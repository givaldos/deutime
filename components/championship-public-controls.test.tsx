import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildChampionshipShareData,
  ChampionshipPublicControls,
} from "./championship-public-controls";

const props = {
  teamId: "cb000000-0000-4000-8000-000000000001",
  teamSlug: "liga-a",
  championshipId: "cb000000-0000-4000-8000-000000000002",
  publicId: "cb000000-0000-4000-8000-000000000003",
  publicUrl: "https://deutime.app/c/cb000000-0000-4000-8000-000000000003",
  championshipName: "Copa da Vila",
} as const;

describe("ChampionshipPublicControls", () => {
  it("publica a página privada sem mostrar o endereço antes da intenção", () => {
    const html = renderToStaticMarkup(
      <ChampionshipPublicControls {...props} publicMode="private" />,
    );
    expect(html).toContain("Publicar página");
    expect(html).toContain("placares já autorizados");
    expect(html).not.toContain(props.publicUrl);
  });

  it("oferece compartilhar, abrir e recolher quando já publicada", () => {
    const html = renderToStaticMarkup(
      <ChampionshipPublicControls {...props} publicMode="public" />,
    );
    expect(html).toContain("Compartilhar campeonato");
    expect(html).toContain("Abrir página");
    expect(html).toContain("Recolher página pública");
    expect(html).toContain(`/c/${props.publicId}`);
  });

  it("monta mensagem pronta para colar no WhatsApp", () => {
    expect(buildChampionshipShareData(props.publicUrl, props.championshipName)).toEqual({
      title: "Copa da Vila",
      text: `Acompanhe Copa da Vila no DeuTime.\n${props.publicUrl}`,
    });
  });
});
