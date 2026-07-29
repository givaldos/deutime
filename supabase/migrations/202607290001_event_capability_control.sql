-- O valor precisa ser publicado antes do contrato que o referencia.
-- O controle nasce desligado e não altera o comportamento do app N-1.

alter type public.runtime_control_key
  add value if not exists 'event_capability_exchange';
