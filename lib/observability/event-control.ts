const expectedEventControlCodes = new Set(["22023", "42501", "55000"]);

export type EventControlOperation =
  | "create"
  | "update"
  | "cancel"
  | "extend_series";

export function classifyEventControlFailure(error?: {
  code?: string | null;
} | null) {
  const code = error?.code?.trim() || "unknown";

  return {
    feature: "event_control" as const,
    outcome: expectedEventControlCodes.has(code)
      ? ("rejected" as const)
      : ("failed" as const),
    code,
  };
}

export function reportEventControlFailure(
  operation: EventControlOperation,
  error?: { code?: string | null } | null,
) {
  const event = {
    ...classifyEventControlFailure(error),
    operation,
  };

  if (event.outcome === "rejected") {
    console.warn("event_control_operation", event);
    return;
  }

  console.error("event_control_operation", event);
}
