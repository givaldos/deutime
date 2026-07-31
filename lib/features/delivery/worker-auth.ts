import { createHash, timingSafeEqual } from "node:crypto";

export function isAuthorizedWorkerRequest(
  authorizationHeader: string | null,
  configuredSecret: string | undefined,
) {
  if (!configuredSecret || configuredSecret.length < 32) return false;
  if (!authorizationHeader?.startsWith("Bearer ")) return false;

  const presented = authorizationHeader.slice("Bearer ".length);
  if (!presented || presented.includes(" ")) return false;

  return timingSafeEqual(hash(presented), hash(configuredSecret));
}

function hash(value: string) {
  return createHash("sha256").update(value).digest();
}
