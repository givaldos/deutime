import {
  buildWhatsAppDispatchCommand,
  parsePreparedDispatch,
  type WhatsAppAdapter,
} from "./dispatch-contract";

export type ClaimedNotification = {
  outboxId: string;
  leaseToken: string;
  attemptNumber: number;
};

export interface WhatsAppDeliveryRepository {
  recoverExpiredLeases(): Promise<{ safeRetryCount: number; reviewCount: number }>;
  claimBatch(limit: number, leaseSeconds: number): Promise<ClaimedNotification[]>;
  releaseClaim(claim: ClaimedNotification): Promise<boolean>;
  prepare(claim: ClaimedNotification): Promise<unknown | null>;
  ack(
    claim: ClaimedNotification,
    attemptId: string,
    providerMessageId: string,
  ): Promise<void>;
  nack(
    claim: ClaimedNotification,
    attemptId: string,
    failureClass: "transient" | "permanent" | "ambiguous",
    errorCode: string,
  ): Promise<void>;
}

export type WorkerMode = "dry-run" | "live";

export type WorkerSummary = {
  mode: WorkerMode;
  recoveredSafe: number;
  recoveredForReview: number;
  claimed: number;
  released: number;
  prepared: number;
  accepted: number;
  rejected: number;
  ambiguous: number;
  cancelled: number;
};

type RunWorkerOptions = {
  mode: WorkerMode;
  repository: WhatsAppDeliveryRepository;
  adapter?: WhatsAppAdapter;
  appUrl?: URL;
  batchSize?: number;
  leaseSeconds?: number;
};

export async function runWhatsAppWorker({
  mode,
  repository,
  adapter,
  appUrl,
  batchSize = 10,
  leaseSeconds = 60,
}: RunWorkerOptions): Promise<WorkerSummary> {
  if (mode === "live" && (!adapter || !appUrl)) {
    throw new Error("Adapter e APP_URL são obrigatórios no modo live.");
  }
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100) {
    throw new Error("Tamanho de lote inválido.");
  }

  const recovered = await repository.recoverExpiredLeases();
  const claims = await repository.claimBatch(batchSize, leaseSeconds);
  const summary: WorkerSummary = {
    mode,
    recoveredSafe: recovered.safeRetryCount,
    recoveredForReview: recovered.reviewCount,
    claimed: claims.length,
    released: 0,
    prepared: 0,
    accepted: 0,
    rejected: 0,
    ambiguous: 0,
    cancelled: 0,
  };

  for (const claim of claims) {
    if (mode === "dry-run") {
      const released = await repository.releaseClaim(claim);
      if (released) summary.released++;
      else summary.ambiguous++;
      continue;
    }

    let rawPrepared: unknown | null;
    try {
      rawPrepared = await repository.prepare(claim);
    } catch {
      summary.ambiguous++;
      continue;
    }

    if (rawPrepared === null) {
      summary.cancelled++;
      continue;
    }

    const prepared = parsePreparedDispatch(rawPrepared);
    if (!prepared) {
      summary.ambiguous++;
      continue;
    }
    summary.prepared++;

    const outcome = await adapter!.send(
      buildWhatsAppDispatchCommand(prepared, appUrl!),
    );
    try {
      if (outcome.kind === "accepted") {
        await repository.ack(
          claim,
          prepared.attempt_id,
          outcome.providerMessageId,
        );
        summary.accepted++;
      } else if (outcome.kind === "rejected") {
        await repository.nack(
          claim,
          prepared.attempt_id,
          outcome.failureClass,
          outcome.errorCode,
        );
        summary.rejected++;
      } else {
        await repository.nack(
          claim,
          prepared.attempt_id,
          "ambiguous",
          outcome.errorCode,
        );
        summary.ambiguous++;
      }
    } catch {
      summary.ambiguous++;
    }
  }

  return summary;
}
