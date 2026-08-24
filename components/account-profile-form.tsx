"use client";

import {
  updateMyAccountProfile,
  type AccountProfileState,
} from "@/app/app/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, LoaderCircle, UserRound } from "lucide-react";
import { useActionState } from "react";

const initialState: AccountProfileState = {};

export function AccountProfileForm({ displayName }: { displayName: string }) {
  const [state, formAction, pending] = useActionState(
    updateMyAccountProfile,
    initialState,
  );
  const displayNameError = state.errors?.displayName?.[0];

  return (
    <form action={formAction} className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
          <UserRound className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-black text-graphite">Sua identidade</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Este nome identifica você dentro dos times que administra.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="displayName">Nome completo</Label>
        <Input
          id="displayName"
          name="displayName"
          defaultValue={displayName}
          minLength={2}
          maxLength={100}
          autoComplete="name"
          required
          aria-invalid={Boolean(displayNameError)}
          aria-describedby={displayNameError ? "displayName-error" : undefined}
        />
        {displayNameError ? (
          <p id="displayName-error" className="text-sm font-medium text-red-700">
            Informe um nome entre 2 e 100 caracteres.
          </p>
        ) : null}
      </div>

      {state.message ? (
        <p
          role={state.outcome === "error" ? "alert" : "status"}
          className={`flex items-center gap-2 rounded-xl p-3 text-sm font-semibold ${
            state.outcome === "success"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {state.outcome === "success" ? (
            <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          ) : null}
          {state.message}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="w-full bg-emerald-700 hover:bg-emerald-800 sm:w-auto"
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
        {pending ? "Salvando..." : "Salvar alterações"}
      </Button>
    </form>
  );
}
