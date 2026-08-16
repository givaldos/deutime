export const featureKeys = [
  "persistent_event_access",
  "whatsapp_delivery",
  "post_match",
  "voting",
  "comments",
  "team_division",
  "event_control",
  "public_event_page",
  "event_capability_exchange",
  "event_capability_rsvp",
  "event_share_card",
  "whatsapp_reminders",
  "championships",
  "recognition",
] as const;

export type FeatureKey = (typeof featureKeys)[number];

export const runtimeControlKeys = [
  "integration_produce",
  "integration_consume",
] as const;

export type RuntimeControlKey = (typeof runtimeControlKeys)[number];

type BooleanLookup<Key extends string> = (key: Key) => Promise<boolean>;

export async function failClosedLookup<Key extends string>(
  key: Key,
  lookup: BooleanLookup<Key>,
  timeoutMs = 750,
): Promise<boolean> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      lookup(key).catch(() => false),
      new Promise<false>((resolve) => {
        timeout = setTimeout(() => resolve(false), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function canProduceExternalCommands(
  lookup: BooleanLookup<RuntimeControlKey>,
  timeoutMs?: number,
) {
  return failClosedLookup("integration_produce", lookup, timeoutMs);
}

export function canConsumeExternalCommands(
  lookup: BooleanLookup<RuntimeControlKey>,
  timeoutMs?: number,
) {
  return failClosedLookup("integration_consume", lookup, timeoutMs);
}
