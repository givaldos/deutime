"use client";

import {
  updateMyAccountEmail,
  updateMyAccountPassword,
  type AccountAccessState,
} from "@/app/app/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  Mail,
} from "lucide-react";
import { useActionState } from "react";

const initialState: AccountAccessState = {};

function Feedback({ state }: { state: AccountAccessState }) {
  if (!state.message) return null;

  return (
    <p
      role={state.outcome === "error" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-xl p-3 text-sm font-semibold ${
        state.outcome === "success"
          ? "bg-emerald-50 text-emerald-800"
          : "bg-red-50 text-red-800"
      }`}
    >
      {state.outcome === "success" ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
      ) : null}
      {state.message}
    </p>
  );
}

export function AccountAccessForm({ currentEmail }: { currentEmail: string }) {
  const [emailState, emailAction, emailPending] = useActionState(
    updateMyAccountEmail,
    initialState,
  );
  const [passwordState, passwordAction, passwordPending] = useActionState(
    updateMyAccountPassword,
    initialState,
  );

  return (
    <div className="space-y-8">
      <form action={emailAction} className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Mail className="size-5" aria-hidden />
          </span>
          <div>
            <h3 className="font-black text-graphite">E-mail de acesso</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Atual: <span className="font-semibold text-slate-700">{currentEmail}</span>
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="accountEmail">Novo e-mail</Label>
          <Input
            id="accountEmail"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
            aria-invalid={Boolean(emailState.errors?.email)}
            aria-describedby={
              emailState.errors?.email ? "accountEmail-error" : "accountEmail-help"
            }
          />
          <p id="accountEmail-help" className="text-xs leading-5 text-slate-500">
            A alteração só entra em vigor depois das confirmações de segurança.
          </p>
          {emailState.errors?.email?.[0] ? (
            <p id="accountEmail-error" className="text-sm font-medium text-red-700">
              {emailState.errors.email[0]}
            </p>
          ) : null}
        </div>

        <Feedback state={emailState} />
        <Button
          type="submit"
          className="w-full sm:w-auto"
          disabled={emailPending}
          aria-busy={emailPending}
        >
          {emailPending ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
          {emailPending ? "Solicitando..." : "Alterar e-mail"}
        </Button>
      </form>

      <div className="border-t border-slate-200" />

      <form action={passwordAction} className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
            <KeyRound className="size-5" aria-hidden />
          </span>
          <div>
            <h3 className="font-black text-graphite">Senha</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Confirme a senha atual antes de definir uma nova.
            </p>
          </div>
        </div>

        <PasswordField
          id="currentPassword"
          name="currentPassword"
          label="Senha atual"
          autoComplete="current-password"
          error={passwordState.errors?.currentPassword?.[0]}
        />
        <PasswordField
          id="newPassword"
          name="password"
          label="Nova senha"
          autoComplete="new-password"
          error={passwordState.errors?.password?.[0]}
        />
        <PasswordField
          id="repeatPassword"
          name="repeatPassword"
          label="Repita a nova senha"
          autoComplete="new-password"
          error={passwordState.errors?.repeatPassword?.[0]}
        />
        <p className="text-xs leading-5 text-slate-500">
          Use pelo menos 12 caracteres, incluindo maiúscula, minúscula, número e símbolo.
        </p>

        <Feedback state={passwordState} />
        <Button
          type="submit"
          className="w-full sm:w-auto"
          disabled={passwordPending}
          aria-busy={passwordPending}
        >
          {passwordPending ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
          {passwordPending ? "Atualizando..." : "Alterar senha"}
        </Button>
      </form>
    </div>
  );
}

function PasswordField({
  id,
  name,
  label,
  autoComplete,
  error,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  error?: string;
}) {
  const errorId = `${id}-error`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type="password"
        autoComplete={autoComplete}
        minLength={name === "currentPassword" ? 1 : 12}
        maxLength={128}
        required
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      />
      {error ? (
        <p id={errorId} className="text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
