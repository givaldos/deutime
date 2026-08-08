---
id: R05
type: vertical
status: active
outcome: "Permitir que cada atleta elegível vote uma vez no Craque da Galera e veja um resultado agregado sem revelar a cédula individual."
depends_on:
  - R04
baseline:
  - BASE-IDENTITY
  - BASE-ATTENDANCE
  - BASE-WRITES
verified_at: "dev"
decisions:
  - DEC-CROWD-STAR
  - DEC-ANONYMOUS-RETENTION
invariants:
  - INV-RLS-MULTI-TIME
  - INV-DEPLOY-COMPATIBLE
  - INV-HISTORICAL-EVENTS
  - INV-PRIVATE-BY-DEFAULT
  - INV-SINGLE-SOURCE
  - INV-POSITIVE-GAMIFICATION
  - INV-MANUAL-FALLBACK
---

# R05 — Craque da Galera

## Resultado demonstrável

Depois que a partida termina, quem respondeu SIM ou TALVEZ no snapshot pode
escolher uma pessoa que realmente participou. Cada eleitor vota uma vez, pode
votar em si, recebe confirmação sem o nome escolhido e não precisa expor sua
cédula à diretoria. Quando a janela fecha, a página mostra somente totais e
percentuais agregados.

## Três tempos

### Passado a preservar

- R02 mantém identidade verificada, capability limitada ao evento e fallback
  para sessão completa;
- R04 fornece partida finalizada e participação real por confronto;
- `event_attendance` diferencia SIM, NÃO, TALVEZ, pendência e lista de espera;
- `voting` já existe como feature flag tipada e nasce desligada;
- a súmula continua útil quando a votação está indisponível.

### Presente a resolver

- congelar SIM/TALVEZ no encerramento sem expor o snapshot ao cliente;
- derivar identidade e pseudônimo do eleitor no servidor, nunca do formulário;
- restringir candidatos a participantes reais e impedir cross-tenant;
- emitir recibo opaco sem candidato e abrir resultado somente após a janela;
- executar descarte de recibos e anonimização conforme a decisão de retenção.

### Futuro compatível

- R10 pode reutilizar o resultado fechado como reconhecimento positivo;
- múltiplas categorias, ranking negativo e mudança de voto ficam fora;
- comentários e reações pertencem à R06 e não ampliam a cédula.

## Escopo

### Incluído

- snapshot privado de eleitores SIM/TALVEZ;
- candidatos derivados de `match_participations`;
- voto único e imutável, com autovoto permitido;
- janela encerrada no máximo 12 horas após o jogo;
- recibo opaco válido por sete dias;
- resultado agregado depois do fechamento;
- retenção de 90 dias para o pseudônimo do eleitor;
- flag `voting`, auditoria mínima, RLS e fallback sem votação.

### Fora

- revelar ou exportar voto individual;
- permitir staff votar sem também ser atleta elegível;
- editar, transferir ou justificar voto;
- pontos, prêmio material, ranking de ausência ou punição;
- push/WhatsApp específico de votação nesta release.

## Contratos e decisões

`DEC-CROWD-STAR` define eleitor, candidato, autovoto, janela e resultado.
[`DEC-ANONYMOUS-RETENTION`](../decisions/DEC-ANONYMOUS-RETENTION.md) define
pseudônimo, recibo e descarte. O UUID do eleitor nunca entra na cédula; a RPC
deriva um hash SHA-256 com salt aleatório privado por partida.

A assinatura publicada em `202608080001` aceitava hashes do cliente e não
interrompia usuário inelegível. `202608080002` revoga essa assinatura antes de
qualquer UI, cria a versão segura com dois IDs públicos e mantém `voting`
desligada. Nenhum app N−1 consome a assinatura revogada.

## Entry points

- banco: `craque_votes`, `craque_vote_receipts`,
  `private.craque_vote_eligibility`, `private.craque_vote_salts` e migrations
  `202608070005`, `202608080001`, `202608080002`;
- aplicação: `lib/features/craque/validation.ts`, `lib/data/craque.ts`, Action
  em `/me/agenda/[eventId]` e componente mobile de voto;
- testes: `supabase/tests/032_craque_voting.test.sql` e testes Vitest focados;
- documentação: decisões de voto/retenção, segurança e este pacote.

## Pacotes de trabalho

| Pacote | Critérios | Entry points | Validação |
|---|---|---|---|
| `WP-R05-01` — contrato seguro | `AC-R05-01` a `06`, `08`, `10` | migration 002, RPC, snapshot e pgTAP 032 | `VAL-DB`, negativo e cross-tenant |
| `WP-R05-02` — voto mobile | `AC-R05-01` a `07`, `10` | Action, DAL e página do evento | `VAL-APP`, Android/iPhone |
| `WP-R05-03` — resultado e retenção | `AC-R05-06` a `10` | agregação, recibo, cleanup e runbook | `VAL-PUBLIC`, tempo e rollback |

