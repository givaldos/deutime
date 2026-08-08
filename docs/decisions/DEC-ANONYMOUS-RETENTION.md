# DEC-ANONYMOUS-RETENTION — Retenção de votos e recibos anônimos (R05/R06)

- Status: accepted
- Data: 2026-08-08
- Release: R05 (Craque da Galera), R06 (Conversa)
- Dependências: LGPD, INV-PRIVATE-BY-DEFAULT
- Aceita em: R04 piloto validado + R05 draft `202608080001`

## Contexto
Voto do Craque é anônimo e imutável, mas precisa de recibo auditável para o próprio votante confirmar que votou sem revelar em quem. Comentários são identificados e moderáveis. Precisamos definir descarte e retenção sem criar re-identificação.

## Decisão
- Cédula `craque_votes`: `id, match_id, team_id, voter_hash, candidate_athlete_id, receipt_token_hash, created_at` — `voter_hash` = SHA-256(salt rotativo + `voter_athlete_id`), permitindo verificar “já votou” sem listar quem votou em quem. Retenção 90 dias após `finalized`, depois anonimização irreversível (apaga hash, mantém contagem).
- Recibo: token opaco de 256 bits entregue ao votante, válido 7 dias (`craque_vote_receipts.expires_at`), permite `GET /vote/receipt/{token}` retornar só “voto computado” sem candidato.
- Comentários: retenção 2 anos ou até remoção do time, com soft-delete e auditoria.

## Alternativas
1. Guardar voter em claro — simples mas permite re-identificação por staff com acesso ao banco.
2. Não guardar recibo — perde auditabilidade para o atleta.

## Consequências
- Totais públicos nunca revelam voto individual; `COUNT` por candidato permanece.
- Staff vê apenas agregado + “você já votou” para o próprio atleta via hash.

## Validação
- pgTAP: voto duplicado falha 23505, voto fora da janela 55000, cross-tenant 42501, recontagem após retenção mantém total.
