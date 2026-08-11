import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PublicEventLinkCard } from "./public-event-link-card";

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
});