## Critérios de aceite

- [x] `AC-R05-01` — Somente SIM/TALVEZ do snapshot da partida pode votar.
- [x] `AC-R05-02` — Somente participação real da mesma partida aparece como candidata.
- [x] `AC-R05-03` — Cada eleitor vota uma vez, o voto é imutável e autovoto funciona.
- [x] `AC-R05-04` — A janela fecha no máximo 12 horas após o jogo e falha fechado fora dela.
- [x] `AC-R05-05` — Cliente não fornece identidade/hash do eleitor e staff não relaciona cédula a pessoa pela aplicação.
- [x] `AC-R05-06` — Recibo de 256 bits confirma somente que o voto foi computado, expira em sete dias e não revela candidato.
- [ ] `AC-R05-07` — Resultado fica oculto durante a votação e depois mostra apenas quantidade e percentual.
- [x] `AC-R05-08` — RLS, grants, RPC e FKs negam acesso direto, anônimo, inelegível e cross-tenant.
- [ ] `AC-R05-09` — Recibos expiram e pseudônimo do eleitor é removido após 90 dias sem alterar totais.
- [x] `AC-R05-10` — Flag desligada preserva a súmula sem votação e rollback não apaga votos computados.

## Riscos e controles

| Risco | Controle | Evidência |
|---|---|---|
| eleitor escolhe hashes e vota várias vezes | hash derivado em RPC com salt privado | pgTAP duplicidade e assinatura antiga revogada |
| usuário inelegível atravessa ramo de autorização | exceção explícita e snapshot privado | negativo SIM/TALVEZ/PENDENTE |
| candidato de outro time ou não participante | participação + FKs compostas | pgTAP cross-tenant |
| contagem parcial influencia voto | resultado indisponível até o fechamento | teste temporal |
| recibo revela escolha | token separado retorna somente confirmação | teste de contrato |
| voto vira ranking negativo | somente reconhecimento agregado positivo | revisão de produto |

## Validação

```bash
npm run migrations:check
npm run db:reset
npm run db:lint
npm run db:test
npm run db:types
npm run verify
npm run security:audit
```

## Rollout, fallback e rollback

- `voting` permanece desligada por padrão;
- migration segura e testes entram antes da Action consumidora;
- piloto usa somente time e atletas demo após o resultado fechado;
- fallback oculta o bloco de votação e preserva a súmula;
- rollback desliga `voting`, revoga o consumidor e conserva votos/recibos;
- app novo tolera RPC ausente como indisponível e app antigo não consome a
  assinatura revogada.

## Evidências e checkpoint

### `WP-R05-01` — CP1 concluído

- divergência `main`/`dev` sincronizada antes da correção;
- assinatura insegura identificada antes da UI e substituída forward-only;
- eleitor, hash, recibo, flag, janela e candidato passam a ser derivados ou
  revalidados pelo banco;
- migration `202608080002` aplicada na recomposição integral do banco local;
- pgTAP focado: 27/27; suíte completa: 32 arquivos e 686 testes;
- aplicação: 39 arquivos e 221 testes, lint, typecheck e build aprovados;
- `npm audit`: zero vulnerabilidades após overrides transitivos compatíveis;
- `db:lint`: sem alerta novo da R05; permanecem dois avisos legados fora do
  pacote;
- próxima ação: `WP-R05-02`, Action e interface mobile de votação com flag
  desligada.

### `WP-R05-02` — CP2 concluído

- o formulário provisório foi removido da área administrativa; atleta vota em
  `/me/agenda/[eventId]`, onde o vínculo global já foi verificado;
- a Action envia à RPC somente `match_id` e `candidate_athlete_id`; identidade,
  salt e hashes continuam exclusivos do banco;
- a leitura mínima retorna apenas elegibilidade, “já votou” e fechamento;
  candidatos vêm de `match_participations` e a cédula nunca é consultável;
- o estado de sucesso aparece imediatamente no topo do bloco e não repete o
  nome escolhido; o recibo autenticado confirma somente “voto computado”;
- flag `voting` desligada omite completamente o bloco e mantém súmula/agenda;
- banco recomposto com 55 migrations; pgTAP focado 40/40 e suíte completa 32
  arquivos/699 testes;
- aplicação: 40 arquivos/227 testes, lint, typecheck, build e auditoria
  aprovados;
- próxima ação: `WP-R05-03`, resultado agregado fechado e retenção automática.
