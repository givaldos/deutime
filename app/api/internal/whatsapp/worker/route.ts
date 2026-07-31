import { isExternalCommandConsumptionEnabled } from "@/lib/features/delivery/server";
import { createSupabaseDeliveryRepository } from "@/lib/features/delivery/supabase-delivery-repository";
import { runWhatsAppWorker } from "@/lib/features/delivery/whatsapp-worker";
import { isAuthorizedWorkerRequest } from "@/lib/features/delivery/worker-auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (
    !isAuthorizedWorkerRequest(
      request.headers.get("authorization"),
      process.env.WHATSAPP_WORKER_SECRET,
    )
  ) {
    return response({ status: "não autorizado" }, 401);
  }

  if (!(await isExternalCommandConsumptionEnabled())) {
    return response({ status: "consumo desligado" }, 409);
  }

  try {
    const summary = await runWhatsAppWorker({
      mode: "dry-run",
      repository: createSupabaseDeliveryRepository(),
    });
    return response({ status: "dry-run concluído", summary }, 200);
  } catch {
    return response({ status: "worker indisponível" }, 503);
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
