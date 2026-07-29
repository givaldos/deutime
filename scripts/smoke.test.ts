import {
  runProductionSmoke,
  validatePublicEventId,
} from "./smoke.mjs";
import { describe, expect, it, vi } from "vitest";

const publicEventId = "fdf577af-5cc4-489f-81cb-65fac548167b";

function htmlResponse(
  status = 200,
  headers: Record<string, string> = {},
) {
  return new Response("<!doctype html><html></html>", {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      ...headers,
    },
  });
}

describe("smoke de produção", () => {
  it("mantém o smoke básico quando o evento público não foi configurado", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(htmlResponse());

    await expect(
      runProductionSmoke({
        mode: "production-readonly",
        appUrl: "https://deutime.app",
        fetchImpl,
      }),
    ).resolves.toEqual({ publicEventChecked: false });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("verifica página pública e bloqueio de GET no endpoint de troca", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(htmlResponse())
      .mockResolvedValueOnce(htmlResponse())
      .mockResolvedValueOnce(
        htmlResponse(200, {
          "cache-control": "private, no-store, max-age=0",
          "referrer-policy": "no-referrer",
          "x-robots-tag": "noindex, nofollow, noarchive",
        }),
      )
      .mockResolvedValueOnce(
        new Response(null, {
          status: 405,
          headers: {
            "referrer-policy": "no-referrer",
            "x-content-type-options": "nosniff",
          },
        }),
      );

    await expect(
      runProductionSmoke({
        mode: "production-readonly",
        appUrl: "https://deutime.app",
        publicEventId,
        fetchImpl,
      }),
    ).resolves.toEqual({ publicEventChecked: true });

    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(fetchImpl.mock.calls[2]?.[0]).toEqual(
      new URL(`https://deutime.app/e/${publicEventId}`),
    );
    expect(fetchImpl.mock.calls[3]?.[1]).toMatchObject({
      method: "GET",
      redirect: "manual",
    });
  });

  it("alerta quando a política segura do evento regrede", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(htmlResponse())
      .mockResolvedValueOnce(htmlResponse())
      .mockResolvedValueOnce(htmlResponse());

    await expect(
      runProductionSmoke({
        mode: "production-readonly",
        appUrl: "https://deutime.app",
        publicEventId,
        fetchImpl,
      }),
    ).rejects.toThrow(
      `/e/${publicEventId} não retornou cache-control contendo no-store.`,
    );
  });

  it("recusa modo de escrita e identificador não canônico", async () => {
    await expect(
      runProductionSmoke({
        mode: "production-write",
        appUrl: "https://deutime.app",
        fetchImpl: vi.fn(),
      }),
    ).rejects.toThrow("SMOKE_MODE deve ser production-readonly.");

    expect(() => validatePublicEventId("../auth/login")).toThrow(
      "SMOKE_PUBLIC_EVENT_ID deve ser um UUID canônico.",
    );
  });
});
