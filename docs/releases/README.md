# Pacotes de release

Cada arquivo desta pasta é o contexto autossuficiente de uma release prestes a ser executada. O roadmap mantém o horizonte completo; aqui ficam somente releases ativas ou próximas o bastante para terem contratos confiáveis.

## Estados

- `discovery`: apenas pacotes `DP-*` podem fechar decisão, protótipo ou threat model; implementação ainda não começou;
- `draft`: resultado conhecido, decisões ainda abertas;
- `ready`: Definition of Ready satisfeita;
- `active`: única release em implementação naquela frente;
- `pilot`: disponível para coorte controlada;
- `done`: entregue com evidências;
- `blocked`: impedimento externo ou decisão registrada.

## Pacotes atuais

| Pacote | Estado inicial | Papel |
|---|---|---|
| [R00 — Fundação de entrega](R00-fundacao-de-entrega.md) | `done` | Fundação local + produção validada; melhorias não bloqueadoras estão no backlog técnico |
| [R01 — Evento sob controle](R01-evento-sob-controle.md) | `ready` | CP0 concluído; próximo passo é fechar o contrato técnico de fuso, comandos e versão |
| [R02 — Confirmação pelo link](R02-confirmacao-pelo-link.md) | `draft` | Entrega o primeiro ciclo WhatsApp-first sem automação |
| [R03 — WhatsApp ponta a ponta](R03-whatsapp-ponta-a-ponta.md) | `active` | Worker em dry-run pronto; próximo passo é callback assinado e operação |

R04 em diante só recebe arquivo próprio quando a release anterior estabilizar seus contratos. Ao promover uma delas, adicione-a também ao dropdown do template de issue. Isso evita abrir trabalho sem pacote, reduz especificação prematura e limita o contexto mantido.

Use [`_template.md`](_template.md) para promover uma nova release.
