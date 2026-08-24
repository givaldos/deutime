# Descoberta pós-R10 — próxima decisão

> Estado: primeiro snapshot concluído; sem promoção de release.

## Objetivo

Escolher uma única próxima frente entre produto, operação e dívida técnica a
partir de uso real, atrito repetido, risco ou retorno mensurável. O levantamento
não promove marketplace, pagamentos, migração de provedor nem outra vertical.

## Evidência permitida

- contagens globais em janelas móveis de 30 e 90 dias;
- proporções calculadas somente sobre grupos com pelo menos três ocorrências;
- incidentes e falhas por categoria fechada, nunca erro bruto;
- problemas relatados sem nome, telefone, time, evento, atleta ou identificador;
- smokes, sondas protegidas e histórico de rollback já registrados nas releases.

O snapshot SQL é somente leitura e está em
[`queries/post-r10-aggregate-snapshot.sql`](queries/post-r10-aggregate-snapshot.sql).
Ele devolve uma única linha, suprime qualquer contagem menor que três e não
seleciona colunas pessoais ou identificadores.

## Perguntas do levantamento

1. Quantos times demonstram uso repetido, medido por pelo menos dois eventos em
   90 dias?
2. O funil evento → resposta → partida encerrada tem densidade suficiente para
   justificar evolução de produto?
3. Há uso mensurável de WhatsApp e qual a taxa agregada de entrega?
4. Existe falha operacional recorrente ou dívida técnica com impacto maior que
   uma nova funcionalidade?
5. Há demanda explícita dos dois lados de um marketplace, sem inferir intenção
   a partir de cadastro ou visita?

## Registro de problemas reais

Cada problema entra apenas com estes campos:

| Campo | Regra |
|---|---|
| categoria | `produto`, `operação` ou `dívida técnica` |
| problema observado | descrição sem PII e sem conteúdo esportivo |
| frequência | quantidade agregada ou `menor que 3` |
| público afetado | papel genérico, como atleta ou organizador |
| impacto | tempo, falha, abandono, custo ou risco mensurável |
| fallback atual | caminho manual ou comportamento preservado |
| evidência | período e fonte agregada |

## Gate para uma próxima release

Uma frente só pode entrar em CP0 quando cumprir todos os itens:

- problema repetido em pelo menos três ocorrências independentes ou risco
  operacional grave comprovado;
- resultado demonstrável, métrica de sucesso e critério de parada;
- público afetado e dependências conhecidos;
- fallback e rollback definidos;
- privacidade, isolamento multi-time e custo avaliados;
- comparação explícita com não fazer agora.

Marketplace e pagamentos exigem adicionalmente demanda explícita de oferta e
procura, modelo de confiança, moderação, suporte, antifraude, tributação e LGPD.
Cadastro, visualização pública ou quantidade de times não contam como intenção
de contratar ou pagar.

## Próximo checkpoint

Acrescentar problemas reais já observados, sem PII, e repetir o snapshot quando
houver nova janela de uso. Se nenhuma frente cumprir o gate, manter a descoberta
como `sem promoção` e o produto estável.

## Snapshot de 24 de agosto de 2026

| Métrica agregada | Resultado |
|---|---:|
| times cadastrados | 4 |
| times criados em 30 dias | 4 |
| times ativos em 30 dias | menor que 3 |
| times com pelo menos dois eventos em 90 dias | menor que 3 |
| eventos não cancelados em 30 dias | 18 |
| respostas de presença em 30 dias | 31 |
| partidas explícitas finalizadas em 90 dias | 3 |
| atletas ativos | 17 |
| atletas ativos com identidade reivindicada | 4 |
| tentativas de WhatsApp em 30 dias | 9 |
| sucesso agregado do WhatsApp em 30 dias | 88,9% |

O uso existe, mas está concentrado em menos de três times ativos e repetentes.
Isso não comprova densidade de oferta e procura nem justifica marketplace,
pagamentos ou outra vertical. A decisão deste checkpoint é `sem promoção`.

## Problemas observados

| Categoria | Problema | Frequência | Impacto | Fallback | Evidência |
|---|---|---:|---|---|---|
| dívida técnica | Dependabot atualiza `codeql-action/init` e `analyze` em PRs separados, criando versões incompatíveis | 4 falhas em duas semanas | bloqueia as próprias atualizações de segurança | atualizar ambos manualmente no mesmo commit | execuções `32728093948`, `32728198188`, `32030785069` e `32030890655` |

O problema supera o mínimo de três ocorrências e autoriza uma correção técnica
estreita, não uma nova release de produto. O controle adotado agrupa todas as
actions do CodeQL no Dependabot, atualiza `init` e `analyze` juntas e testa que
SHA e versão permaneçam iguais.

Durante a execução, o editor anexou inicialmente um snippet histórico que pode
ter reativado a flag `team_division` de uma antiga coorte de piloto. A operação
foi imediatamente revertida pela mesma RPC auditada, e a pós-sonda confirmou a
flag desligada, a página pública preservada e os fatos existentes intactos.
