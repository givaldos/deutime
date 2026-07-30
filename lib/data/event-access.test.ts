import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const state: {
    cookie: string | null;
    claims: {
      data: { claims: { sub?: string } | null };
      error: { code?: string; message?: string } | null;
    };
    rpcResults: Record<
      string,
      {
        data: unknown;
        error: { code?: string; message?: string } | null;
      }
    >;
  } = {
    cookie: null,
    claims: { data: { claims: null }, error: null },
    rpcResults: {},
  };

  const rpc = vi.fn(async (name: string) => {
    return state.rpcResults[name] ?? { data: null, error: null };
  });
  const getClaims = vi.fn(async () => state.claims);
  const createClient = vi.fn(async () => ({
    rpc,
    auth: { getClaims },
  }));
  const cookies = vi.fn(async () => ({
    get: vi.fn(() =>
      state.cookie ? { name: "dt_event_access", value: state.cookie } : null,
    ),
  }));

  return { state, rpc, getClaims, createClient, cookies };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));
vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}));

import {
  exchangeEventAccessCredential,
  getEventAccessContext,
  respondToEventFromAccess,
} from "./event-access";

const publicId = "b4000000-0000-4000-8000-000000000001";
const secret = "A".repeat(43);
const capabilitySecret = "B".repeat(43);
const accessRow = {
  public_id: publicId,
  athlete_display_name: "Atleta",
  attendance_status: "pending",
  event_status: "scheduled",
  can_respond: false,
  capability_expires_at: "2026-08-20T12:00:00.000Z",
};

