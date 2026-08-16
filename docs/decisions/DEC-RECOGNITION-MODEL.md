# DEC-RECOGNITION-MODEL — Reconhecimento positivo derivado de fatos esportivos

- Status: proposed
- Data: 2026-08-15
- Release: R10
- Responsáveis: produto e engenharia do DeuTime

## Contexto

O DeuTime já possui participação real, súmula corrigível, estatísticas derivadas,
resultado agregado do Craque da Galera e consentimentos próprios por finalidade.
Ainda não existe um contrato para transformar essas fontes em reconhecimento sem
criar contador paralelo, reidentificar voto ou incentivar comparação entre
pessoas.

Em 2026-08-15, a leitura protegida de homologação encontrou duas partidas
finalizadas e três participações reais, mas nenhum voto, consentimento esportivo
ou time com `voting` ativa. A decisão precisa, portanto, separar o contrato
seguro da autorização de implementar: o modelo pode ser proposto e testado, mas
R10 continua em descoberta até existir compreensão e sinal de demanda na coorte.

## Opções consideradas

1. **Livro de pontos com pesos por gol, assistência, presença e Craque:** permite
   progressão e comparação, porém cria um segundo contador, exige pesos ainda
   arbitrários e tende a transformar fatos positivos em ranking de habilidade.
2. **Selos ou elogios concedidos manualmente por staff e atletas:** parece mais
   humano, mas não possui fonte autoritativa, amplia moderação e permite pressão,
   favoritismo e abuso.
3. **Cartões factuais derivados de catálogo fechado:** projeta somente fatos já
   finalizados e o resultado agregado do Craque, sem pontos, nota, série ou
   ordenação entre pessoas. Correções na fonte alteram a projeção.
4. **Estacionar toda a vertical:** mantém o produto atual e elimina o risco, mas
   não testa se uma apresentação privada e factual resolve a necessidade de
   reconhecimento.

## Decisão proposta

Adotar a opção 3 apenas como contrato e protótipo da descoberta. Nenhum schema,
flag, RPC, Action, interface de produção ou efeito externo está autorizado até
que a validação da coorte aceite esta decisão ou estacione R10.

### Fonte e catálogo `recognition-v1`

O catálogo inicial contém somente:

| Código | Fonte autoritativa | Condição |
|---|---|---|
| `goal_recorded` | `match_events` | gol atribuído à pessoa em partida finalizada e não invalidado por correção |
| `assist_recorded` | `match_events.assist_athlete_id` | assistência atribuída à pessoa em partida finalizada e não invalidada por correção |
| `crowd_star` | resultado fechado de `get_craque_vote_result` | pessoa empatada na maior contagem positiva após o fechamento |

Participação real é pré-condição, não reconhecimento próprio. Cartões, ausência,
atraso, derrota, posição na tabela, sequência, nota e inferência de habilidade
ficam fora. Categoria nova exige versão nova do catálogo e evidência de demanda;
pesos retroativos não existem.

Cada item é identificável conceitualmente por
`team_id + athlete_id + source_kind + source_id + catalog_version`. A projeção
não cria um saldo mutável: replay da mesma fonte produz o mesmo item, e uma
correção ou reversão na fonte remove ou atualiza o cartão na leitura. A versão
`v1` alcança somente partidas finalizadas depois da ativação futura da feature
naquele time, evitando premiação retroativa inesperada.

### Pertencimento, audiência e consentimento

- todo item pertence ao vínculo `athlete_id + team_id`; não existe registro
  global gravável por um time;
- a visão privada reúne somente vínculos ativos ligados à sessão global
  verificada e mantém a origem por time visível;
- staff não concede, edita ou publica reconhecimento pela pessoa;
- o perfil público exige a finalidade própria e versionada
  `public_recognition_summary_v1`, desligada por padrão e independente de
  `public_player_profile` e `public_sports_activity`;
- a projeção pública soma apenas categorias consentidas em cada vínculo. Não
  publica partida, data, quantidade de votos, colocação, time sem consentimento
  ou qualquer caminho para a cédula;
- recusa ou revogação retira imediatamente a fatia daquele time da projeção e
  não reduz acesso ao time, agenda, súmula ou perfil privado.

Não nasce um ledger pessoal novo. A retenção acompanha os fatos esportivos já
governados pelo domínio. Para `crowd_star`, a leitura consome apenas o resultado
agregado fechado e continua válida depois da anonimização prevista por
`DEC-ANONYMOUS-RETENTION`; pseudônimo, recibo e cédula nunca entram na projeção.

## Consequências

- a pessoa entende por que recebeu cada cartão e pode conferir sua origem;
- replay, concorrência e correção não duplicam saldo, porque não existe saldo;
- o modelo preserva `INV-POSITIVE-GAMIFICATION` sem introduzir ranking público
  ou privado entre pessoas;
- o perfil público ganha nova finalidade de consentimento e invalidação de
  cache, caso a decisão seja aceita;
- agregações futuras por temporada ou campeonato reutilizam as mesmas fontes e
  continuam fatiadas por tenant;
- WhatsApp automático, prêmio, marketplace, recomendação e compartilhamento
  externo permanecem fora.

## Validação

O protótipo descartável apresenta, no celular:

1. visão privada com origem e prova do fato;
2. ausência explícita de pontos, nota e comparação;
3. consentimento público desligado por padrão e revogável;
4. prévia pública contendo somente totais por categoria consentida;
5. cabeçalho alinhado ao padrão público, com identidade e escudo do time.

A checagem técnica cobriu 390 px e 360 px, sem overflow horizontal ou conteúdo
recortado, controles com pelo menos 44 px e alternância funcional entre visão
privada, consentimento e prévia pública. Isso não substitui validação humana.

A coorte deve revisar sem explicação prévia e responder, em contagens agregadas:

- se entendeu que a visão nasce privada;
- se identificou que os cartões vêm de fatos finalizados e corrigíveis;
- se entendeu que não há pontos ou ranking;
- se distinguiu o resumo público do detalhe privado;
- se usaria a visão novamente ou escolheria publicar o resumo.

Sinal mínimo proposto: três pessoas do piloto revisam; todas compreendem os
quatro limites de privacidade/modelo e pelo menos duas demonstram intenção de
uso. Abaixo disso, ou se `voting` continuar sem uso após mais três partidas
finalizadas da coorte, R10 deve ser estacionada e reaberta somente quando houver
novo sinal comportamental.

## Plano de migração e reversão

Se a decisão for aceita, a implementação futura segue expansão inerte:

1. catálogo tipado e projeção privada por tenant, sem consumidor;
2. testes positivo, negativo, concorrente e cross-tenant;
3. consentimento versionado e projeção pública sem consumidor;
4. interface privada atrás de `recognition`, desligada por padrão;
5. uma única coorte demo, com fallback nas estatísticas e no Craque atuais;
6. somente depois do piloto, avaliar expansão e compartilhamento manual.

Rollback desliga `recognition` e invalida a projeção pública. Súmula,
participação, estatísticas e votos permanecem intactos; não há pontos a
reconciliar nem reconhecimento manual a apagar.
