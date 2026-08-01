import { getAppUrl } from "@/lib/env/server";
import { recordNotificationCallbackByAttemptId } from "@/lib/features/delivery/supabase-delivery-repository";
import { parseCallbackAttemptId } from "@/lib/features/delivery/twilio-status-callback";
import { NextRequest } from "next/server";
import {
  handleTwilioStatusCallback,
  twilioCallbackResponse,
} from "../callback-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ attemptId: string }> },
) {
  const { attemptId: rawAttemptId } = await context.params;
  const attemptId = parseCallbackAttemptId(rawAttemptId);
  if (!attemptId) return twilioCallbackResponse(400);

  const callbackUrl = new URL(
    `/api/integrations/twilio/whatsapp/status/${attemptId}`,
    getAppUrl(),
  ).toString();

  return handleTwilioStatusCallback(request, callbackUrl, (callback) =>
    recordNotificationCallbackByAttemptId({ attemptId, ...callback }),
  );
}
