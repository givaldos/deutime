-- R16 / WP-R16-02 / LIST-01 — a capacidade nasce inerte.
-- Ela permanece fora de private.product_feature_keys() até o piloto LIST-05.

alter type public.feature_key
  add value if not exists 'complete_management_lists';
