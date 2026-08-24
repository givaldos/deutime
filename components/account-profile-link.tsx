import { Button } from "@/components/ui/button";
import { UserRound } from "lucide-react";
import Link from "next/link";

export function AccountProfileLink() {
  return (
    <Button asChild size="icon" variant="ghost">
      <Link href="/app/profile" aria-label="Editar perfil" title="Editar perfil">
        <UserRound aria-hidden />
      </Link>
    </Button>
  );
}
