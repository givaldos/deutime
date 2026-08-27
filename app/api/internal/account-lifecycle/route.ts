import { isAuthorizedWorkerRequest } from "@/lib/features/delivery/worker-auth";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (
    !isAuthorizedWorkerRequest(
      request.headers.get("authorization"),
      process.env.CRON_SECRET,
    )
  ) {
    return response({ status: "não autorizado" }, 401);
  }

  try {
    const supabase = createPrivilegedClient();
    const { data: claimed, error: claimError } = await supabase.rpc(
      "claim_account_closures",
      { requested_limit: 20 },
    );
    if (claimError) throw claimError;

    const { data: teamJobs, error: teamClaimError } = await supabase.rpc(
      "claim_team_closure_storage",
      { requested_limit: 20 },
    );
    if (teamClaimError) throw teamClaimError;

    let completed = 0;
    let pending = 0;
    for (const closure of claimed ?? []) {
      let storageErrorCode: string | null = null;
      if (closure.pending_storage_paths.length) {
        const { error: storageError } = await supabase.storage
          .from("athlete_avatars")
          .remove(closure.pending_storage_paths);
        storageErrorCode = storageError
          ? normalizedCode(storageError.name || "storage_remove_failed")
          : null;
      }
      const { error } = await supabase.auth.admin.deleteUser(
        closure.user_id,
        true,
      );
      const alreadyAbsent = error?.code === "user_not_found";
      const errorCode = storageErrorCode ??
        (error && !alreadyAbsent ? normalizedCode(error.code) : null);
      const { error: completionError } = await supabase.rpc(
        "complete_account_closure",
        {
          requested_request_id: closure.request_id,
          requested_error_code: errorCode ?? undefined,
        },
      );
      if (completionError) throw completionError;
      if (errorCode) pending += 1;
      else completed += 1;
    }

    let teamStorageCompleted = 0;
    let teamStoragePending = 0;
    for (const job of teamJobs ?? []) {
      const { error } = job.pending_storage_paths.length
        ? await supabase.storage
            .from("athlete_avatars")
            .remove(job.pending_storage_paths)
        : { error: null };
      const errorCode = error
        ? normalizedCode(error.name || "storage_remove_failed")
        : null;
      const { error: completionError } = await supabase.rpc(
        "complete_team_closure_storage",
        {
          requested_request_id: job.request_id,
          requested_error_code: errorCode ?? undefined,
        },
      );
      if (completionError) throw completionError;
      if (errorCode) teamStoragePending += 1;
      else teamStorageCompleted += 1;
    }

    const { data: retention, error: retentionError } = await supabase.rpc(
      "cleanup_account_lifecycle_retention",
      { requested_limit: 500 },
    );
    if (retentionError) throw retentionError;

    return response(
      {
        status: "ciclo de vida reconciliado",
        summary: {
          claimed: claimed?.length ?? 0,
          completed,
          pending,
          teamStorageClaimed: teamJobs?.length ?? 0,
          teamStorageCompleted,
          teamStoragePending,
          retention,
        },
      },
      200,
    );
  } catch {
    return response({ status: "reconciliação indisponível" }, 503);
  }
}

function normalizedCode(code?: string) {
  const normalized = (code ?? "auth_provider_failed")
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "_")
    .slice(0, 80);
  return normalized.length >= 2 ? normalized : "auth_provider_failed";
}

function response(body: object, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
