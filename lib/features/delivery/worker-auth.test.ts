import { describe, expect, it } from "vitest";
import { isAuthorizedWorkerRequest } from "./worker-auth";

const secret = "worker-secret-with-at-least-32-characters";

describe("autenticação do worker", () => {
  it("aceita somente o bearer configurado", () => {
    expect(isAuthorizedWorkerRequest(`Bearer ${secret}`, secret)).toBe(true);
    expect(isAuthorizedWorkerRequest("Bearer incorreto", secret)).toBe(false);
  });

  it("falha fechado sem configuração forte ou com formato inválido", () => {
    expect(isAuthorizedWorkerRequest(`Bearer ${secret}`, undefined)).toBe(false);
    expect(isAuthorizedWorkerRequest(`Bearer ${secret}`, "curto")).toBe(false);
    expect(isAuthorizedWorkerRequest(secret, secret)).toBe(false);
    expect(isAuthorizedWorkerRequest(null, secret)).toBe(false);
  });
});
