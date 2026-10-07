"use client";

import { lookupBatchCommand } from "@/app/app/[teamSlug]/batch-actions";
import { batchPreviewEnvelopeSchema, type BatchPreviewEnvelope } from "@/lib/validation/batch-operations";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

const pendingSchema = z.object({
  requestId: z.uuid(),
  preview: batchPreviewEnvelopeSchema,
});

type Pending = z.infer<typeof pendingSchema>;
type LookupState = "checking" | "unknown" | "error" | "applied" | null;

function storageKey(teamId: string, domain: "events" | "athletes") {
  return `deutime:batch:${domain}:${teamId}`;
}

export function minimalPreview(preview: BatchPreviewEnvelope): BatchPreviewEnvelope {
  return {
    ...preview,
    items: preview.items.map((item) => ({ id: item.id, version: item.version })),
  };
}

export function useBatchRecovery(teamId: string, domain: "events" | "athletes") {
  const [pending, setPending] = useState<Pending | null>(null);
  const [lookupState, setLookupState] = useState<LookupState>(null);
  const [appliedCount, setAppliedCount] = useState<number | null>(null);
  const [expired, setExpired] = useState(false);
  const key = storageKey(teamId, domain);

  const check = useCallback(async (command: Pending) => {
    setLookupState("checking");
    setExpired(Date.parse(command.preview.expires_at) <= Date.now());
    try {
      const result = await lookupBatchCommand({ teamId, domain, requestId: command.requestId });
      if (result.status === "applied") {
        try { sessionStorage.removeItem(key); } catch { /* storage may be unavailable */ }
        setPending(null);
        setAppliedCount(result.appliedCount);
      }
      setLookupState(result.status);
      return result.status;
    } catch {
      setLookupState("error");
      return "error";
    }
  }, [domain, key, teamId]);

  useEffect(() => {
    let active = true;
    let saved: string | null = null;
    try { saved = sessionStorage.getItem(key); } catch { return; }
    if (!saved) return;
    try {
      const parsed = pendingSchema.safeParse(JSON.parse(saved));
      if (!parsed.success || parsed.data.preview.domain !== domain) {
        sessionStorage.removeItem(key);
        return;
      }
      queueMicrotask(() => {
        if (!active) return;
        setPending(parsed.data);
        void check(parsed.data);
      });
    } catch {
      sessionStorage.removeItem(key);
    }
    return () => { active = false; };
  }, [check, domain, key]);

  function remember(requestId: string, preview: BatchPreviewEnvelope) {
    const command = { requestId, preview: minimalPreview(preview) };
    setPending(command);
    setLookupState(null);
    setExpired(false);
    try { sessionStorage.setItem(key, JSON.stringify(command)); } catch { /* retry remains available in this page */ }
  }

  function complete() {
    try { sessionStorage.removeItem(key); } catch { /* storage may be unavailable */ }
    setPending(null);
    setLookupState(null);
  }

  function dismissExpired() {
    if (!pending || Date.parse(pending.preview.expires_at) > Date.now() || lookupState !== "unknown") return;
    complete();
  }

  return { pending, lookupState, appliedCount, expired, remember, complete, check, dismissExpired };
}
