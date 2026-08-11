import "server-only";

import { isPublicEventId } from "@/lib/features/public-event/presentation";
import { createClient } from "@/lib/supabase/server";
import { cache } from "react";
import { z } from "zod";

const publicLineupSchema = z.object({
  revision: z.number().int().positive(),
  published_at: z.string().datetime({ offset: true }),
  squads: z.array(z.object({
    name: z.string().min(1).max(60),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable(),
    sort_order: z.number().int().min(1).max(12),
    athletes: z.array(z.object({
      name: z.string().trim().min(1).max(120),
      sort_order: z.number().int().positive(),
    })).max(300),
  })).min(2).max(12),
});

export type PublicEventLineup = z.infer<typeof publicLineupSchema>;

export const getPublicEventLineup = cache(
  async (publicId: string): Promise<PublicEventLineup | null> => {
    if (!isPublicEventId(publicId)) return null;
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_public_event_lineup", {
      requested_public_id: publicId,
    });
    if (error) {
      if (error.code === "42883" || error.code === "42P01") return null;
      throw new Error("Não foi possível carregar os times publicados.");
    }
    const parsed = publicLineupSchema.safeParse(data);
    if (!parsed.success) return null;

    return {
      ...parsed.data,
      squads: parsed.data.squads.map((squad) => ({
        ...squad,
        athletes: squad.athletes.map((athlete) => ({
          ...athlete,
          name: athlete.name.replace(/\s.*$/u, ""),
        })),
      })),
    };
  },
);
