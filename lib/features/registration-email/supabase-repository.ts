import "server-only";

import type { Database } from "@/lib/database.types";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import type { RegistrationEmailRepository } from "./worker";

type Client = ReturnType<typeof createPrivilegedClient>;
type PreparedRow =
  Database["public"]["Functions"]["prepare_registration_email_dispatch"]["Returns"][number];

export function createRegistrationEmailRepository(
  client: Client = createPrivilegedClient(),
): RegistrationEmailRepository {
  return {
    async recoverExpiredLeases() {
      const { data, error } = await client.rpc(
        "recover_expired_registration_email_leases",
      );
      if (error) throw operationFailed("recover");
      const row = data?.[0];
      return {
        safeRetryCount: row?.safe_retry_count ?? 0,
        reviewCount: row?.review_count ?? 0,
      };
    },
    async claimBatch(limit, leaseSeconds) {
      const { data, error } = await client.rpc("claim_registration_email_batch", {
        requested_limit: limit,
        requested_lease_seconds: leaseSeconds,
      });
      if (error) throw operationFailed("claim");
      return (data ?? []).map((row) => ({
        outboxId: row.outbox_id,
        leaseToken: row.lease_token,
        attemptNumber: row.attempt_number,
      }));
    },
    async prepare(claim) {
      const { data, error } = await client.rpc(
        "prepare_registration_email_dispatch",
        {
          requested_outbox_id: claim.outboxId,
          requested_lease_token: claim.leaseToken,
        },
      );
      if (error) throw operationFailed("prepare");
      const row = data?.[0] as PreparedRow | undefined;
      return row
        ? {
            attemptId: row.attempt_id,
            recipient: row.recipient_email,
            teamName: row.team_name,
            teamSlug: row.team_slug,
          }
        : null;
    },
    async ack(claim, attemptId, providerMessageId) {
      const { data, error } = await client.rpc("ack_registration_email_sent", {
        requested_outbox_id: claim.outboxId,
        requested_lease_token: claim.leaseToken,
        requested_attempt_id: attemptId,
        requested_provider_message_id: providerMessageId,
      });
      if (error) throw operationFailed("ack");
      return data === true;
    },
    async nack(claim, attemptId, failureClass, errorCode) {
      const { data, error } = await client.rpc("nack_registration_email", {
        requested_outbox_id: claim.outboxId,
        requested_lease_token: claim.leaseToken,
        requested_attempt_id: attemptId,
        requested_failure_class: failureClass,
        requested_error_code: errorCode,
      });
      if (error) throw operationFailed("nack");
      return data;
    },
  };
}

function operationFailed(operation: string) {
  return new Error(`Operação de aviso de cadastro indisponível: ${operation}.`);
}
