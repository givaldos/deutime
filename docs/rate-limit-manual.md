# Rate limiting manual — Vercel + Supabase (F1, passo a passo)

O throttle em banco (migration `202609080001`, teste `072`) já cobre chamadas
diretas ao PostgREST. Falta a camada de borda, que é manual e não versionável.
Pré-requisito: plano Vercel **Pro** (Firewall com rate limiting) e acesso de
admin ao projeto Supabase de produção. Execute em horário de baixo tráfego,
uma parte por vez.

## Parte A — Vercel Firewall (30 min)

1. Abra o projeto → **Settings → Firewall → Custom Rules → Add Rule**.
2. Crie uma regra por linha da tabela, todas com ação **Rate Limit** por IP e
   resposta **429**. Comece em modo **Log** (sem bloquear):

| Nome | Condição (path wildcard) | Limite inicial |
| --- | --- | --- |
| `rl-auth` | `/auth/*` | 30 req / 60 s |
| `rl-cadastro` | `/t/*/register`, `/t/*/cadastro` | 10 req / 60 s |
| `rl-event-access` | `/e/*/access` | 20 req / 60 s |
| `rl-invite` | `/invite/*` | 20 req / 60 s |
| `rl-api` | `/api/*` | 60 req / 60 s |

3. Aguarde 3–5 dias e abra **Firewall → Analytics**: procure 429 que seriam
   gerados para IPs legítimos (escritório, time piloto). Se houver, suba o
   teto da regra afetada em 50% e observe de novo.
4. Troque a ação de **Log** para **Challenge** (recomendado: poupa quem está
   atrás de CGNAT) ou **Deny** nas rotas de API. Nunca use Deny em `/auth/*`
   sem antes validar o passo 3.
5. Valide de fora da sua rede (4G):
   `for i in $(seq 1 15); do curl -s -o /dev/null -w "%{http_code} " https://deutime.app/t/SEU-SLUG/register; done`
   Esperado: maioria 200 e, acima do teto, **429** com `Retry-After`.
6. **Não** crie regra de bloqueio por IP em `/api/internal/*`: o cron da
   Vercel usa IPs dinâmicos; a proteção ali é o bearer `CRON_SECRET` /
   `WHATSAPP_WORKER_SECRET` (já validado).

## Parte B — Supabase Auth (15 min)

1. **Authentication → Settings → Rate Limits**: aperte `Send OTP`,
   `Verify OTP` e `Password recovery` (sugestão: 3 envios / 10 min por
   número). O app já trata `over_sms_send_rate_limit`, então o usuário vê
   mensagem amigável.
2. **Authentication → Settings → Bot protection**: ative e cadastre as
   chaves do Turnstile. Sem isso, o `captchaToken` que o app envia no
   `signInWithOtp` é **ignorado** e o Turnstile do formulário vira teatro.
3. Valide: peça um código com o widget resolvido (deve chegar) e confirme
   nos **Auth → Logs** que tentativas em rajada retornam rate limited.
4. SMS não tem teto de gasto: crie um lembrete mensal para revisar
   **Auth → Users → logs de OTP** e volume Twilio. Pico fora do padrão =
   incidente (ver runbook).

## Parte C — Conferência final (10 min)

- [ ] `GET /robots.txt` responde 200 com os disallows (F7).
- [ ] Cookies de sessão em produção trazem `Secure` e `SameSite=Lax` (F8,
      DevTools → Application → Cookies).
- [ ] Rajada no `/e/<id>/access` acima de 120/min retorna erro genérico
      "Acesso indisponível" sem vazar motivo (throttle em banco).
- [ ] `npm run db:test` (ou CI) com `072_rate_limit_contract` verde —
      exige Docker/Supabase local; sem isso, não promova a migration.
- [ ] Anote data e tetos aplicados no arquivo da release; revise os tetos
      após o piloto com os números reais do Firewall Analytics.

## Reversão

- Vercel: volte a regra para **Log** ou desative; efeito imediato.
- Supabase: restaure os rate limits anteriores (anote antes de mudar).
- Banco: correção forward-only — nunca edite a migration aplicada; se um
      teto legítimo for atingido, suba o teto com nova migration.
