-- R16 / WP-R16-04 / CMP-01 — capacidade inerte do acompanhamento de campeonatos.
-- A flag permanece fora de private.product_feature_keys() até o piloto CMP-05.

alter type public.feature_key
  add value if not exists 'clear_championship_workspace';
