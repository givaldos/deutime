import { PlayerProfileForm } from "@/components/player-profile-form";
import { PlayerAvatarManager } from "@/components/player-avatar-manager";
import { AsyncSubmitButton } from "@/components/ui/async-submit-button";
import { updateMySportsActivityConsent } from "@/app/me/actions";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, BadgeCheck, ShieldCheck, ShieldOff } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function EditPlayerProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ consent?: string }>;
}) {
  const user = await requireUser();
  const query = await searchParams;
  const supabase = await createClient();
  const [
    { data: profile },
    { data: preferences },
    { data: positions },
    { data: athleteLinks },
  ] = await Promise.all([
    supabase
      .from("player_profiles")
      .select(
        "handle, display_name, preferred_name, bio, photo_path, is_public, phone_verified_at",
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("player_position_preferences")
      .select("sport_format, position_code, priority")
      .eq("user_id", user.id)
      .order("priority"),
    supabase
      .from("positions")
      .select("sport_format, code, label")
      .order("sport_format")
      .order("sort_order"),
    supabase
      .from("athletes")
      .select("id, team_id, preferred_name")
      .eq("user_id", user.id)
      .eq("status", "active")
      .is("removed_at", null),
  ]);
  if (!profile) notFound();
  const { data: signedPhoto } = profile.photo_path
    ? await supabase.storage
        .from("athlete_avatars")
        .createSignedUrl(profile.photo_path, 3600)
    : { data: null };
  const teamIds = [...new Set((athleteLinks ?? []).map((athlete) => athlete.team_id))];
  const athleteIds = (athleteLinks ?? []).map((athlete) => athlete.id);
  const [{ data: linkedTeams }, { data: sportsConsents }] = await Promise.all([
    teamIds.length > 0
      ? supabase.from("teams").select("id, name").in("id", teamIds)
      : Promise.resolve({ data: [] }),
    athleteIds.length > 0
      ? supabase
          .from("athlete_public_consents")
          .select("athlete_id, status")
          .eq("purpose", "public_sports_activity")
          .in("athlete_id", athleteIds)
      : Promise.resolve({ data: [] }),
  ]);
  const teamNameById = new Map((linkedTeams ?? []).map((team) => [team.id, team.name]));
  const consentByAthlete = new Map((sportsConsents ?? []).map((consent) => [consent.athlete_id, consent.status]));

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <Link
        href="/me/perfil"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-800"
      >
        <ArrowLeft className="size-4" aria-hidden /> Voltar ao perfil
      </Link>

      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
          Seus dados
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Editar perfil
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Atualize sua identidade esportiva, posições e privacidade.
        </p>
      </div>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <PlayerAvatarManager
          userId={user.id}
          playerName={profile.preferred_name || profile.display_name}
          photoUrl={signedPhoto?.signedUrl ?? null}
        />
      </section>

      <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <PlayerProfileForm
          profile={profile}
          positions={
            (positions ?? []) as Parameters<
              typeof PlayerProfileForm
            >[0]["positions"]
          }
          preferences={
            (preferences ?? []) as Parameters<
              typeof PlayerProfileForm
            >[0]["preferences"]
          }
        />
      </section>

      {athleteLinks && athleteLinks.length > 0 ? (
        <section aria-labelledby="sports-consent-title" className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Privacidade por time</p>
          <h2 id="sports-consent-title" className="mt-2 text-xl font-black">Aparecer nas escalações públicas</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Você decide em cada time. A autorização mostra apenas seu nome esportivo em divisões publicadas; telefone, perfil privado e resposta à chamada não aparecem.
          </p>
          {query.consent ? (
            <p role="status" className={`mt-4 rounded-xl p-3 text-sm font-semibold ${query.consent === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>
              {query.consent === "granted" ? "Autorização concedida." : query.consent === "revoked" ? "Autorização revogada. Seu nome deixa as próximas leituras públicas." : "Não foi possível atualizar a autorização."}
            </p>
          ) : null}
          <div className="mt-4 space-y-3">
            {athleteLinks.map((athlete) => {
              const granted = consentByAthlete.get(athlete.id) === "granted";
              return (
                <article key={athlete.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start gap-3">
                    <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${granted ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                      {granted ? <BadgeCheck className="size-5" aria-hidden /> : <ShieldOff className="size-5" aria-hidden />}
                    </span>
                    <div className="min-w-0">
                      <p className="font-black text-slate-900">{teamNameById.get(athlete.team_id) ?? "Seu time"}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{granted ? "Autorizado para escalações públicas." : "Seu nome não aparece nas escalações públicas."}</p>
                    </div>
                  </div>
                  <form action={updateMySportsActivityConsent} className="mt-3">
                    <input type="hidden" name="athleteId" value={athlete.id} />
                    <input type="hidden" name="granted" value={granted ? "false" : "true"} />
                    <input type="hidden" name="requestId" value={crypto.randomUUID()} />
                    <AsyncSubmitButton pendingLabel="Atualizando..." variant={granted ? "outline" : "default"} className="min-h-12 w-full">
                      {granted ? "Revogar autorização" : "Autorizar meu nome esportivo"}
                    </AsyncSubmitButton>
                  </form>
                </article>
              );
            })}
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden /> Recusar ou revogar não reduz seu acesso ao time e não altera sua confirmação.
          </p>
        </section>
      ) : null}

      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500">
        <ShieldCheck
          className="mt-0.5 size-4 shrink-0 text-emerald-700"
          aria-hidden
        />
        Telefone e dados privados não aparecem no perfil público.
      </p>
    </div>
  );
}
