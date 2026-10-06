import { BrandMark } from "@/components/brand-mark";
import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh bg-[#f7faf5] text-[#0d2b22] lg:grid lg:grid-cols-[.9fr_1.1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#0d2b22] p-12 text-[#f7faf5] lg:flex xl:p-16" aria-label="Sobre o DeuTime">
        <BrandMark inverted />
        <div className="relative py-20">
          <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-[#bdf63c]">Do primeiro convite ao pós-jogo</p>
          <p className="max-w-md font-display text-5xl font-medium leading-[1.06] tracking-[-.05em] xl:text-6xl">Quem organiza também merece <span className="text-[#bdf63c]">jogar.</span></p>
          <p className="mt-7 max-w-sm text-base leading-8 text-[#c4d3c9]">Agenda, confirmações, equipes e resultados no mesmo lugar. Mais clareza para cuidar do racha.</p>
          <div className="mt-10 flex items-center gap-2 text-sm text-[#c4d3c9]"><Check size={17} className="text-[#bdf63c]" aria-hidden="true" /> No celular, sem instalar aplicativo.</div>
        </div>
        <p className="text-xs text-[#c4d3c9]">deutime.app</p>
      </aside>
      <main className="flex min-h-svh flex-col px-5 py-5 sm:px-10 sm:py-8">
        <Link href="/" className="inline-flex min-h-11 w-fit items-center gap-2 rounded text-sm text-[#52665b] hover:text-[#0d2b22]"><ArrowLeft size={16} aria-hidden="true" /> Voltar ao início</Link>
        <div className="flex flex-1 flex-col items-center justify-center py-8 sm:py-12">
          <header className="mb-7 text-center lg:hidden"><BrandMark className="justify-center" /><p className="mt-3 text-sm text-[#52665b]">Seu racha, organizado.</p></header>
          <div className="flex w-full justify-center">{children}</div>
        </div>
      </main>
    </div>
  );
}
