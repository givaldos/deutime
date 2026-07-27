# DEC-PERSISTENT-ACCESS — Acesso duradouro vindo do WhatsApp

- Status: decisão de produto aceita; threat model e transporte pendentes na R00
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

O transporte inicial — fragmento trocado por `POST` antes de terceiros ou mecanismo equivalente — será fechado pelo threat model da R00. O provedor de WhatsApp necessariamente conhece o link enviado; isso deve constar no DPA e não pode ser descrito como anonimato contra o provedor.

## Consequências

- o uso normal fica semelhante ao de app depois da primeira verificação do aparelho;
- o navegador interno pode recuperar o contexto pelo link mesmo se perder cookies;
- confirmação e identidade completa passam a ter sessões e permissões distintas;
- revogação precisa abranger credencial, capability, aparelho, identidade e vínculo;
- implementação exige inventário/rotação de aparelho e testes específicos de replay, forwarding, unfurl, cache e logs;
- suporte nunca consulta nem reconstrói o segredo original.

## Validação pendente

- threat model com link encaminhado, aparelho roubado, unfurl, prefetch, `Referer`, logs da plataforma e concorrência;
- protótipo Android/iPhone nos navegadores interno e padrão;
- teste de que capability de um evento não acessa outro evento/time;
- teste de step-up antes de comentário ou voto em aparelho não verificado;
- definição de renovação deslizante, limite absoluto e política de risco.

## Migração e reversão

- introduzir tabelas/artefatos por expansão inerte;
- ativar somente para time de teste;
- manter confirmação autenticada atual como fallback;
- permitir kill switch de troca de credencial e revogação global;
- em rollback, preservar a URL pública e desabilitar ações identificadas sem apagar respostas já registradas.
