# Nexo PDV → Produto para Revendedores de Cosméticos
### Pesquisa de mercado e plano de funcionalidades

**Objetivo:** transformar o Nexo PDV (já funcional) em um produto direcionado a revendedores de Natura, Avon, Boticário, Eudora e marcas similares.

**Decisão de preço (já tomada):** totalmente grátis por 6 meses; depois, modelo freemium com plano pago de no máximo R$ 19/mês.

---

## Frente 1 — Validação de demanda (CONCLUÍDA)

Conversas com revendedoras reais. Principais achados:

- A maioria controla as vendas **no caderno ou de cabeça**.
- A dor é **difusa**, mas a mais forte é **não saber gerir as vendas** (não ter clareza de quanto se ganha, quanto se tem a receber).
- Implicação de produto: o concorrente real é o caderno. O app precisa ser **pouco mais difícil de usar que um caderno** — onboarding em ~2 minutos, sem treinamento.

---

## Frente 2 — Teardown de concorrentes (CONCLUÍDA)

### Achado central: a "janela de órfãos"

O **Super Revendedores**, líder histórico do nicho (multimarca, importação de catálogos, estoque, fiado, relatórios), anunciou encerramento em 2025. Milhares de revendedoras estão **procurando substituto agora**. Sucessores como o Revendi já estão capturando esse público.

> Consequência estratégica: a entrada do Nexo é favorecida por esse momento, e os "6 meses grátis" são a isca ideal. Mas há urgência — a janela não fica aberta para sempre.

### Mapa de concorrentes

**Nicho (feitos para revendedora de cosmético):**
- **Revendi** (revendi.app) — sucessor mais forte e principal concorrente vivo. Celular + computador sincronizados, marcas já integradas, validade, preços individuais, alertas de pagamento, Pix automático, visão de "ganhou" e "a receber". Teste grátis de 7 dias.
- **Minha Revenda** (minharevenda.app) — gestão de estoque/vendas com catálogos de várias marcas; roda no navegador.
- **Clube Amí / Mix Lar / +amigas** — focados em catálogo (atualizam antes da revista chegar), não em gestão.

**Genéricos (qualquer vendedor pequeno):**
- **Stoqui** — gigante (40 mil+ lojistas), grátis e pagos a partir de R$ 39/mês. Forte, mas **não fala a língua da revendedora** (sem ciclo, sem preço consultoria vs. catálogo, sem boleto da marca).

**Apps oficiais das marcas (ameaça crescente):**
- **Revendedores Grupo Boticário** — já tem relatório financeiro, detalhamento por cliente e controle de "a receber". A marca está construindo a camada de gestão, de graça — **mas só dentro da própria marca.**

### Quadro resumido

| App | O que é | Preço | Calcanhar de Aquiles |
|---|---|---|---|
| Super Revendedores | Nicho, líder histórico | Grátis + Premium | Encerrando; era lento, busca quebrada, travava |
| Revendi | Nicho, sucessor ativo | 7 dias grátis, depois pago | Preço não público; ainda novo |
| Minha Revenda | Nicho, web | "Use sem taxas" | Pouca presença de marca |
| Stoqui | Genérico, líder | Grátis / R$ 39+ | Não fala a "língua" da revendedora |
| App das marcas | Oficial | Grátis | Só funciona dentro da própria marca |

### As brechas do Nexo (onde ganhar)

1. **Multimarca de verdade.** Apps de marca são jardins murados. Quem vende Natura + Boticário + outra marca não tem nenhum lugar que some o lucro e o "a receber" das três. **Este é o fosso mais durável** — nenhuma marca pode copiá-lo.
2. **Fiado/caderneta bem feito.** Dor nº 1 ("nem sempre recebo no ato da entrega").
3. **Velocidade e confiabilidade.** O Super Revendedores morreu de lentidão. Um app rápido já é diferencial — a arquitetura PWA-first ajuda.
4. **Simplicidade.** Mal mais difícil que o caderno.

### Duas armadilhas

- **Não prometer catálogo pronto de todas as marcas (ainda).** Manter preço/ciclo atualizado por campanha foi o que quebrou o líder. Começar deixando a revendedora cadastrar/importar os próprios produtos.
- **Velocidade de mercado.** O Revendi já absorve os órfãos.

---

## Lista priorizada de funcionalidades

Status **confirmado no repositório** (Frente 6): **[já tem]**, **[adaptar]**, **[novo]**.
Régua de priorização: *o que faz uma revendedora largar o caderno e ficar no Nexo.*

### P0 — MVP que conquista o órfão

