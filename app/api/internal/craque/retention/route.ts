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
    const { data, error } = await createPrivilegedClient().rpc(
      "cleanup_craque_voting_retention",
      { requested_limit: 500 },
    );

    if (error) throw error;
    return response({ status: "retenção executada", summary: data }, 200);
  } catch {
    return response({ status: "retenção indisponível" }, 503);
  }
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
