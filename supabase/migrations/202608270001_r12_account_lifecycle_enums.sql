-- R12 / WP-R12-03 — enums em transação própria para compatibilidade PostgreSQL.

alter type public.runtime_control_key
  add value if not exists 'account_autonomy';

create type public.account_closure_status as enum (
  'auth_pending',
  'completed'
);

create type public.lifecycle_authorization_purpose as enum (
  'close_team',
  'close_account'
);
