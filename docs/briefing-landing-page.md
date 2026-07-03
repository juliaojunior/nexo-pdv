# Briefing — Landing Page do Nexo PDV

> Documento para IA de design. Contém tudo: produto, público, posicionamento,
> identidade visual, tom de voz, copy validada, CTAs e restrições.
> Atualizado em 2026-07-03 — produto **em produção**.

---

## 1. O produto

**Nexo PDV** — app de gestão de vendas para **revendedoras de cosméticos**
(Natura, Avon, Boticário, Eudora e outras marcas). PWA instalável no celular,
funciona offline, sem loja de aplicativos (instala direto do navegador, em
tela cheia).

- **URL de produção:** https://nexo.muitomelhor.net
- **Tagline oficial:** "Suas vendas de revenda, organizadas num lugar só"
- **Estado:** lançado, em captação dos primeiros usuários reais

O que o app faz (tudo já funcionando em produção):

| Funcionalidade | Descrição para marketing |
|---|---|
| Painel multimarca | Lucro e "a receber" de TODAS as marcas somados numa tela só — nenhum app de marca faz isso |
| Fiado / caderneta | Parcelas com data, saldo devedor por cliente, quem deve o quê |
| Lucro real | Preço de custo congelado em cada venda — o lucro certo, sempre, mesmo se o custo mudar depois |
| Caixa (PDV) | Registrar venda em segundos, com leitor de código de barras pela câmera |
| Offline-first | Vendeu sem sinal? A venda entra na fila e sincroniza sozinha quando a internet volta |
| Vitrine online | Link do catálogo da revendedora para mandar no WhatsApp; cliente monta o pedido sozinho |
| Pedidos via WhatsApp | Cliente finaliza na vitrine e avisa a vendedora por mensagem pronta |
| Estoque | Baixa automática a cada venda, estorno devolve ao estoque |
| Clientes | Cadastro com telefone, histórico de compras |
| Recibo | Comprovante bonito para compartilhar com o cliente |

## 2. Público-alvo

**Persona:** revendedora autônoma de cosméticos, mulher, vende Natura e/ou
Avon e/ou Boticário/Eudora (frequentemente 2+ marcas ao mesmo tempo), atende
por WhatsApp, trabalha do celular. Não é "lojista" formal — é a vizinha, a
colega de trabalho, a consultora do bairro.

**Como ela controla hoje (validado em pesquisa com revendedoras reais):**
- No **caderno ou de cabeça** — o concorrente real é o caderno, não outro app
- Dor nº 1: **não saber gerir** — quanto ganhou de verdade, quanto tem a receber
- Dor recorrente: **fiado** ("nem sempre recebo no ato da entrega")
- Cada marca tem seu app próprio, mas nenhum soma as marcas entre si

**Implicação de design:** a página precisa parecer simples e acolhedora, nunca
"sistema empresarial". A promessa é: *pouco mais difícil que o caderno, muito
mais poderoso*. Onboarding em ~2 minutos, sem treinamento.

## 3. Contexto de mercado (por que agora)

- O **Super Revendedores**, app líder histórico do nicho, encerrou em 2025 —
  milhares de revendedoras "órfãs" procuram substituto **agora**
- Concorrente principal vivo: **Revendi** (pago após 7 dias de teste)
- Apps oficiais das marcas são jardins murados: só funcionam dentro da própria
  marca — **nenhum consegue somar Natura + Boticário + Avon**
- **O fosso do Nexo: multimarca de verdade.** É o diferencial mais durável
  (nenhuma marca pode copiá-lo) e deve ser o herói da página

## 4. Oferta e preço

- **Grátis por 6 meses** para quem entrar agora (isca para capturar as órfãs)
- Depois: freemium — plano essencial grátis para sempre + **Premium por
  R$ 19/mês no máximo** (mais barato que os concorrentes pagos)
- Sem cartão de crédito no cadastro; conta criada só com e-mail + código
  (sem senha, sem Google — mencionar "sem complicação de senha" é um plus)

## 5. Identidade visual (tokens reais do app)

A landing deve conversar com o app que a pessoa vai abrir em seguida.

**Fonte:** Inter (títulos em peso black/extrabold com tracking apertado —
`tracking-tighter` — é a cara do app). Ícones: Material Symbols Outlined
ou Lucide (o app usa Lucide).

**Tema claro (padrão do app):**

| Token | Valor | Uso |
|---|---|---|
| background | `#f5f6f8` | fundo da página |
| surface | `#ffffff` | cards |
| surface-raised | `#f0f2f5` | chips, campos |
| border | `#d3d7dd` | bordas suaves |
| foreground | `#1f2328` | texto principal |
| muted | `#687181` | texto secundário |
| primary | `#06b6d4` | cyan da marca — botões, destaques |
| primary-bright | `#0e7490` | cyan profundo — texto de preço/link sobre claro |
| primary-deep | `#00343d` | texto sobre botão cyan |
| danger | `#e2433d` | dores/problemas (usado nos cards de dor) |
| success | `#15a34a` | confirmações |

