import { describe, expect, it } from "vitest";

import {
  EVENT_ACCESS_COOKIE_NAME,
  eventAccessCookiePath,
  isEventAccessSecret,
  readEventAccessFragment,
} from "./contract";

const publicId = "b4000000-0000-4000-8000-000000000001";
const secret = "A".repeat(43);

describe("event access browser contract", () => {
  it("accepts only a 256-bit base64url secret", () => {
    expect(isEventAccessSecret(secret)).toBe(true);
    expect(isEventAccessSecret(`${secret}=`)).toBe(false);
    expect(isEventAccessSecret("A".repeat(42))).toBe(false);
    expect(isEventAccessSecret(`${"A".repeat(42)}+`)).toBe(false);
  });

  it("reads one isolated credential parameter from the fragment", () => {
    expect(readEventAccessFragment(`#c=${secret}`)).toEqual({
      hadCredential: true,
      credential: secret,
    });
    expect(readEventAccessFragment(`#c=${secret}&c=${secret}`)).toEqual({
      hadCredential: true,
      credential: null,
    });
    expect(readEventAccessFragment(`#c=${secret}&utm_source=whatsapp`)).toEqual({
      hadCredential: true,
      credential: null,
    });
  });

  it("does not treat unrelated fragments as credentials", () => {
    expect(readEventAccessFragment("#detalhes")).toEqual({
      hadCredential: false,
      credential: null,
    });
    expect(readEventAccessFragment("")).toEqual({
      hadCredential: false,
      credential: null,
    });
  });

  it("scopes the opaque cookie to the canonical event path", () => {
    expect(EVENT_ACCESS_COOKIE_NAME).toBe("dt_event_access");
    expect(eventAccessCookiePath(publicId)).toBe(`/e/${publicId}`);
    expect(eventAccessCookiePath("../outro")).toBe("/e");
  });
});
