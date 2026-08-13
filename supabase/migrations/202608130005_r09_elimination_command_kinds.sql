-- R09 / WP-R09-03 — novos recibos idempotentes para classificação e avanço.
-- Os valores ficam em migration própria porque enums novos só podem ser usados
-- depois do commit que os adiciona.

alter type public.championship_command_kind add value if not exists 'decide_qualifier';
alter type public.championship_command_kind add value if not exists 'advance';
alter type public.championship_command_kind add value if not exists 'resolve';
alter type public.championship_command_kind add value if not exists 'release_fixture';
alter type public.championship_command_kind add value if not exists 'withdraw';
