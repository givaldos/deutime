import { z } from "zod";

const teamSlugSchema = z
  .string()
  .regex(/^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/);

const hoursSchema = z.coerce.number().int().min(1).max(720);

export const teamReminderSettingsSchema = z
  .object({
    teamId: z.string().uuid(),
    teamSlug: teamSlugSchema,
    firstHours: hoursSchema.min(25),
    secondHours: hoursSchema.min(25),
  })
  .refine((value) => value.firstHours > value.secondHours, {
    message: "O primeiro lembrete precisa acontecer antes do segundo.",
    path: ["firstHours"],
  });

export const eventReminderSettingsSchema = z
  .object({
    teamId: z.string().uuid(),
    teamSlug: teamSlugSchema,
    eventId: z.string().uuid(),
    mode: z.enum(["inherit", "custom"]),
    firstHours: hoursSchema.optional(),
    secondHours: hoursSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.mode === "inherit") return;
    if (value.firstHours === undefined || value.secondHours === undefined) {
      context.addIssue({
        code: "custom",
        message: "Informe os dois horários do evento.",
        path: ["firstHours"],
      });
      return;
    }
    if (value.firstHours <= value.secondHours) {
      context.addIssue({
        code: "custom",
        message: "O primeiro lembrete precisa acontecer antes do segundo.",
        path: ["firstHours"],
      });
    }
  });

export const sendEventReminderSchema = z.object({
  teamId: z.string().uuid(),
  teamSlug: teamSlugSchema,
  eventId: z.string().uuid(),
  requestId: z.string().uuid(),
});
