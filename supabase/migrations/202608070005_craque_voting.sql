-- R05 draft — voto anônimo do Craque da Galera (inativo até DEC-ANONYMOUS-RETENTION accepted e flag craque_voting)
-- Mantém contagem sem re-identificação; recibo opaco 256 bits para auditoria do próprio votante.

create type public.craque_vote_status as enum ('counted','revoked');

create table if not exists public.craque_votes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.event_matches(id) on delete cascade,
  team_id uuid not null,
  voter_hash text not null check (char_length(voter_hash)=64), -- sha256 hex do voter_athlete_id + salt
  candidate_athlete_id uuid not null references public.athletes(id) on delete restrict,
  receipt_token_hash text not null check (char_length(receipt_token_hash)=64),
  created_at timestamptz not null default now(),
  unique (match_id, voter_hash),
  foreign key (match_id, team_id) references public.event_matches(id, team_id) on delete cascade
);

create table if not exists public.craque_vote_receipts (
  token_hash text primary key check (char_length(token_hash)=64),
  vote_id uuid not null references public.craque_votes(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.craque_votes enable row level security;
alter table public.craque_vote_receipts enable row level security;
revoke all on public.craque_votes from public, anon, authenticated;
revoke all on public.craque_vote_receipts from public, anon, authenticated;
grant select on public.craque_votes to authenticated;
-- anon não lê votos; apenas agregado via RPC futura

comment on table public.craque_votes is 'R05 draft: voto único anônimo por match, voter_hash com salt rotativo, retenção 90d depois anonimiza.';
