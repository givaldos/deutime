-- R16 / WP-R16-01 — expansão inerte do novo invólucro de navegação.
-- A capacidade não entra no catálogo global até a migração das páginas e da
-- rota Mais terminar; portanto times atuais e novos permanecem no fallback.

alter type public.feature_key
  add value if not exists 'team_navigation_shell';
