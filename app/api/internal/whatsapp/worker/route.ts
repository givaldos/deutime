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

const reminderTemplateIds = [
  "event_reminder:first_card_v2",
  "event_reminder:last_card_v2",
] as const;
const workerControlTimeoutMs = 3_000;

export async function POST(request: NextRequest) {
  if (
    !isAuthorizedWorkerRequest(
      request.headers.get("authorization"),
      process.env.WHATSAPP_WORKER_SECRET,
    )
  ) {
    return response({ status: "não autorizado" }, 401);
  }

  if (!(await isExternalCommandConsumptionEnabled(workerControlTimeoutMs))) {
    return response({ status: "consumo desligado" }, 409);
  }

  let config;
  try {
    config = parseTwilioProductionConfig(process.env);
  } catch {
    return response({ status: "worker indisponível" }, 503);
  }

  const mode = config ? "live" : "dry-run";
  const reminderTemplatesReady =
    config !== null &&
    reminderTemplateIds.every((identifier) =>
      Boolean(config.templates[identifier]),
    );

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
      produceReminders: reminderTemplatesReady,
    });
    return response(
      {
        status: mode === "live" ? "worker executado" : "dry-run concluído",
        reminderTemplates: reminderTemplatesReady
          ? "prontos"
          : "indisponíveis",
        summary,
      },
      200,
    );
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
