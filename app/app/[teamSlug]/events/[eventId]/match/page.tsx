import { redirect } from "next/navigation";

export default async function LegacyMatchRedirect({ params }: { params: Promise<{ teamSlug: string; eventId: string }> }) {
  const { teamSlug, eventId } = await params;
  redirect(`/app/${teamSlug}/events/${eventId}/matches`);
}
