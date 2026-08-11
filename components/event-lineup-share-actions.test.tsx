import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EventLineupShareActions } from "./event-lineup-share-actions";

describe("EventLineupShareActions", () => {
  it("mantém compartilhar, baixar e copiar como alternativas mobile", () => {
    const html = renderToStaticMarkup(
      <EventLineupShareActions
        eventTitle="Treino semanal"
        eventUrl="https://deutime.app/e/b4000000-0000-4000-8000-000000000001"
        imageUrl="https://deutime.app/e/b4000000-0000-4000-8000-000000000001/convite.png?revision=2"
      />,
    );
    expect(html).toContain("Compartilhar imagem");
    expect(html).toContain("Baixar");
    expect(html).toContain("Copiar link");
    expect(html).toContain("revision=2");
    expect(html).not.toContain("capability");
  });
});
