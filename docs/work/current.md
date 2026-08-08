---
release: R06
work_package: WP-R06-03
scope: match_conversation_moderation_retention
branch_or_commit: "dev"
checkpoint: CP5
status: idle
completed_ac:
  - "AC-R06-01"
  - "AC-R06-02"
  - "AC-R06-03"
  - "AC-R06-04"
  - "AC-R06-05"
  - "AC-R06-06"
  - "AC-R06-07"
  - "AC-R06-08"
  - "AC-R06-09"
  - "AC-R06-10"
dirty_files:
  - "docs/roadmap.md (alteração preexistente do usuário; fora do pacote)"
tests:
  - "npm run migrations:check -- origin/main HEAD: passou"
  - "npm run db:reset: passou"
  - "npm run db:lint: passou; somente 2 avisos preexistentes"
  - "npm run db:test: 34 arquivos, 802 testes passaram"
  - "pgTAP 034 focal: 30 testes passaram"
  - "testes focados: 5 arquivos, 23 testes passaram"
  - "npm run verify: lint, typecheck, 267 testes e build passaram"
  - "npm run security:audit: 0 vulnerabilidades"
  - "viewport 390x844: moderação sem overflow; ocultação, restauração e estado vazio passaram sem erro no console"
  - "produção: comments ativada somente no Demo Campo por RPC auditada"
  - "produção: partida demo finalizada e snapshot de conversa congelado com 12 atletas elegíveis"
  - "npm run smoke:production: passou após ativação; evento público não configurado"
  - "CP4 físico: criação, resposta, reabertura e sincronização passaram no iPhone e Android"
  - "CP4 físico: denúncia de comentário de outro autor persistiu aberta e vinculada a identidade verificada"
  - "CP4 físico: ocultação staff passou, resolveu a denúncia e registrou ator e motivo na auditoria"
  - "CP4 físico: restauração staff passou, reativou o conteúdo, descartou a denúncia resolvida e registrou auditoria"
  - "produção: rollback desligou comments em todos os times e preservou 5 comentários, 1 denúncia e 12 elegíveis"
  - "npm run smoke:production: passou após rollback; evento público não configurado"
  - "CP4 físico: fallback com comments desligada preservou placar e lances sem erro"
  - "CP4 físico: remoção pelo autor passou; 2 respostas foram marcadas como removidas e auditadas"
  - "produção: rollback final deixou 0 times com comments ativa e preservou 5 comentários e 1 denúncia"
  - "npm run smoke:production: passou após rollback final; evento público não configurado"
blocker: null
next_action: "Executar CP6: consolidar a conclusão de R06, definir o rollout futuro e limpar o checkpoint."
---

# Trabalho atual

A conversa privada e a moderação staff de R06 estão implementadas. O painel da
súmula lista somente denúncias abertas e conteúdo ocultado, exige motivo para
ocultar/restaurar e não projeta identidade do denunciante. O cron diário
existente executa a limpeza transacional depois de dois anos e devolve apenas
contadores; app e banco toleram as duas ordens de deploy.

O CP4 físico e o CP5 operacional foram concluídos. A terceira partida da Copa
do Mundo foi finalizada depois da ativação e congelou 12 atletas elegíveis, sem
backfill das partidas anteriores. Criação, resposta, denúncia, remoção,
ocultação/restauração e fallback passaram no iPhone e Android. O rollback final
deixou `comments` desligada em todos os times, com histórico e auditoria
preservados. A próxima ação é o fechamento documental de R06 em CP6.
