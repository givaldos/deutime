import { confirmEmail } from "@/app/auth/confirm/actions";
import { ClearConfirmationUrl } from "@/app/auth/confirm/clear-confirmation-url";
import { CompletePkceConfirmation } from "@/app/auth/confirm/complete-pkce-confirmation";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  isValidEmailTokenHash,
  isValidPkceAuthCode,
} from "@/lib/auth/email-callbacks";
import { safeInternalPath } from "@/lib/security/redirects";
import { redirect } from "next/navigation";

type ConfirmPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ConfirmPage({ searchParams }: ConfirmPageProps) {
  const params = await searchParams;
  const tokenHash = firstValue(params.token_hash);
  const type = firstValue(params.type);
  const code = firstValue(params.code);
  const next = safeInternalPath(firstValue(params.next) ?? null);

  if (!tokenHash && !type && isValidPkceAuthCode(code)) {
    return (
      <AuthShell>
        <CompletePkceConfirmation nextPath={next} />
      </AuthShell>
    );
  }

  if (!isValidEmailTokenHash(tokenHash) || type !== "email") {
    redirect("/auth/error");
  }

  return (
    <AuthShell>
      <ClearConfirmationUrl />
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Confirme seu e-mail</CardTitle>
            <CardDescription>Um último passo para proteger sua conta.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              Toque no botão abaixo para concluir a confirmação e entrar com
              segurança.
            </p>
            <form action={confirmEmail} className="mt-5">
              <input type="hidden" name="token_hash" value={tokenHash} />
              <input type="hidden" name="type" value="email" />
              <input type="hidden" name="next" value={next} />
              <Button type="submit" className="w-full">
                Confirmar e-mail
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}
