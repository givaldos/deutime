-- R09 / WP-R09-02 — novos comandos idempotentes do caminho de pontos corridos.
-- Valores de enum precisam ser confirmados antes de serem consumidos pela
-- migration seguinte, por isso esta expansão permanece isolada.

alter type public.championship_command_kind add value if not exists 'generate';
alter type public.championship_command_kind add value if not exists 'publish';