1. **Produto com marca + dois preços** *[adaptar — PEÇA-CHAVE]* — hoje o `Product` tem **um preço só** (`price`). Falta campo `brand` e `costPrice` (preço de consultoria/custo). Tudo (itens 2 e 5) depende disto.
2. **Venda com cálculo de lucro + baixa de estoque** *[metade pronta]* — baixa de estoque **já pronta** (`finalizeSale`, transação atômica). Lucro impossível hoje (sem preço de custo); destrava com o item 1.
3. **Fiado / caderneta** *[metade pronta]* — "Fiado" **já existe como forma de pagamento**, mas é só rótulo. Falta status (pago/parcial/aberto) e tela "quem me deve quanto".
4. **Cadastro de clientes** *[já tem]* — entidade `Customer` e tela `/customers` existem. Pronto.
5. **Painel multimarca** *[novo, pequeno — o fosso]* — não existe, mas depende só do item 1. A tela `/reports` pode hospedá-lo.

### P1 — Consolida e diferencia

6. **Lembrete de cobrança (WhatsApp)** *[novo]* — mensagem pronta a partir do fiado.
7. **Ciclo / campanha** *[novo]* — agrupar vendas por ciclo (~21 dias), não só por mês.
8. **Boleto da marca** *[novo]* — registrar o que ela paga à fábrica + vencimento e lembrete. Fecha o ciclo financeiro.
9. **Pós-venda / recompra** *[novo]* — lembrete "faz 30 dias que X comprou".

### P2 — Futuro / escala

10. **Vitrine com checkout/pedido melhorado** *[adaptar]*.
11. **Relatórios** (mais vendidos, ticket médio) *[novo]*.
12. **Kits e promoções** *[novo]*.
13. **Catálogo integrado das marcas** *[novo — arriscado]* — por último de propósito; só com demanda comprovada.

### Notas

- O P0 é majoritariamente **adaptação** do que o Nexo já faz; os itens "novos" reaproveitam dados de produtos e vendas.
- Resistir a inflar o MVP. A sequência P0 é o caminho mais curto até "trocou o caderno pelo Nexo".

---

## Frente 6 — Estado do repositório (CONCLUÍDA)

Repositório: github.com/juliaojunior/nexo-pdv

**Stack:** Next.js + Capacitor (Android), PWA, **offline-first** com Dexie (banco local IndexedDB) sincronizando com **Postgres na nuvem** (Vercel). Login via Clerk. Leitor de código de barras (html5-qrcode), notificações locais, compartilhamento.

**Já construído (o motor difícil):**
- Venda atômica com baixa de estoque (`finalizeSale`) e estorno (`revertSale`).
- Entidades `Product`, `Customer`, `Sale`, `SaleItem`, `Category`.
- Fila de vendas offline (`pendingSales`) + cache de leituras (`apiCache`) + sincronização com a nuvem.
- Telas: produtos, estoque (`inventory`), clientes, pedidos, histórico de vendas, relatórios, vitrine pública (`/c/[storeId]`), configurações.
- "Fiado" já existe no enum de formas de pagamento (`src/lib/payments.ts`).

**Conclusão:** o pivô é menor do que parece. A peça que destrava tudo é uma só — **marca + preço de custo no produto.**

### Sutileza de modelo de dados (não esquecer)

Ao adicionar o preço de custo, **congelar o custo no momento da venda** gravando `unitCost` em cada `SaleItem`. Senão, mudar o custo de um produto no próximo ciclo altera o lucro de todas as vendas antigas.

---

## Plano de sprints do P0

Ordem obrigatória: o Sprint 0 destrava os demais.

### Sprint 0 — Fundação de dados (a peça-chave)
**Objetivo:** o produto passa a ter marca e preço de custo; a venda passa a congelar o custo.
**Tarefas:**
- `src/db/db.ts`: adicionar `brand` e `costPrice` em `Product`; `unitCost` em `SaleItem` e `SalePayloadItem`; subir Dexie para v3 com migração que preenche registros antigos (brand vazio, custo 0).
- Formulário de produto (`src/app/products/`): campos de marca (lista: Natura, Avon, Boticário, Eudora, Outra) e preço de custo.
- Nuvem: refletir os campos no Postgres — `src/app/api/db-setup/route.ts`, `src/app/api/products/route.ts` e `src/app/api/cloud/sync/products/route.ts`.
**Pronto quando:** cadastrar produto com marca + custo, sincronizar na nuvem e nada quebrar nas vendas existentes.

### Sprint 1 — Lucro
**Objetivo:** cada venda mostra o lucro; relatório soma o lucro do período.
**Tarefas:**
- `finalizeSale`: gravar `unitCost` = custo atual do produto (snapshot) em cada item.
- `src/app/sales-history/`: exibir lucro = subtotal − (unitCost × quantidade).
- `src/app/reports/`: somar lucro do período.
**Pronto quando:** vender e ver o lucro correto; o relatório bate.

