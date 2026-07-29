import "server-only";

import type { Database } from "@/lib/database.types";
import {
  EVENT_ACCESS_COOKIE_NAME,
  isEventAccessSecret,
} from "@/lib/features/event-access/contract";
import { isPublicEventId } from "@/lib/features/public-event/presentation";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

type AttendanceStatus = Database["public"]["Enums"]["attendance_status"];
type EventStatus = Database["public"]["Enums"]["event_status"];

export type EventAccessContext = {
  publicId: string;
  athleteDisplayName: string;
  attendanceStatus: AttendanceStatus;
  eventStatus: EventStatus;
  canRespond: boolean;
  expiresAt: string;
  source: "capability" | "verified_session";
};

export type EventAccessResolution = {
  context: EventAccessContext | null;
  clearInvalidCookie: boolean;
};

type AccessRow = {
  public_id: string;
  athlete_display_name: string;
  attendance_status: AttendanceStatus;
  event_status: EventStatus;
  can_respond: boolean;
  capability_expires_at: string;
};

export async function exchangeEventAccessCredential(
  publicId: string,
  credential: string,
): Promise<{ secret: string; expiresAt: string } | null> {
  if (!isPublicEventId(publicId) || !isEventAccessSecret(credential)) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "exchange_event_access_credential",
    {
      requested_public_id: publicId,
      requested_credential_secret: credential,
    },
  );

  if (error) {
    reportUnexpectedAccessFailure("exchange", error);
    return null;
  }

  const row = data?.[0];
  if (
    !row ||
    !isEventAccessSecret(row.capability_secret) ||
    !isValidTimestamp(row.capability_expires_at)
  ) {
    return null;
  }

  return {
    secret: row.capability_secret,
    expiresAt: row.capability_expires_at,
  };
}

export async function getEventAccessContext(
  publicId: string,
): Promise<EventAccessResolution> {
  if (!isPublicEventId(publicId)) {
    return { context: null, clearInvalidCookie: false };
  }

  const cookieStore = await cookies();
  const cookieSecret = cookieStore.get(EVENT_ACCESS_COOKIE_NAME)?.value ?? null;
  const hasCookie = cookieSecret !== null;
  const supabase = await createClient();

  if (isEventAccessSecret(cookieSecret)) {
    const { data, error } = await supabase.rpc("resolve_event_capability", {
      requested_public_id: publicId,
      requested_capability_secret: cookieSecret,
    });

    if (!error) {
      const context = normalizeAccessRow(data?.[0], "capability");
      if (context) {
        return { context, clearInvalidCookie: false };
      }
    } else {
      reportUnexpectedAccessFailure("resolve_capability", error);
    }
  }

  const { data: claimsResult, error: claimsError } =
    await supabase.auth.getClaims();

  if (!claimsError && typeof claimsResult?.claims?.sub === "string") {
    const { data, error } = await supabase.rpc(
      "resolve_event_access_for_verified_session",
      { requested_public_id: publicId },
    );

    if (!error) {
      const context = normalizeAccessRow(data?.[0], "verified_session");
      if (context) {
        return { context, clearInvalidCookie: hasCookie };
      }
    } else {
      reportUnexpectedAccessFailure("resolve_verified_session", error);
    }
  }

  return { context: null, clearInvalidCookie: hasCookie };
}

function normalizeAccessRow(
  candidate: AccessRow | null | undefined,
  source: EventAccessContext["source"],
): EventAccessContext | null {
  if (
    !candidate ||
    !isPublicEventId(candidate.public_id) ||
    !candidate.athlete_display_name ||
    !candidate.attendance_status ||
    !candidate.event_status ||
    typeof candidate.can_respond !== "boolean" ||
    !isValidTimestamp(candidate.capability_expires_at)
  ) {
    return null;
  }

  return {
    publicId: candidate.public_id,
    athleteDisplayName: candidate.athlete_display_name,
    attendanceStatus: candidate.attendance_status,
    eventStatus: candidate.event_status,
    canRespond: candidate.can_respond,
    expiresAt: candidate.capability_expires_at,
    source,
  };
}

function isValidTimestamp(candidate: string) {
  return Number.isFinite(Date.parse(candidate));
}

function reportUnexpectedAccessFailure(
  boundary: string,
  error: { code?: string; message?: string },
) {
  if (isExpectedAccessFailure(error)) return;

  console.error(
    JSON.stringify({
      event: "event_access_boundary",
      boundary,
      outcome: "failed",
      code: error.code ?? "unknown",
    }),
  );
}

function isExpectedAccessFailure(error: { code?: string; message?: string }) {
  if (
    error.code === "42501" ||
    error.code === "42883" ||
    error.code === "PGRST202" ||
    error.code === "PGRST204"
  ) {
    return true;
  }

  const message = error.message?.toLowerCase() ?? "";
  return (
    message.includes("event access") ||
    message.includes("acesso ao evento") ||
    message.includes("sessão verificada") ||
    message.includes("schema cache")
  );
}
