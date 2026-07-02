# Migração Clerk dev → production

O app roda hoje na instância de **desenvolvimento** do Clerk
(`rational-gopher-23.clerk.accounts.dev`, chaves `pk_test`/`sk_test`).
Instância dev tem banner "Development mode", limites de usuários e
credenciais OAuth compartilhadas — não serve para mercado real.

O código **já está pronto** para a troca: o CSP deriva o domínio do Clerk
da própria publishable key (`next.config.ts`). Migrar = executar os passos
abaixo e trocar 2 variáveis de ambiente. Nada de código.

## Pré-requisito: domínio próprio

Clerk production exige um domínio seu (não aceita `*.vercel.app`).
Sugestão: `nexo.muitomelhor.net` (o domínio já aparece no código da landing).

## Passos (só o dono da conta consegue fazer)

1. **Vercel — apontar o domínio pro app**
   - `npx vercel domains add nexo.muitomelhor.net nexo-pdv`
   - No painel DNS do registrador do `muitomelhor.net`, criar o CNAME que a
     Vercel indicar (`cname.vercel-dns.com`).

2. **Clerk Dashboard → criar a instância de produção**
   - dashboard.clerk.com → app Nexo → seletor de instância → **Create production instance**
     (opção de clonar as configurações da dev).
   - Informar o domínio de produção (`nexo.muitomelhor.net`).

3. **DNS do Clerk** — o dashboard vai listar os registros (no registrador):
   - CNAME `clerk.<domínio>` → Frontend API
   - CNAME `accounts.<domínio>` → Account portal
   - CNAMEs de e-mail (DKIM) para os e-mails de verificação
   - Aguardar o dashboard validar tudo (pode levar alguns minutos após propagar).

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
