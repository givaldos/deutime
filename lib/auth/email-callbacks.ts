const TOKEN_HASH_PATTERN = /^[A-Za-z0-9_-]{32,256}$/;
const AUTH_CODE_PATTERN = /^[A-Za-z0-9._~-]{16,512}$/;

export function isValidEmailTokenHash(
  value: string | null | undefined,
): value is string {
  return typeof value === "string" && TOKEN_HASH_PATTERN.test(value);
}

export function isValidPkceAuthCode(
  value: string | null | undefined,
): value is string {
  return typeof value === "string" && AUTH_CODE_PATTERN.test(value);
}
