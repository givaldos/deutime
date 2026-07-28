"use client";

import { Button, type ButtonProps } from "@/components/ui/button";
import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

type AsyncSubmitButtonProps = ButtonProps & {
  pendingLabel: string;
  iconOnly?: boolean;
};

export function AsyncSubmitButton({
  children,
  disabled,
  iconOnly = false,
  pendingLabel,
  ...props
}: AsyncSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      {...props}
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
    >
      {pending ? (
        <>
          <LoaderCircle className="animate-spin" aria-hidden />
          <span className={iconOnly ? "sr-only" : undefined}>{pendingLabel}</span>
        </>
      ) : (
        children
      )}
    </Button>
  );
}
