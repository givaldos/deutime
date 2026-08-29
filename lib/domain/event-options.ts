export const EVENT_DURATION_MINUTES_MIN = 15;
export const EVENT_DURATION_MINUTES_MAX = 480;

export const EVENT_DURATION_OPTIONS = [
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 h" },
  { value: 75, label: "1 h 15 min" },
  { value: 90, label: "1 h 30 min" },
  { value: 120, label: "2 h" },
  { value: 180, label: "3 h" },
  { value: 240, label: "4 h" },
  { value: 360, label: "6 h" },
  { value: 480, label: "8 h" },
] as const;

export const EVENT_CONFIRMATION_DEADLINE_OPTIONS = [
  { value: 0, label: "Até o início" },
  { value: 60, label: "1 h antes" },
  { value: 120, label: "2 h antes" },
  { value: 180, label: "3 h antes" },
  { value: 360, label: "6 h antes" },
  { value: 720, label: "12 h antes" },
  { value: 1_440, label: "1 dia antes" },
] as const;

const durationValues = new Set<number>(
  EVENT_DURATION_OPTIONS.map((option) => option.value),
);
const deadlineValues = new Set<number>(
  EVENT_CONFIRMATION_DEADLINE_OPTIONS.map((option) => option.value),
);

export function isCommonEventDuration(value: number) {
  return durationValues.has(value);
}

export function isEventConfirmationDeadline(value: number) {
  return deadlineValues.has(value);
}
