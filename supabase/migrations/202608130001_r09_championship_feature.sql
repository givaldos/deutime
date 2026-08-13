-- R09 / WP-R09-01 — flag isolada para campeonatos.
-- Nenhum time é habilitado por esta expansão. O valor precisa ser commitado
-- antes da migration seguinte referenciá-lo.

alter type public.feature_key
  add value if not exists 'championships';
