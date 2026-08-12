-- R08M / WP-R08M-01 — flag isolada para o cartão evolutivo.
-- Nenhum time é habilitado por esta expansão. O valor precisa ser commitado
-- antes da migration seguinte referenciá-lo.

alter type public.feature_key
  add value if not exists 'event_share_card';
