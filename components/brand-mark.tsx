import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

export function BrandMark({
  href = "/",
  compact = false,
  inverted = false,
  className,
}: {
  href?: string;
  compact?: boolean;
  inverted?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="DeuTime"
      className={cn(
        "group inline-flex shrink-0 items-center rounded-xl focus-visible:ring-offset-white",
        className,
      )}
    >
      <Image
        src={
          compact
            ? "/brand/icone-app-deutime.svg"
            : inverted
              ? "/brand/logo-deutime-fundo-escuro.svg"
              : "/brand/logo-deutime.svg"
        }
        alt=""
        width={compact ? 512 : 580}
        height={compact ? 512 : 140}
        priority={href === "/"}
        className={cn(
          compact
            ? "size-10 rounded-[0.85rem] shadow-sm"
            : "h-auto w-[9.5rem] sm:w-[10.5rem]",
        )}
      />
    </Link>
  );
}
