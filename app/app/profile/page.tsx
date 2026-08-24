import { AccountProfileForm } from "@/components/account-profile-form";
import { BrandMark } from "@/components/brand-mark";
import { LogoutButton } from "@/components/logout-button";
import { Button } from "@/components/ui/button";
import {
  AppContainer,
  PageHeader,
  SectionHeader,
  Surface,
} from "@/components/ui/app-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Mail, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";

export default async function AccountProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: profile, error: profileError }, { data: playerProfile }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("player_profiles")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  if (profileError || !profile) {
    throw new Error("Não foi possível carregar seu perfil.");
  }

  return (
    <main className="app-canvas min-h-screen pb-10">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-3xl items-center justify-between px-4 sm:px-6">
          <BrandMark href="/app" compact />
          <LogoutButton />
        </div>
      </header>

      <AppContainer narrow>
        <Button asChild variant="ghost" className="-ml-3 min-h-11">
          <Link href="/app">
            <ArrowLeft aria-hidden /> Voltar
          </Link>
        </Button>

        <PageHeader
          eyebrow="Minha conta"
          title="Editar perfil"
          description="Mantenha seus dados pessoais atualizados após entrar no DeuTime."
        />

        <Surface>
          <AccountProfileForm displayName={profile.display_name} />
        </Surface>

        <Surface className="space-y-5">
          <SectionHeader
            icon={ShieldCheck}
            title="Acesso à conta"
            description="O identificador de acesso não muda junto com o nome do perfil."
          />
          {user.email ? (
            <div className="space-y-2">
              <Label htmlFor="accountEmail">E-mail verificado</Label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <Input
                  id="accountEmail"
                  value={user.email}
                  className="bg-slate-50 pl-10 text-slate-600"
                  readOnly
                  aria-readonly="true"
                />
              </div>
              <p className="text-xs leading-5 text-slate-500">
                A troca do e-mail exige uma nova confirmação de segurança.
              </p>
            </div>
          ) : (
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
              Sua conta usa um acesso verificado sem e-mail cadastrado.
            </p>
          )}
        </Surface>

        {playerProfile ? (
          <Surface className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <SectionHeader
              icon={UserRound}
              title="Perfil de atleta"
              description="Foto, nome no futebol, posições e privacidade continuam na área esportiva."
            />
            <Button asChild variant="outline" className="min-h-11 shrink-0">
              <Link href="/me/perfil/editar">Editar perfil esportivo</Link>
            </Button>
          </Surface>
        ) : null}
      </AppContainer>
    </main>
  );
}
