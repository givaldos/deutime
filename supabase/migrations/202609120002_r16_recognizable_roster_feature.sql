-- R16 / WP-R16-03 / ATH-01 — a capacidade nasce inerte.
-- Ela permanece fora de private.product_feature_keys() até o piloto ATH-05.

alter type public.feature_key
  add value if not exists 'recognizable_roster';
