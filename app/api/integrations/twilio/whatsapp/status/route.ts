import { getAppUrl } from "@/lib/env/server";
import { recordNotificationCallback } from "@/lib/features/delivery/supabase-delivery-repository";
import {
  parseCallbackToken,
} from "@/lib/features/delivery/twilio-status-callback";
import { NextRequest } from "next/server";
import {
  handleTwilioStatusCallback,
  twilioCallbackResponse,
} from "./callback-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const callbackToken = parseCallbackToken(request.nextUrl.searchParams);
  if (!callbackToken) return twilioCallbackResponse(400);
  const callbackUrl = new URL(
    `/api/integrations/twilio/whatsapp/status${request.nextUrl.search}`,
    getAppUrl(),
  ).toString();

  return handleTwilioStatusCallback(request, callbackUrl, (callback) =>
    recordNotificationCallback({
      callbackToken,
      ...callback,
    }),
  );
}
