import {
  runProductionSmoke,
  validatePublicEventId,
} from "./smoke.mjs";
import { describe, expect, it, vi } from "vitest";

const publicEventId = "fdf577af-5cc4-489f-81cb-65fac548167b";

function htmlResponse(
  status = 200,
  headers: Record<string, string> = {},
  body = "<!doctype html><html></html>",
) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      ...headers,
    },
  });
}

function imageResponse() {
  return new Response(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), {
    status: 200,
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=300, stale-while-revalidate=3600",
      "referrer-policy": "no-referrer",
      "x-robots-tag": "noindex, nofollow, noimageindex",
      "x-content-type-options": "nosniff",
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
        }, `<link rel="canonical" href="/e/${publicEventId}">`),
      )
      .mockResolvedValueOnce(
        new Response(null, {
          status: 405,
          headers: {
            "referrer-policy": "no-referrer",
            "x-content-type-options": "nosniff",
          },
        }),
      )
      .mockResolvedValueOnce(imageResponse())
      .mockResolvedValueOnce(imageResponse());

    await expect(
      runProductionSmoke({
        mode: "production-readonly",
        appUrl: "https://deutime.app",
        publicEventId,
        fetchImpl,
      }),
    ).resolves.toEqual({ publicEventChecked: true });

    expect(fetchImpl).toHaveBeenCalledTimes(6);
    expect(fetchImpl.mock.calls[2]?.[0]).toEqual(
      new URL(`https://deutime.app/e/${publicEventId}`),
    );
    expect(fetchImpl.mock.calls[3]?.[1]).toMatchObject({
      method: "GET",
      redirect: "manual",
    });
    expect(fetchImpl.mock.calls[4]?.[0]).toEqual(
      new URL(`https://deutime.app/e/${publicEventId}/convite.png`),
    );
    expect(fetchImpl.mock.calls[5]?.[1]).toMatchObject({ method: "HEAD" });
  });

  it("exige versão opaca quando o cartão evolutivo está ativo", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(htmlResponse())
      .mockResolvedValueOnce(htmlResponse())
      .mockResolvedValueOnce(
        htmlResponse(
          200,
          {
            "cache-control": "private, no-store, max-age=0",
            "referrer-policy": "no-referrer",
            "x-robots-tag": "noindex, nofollow, noarchive",
          },
          `<link rel="canonical" href="/e/${publicEventId}"><meta property="og:image" content="/e/${publicEventId}/convite.png?v=0123456789ab">`,
        ),
      )
      .mockResolvedValueOnce(
        new Response(null, {
          status: 405,
          headers: {
            "referrer-policy": "no-referrer",
            "x-content-type-options": "nosniff",
          },
        }),
      )
      .mockResolvedValueOnce(imageResponse())
      .mockResolvedValueOnce(imageResponse());

    await expect(
      runProductionSmoke({
        mode: "production-readonly",
        appUrl: "https://deutime.app",
        publicEventId,
        expectEventShareCardEnabled: true,
        fetchImpl,
      }),
    ).resolves.toEqual({ publicEventChecked: true });
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

  it("alerta quando uma URL assinada vaza no HTML público", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(htmlResponse())
      .mockResolvedValueOnce(htmlResponse())
      .mockResolvedValueOnce(
        htmlResponse(
          200,
          {
            "cache-control": "private, no-store, max-age=0",
            "referrer-policy": "no-referrer",
            "x-robots-tag": "noindex, nofollow, noarchive",
          },
          `<link rel="canonical" href="/e/${publicEventId}"><img src="https://storage.example/logo.webp?token=capacidade-assinada">`,
        ),
      );

    await expect(
      runProductionSmoke({
        mode: "production-readonly",
        appUrl: "https://deutime.app",
        publicEventId,
        fetchImpl,
      }),
    ).rejects.toThrow(
      `/e/${publicEventId} publicou segredo em HTML ou metadata.`,
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
