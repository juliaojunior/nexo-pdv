# Migração Clerk dev → production

O app roda hoje na instância de **desenvolvimento** do Clerk
(`rational-gopher-23.clerk.accounts.dev`, chaves `pk_test`/`sk_test`).
Instância dev tem banner "Development mode", limites de usuários e
credenciais OAuth compartilhadas — não serve para mercado real.

O código **já está pronto** para a troca: o CSP deriva o domínio do Clerk
da própria publishable key (`next.config.ts`). Migrar = executar os passos
abaixo e trocar 2 variáveis de ambiente. Nada de código.

## Pré-requisito: domínio próprio — ✅ PRONTO

`nexo.muitomelhor.net` já está no ar servido pela Vercel (CNAME →
`cname.vercel-dns.com` na Hostinger + domínio atribuído ao projeto).
Verificado em 2026-07-01.

Precedente: o subdomínio `flowtime` do mesmo domínio já tem um Clerk
production completo (clerk.flowtime, accounts.flowtime, DKIM) — o padrão
de registros para o `nexo` é o mesmo.

## Passos (só o dono da conta consegue fazer)

2. **Clerk Dashboard → criar a instância de produção**
   - dashboard.clerk.com → app Nexo → seletor de instância → **Create production instance**
     (opção de clonar as configurações da dev).
   - Informar o domínio de produção (`nexo.muitomelhor.net`).

3. **DNS do Clerk** — o dashboard vai listar ~5 CNAMEs (clerk.nexo,
   accounts.nexo, clk._domainkey.nexo, clk2._domainkey.nexo, clkmail.nexo).
   Colar os valores aqui no Claude: ele aplica via API da Hostinger
   (token em `~/.hostinger-token`). Aguardar o dashboard validar.

4. **OAuth (login com Google)** — em produção o Clerk NÃO usa mais as
   credenciais compartilhadas: criar OAuth Client no Google Cloud Console
   (tipo Web, redirect URI que o dashboard do Clerk mostra) e colar
   client id/secret no Clerk → SSO connections → Google.

5. **Trocar as envs na Vercel** (com as chaves `pk_live`/`sk_live` em mãos —
   estes comandos o Claude pode rodar por você):
   ```bash
   npx vercel env rm NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production
   npx vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production   # colar pk_live
   npx vercel env rm CLERK_SECRET_KEY production
   npx vercel env add CLERK_SECRET_KEY production                    # colar sk_live
   ```
   Preview/development continuam com as chaves de dev (correto: cada
   ambiente na sua instância).

6. **Redeploy de produção** — o CSP se ajusta sozinho ao novo domínio do Clerk.

## Depois de migrar

- Testar: cadastro novo, login Google, logout, `/comecar` → instalar PWA.
- Os usuários da instância dev NÃO migram automaticamente (contas de teste
  ficam na dev — decisão consciente: começar produção limpo).
