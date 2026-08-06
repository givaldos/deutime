-- R04 Piloto Demo Campo — ativação e validação CP4 (inerte até este script)
-- Rode no SQL Editor como owner/admin do time Demo Campo (troque demo_campo_id pelo UUID real)

-- 1) Ligar flag event_matches (desligada por padrão)
select set_team_feature_flag(
  (select id from teams where slug = 'demo-campo'),
  'event_matches'::public.feature_key,
  true
);

-- 2) Verificar flag
select team_id, feature, enabled from team_feature_flags
where team_id = (select id from teams where slug = 'demo-campo') and feature = 'event_matches';

-- 3) Criar 1ª partida padrão (se ainda não existe via backfill, cria ordinal 2)
select create_event_match(
  (select id from events where team_id = (select id from teams where slug='demo-campo') order by starts_at desc limit 1),
  null, 'Time A', 'Time B', null
);

-- 4) Criar 2ª partida com adversário externo (festival)
select create_event_match(
  (select id from events where team_id = (select id from teams where slug='demo-campo') order by starts_at desc limit 1),
  null, 'DeuTime', null, 'Unidos da Vila'
);

-- 5) Listar partidas e lados
select m.id, m.ordinal, m.status, m.public_mode, s.side_index, s.label
from event_matches m join match_sides s on s.match_id = m.id
where m.event_id = (select id from events where team_id = (select id from teams where slug='demo-campo') order by starts_at desc limit 1)
order by m.ordinal, s.side_index;

-- 6) Rollback (se precisar desligar piloto sem apagar dados)
-- select set_team_feature_flag((select id from teams where slug='demo-campo'), 'event_matches'::public.feature_key, false);
