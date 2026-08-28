import { getAppUrl } from "@/lib/env/server";
import { isRegistrationEmailDeliveryEnabled } from "@/lib/features/delivery/server";
import { isAuthorizedWorkerRequest } from "@/lib/features/delivery/worker-auth";
import { createRegistrationEmailSmtpAdapter, parseRegistrationEmailSmtpConfig } from "@/lib/features/registration-email/smtp-adapter";
import { createRegistrationEmailRepository } from "@/lib/features/registration-email/supabase-repository";
import { runRegistrationEmailWorker } from "@/lib/features/registration-email/worker";
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

  if (!(await isRegistrationEmailDeliveryEnabled(3_000))) {
    return response({ status: "consumo desligado" }, 409);
  }

  let config;
  try {
    config = parseRegistrationEmailSmtpConfig(process.env);
  } catch {
    return response({ status: "worker indisponível" }, 503);
  }
  if (!config) return response({ status: "worker indisponível" }, 503);

  try {
    const summary = await runRegistrationEmailWorker({
      repository: createRegistrationEmailRepository(),
      adapter: createRegistrationEmailSmtpAdapter(config, getAppUrl()),
    });
    return response({ status: "avisos processados", summary }, 200);
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
