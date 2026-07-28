"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LoaderCircle, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logout = async () => {
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError("Não foi possível sair agora.");
      setPending(false);
      return;
    }
    router.replace("/auth/login");
    router.refresh();
  };

  return (
    <div className="flex flex-col items-end">
      <Button
        onClick={logout}
        size="sm"
        variant="ghost"
        aria-label="Sair da conta"
        aria-busy={pending}
        disabled={pending}
        className="px-3 text-slate-500"
      >
        {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <LogOut aria-hidden />}
        <span className="hidden sm:inline">{pending ? "Saindo..." : "Sair"}</span>
      </Button>
      {error ? (
        <p role="alert" className="mt-1 text-xs font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
