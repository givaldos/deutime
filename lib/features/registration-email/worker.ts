import type { RegistrationEmailAdapter } from "./contract";

export type RegistrationEmailClaim = {
  outboxId: string;
  leaseToken: string;
  attemptNumber: number;
};

export type PreparedRegistrationEmail = {
  attemptId: string;
  recipient: string;
  teamName: string;
  teamSlug: string;
};

export interface RegistrationEmailRepository {
  recoverExpiredLeases(): Promise<{ safeRetryCount: number; reviewCount: number }>;
  claimBatch(limit: number, leaseSeconds: number): Promise<RegistrationEmailClaim[]>;
  prepare(claim: RegistrationEmailClaim): Promise<PreparedRegistrationEmail | null>;
  ack(
    claim: RegistrationEmailClaim,
    attemptId: string,
    providerMessageId: string,
  ): Promise<boolean>;
  nack(
    claim: RegistrationEmailClaim,
    attemptId: string,
    failureClass: "transient" | "permanent" | "ambiguous",
    errorCode: string,
  ): Promise<string>;
}

export async function runRegistrationEmailWorker(input: {
  repository: RegistrationEmailRepository;
  adapter: RegistrationEmailAdapter;
  limit?: number;
}) {
  const limit = input.limit ?? 25;
  const recovery = await input.repository.recoverExpiredLeases();
  const claims = await input.repository.claimBatch(limit, 90);
  const summary = {
    claimed: claims.length,
    prepared: 0,
    accepted: 0,
    transient: 0,
    permanent: 0,
    ambiguous: 0,
    skipped: 0,
    recovered: recovery.safeRetryCount,
    review: recovery.reviewCount,
  };

  for (const claim of claims) {
    let prepared: PreparedRegistrationEmail | null;
    try {
      prepared = await input.repository.prepare(claim);
    } catch {
      summary.ambiguous += 1;
      continue;
    }
    if (!prepared) {
      summary.skipped += 1;
      continue;
    }
    summary.prepared += 1;

    const result = await input.adapter.send({
      recipient: prepared.recipient,
      teamName: prepared.teamName,
      teamSlug: prepared.teamSlug,
    });
    if (result.kind === "accepted") {
      await input.repository.ack(
        claim,
        prepared.attemptId,
        result.providerMessageId,
      );
      summary.accepted += 1;
      continue;
    }
    if (result.kind === "ambiguous") {
      await input.repository.nack(
        claim,
        prepared.attemptId,
        "ambiguous",
        result.errorCode,
      );
      summary.ambiguous += 1;
      continue;
    }
    await input.repository.nack(
      claim,
      prepared.attemptId,
      result.failureClass,
      result.errorCode,
    );
    summary[result.failureClass] += 1;
  }

  return summary;
}
