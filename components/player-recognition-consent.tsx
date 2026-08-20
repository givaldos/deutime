import { updateMyRecognitionSummaryConsent } from "@/app/me/actions";
import { AsyncSubmitButton } from "@/components/ui/async-submit-button";
import { BadgeCheck, ShieldCheck, ShieldOff, Sparkles } from "lucide-react";

type RecognitionConsentLink = {
  athleteId: string;
  teamName: string;
  granted: boolean;
};

type PlayerRecognitionConsentProps = {
  links: RecognitionConsentLink[];
  status?: string;
};

export function PlayerRecognitionConsent({
  links,
  status,
}: PlayerRecognitionConsentProps) {
  if (!links.length) return null;
  const statusIsSuccess = status === "granted" || status === "revoked";

  return (
    <section
      aria-labelledby="recognition-consent-title"
      className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
    >
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
        Reconhecimentos
      </p>
      <h2
        id="recognition-consent-title"
        className="mt-2 text-xl font-black"
      >
        Publicar meu resumo positivo
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Você decide em cada time. O perfil mostra somente os totais de gols,
        assistências e Craques da Galera reconhecidos — nunca partida, data,
        voto, colocação ou ranking.
      </p>

      {status ? (
        <p
          role="status"
          className={`mt-4 rounded-xl p-3 text-sm font-semibold ${
            statusIsSuccess
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {status === "granted"
            ? "Resumo público autorizado."
            : status === "revoked"
              ? "Publicação interrompida. O resumo já não aparece no perfil público."
              : "Não foi possível atualizar essa escolha."}
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        {links.map((link) => (
          <article
            key={link.athleteId}
            className="rounded-2xl border border-slate-200 p-4"
          >
            <div className="flex items-start gap-3">
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                  link.granted
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {link.granted ? (
                  <BadgeCheck className="size-5" aria-hidden />
                ) : (
                  <Sparkles className="size-5" aria-hidden />
                )}
              </span>
              <div className="min-w-0">
                <p className="font-black text-slate-900">{link.teamName}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {link.granted
                    ? "Totais positivos publicados no seu perfil."
                    : "Seus reconhecimentos continuam somente privados."}
                </p>
              </div>
            </div>

            <form
              action={updateMyRecognitionSummaryConsent}
              className="mt-3"
            >
              <input type="hidden" name="athleteId" value={link.athleteId} />
              <input
                type="hidden"
                name="granted"
                value={link.granted ? "false" : "true"}
              />
              <input
                type="hidden"
                name="requestId"
                value={crypto.randomUUID()}
              />
              <AsyncSubmitButton
                pendingLabel="Atualizando..."
                variant={link.granted ? "outline" : "default"}
                className="min-h-12 w-full"
              >
                {link.granted
                  ? "Parar de publicar o resumo"
                  : "Publicar meu resumo"}
              </AsyncSubmitButton>
            </form>
          </article>
        ))}
      </div>

      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500">
        {links.some((link) => link.granted) ? (
          <ShieldCheck
            className="mt-0.5 size-4 shrink-0 text-emerald-700"
            aria-hidden
          />
        ) : (
          <ShieldOff
            className="mt-0.5 size-4 shrink-0 text-slate-500"
            aria-hidden
          />
        )}
        Recusar ou revogar não altera sua visão privada nem seu acesso ao time.
      </p>
    </section>
  );
}
