# DEC-ANONYMOUS-RETENTION — Retenção de votos e recibos anônimos (R05/R06)

- Status: draft
- Data: 2026-08-07
- Release: R05 (Craque da Galera), R06 (Conversa)
- Dependências: LGPD, INV-PRIVATE-BY-DEFAULT

## Contexto
Voto do Craque é anônimo e imutável, mas precisa de recibo auditável para o próprio votante confirmar que votou sem revelar em quem. Comentários são identificados e moderáveis. Precisamos definir descarte e retenção sem criar re-identificação.

## Decisão proposta
- Cédula `craque_votes`: `id, match_id, team_id, voter_athlete_id (hash?), candidate_athlete_id, created_at` — `voter_athlete_id` armazenado como hash com salt rotativo, permitindo verificar “já votou” sem listar quem votou em quem. Retenção 90 dias após `finalized`, depois anonimização irreversible (apaga hash, mantém contagem).
- Recibo: token opaco de 256 bits entregue ao votante, válido 7 dias, permite `GET /vote/receipt/{token}` retornar só “voto computado” sem candidato.
- Comentários: retenção 2 anos ou até remoção do time, com soft-delete e auditoria.

## Alternativas
1. Guardar voter em claro — simples mas permite re-identificação por staff com acesso ao banco.
2. Não guardar recibo — perde auditabilidade para o atleta.

## Consequências
- Totais públicos nunca revelam voto individual; `COUNT` por candidato permanece.
- Staff vê apenas agregado + “você já votou” para o próprio atleta via hash.

## Validação
- pgTAP: voto duplicado falha 23505, voto fora da janela 55000, cross-tenant 42501, recontagem após retenção mantém total.
