import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  buildPublicEventShareData,
  PublicEventLinkCard,
} from "./public-event-link-card";

describe("PublicEventLinkCard", () => {
  it("oferece uma única ação de compartilhar sem expor um campo de cópia", () => {
    const html = renderToStaticMarkup(
      <PublicEventLinkCard
        publicUrl="https://deutime.app/e/evento-publico"
        eventTitle="Racha de terça"
      />,
    );

    expect(html).toContain("Compartilhe com a galera");
    expect(html).toContain("Compartilhar evento");
    expect(html).toContain("WhatsApp");
    expect(html).not.toContain("Copiar link público");
    expect(html).not.toContain("https://deutime.app/e/evento-publico");
  });

  it("envia contexto antes da URL em um único campo de texto", () => {
    expect(
      buildPublicEventShareData(
        "https://deutime.app/e/evento-publico",
        "Racha de terça",
      ),
    ).toEqual({
      title: "Racha de terça",
      text: "Confira Racha de terça no DeuTime.\nhttps://deutime.app/e/evento-publico",
    });
  });
});
