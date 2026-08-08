import { AppContainer } from "@/components/ui/app-shell";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/dal";
import { verifyCraqueVoteReceipt } from "@/lib/data/craque";
import { craqueReceiptTokenSchema } from "@/lib/features/craque/validation";
import { ArrowLeft, BadgeCheck, ShieldCheck, ShieldX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function CraqueReceiptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await requireUser();
  const parsed = craqueReceiptTokenSchema.safeParse((await params).token);
  const valid = parsed.success
    ? await verifyCraqueVoteReceipt(parsed.data)
    : false;

  return (
    <AppContainer narrow>
      <Link
        href="/me/agenda"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-800"
      >
        <ArrowLeft className="size-4" aria-hidden /> Voltar à agenda
      </Link>

      <section className="app-surface p-6 text-center sm:p-8">
        <div
          className={`mx-auto grid size-14 place-items-center rounded-2xl ${
            valid
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {valid ? (
            <BadgeCheck className="size-7" aria-hidden />
          ) : (
            <ShieldX className="size-7" aria-hidden />
          )}
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-wider text-emerald-700">
          Recibo do Craque da Galera
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight">
          {valid ? "Voto computado" : "Recibo indisponível"}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
          {valid
            ? "Este recibo confirma somente que um voto foi computado. Ele não revela o atleta escolhido."
            : "O recibo é inválido ou já expirou. O voto computado não é alterado por isso."}
        </p>
        <div className="mx-auto mt-5 flex max-w-md items-start gap-2 rounded-2xl bg-slate-50 p-4 text-left text-xs leading-5 text-slate-500">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden />
          A diretoria e outros atletas não recebem acesso à sua escolha por esta página.
        </div>
        <Button asChild className="mt-6 w-full sm:w-auto">
          <Link href="/me/agenda">Ir para minha agenda</Link>
        </Button>
      </section>
    </AppContainer>
  );
}
