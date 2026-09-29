-- R16 / WP-R16-06 / BAT-01 — capacidade inerte de operações em lote.
-- A flag permanece fora de private.product_feature_keys() até o piloto BAT-05.

alter type public.feature_key
  add value if not exists 'batch_operations';
