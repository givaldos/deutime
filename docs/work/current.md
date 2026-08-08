---
release: R06
work_package: WP-R06-01
scope: match_conversation_contract
branch_or_commit: "dev@50c7646"
checkpoint: CP0
status: idle
completed_ac: []
dirty_files: []
tests:
  - "CP0 documental: decisão, audiência, retenção, riscos, entrypoints e critérios fechados"
blocker: null
next_action: "Criar a migration 202608080005 com snapshot privado, comentários/respostas, denúncia e RPCs mínimas; manter comments desligada e provar RLS/cross-tenant no pgTAP 033."
---

# Trabalho atual

R05 está concluída em produção no commit `50c7646`; `main` e `dev` estão
sincronizadas, o smoke passou e `voting` permanece desligada.

R06 está pronta. `DEC-CONVERSATION-LIFETIME` fecha escrita por sete dias,
leitura privada durante a retenção de dois anos, identidade completa obrigatória
e ausência de token próprio da conversa. Staff ativo e atletas do snapshot
SIM/TALVEZ formam a audiência; capability, anônimo e vínculos removidos falham
fechado.

O primeiro pacote é somente expansão inerte: schema, snapshot independente da
votação, RPCs e pgTAP. Nenhuma interface deve consumir o contrato antes de o
banco N aceitar o app N−1 e a flag `comments` continuar desligada.
