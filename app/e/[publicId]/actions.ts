"use server";

import { respondToEventFromAccess } from "@/lib/data/event-access";
import {
  attendanceStatusLabels,
  type EventResponseStatus,
  isEventResponseStatus,
} from "@/lib/features/event-access/contract";
import { isPublicEventId } from "@/lib/features/public-event/presentation";
import { revalidatePath } from "next/cache";

export type EventRsvpActionState = {
  outcome?: "success" | "error" | "unavailable";
  message?: string;
  status?: EventResponseStatus;
};

export async function respondToPublicEventFromAccess(
  _previousState: EventRsvpActionState,
  formData: FormData,
): Promise<EventRsvpActionState> {
  const publicId = formData.get("publicId");
  const status = formData.get("status");

  if (
    typeof publicId !== "string" ||
    !isPublicEventId(publicId) ||
    !isEventResponseStatus(status)
  ) {
    return {
      outcome: "unavailable",
      message:
        "Sua resposta não pode ser alterada por este link agora. Consulte a agenda para continuar.",
    };
  }

  const result = await respondToEventFromAccess(publicId, status);

  if (result.outcome === "unavailable") {
    return {
      outcome: "unavailable",
      message:
        "Sua resposta não pode ser alterada por este link agora. Consulte a agenda para continuar.",
    };
  }

  if (result.outcome === "error") {
    return {
      outcome: "error",
      message: "Não foi possível salvar agora. Tente novamente.",
    };
  }

  revalidatePath(`/e/${publicId}`);
  return {
    outcome: "success",
    message: `Presença atualizada: ${attendanceStatusLabels[result.status]}.`,
    status: result.status,
  };
}
