import { getAppUrl } from "@/lib/env/server";
import { isExternalCommandConsumptionEnabled } from "@/lib/features/delivery/server";
import { createSupabaseDeliveryRepository } from "@/lib/features/delivery/supabase-delivery-repository";
import { createTwilioWhatsAppAdapter } from "@/lib/features/delivery/twilio-adapter";
import { parseTwilioProductionConfig } from "@/lib/features/delivery/twilio-pilot-config";
import { runWhatsAppWorker } from "@/lib/features/delivery/whatsapp-worker";
import { isAuthorizedWorkerRequest } from "@/lib/features/delivery/worker-auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET temporário para diagnóstico de variáveis de ambiente — remover após confirmar live. */
export async function GET(request: NextRequest) {
  if (
    !isAuthorizedWorkerRequest(
      request.headers.get("authorization"),
      process.env.WHATSAPP_WORKER_SECRET,
    )
  ) {
    return response({ status: "não autorizado" }, 401);
  }

  const vars = [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_WHATSAPP_FROM",
    "TWILIO_CONTENT_SID_EVENT_CALL_V1",
    "TWILIO_CONTENT_SID_EVENT_CALL_CARD_V1",
    "WHATSAPP_PILOT_MODE",
  ] as const;

  const present: Record<string, string> = {};
  for (const key of vars) {
    const val = process.env[key];
    if (val) {
      // mostra apenas os primeiros 6 caracteres para confirmar o formato sem expor o segredo
      present[key] = val.slice(0, 6) + "…";
    } else {
      present[key] = "(ausente)";
    }
  }

  let configResult: string;
  try {
    const cfg = parseTwilioProductionConfig(process.env);
    configResult = cfg ? `live — ${Object.keys(cfg.templates).join(", ")}` : "null (dry-run)";
  } catch (e) {
    configResult = `erro: ${e instanceof Error ? e.message : String(e)}`;
  }

  return response({ env: present, parsedConfig: configResult }, 200);
}

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

  let config;
  try {
    config = parseTwilioProductionConfig(process.env);
  } catch {
    return response({ status: "worker indisponível" }, 503);
  }

  const mode = config ? "live" : "dry-run";

  try {
    const summary = await runWhatsAppWorker({
      mode,
      repository: createSupabaseDeliveryRepository(),
      ...(config
        ? {
            adapter: createTwilioWhatsAppAdapter(config),
            appUrl: getAppUrl(),
          }
        : {}),
    });
    return response({ status: mode === "live" ? "worker executado" : "dry-run concluído", summary }, 200);
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
