import { getAppUrl } from "@/lib/env/server";
import { isExternalCommandConsumptionEnabled } from "@/lib/features/delivery/server";
import { createSupabasePilotDeliveryRepository } from "@/lib/features/delivery/supabase-delivery-repository";
import { createTwilioWhatsAppAdapter } from "@/lib/features/delivery/twilio-adapter";
import { parseTwilioPilotConfig } from "@/lib/features/delivery/twilio-pilot-config";
import { runWhatsAppWorker } from "@/lib/features/delivery/whatsapp-worker";
import { isAuthorizedWorkerRequest } from "@/lib/features/delivery/worker-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ outboxId: z.string().uuid() }).strict();
const BODY_LIMIT = 1024;
const CONTROL_LOOKUP_TIMEOUT_MS = 3_000;

export async function POST(request: NextRequest) {
  if (
    !isAuthorizedWorkerRequest(
      request.headers.get("authorization"),
      process.env.WHATSAPP_WORKER_SECRET,
    )
  ) {
    return response({ status: "não autorizado" }, 401);
  }

  let config;
  try {
    config = parseTwilioPilotConfig(process.env);
  } catch {
    return response({ status: "piloto indisponível" }, 503);
  }
  if (!config) return response({ status: "piloto desligado" }, 409);

  if (!(await isExternalCommandConsumptionEnabled(CONTROL_LOOKUP_TIMEOUT_MS))) {
    return response({ status: "consumo desligado" }, 409);
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    return response({ status: "requisição inválida" }, 415);
  }
  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > BODY_LIMIT) {
    return response({ status: "requisição inválida" }, 413);
  }
  const parsedBody = bodySchema.safeParse(safeJson(rawBody));
  if (!parsedBody.success) {
    return response({ status: "requisição inválida" }, 400);
  }

  try {
    const summary = await runWhatsAppWorker({
      mode: "live",
      repository: createSupabasePilotDeliveryRepository({
        teamId: config.pilotTeamId,
        recipient: config.pilotRecipient,
        outboxId: parsedBody.data.outboxId,
      }),
      adapter: createTwilioWhatsAppAdapter(config),
      appUrl: getAppUrl(),
      batchSize: 1,
      leaseSeconds: 60,
    });
    return response({ status: "piloto executado", summary }, 200);
  } catch {
    return response({ status: "piloto indisponível" }, 503);
  }
}

function safeJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
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
