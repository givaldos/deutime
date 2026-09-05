-- R14 / WP-R14-01 — controle inerte da criação por convite.

alter type public.runtime_control_key
  add value if not exists 'team_creation_invite_only';
