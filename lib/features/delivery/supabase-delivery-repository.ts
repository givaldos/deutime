import "server-only";

import type { Database } from "@/lib/database.types";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import type { WhatsAppDeliveryRepository } from "./whatsapp-worker";

type Client = ReturnType<typeof createPrivilegedClient>;
type PreparedRow =
  Database["public"]["Functions"]["prepare_whatsapp_dispatch"]["Returns"][number];

export function createSupabaseDeliveryRepository(
  client: Client = createPrivilegedClient(),
): WhatsAppDeliveryRepository {
  return {
    async recoverExpiredLeases() {
      const { data, error } = await client.rpc(
        "recover_expired_notification_leases",
      );
      if (error) throw operationFailed("recover");
      const row = data?.[0];
      return {
        safeRetryCount: row?.safe_retry_count ?? 0,
        reviewCount: row?.review_count ?? 0,
      };
    },

    async claimBatch(limit, leaseSeconds) {
      const { data, error } = await client.rpc("claim_notification_batch", {
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

    async releaseClaim(claim) {
      const { data, error } = await client.rpc("release_notification_claim", {
        requested_outbox_id: claim.outboxId,
        requested_lease_token: claim.leaseToken,
      });
      if (error) throw operationFailed("release");
      return data === true;
    },

    async prepare(claim) {
      const { data, error } = await client.rpc("prepare_whatsapp_dispatch", {
        requested_outbox_id: claim.outboxId,
        requested_lease_token: claim.leaseToken,
      });
      if (error) throw operationFailed("prepare");
      return (data?.[0] as PreparedRow | undefined) ?? null;
    },

    async ack(claim, attemptId, providerMessageId) {
      const { error } = await client.rpc("ack_notification_sent", {
        requested_outbox_id: claim.outboxId,
        requested_lease_token: claim.leaseToken,
        requested_attempt_id: attemptId,
        requested_provider_message_id: providerMessageId,
      });
      if (error) throw operationFailed("ack");
    },

    async nack(claim, attemptId, failureClass, errorCode) {
      const { error } = await client.rpc("nack_notification", {
        requested_outbox_id: claim.outboxId,
        requested_lease_token: claim.leaseToken,
        requested_attempt_id: attemptId,
        requested_failure_class: failureClass,
        requested_error_code: errorCode,
      });
      if (error) throw operationFailed("nack");
    },
  };
}

export async function recordNotificationCallback(
  input: {
    callbackToken: string;
    providerMessageId: string;
    deliveryStatus: string;
    errorCode: string | null;
  },
  client: Client = createPrivilegedClient(),
) {
  const { data, error } = await client.rpc("record_notification_callback", {
    requested_callback_token: input.callbackToken,
    requested_provider_message_id: input.providerMessageId,
    requested_delivery_status: input.deliveryStatus,
    requested_error_code: input.errorCode ?? undefined,
  });
  if (error) throw operationFailed("callback");
  return data === true;
}

function operationFailed(operation: string) {
  return new Error(`Operação de delivery indisponível: ${operation}.`);
}
