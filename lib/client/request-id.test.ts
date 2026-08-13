import { afterEach, describe, expect, it, vi } from "vitest";

import { createRequestId } from "./request-id";

describe("createRequestId", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("preserva crypto.randomUUID quando disponível", () => {
    const randomUUID = vi.fn(() => "10000000-0000-4000-8000-000000000001");
    vi.stubGlobal("crypto", { randomUUID, getRandomValues: vi.fn() });

    expect(createRequestId()).toBe("10000000-0000-4000-8000-000000000001");
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  it("gera UUID v4 com getRandomValues em origem HTTP privada", () => {
    const getRandomValues = vi.fn((bytes: Uint8Array) => {
      bytes.fill(0xab);
      return bytes;
    });
    vi.stubGlobal("crypto", { getRandomValues });

    const requestId = createRequestId();

    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(getRandomValues).toHaveBeenCalledOnce();
  });
});
