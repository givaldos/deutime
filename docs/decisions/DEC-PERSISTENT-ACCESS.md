# DEC-PERSISTENT-ACCESS — Acesso duradouro vindo do WhatsApp

- Status: aceita; threat model aprovado na R00
- Data: 27 de julho de 2026
- Release consumidora: R02

## Contexto

O atleta deve voltar ao evento pelo WhatsApp como voltaria a um aplicativo: sem senha, sem procurar a agenda e sem repetir OTP em um aparelho já reconhecido. Ao mesmo tempo, o link pode ser encaminhado, aberto em navegador interno descartável ou aparecer para o provedor que entregou a mensagem.

Uma credencial de evento não pode virar silenciosamente uma sessão global que libere outros times e eventos da identidade.

## Opções consideradas

1. **Magic link curto e de uso único:** reduz a exposição, mas repete autenticação e falha no objetivo de acesso duradouro.
2. **Link reutilizável que cria sessão global:** oferece pouca fricção, mas um encaminhamento amplia o acesso muito além do evento.
3. **Capability persistente do evento + sessão de identidade verificada:** mantém o link útil, limita o dano de encaminhamento e deixa o aparelho reconhecido sem novos OTPs.

## Decisão

Adotar a terceira opção:

- cada evento possui URL pública canônica independente do segredo;
- o link personalizado contém credencial opaca, reutilizável e revogável, persistida somente como hash;
- a troca cria capability persistente limitada ao par atleta-evento e às ações permitidas naquela fase;
- a capability não emite diretamente uma sessão global de identidade;
- OTP feito uma vez no aparelho pode criar sessão completa, duradoura, rotativa e inventariada;
- aparelho que já possui essa sessão abre novos eventos sem novo OTP;
- comentário e voto exigem identidade completa; confirmação pode usar a capability limitada;
- vínculo, fase, cancelamento e revogação são recalculados server-side em cada ação;
- segredo sai da URL após a troca e não entra em Open Graph, analytics, `Referer` ou logs controlados pela aplicação.

O transporte inicial usa um fragmento, no formato conceitual
`/e/<evento>#c=<credencial>`. Fragmentos não são enviados na requisição HTTP. A
página de troca é um documento mínimo, same-origin, sem analytics, imagens
remotas, preconnect, service worker ou scripts de terceiros. O bootstrap remove
o fragmento com `history.replaceState` e faz `POST` same-origin para a troca
antes de carregar a jornada. A resposta instala a capability em cookie
`Secure`, `HttpOnly`, `SameSite=Lax`, limitado ao caminho do evento. Sem
JavaScript ou diante de falha, a página oferece o fluxo autenticado atual, sem
refletir a credencial no HTML.

O provedor de WhatsApp necessariamente conhece o conteúdo enviado, inclusive a
credencial no fragmento; isso deve constar no DPA e não pode ser descrito como
anonimato contra o provedor.

## Threat model aprovado

| Ameaça | Controle obrigatório | Evidência de implementação |
|---|---|---|
| Link encaminhado | capability limitada ao atleta-evento; confirmação permitida apenas na fase atual; comentário, voto e identidade global exigem step-up por OTP | teste cross-tenant, cross-evento e de encaminhamento |
| Unfurl ou prefetch | segredo somente no fragmento; `GET` canônico é genérico e não troca credencial; troca exige `POST` same-origin | teste de `GET`, unfurl e prefetch sem consumo |
| Vazamento por `Referer`, cache, OG, analytics, erro ou log | `Referrer-Policy: no-referrer`, página sem terceiros, URL limpa antes da jornada, respostas `no-store`, redaction por nome/formato e nenhuma credencial em telemetria | inspeção de rede, cache, HTML, logs e erros |
| Replay e concorrência | credencial identificada por hash SHA-256 e comparação constante; troca serializada; múltiplas trocas válidas convergem para capability do mesmo escopo, sem ampliar permissão | teste simultâneo e de replay |
| Fixação de sessão | servidor gera capability nova; nunca aceita identificador de sessão fornecido pelo cliente; rotação após step-up e ação sensível | teste de cookie predefinido e rotação |
| Aparelho roubado | inventário por aparelho, revogação individual e global imediata; sinal de risco força OTP; suporte não recupera segredo | ensaio de revogação e runbook |
| Navegador interno perde cookies | o link reutilizável pode refazer a troca; ausência do link ou revogação cai no fluxo OTP, nunca em permissão implícita | Android/iPhone, navegador interno e padrão |
| Capability usada em outro evento/time | chave composta e autorização recalculada por evento, atleta, time, vínculo e fase em cada RPC | pgTAP positivo, negativo e cross-tenant |
| Provedor ou operador acessa o link | DPA e acesso mínimo; capacidade limitada reduz impacto; rotação/revogação disponíveis | revisão de fornecedor e auditoria |

### Material criptográfico e ciclo de vida

- credencial gerada com 256 bits de entropia por CSPRNG, codificada em base64url
  sem padding e persistida apenas como SHA-256;
- comparação de hash constante e nenhum prefixo pesquisável em logs;
- credencial expira no máximo sete dias após o encerramento do evento e pode ser
  revogada antes; a fase do evento pode retirar ações imediatamente;
- capability renova de forma deslizante por até 30 dias de inatividade, sem
  ultrapassar a expiração da credencial/evento;
- sessão completa de aparelho rotaciona refresh token, expira após 30 dias de
  inatividade e possui limite absoluto de 180 dias;
- OTP é obrigatório em aparelho novo, após limite absoluto, revogação, troca
  suspeita de contexto ou antes de elevar uma capability para identidade;
- uso sensível rotaciona a capability/sessão, sem tornar o link original uma
  sessão global.

### Revogação e recuperação

A revogação pode atingir uma credencial, uma capability, um aparelho, toda a
identidade ou globalmente a troca. O efeito é conferido no banco em cada ação e
não depende apenas da validade do cookie. Em incidente, o kill switch interrompe
a troca e ações identificadas, preserva a URL pública e o fluxo autenticado
atual, revoga o escopo afetado e registra somente identificadores não secretos.

## Consequências

- o uso normal fica semelhante ao de app depois da primeira verificação do aparelho;
- o navegador interno pode recuperar o contexto pelo link mesmo se perder cookies;
- confirmação e identidade completa passam a ter sessões e permissões distintas;
- revogação precisa abranger credencial, capability, aparelho, identidade e vínculo;
- implementação exige inventário/rotação de aparelho e testes específicos de replay, forwarding, unfurl, cache e logs;
- suporte nunca consulta nem reconstrói o segredo original.

## Validação da implementação consumidora

- threat model com link encaminhado, aparelho roubado, unfurl, prefetch, `Referer`, logs da plataforma e concorrência;
- protótipo Android/iPhone nos navegadores interno e padrão;
- teste de que capability de um evento não acessa outro evento/time;
- teste de step-up antes de comentário ou voto em aparelho não verificado;
- conferência dos prazos e sinais de risco acima com telemetria do piloto.

Esses itens são gates da implementação R02, não decisões estruturais abertas.
A R01 não consome esta credencial e permanece desbloqueada.

## Migração e reversão

- introduzir tabelas/artefatos por expansão inerte;
- ativar somente para time de teste;
- manter confirmação autenticada atual como fallback;
- permitir kill switch de troca de credencial e revogação global;
- em rollback, preservar a URL pública e desabilitar ações identificadas sem apagar respostas já registradas.