describe("event access data boundary", () => {
  beforeEach(() => {
    mocks.state.cookie = null;
    mocks.state.claims = { data: { claims: null }, error: null };
    mocks.state.rpcResults = {};
    vi.clearAllMocks();
  });

  it("does not touch cookies or Supabase for an invalid public id", async () => {
    await expect(getEventAccessContext("../evento")).resolves.toEqual({
      context: null,
      clearInvalidCookie: false,
    });
    expect(mocks.cookies).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("resolves a valid path-scoped capability before identity", async () => {
    mocks.state.cookie = secret;
    mocks.state.rpcResults.resolve_event_capability = {
      data: [accessRow],
      error: null,
    };

    await expect(getEventAccessContext(publicId)).resolves.toMatchObject({
      context: {
        athleteDisplayName: "Atleta",
        attendanceStatus: "pending",
        source: "capability",
      },
      clearInvalidCookie: false,
    });
    expect(mocks.getClaims).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledWith("resolve_event_capability", {
      requested_public_id: publicId,
      requested_capability_secret: secret,
    });
  });

  it("falls through a stale cookie to an already verified device", async () => {
    mocks.state.cookie = "inválido";
    mocks.state.claims = {
      data: { claims: { sub: "user-1" } },
      error: null,
    };
    mocks.state.rpcResults.resolve_event_access_for_verified_session = {
      data: [accessRow],
      error: null,
    };

    await expect(getEventAccessContext(publicId)).resolves.toMatchObject({
      context: { source: "verified_session" },
      clearInvalidCookie: true,
    });
  });

  it("fails closed and requests cookie cleanup after revocation", async () => {
    mocks.state.cookie = secret;
    mocks.state.rpcResults.resolve_event_capability = {
      data: null,
      error: { code: "42501", message: "Acesso ao evento indisponível" },
    };

    await expect(getEventAccessContext(publicId)).resolves.toEqual({
      context: null,
      clearInvalidCookie: true,
    });
  });

  it("returns a one-time capability secret only for a valid exchange", async () => {
    mocks.state.rpcResults.exchange_event_access_credential = {
      data: [
        {
          capability_secret: capabilitySecret,
          capability_expires_at: "2026-08-20T12:00:00.000Z",
        },
      ],
      error: null,
    };

    await expect(
      exchangeEventAccessCredential(publicId, secret),
    ).resolves.toEqual({
      secret: capabilitySecret,
      expiresAt: "2026-08-20T12:00:00.000Z",
    });
    await expect(
      exchangeEventAccessCredential(publicId, "curto"),
    ).resolves.toBeNull();
    expect(mocks.createClient).toHaveBeenCalledTimes(1);
  });

  it("treats a missing N-1 RPC as unavailable without exposing the secret", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.state.rpcResults.exchange_event_access_credential = {
      data: null,
      error: { code: "PGRST202", message: "schema cache" },
    };

    await expect(
      exchangeEventAccessCredential(publicId, secret),
    ).resolves.toBeNull();
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("responds with the path-scoped capability without exposing it to the client", async () => {
    mocks.state.cookie = capabilitySecret;
    mocks.state.rpcResults.respond_to_event_from_access = {
      data: "confirmed",
      error: null,
    };

    await expect(
      respondToEventFromAccess(publicId, "confirmed"),
    ).resolves.toEqual({ outcome: "success", status: "confirmed" });
    expect(mocks.rpc).toHaveBeenCalledWith("respond_to_event_from_access", {
      requested_public_id: publicId,
      response_status: "confirmed",
      requested_capability_secret: capabilitySecret,
    });
  });

  it("delegates without a capability when a verified session is the fallback", async () => {
    mocks.state.rpcResults.respond_to_event_from_access = {
      data: "maybe",
      error: null,
    };

    await expect(respondToEventFromAccess(publicId, "maybe")).resolves.toEqual({
      outcome: "success",
      status: "maybe",
    });
    expect(mocks.rpc).toHaveBeenCalledWith("respond_to_event_from_access", {
      requested_public_id: publicId,
      response_status: "maybe",
    });
  });

  it("keeps a forwarded capability ahead of another verified account", async () => {
    mocks.state.cookie = capabilitySecret;
    mocks.state.claims = {
      data: { claims: { sub: "another-user" } },
      error: null,
    };
    mocks.state.rpcResults.respond_to_event_from_access = {
      data: "declined",
      error: null,
    };

    await expect(
      respondToEventFromAccess(publicId, "declined"),
    ).resolves.toEqual({ outcome: "success", status: "declined" });
    expect(mocks.rpc).toHaveBeenCalledWith("respond_to_event_from_access", {
      requested_public_id: publicId,
      response_status: "declined",
      requested_capability_secret: capabilitySecret,
    });
    expect(mocks.getClaims).not.toHaveBeenCalled();
  });

  it("fails closed before cookies for an invalid response request", async () => {
    await expect(
      respondToEventFromAccess("../evento", "confirmed"),
    ).resolves.toEqual({ outcome: "unavailable" });
    expect(mocks.cookies).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("treats an N-1 response RPC as read-only fallback", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.state.rpcResults.respond_to_event_from_access = {
      data: null,
      error: { code: "PGRST202", message: "schema cache" },
    };

    await expect(
      respondToEventFromAccess(publicId, "declined"),
    ).resolves.toEqual({ outcome: "unavailable" });
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("redacts the capability from unexpected response logs", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.state.cookie = capabilitySecret;
    mocks.state.rpcResults.respond_to_event_from_access = {
      data: null,
      error: { code: "XX000", message: `failure ${capabilitySecret}` },
    };

    await expect(
      respondToEventFromAccess(publicId, "declined"),
    ).resolves.toEqual({ outcome: "error" });
    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy.mock.calls.flat().join(" ")).not.toContain(capabilitySecret);
    errorSpy.mockRestore();
  });

  it("allows only a bounded provider code in structured logs", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.state.rpcResults.respond_to_event_from_access = {
      data: null,
      error: {
        code: capabilitySecret,
        message: "unexpected",
      },
    };

    await expect(
      respondToEventFromAccess(publicId, "maybe"),
    ).resolves.toEqual({ outcome: "error" });
    expect(errorSpy).toHaveBeenCalledWith(
      JSON.stringify({
        event: "event_access_boundary",
        boundary: "respond",
        outcome: "failed",
        code: "unknown",
      }),
    );
    expect(errorSpy.mock.calls.flat().join(" ")).not.toContain(capabilitySecret);
    errorSpy.mockRestore();
  });

  it("reports a redacted contract mismatch without accepting stale status", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.state.rpcResults.respond_to_event_from_access = {
      data: "confirmed",
      error: null,
    };

    await expect(
      respondToEventFromAccess(publicId, "maybe"),
    ).resolves.toEqual({ outcome: "error" });
    expect(errorSpy).toHaveBeenCalledWith(
      JSON.stringify({
        event: "event_access_boundary",
        boundary: "respond_result",
        outcome: "failed",
        code: "invalid_result",
      }),
    );
    errorSpy.mockRestore();
  });

  it.each([
    ["revoked capability", "42501", "Resposta ao evento indisponível"],
    ["missing N-1 contract", "PGRST202", "schema cache"],
  ])("fails %s closed without noisy logs", async (_case, code, message) => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.state.cookie = capabilitySecret;
    mocks.state.rpcResults.respond_to_event_from_access = {
      data: null,
      error: { code, message },
    };

    await expect(
      respondToEventFromAccess(publicId, "confirmed"),
    ).resolves.toEqual({ outcome: "unavailable" });
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
