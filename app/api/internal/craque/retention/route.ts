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
    const { data: craque, error: craqueError } = await supabase.rpc(
      "cleanup_craque_voting_retention",
      { requested_limit: 500 },
    );
    if (craqueError) throw craqueError;

    const { data: conversation, error: conversationError } = await supabase.rpc(
      "cleanup_match_conversation_retention",
      { requested_limit: 500 },
    );
    const conversationContractPending =
      conversationError?.code === "PGRST202" ||
      conversationError?.code === "42883";
    if (conversationError && !conversationContractPending) {
      throw conversationError;
    }

    return response(
      {
        status: "retenção executada",
        summary: {
          ...(craque && typeof craque === "object" && !Array.isArray(craque)
            ? craque
            : { craque }),
          conversation: conversationContractPending
            ? { status: "contrato pendente" }
            : conversation,
        },
      },
      200,
    );
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
