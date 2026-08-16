-- R10 / WP-R10-01 — enums isolados para deploy compatível.
-- Nenhum time é habilitado e nenhum consentimento é criado por esta expansão.
-- Os valores precisam ser commitados antes da migration seguinte referenciá-los.

alter type public.feature_key
  add value if not exists 'recognition';

alter type public.athlete_public_consent_purpose
  add value if not exists 'public_recognition_summary_v1';
