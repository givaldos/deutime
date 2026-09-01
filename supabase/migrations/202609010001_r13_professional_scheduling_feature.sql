-- R13 / WP-R13-01 — expansão inerte da agenda profissional.
-- A capacidade futura não entra em private.product_feature_keys(), portanto
-- não herda o rollout global já ativo nem é ligada para times novos.

alter type public.feature_key
  add value if not exists 'professional_scheduling';
