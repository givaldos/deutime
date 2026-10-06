"use server";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const databaseUuid = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
);

const lookupRequestSchema = z.object({
  teamId: databaseUuid,
  requestId: databaseUuid,
  domain: z.enum(["events", "athletes"]),
});

export type BatchCommandLookup =
  | { status: "applied"; appliedCount: number }
  | { status: "unknown" }
  | { status: "error" };

export async function lookupBatchCommand(input: unknown): Promise<BatchCommandLookup> {
  await requireUser();
  const parsed = lookupRequestSchema.safeParse(input);
  if (!parsed.success) return { status: "error" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_batch_command_result", {
    requested_team_id: parsed.data.teamId,
    requested_domain: parsed.data.domain,
    requested_request_id: parsed.data.requestId,
  });
  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    return { status: "error" };
  }
  if (data.status === "unknown") return { status: "unknown" };
  return data.status === "applied" && typeof data.applied_count === "number"
    ? { status: "applied", appliedCount: data.applied_count }
    : { status: "error" };
}
