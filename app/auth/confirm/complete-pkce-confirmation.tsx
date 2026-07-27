"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function CompletePkceConfirmation({
  nextPath,
}: {
  nextPath: string;
}) {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function complete() {
      try {
        // createBrowserClient detects the PKCE code in the current URL,
        // exchanges it and persists the resulting session in cookies during
        // initialization.
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!active) return;

        if (session) {
          router.replace(nextPath);
          router.refresh();
          return;
        }
      } catch {
        if (!active) return;
      }

      // The confirmation itself already happened at the auth provider. A PKCE
      // session cannot be recovered when the email was opened in another
      // browser, so guide the user to sign in instead of claiming the link failed.
      const loginParams = new URLSearchParams({
        confirmed: "1",
        next: nextPath,
      });
      router.replace(`/auth/login?${loginParams.toString()}`);
    }

    void complete();

    return () => {
      active = false;
    };
  }, [nextPath, router]);

  return (
    <div className="w-full max-w-sm">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Concluindo seu acesso</CardTitle>
        </CardHeader>
        <CardContent>
          <p
            role="status"
            className="flex items-center gap-3 text-sm leading-6 text-muted-foreground"
          >
            <LoaderCircle className="size-5 animate-spin" aria-hidden />
            Confirmando seu e-mail e preparando o ambiente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