**Sombras características:** glow cyan suave nos CTAs
(`0 6px 18px rgb(6 182 212 / 0.28)`), cards que "flutuam" sem borda.
**Raios:** generosos — `rounded-xl`/`rounded-2xl`/`rounded-3xl` em tudo.
**Estética geral:** limpa, arejada, mobile-first, botões grandes com texto
em caixa alta e tracking largo, chips de rótulo em 10-11px uppercase.

**Assets existentes:** `icon.png` (logo quadrado arredondado),
`og-image.png` (1200×630), ícones PWA 192/512. A logomarca é o texto
"Nexo PDV" em Inter black + ícone de lojinha em círculo com gradiente cyan.

## 6. Tom de voz

- **Direto, caloroso, coloquial** — fala com "você", zero jargão corporativo
- Vocabulário da revendedora: "fiado", "caderno", "a receber", "revista",
  "campanha", "as marcas que você vende"
- Frases curtas. Contraste dor → alívio
- Nunca infantilizar; ela é uma empreendedora de verdade

## 7. Copy validada (já em uso na página /comecar atual — reutilizável)

**Headline:** "Suas vendas de revenda, organizadas"
**Subheadline:** "Controle o fiado, o lucro e o estoque de todas as marcas
que você vende — num lugar só, no seu celular."

**Bloco de dores (cards com ícone em danger):**
- "O fiado vira bagunça" — "Quem deve o quê some no meio dos rabiscos."
- "O lucro fica no escuro" — "Vende muito, mas não sabe quanto sobra."
- "Cada marca num canto" — "Um app pra Natura, outro pra Avon, planilha pro resto."
- (estoque) — "Estoque e contas só na cabeça — até esquecer."

**Bloco de soluções:**
- "Todas as marcas juntas" — "Lucro e a receber numa tela só. Só o Nexo faz."
- (fiado) — "Parcelas com data e contas a receber por cliente."
- (lucro) — "Custo congelado em cada venda — o lucro certo, sempre."
- "Rápido e funciona offline" — "Vendeu sem sinal? Sincroniza sozinho depois."

**FAQ existente:**
- "Precisa de CNPJ?" → "Não. É só baixar e começar a usar — feito para revendedoras autônomas."
- "Funciona sem internet?" → "Sim. Você vende offline e o app sincroniza assim que a conexão voltar."
- "Dá pra usar várias marcas?" → "Sim — esse é o ponto. Natura, Avon, Boticário, Eudora e o que mais você vender, juntas."
- "E os dados dos meus clientes?" → "São seus. Ficam seguros na nuvem e acessíveis só pela sua conta."

## 8. CTAs e fluxo

- **CTA primário:** "Criar minha conta grátis" → `https://nexo.muitomelhor.net/sign-up`
- CTA secundário possível: "Ver como funciona" (âncora/scroll)
- Reforço junto ao CTA: "Grátis nos 6 primeiros meses · Sem cartão · Sem CNPJ"
- Pós-cadastro o app já sugere **instalar na tela inicial** (PWA) — a landing
  pode mencionar "instala direto do navegador, sem loja de aplicativos"
- Canal de aquisição principal: **link compartilhado no WhatsApp e Facebook**
  — a página PRECISA ser leve e perfeita em tela de celular (a maioria
  absoluta dos acessos será mobile). OG image caprichada é crítica.

## 9. Restrições e cuidados

1. **NÃO prometer** "catálogo pronto das marcas" ou "preços atualizados por
   campanha" — o app não faz isso (foi o que quebrou o concorrente líder);
   a revendedora cadastra os próprios produtos (com foto, pela câmera)
2. **NÃO usar depoimentos inventados** — produto recém-lançado, ainda sem
   social proof real; usar placeholder claro ou omitir a seção por ora
3. **NÃO usar os logotipos oficiais** de Natura/Avon/Boticário/Eudora como
   se fossem parceiros — citar os nomes em texto é ok ("as marcas que você
   vende"), implicar parceria não
4. Dados/LGPD: manter a promessa já publicada ("os dados são seus") — a
   página de privacidade existe em `/privacidade` e os termos em `/termos`
5. Mobile-first radical: hero legível em 360px de largura; botões com área
   de toque generosa; peso de página baixo (público em 4G)

## 10. Estrutura sugerida (referência, a IA de design tem liberdade)

1. Hero: headline + subheadline + CTA + mock do app no celular
2. Barra de reforço: "Grátis 6 meses · Sem cartão · Sem CNPJ · Funciona offline"
3. Dores (os 4 cards) → vira ponte para…
4. Soluções/funcionalidades (destaque hero: painel multimarca)
5. Como funciona em 3 passos (criar conta → cadastrar produtos → vender/compartilhar vitrine)
6. Oferta (6 meses grátis, depois R$ 19/mês no máximo — transparência)
7. FAQ (as 4 perguntas acima)
8. CTA final + rodapé (Termos, Privacidade)