### Sprint 2 — Fiado de verdade (caderneta)
**Objetivo:** gerir o que cada cliente deve, não só rotular a venda.
**Tarefas:**
- `src/db/db.ts`: em `Sale`, adicionar `amountPaid` e `status` (pago/parcial/aberto). Opcional: tabela `payments` para quitações parciais com data.
- Ação "registrar pagamento / quitar" numa venda fiado.
- Tela nova de **contas a receber**: "quem me deve quanto", com total no topo.
**Pronto quando:** marcar venda como fiado, registrar pagamento parcial e ver o saldo certo.

### Sprint 3 — Painel multimarca (o fosso)
**Objetivo:** uma tela que soma lucro do mês e total a receber, por marca e no total.
**Tarefas:**
- `src/app/page.tsx` (home) ou `src/app/reports/`: cards de lucro do mês e a receber, com quebra por marca.
**Pronto quando:** a revendedora multimarca vê numa tela só o que nenhum app de marca mostra.

> Item 4 (clientes) já está pronto — não vira sprint.

---

## Frente 3 — Dados de catálogo (CONCLUÍDA)

**Decisão:** não construir nem manter catálogo de marca (foi o que quebrou o Super Revendedores). Aproveitar o leitor de código de barras que o Nexo já tem e consultar uma base pública para auto-preencher produto.

Bases disponíveis no Brasil:
- **Cosmos (Bluesoft)** — maior base (+18 mi de itens), API por GTIN/EAN com descrição, marca, NCM, preço, fotos. Paga.
- **GS1 Brasil** — consulta oficial gratuita por GTIN (nome, marca, fabricante, categoria, imagem).
- **DotCompany** — +2 mi de itens, API pública (25 consultas grátis/dia/IP; planos pagos).

**Recomendação:** escanear código → Nexo preenche nome/marca/foto. Resolve o "cadastrar um por um" sem risco jurídico de redistribuir catálogo de marca e sem manutenção por ciclo.
**Cuidados:** cobertura de cosméticos é incompleta (produtos de campanha às vezes nem têm código) → manter cadastro manual como alternativa; APIs têm limite/custo. Catálogo integrado das marcas = P2/arriscado.

---

## Frente 4 — Jurídico / nomes de marca (CONCLUÍDA)

**Base legal favorável:** lojas que vendem produtos de terceiros podem usar essas marcas em catálogos/promoções, desde que junto com a própria marca e em concorrência leal; pela "exaustão de direitos", o dono da marca não impede a revenda do produto já colocado no mercado.

**Limites (o que NÃO fazer):**
- Não batizar/logar o app com a marca delas — Natura/Avon/Boticário são alto renome (proteção em todos os ramos). "Nexo PDV" (nome neutro) é o certo.
- Não comprar o nome da marca em anúncios pagos de forma enganosa (STJ: concorrência desleal).
- Não usar logos das marcas.

**Recomendação:** citar marcas só descritivamente ("para revendedores de Natura, Avon…"), ao lado do próprio nome, com aviso de não-afiliação. Melhor: deixar a revendedora digitar a própria marca (uso legítimo dela). Atenção à LGPD (guarda dados de clientes): política de privacidade, base legal, segurança. **Consultar advogado de PI antes de lançar**, sobretudo os textos de marketing.

---

## Frente 5 — Monetização e ponto de equilíbrio (CONCLUÍDA)

**Custo de infra é baixo no início:** Clerk grátis até 50 mil usuários/mês (subiu de 10 mil em fev/2026); Vercel e Neon têm planos gratuitos para a fase inicial.

**O que decide a margem é o canal de cobrança:**
- Loja de apps (assinatura in-app): comissão 15% (pequeno desenvolvedor). R$19 → ~R$16,15.
- Web/Pix (natural pro PWA): Mercado Pago 0,99% no Pix (0,49% p/ CNPJ faturando R$15k+/mês). R$19 → ~R$18,80. Pix Automático permite recorrência.

**Recomendações:**
- Cobrar pela **web com Pix Automático** (fica com ~99% em vez de 85%).
- Ponto de equilíbrio: ~R$18,80 líquidos/assinante → ~11 pagantes cobrem R$200/mês de infra. O gargalo não é custo, é **conversão grátis→pago** (~2–5%): ~100 pagantes exigem ~2.000–5.000 ativas no grátis.
- Modelar como **grátis para sempre (básico) + R$19 premium**, com os 6 meses grátis como promoção de entrada para a onda de órfãos.

---

## Status geral

Todas as 6 frentes concluídas. Próximo passo prático: implementar o **Sprint 0** (no Claude Code) — marca + preço de custo no produto, que destrava lucro e painel multimarca.
