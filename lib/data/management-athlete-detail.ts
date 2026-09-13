import "server-only";

import {
  buildManagementAthleteListUrl,
  parseManagementAthleteSearchParams,
  type ManagementAthleteCursor,
  type RawManagementAthleteSearchParams,
} from "@/lib/data/management-athletes";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const positionSchema = z.object({
  sport_format: z.enum(["field", "society", "futsal"]),
  code: z.string(),
  label: z.string(),
  priority: z.number().int().min(1).max(3),
});

const participationSchema = z.object({
  event_id: z.uuid(),
  title: z.string().min(2),
  kind: z.enum([
    "weekly_match",
    "championship",
    "friendly",
    "tournament",
    "training",
    "other",
  ]),
  starts_at: z.iso.datetime({ offset: true }),
  status: z.enum(["scheduled", "cancelled", "completed"]),
  attendance_status: z.enum([
    "pending",
    "confirmed",
    "declined",
    "maybe",
    "waitlist",
  ]),
  in_lineup: z.boolean(),
});

const detailSchema = z.object({
  id: z.uuid(),
  registration_number: z.number().int().positive(),
  claimed: z.boolean(),
  display_name: z.string().min(2),
  full_name: z.string().min(2),
  shirt_number: z.number().int().min(1).max(99).nullable(),
  status: z.enum(["active", "inactive", "pending", "rejected"]),
  registration_source: z.enum(["admin", "public_form", "import"]),
  joined_on: z.iso.date().nullable(),
  created_at: z.iso.datetime({ offset: true }),
  contact: z.object({
    birth_date: z.iso.date().nullable(),
    phone_e164: z.string().nullable(),
    email: z.string().nullable(),
    notes: z.string().nullable(),
  }),
  positions: z.array(positionSchema),
  photo_source: z.enum(["player_profile", "team_registration"]).nullable(),
  photo_path: z.string().nullable(),
  recent_participations: z.array(participationSchema).max(10),
  sports_statistics_available: z.literal(false),
  allowed_actions: z.object({
    can_review: z.boolean(),
    can_edit: z.boolean(),
    can_remove: z.boolean(),
    can_change_availability: z.boolean(),
  }),
});

export type ManagementAthleteDetail = Omit<
  z.infer<typeof detailSchema>,
  "photo_path"
> & { photo_url: string | null };

const unavailableCodes = new Set(["P0001", "42883", "PGRST202"]);

export async function getManagementAthleteDetail(
  teamId: string,
  athleteId: string,
): Promise<
  | { mode: "enhanced"; detail: ManagementAthleteDetail }
  | { mode: "unavailable" }
  | { mode: "not_found" }
  | { mode: "error" }
> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_management_athlete_detail", {
    requested_team_id: teamId,
    requested_athlete_id: athleteId,
  });

  if (error) {
    if (unavailableCodes.has(error.code)) return { mode: "unavailable" };
    if (error.code === "42501" || error.code === "22P02") {
      return { mode: "not_found" };
    }
    console.warn("[recognizable-roster] detail_rpc_error", { code: error.code });
    return { mode: "error" };
  }

  const parsed = detailSchema.safeParse(data);
  if (!parsed.success) {
    console.warn("[recognizable-roster] invalid_detail_response", {
      paths: parsed.error.issues.map((issue) => issue.path.join(".")),
    });
    return { mode: "error" };
  }

  const { photo_path: photoPath, ...detail } = parsed.data;
  let photoUrl: string | null = null;
  if (photoPath) {
    const signed = await supabase.storage
      .from("athlete_avatars")
      .createSignedUrl(photoPath, 900);
    if (signed.error) {
      console.warn("[recognizable-roster] detail_media_sign_error");
    } else {
      photoUrl = signed.data.signedUrl;
    }
  }

  return { mode: "enhanced", detail: { ...detail, photo_url: photoUrl } };
}

const returnFilterKeys = ["status", "q", "position", "cursor"] as const;

export function safeManagementAthleteReturnTo(
  teamSlug: string,
  rawValue: string | string[] | undefined,
) {
  const fallback = `/app/${teamSlug}/athletes`;
  if (typeof rawValue !== "string" || !rawValue.startsWith("/") || rawValue.startsWith("//") || rawValue.includes("\\") || rawValue.includes("#")) {
    return fallback;
  }

  try {
    const parsedUrl = new URL(rawValue, "https://return.deutime.invalid");
    if (
      parsedUrl.origin !== "https://return.deutime.invalid"
      || parsedUrl.pathname !== fallback
      || [...parsedUrl.searchParams.keys()].some(
        (key) => !returnFilterKeys.includes(key as (typeof returnFilterKeys)[number]),
      )
    ) {
      return fallback;
    }

    const query: RawManagementAthleteSearchParams = {};
    for (const key of returnFilterKeys) {
      const values = parsedUrl.searchParams.getAll(key);
      if (values.length === 1) query[key] = values[0];
      if (values.length > 1) query[key] = values;
    }
    const parsedFilters = parseManagementAthleteSearchParams(query);
    if (!parsedFilters.ok) return fallback;
    return buildManagementAthleteListUrl(
      teamSlug,
      parsedFilters.filters,
      parsedFilters.filters.cursor as ManagementAthleteCursor | null,
    );
  } catch {
    return fallback;
  }
}
