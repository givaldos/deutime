-- R09 / WP-R09-04 — recibo idempotente da publicação da página compartilhável.
-- O valor fica separado porque enums novos só podem ser usados após o commit.

alter type public.championship_command_kind
  add value if not exists 'set_public_mode';
