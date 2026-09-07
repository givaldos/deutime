-- R15 CP1 — novo comando nasce inerte até o consumidor chamar a RPC.
alter type public.championship_command_kind
  add value if not exists 'finish_setup';
