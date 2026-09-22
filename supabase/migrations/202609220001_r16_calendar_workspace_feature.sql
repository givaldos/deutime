-- R16 / WP-R16-05 / CAL-01 — capacidade inerte do calendário de gestão.
-- A flag permanece fora de private.product_feature_keys() até o piloto CAL-05.

alter type public.feature_key
  add value if not exists 'calendar_workspace';
