# Pacotes de release

Cada arquivo desta pasta é o contexto operacional autossuficiente de uma release prestes a ser executada. O roadmap mantém o horizonte completo; aqui ficam somente releases ativas ou próximas o bastante para terem contratos confiáveis. Evidências antigas podem ser movidas para [`evidence/`](evidence/) quando começarem a ocultar contrato, riscos e trabalho atual; a execução não carrega esse arquivo salvo para auditoria, regressão ou passagem de checkpoint.

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
| [R01 — Evento sob controle](R01-evento-sob-controle.md) | `completed` | Edição, remarcação e cancelamento entregues |
| [R02 — Confirmação pelo link](R02-confirmacao-pelo-link.md) | `completed` | Confirmação persistente pelo mesmo link entregue |
| [R03 — WhatsApp ponta a ponta](R03-whatsapp-ponta-a-ponta.md) | `completed` | Envio, callback e operação pelo sender oficial entregues |
| [R03R — Lembretes econômicos](R03R-lembretes-economicos.md) | `completed` | Duas cotas configuráveis, envio manual e automático idempotente entregues |
| [R04 — Partida ao vivo e pós-jogo](R04-partida-ao-vivo-e-pos-jogo.md) | `completed` | Súmula por partida, placar, timeline e privacidade entregues |
| [R05 — Craque da Galera](R05-craque-da-galera.md) | `completed` | Voto anônimo, resultado agregado e retenção entregues |
| [R06 — Conversa da súmula](R06-conversa-da-sumula.md) | `completed` | Conversa privada, moderação, retenção e validação física entregues |
| [R07 — Times reutilizáveis e divisão compartilhável](R07-times-manuais-compartilhaveis.md) | `completed` | Equipes internas, sugestão, publicação e jornada por toque entregues |
| [R08M — Fechamento do MVP compartilhável](R08M-fechamento-mvp-compartilhavel.md) | `completed` | Open Graph por fase e gate integrado do MVP concluídos |
| [R09 — Campeonatos e tabela](R09-campeonatos-e-tabela.md) | `completed` | Três formatos, página pública, piloto, sonda agregada e CP6 concluídos |
| [R10 — Reconhecimento positivo](R10-reconhecimento-positivo.md) | `done` | Visão privada, resumo consentido, piloto, smokes e rollback concluídos em CP6 |
| [R12 — Confiança e autonomia](R12-confianca-e-autonomia.md) | `ready` | CP0 fechado; próxima execução começa pelas correções públicas e de interface |

Uma release só recebe arquivo próprio quando a anterior estabilizar seus contratos. Ao promovê-la, adicione-a também ao dropdown do template de issue. Isso evita abrir trabalho sem pacote, reduz especificação prematura e limita o contexto mantido.

Use [`_template.md`](_template.md) para promover uma nova release.
