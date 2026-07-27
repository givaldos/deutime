import { describe, expect, it } from "vitest";
import { findMigrationIntegrityErrors } from "./check-migration-integrity.mjs";

describe("integridade de migrations", () => {
  it("aceita somente migration nova com nome canônico", () => {
    expect(
      findMigrationIntegrityErrors(
        "A\tsupabase/migrations/202607270001_delivery_foundation.sql\n",
      ),
    ).toEqual([]);
  });

  it.each(["M", "D", "R100"])(
    "recusa status retroativo %s",
    (status) => {
      const suffix =
        status === "R100"
          ? "\tsupabase/migrations/202607270002_renamed.sql"
          : "";
      expect(
        findMigrationIntegrityErrors(
          `${status}\tsupabase/migrations/202607130001_initial_schema.sql${suffix}\n`,
        ),
      ).toHaveLength(1);
    },
  );

  it("recusa nome que não ordena migrations de forma determinística", () => {
    expect(
      findMigrationIntegrityErrors(
        "A\tsupabase/migrations/foundation.sql\n",
      ),
    ).toEqual(["Nome de migration inválido: supabase/migrations/foundation.sql"]);
  });
});

