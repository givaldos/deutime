---
release: R03
work_package: WP-R03-01
scope: whatsapp_enqueue_claim_contract
branch_or_commit: "e611666"
checkpoint: idle
status: ready_for_review
completed_ac:
  - "AC-R03-01"
dirty_files:
  - "docs/decisions/DEC-WHATSAPP-DISPATCH-SAFETY.md"
  - "docs/decisions/DEC-WHATSAPP-PROVIDER.md"
  - "docs/releases/R03-whatsapp-ponta-a-ponta.md"
  - "docs/product-context.md"
  - "docs/architecture.md"
  - "docs/security.md"
  - "docs/work/current.md"
tests:
  - "Contrato confrontado com a outbox, os estados e os kill switches existentes"
  - "Semântica de Message create, SID e callbacks confrontada com a documentação oficial Twilio"
  - "Compatibilidade N/N-1 e preservação do segredo R02 revisadas documentalmente"
blocker: null
next_action: "Implementar a expansão forward-only e os pgTAPs de WP-R03-01, mantendo whatsapp_delivery, integration_produce e integration_consume desligados."
---

# Trabalho atual

O CP1 de `WP-R03-01` está fechado. Enqueue, dedupe, claim, preparo, ack, nack,
callback e recuperação possuem contratos explícitos. O segredo R02 não entra na
outbox: nasce no preparo transacional, permanece apenas como hash no banco e
existe em claro somente na memória do worker.

Como a criação de mensagem da API clássica não documenta idempotência definida
pela aplicação, uma barreira separa retry seguro de efeito externo. Timeout,
queda ou lease vencido depois da barreira exigem revisão manual e nunca são
reenviados automaticamente.

Nenhuma migration, integração, template, flag ou efeito externo foi produzido.
A próxima fatia pode criar a expansão de banco inerte e seus pgTAPs sem aguardar
o teste temporal restante da R02. A ativação do envio continua bloqueada até a
R02 fechar e o piloto da R03 cumprir seus próprios gates.

As alterações locais do usuário em `docs/backlog.md` e `docs/roadmap.md`
permanecem separadas.
