import { NextResponse } from 'next/server';
import { cloudDb } from '@/lib/cloudDb';
import { auth } from '@clerk/nextjs/server';
import { isPaymentMethod } from '@/lib/payments';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await cloudDb.connect();

    // Schema garantido por /api/db-setup (migration única). Sem ALTERs no caminho quente.
    let rows;
    try {
      // Trazendo as vendas agrupadas com os itens usando JSON Aggregation do Postgres (Isso é rápido!)
      const result = await client.sql`
        SELECT
          s.id,
          s.total_amount as total,
          s.payment_method as "paymentMethod",
          s.customer_id as "customerId",
          s.amount_received as "amountReceived",
          s.change_returned as change,
          s.discount_total as "discountTotal",
          s.created_at as date,
          COALESCE(
            json_agg(
              json_build_object(
                'id', si.id,
                'productId', si.product_id,
                'productName', si.product_name,
                'quantity', si.quantity,
                'unitPrice', si.price_at_time,
                'unitCost', si.unit_cost,
                'discount', si.discount,
                'subtotal', si.subtotal
              )
            ) FILTER (WHERE si.id IS NOT NULL), '[]'
          ) AS items
        FROM nexo_sales s
        LEFT JOIN nexo_sale_items si ON s.id = si.sale_id
        WHERE s.user_id = ${userId}
        GROUP BY s.id
        ORDER BY s.created_at DESC;
      `;
      rows = result.rows;
    } finally {
      client.release();
    }

    return NextResponse.json(rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { total, paymentMethod, amountReceived, change, customerId, date, items, clientId } = body;

    // 0. Validação do método de pagamento contra o enum canônico (PaymentMethod)
    if (!isPaymentMethod(paymentMethod)) {
      return NextResponse.json({ error: `Forma de pagamento inválida: ${paymentMethod}` }, { status: 400 });
    }

    // 0. TRAVA DE ESTOQUE NEGATIVO (Bloqueia Reversing Math e inflação de estoque)
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Carrinho vazio ou inválido." }, { status: 400 });
    }

    // 0.2 Normaliza/valida cada item. O subtotal e o desconto são RECALCULADOS no
    // servidor (não confiamos no que o client mandou): desconto trava em [0, bruto].
    const normalizedItems = [] as Array<{
      productId: any; productName: any; quantity: number; unitPrice: number; unitCost: number; discount: number; subtotal: number;
    }>;
    for (const item of items) {
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
         return NextResponse.json({ error: `A quantidade do item ${item.productName || 'desconhecido'} é inválida ou negativa.` }, { status: 400 });
      }
      const unitPrice = Number(item.unitPrice);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
         return NextResponse.json({ error: `Preço inválido para ${item.productName || 'item desconhecido'}.` }, { status: 400 });
      }
      const gross = unitPrice * item.quantity;
      let discount = Number(item.discount) || 0;
      if (discount < 0) discount = 0;
      if (discount > gross) discount = gross; // desconto nunca passa do valor cheio da linha
      discount = Math.round(discount * 100) / 100;
      const subtotal = Math.round((gross - discount) * 100) / 100;
      // Custo do payload é só fallback (venda offline). O valor autoritativo é
      // congelado do nexo_products dentro da transação (ver loop abaixo).
      let unitCost = Number(item.unitCost);
      if (!Number.isFinite(unitCost) || unitCost < 0) unitCost = 0;
      unitCost = Math.round(unitCost * 100) / 100;
      normalizedItems.push({ productId: item.productId, productName: item.productName, quantity: item.quantity, unitPrice, unitCost, discount, subtotal });
    }

    // Totais confiáveis derivados dos itens normalizados (evita spoofing do total)
    const computedTotal = Math.round(normalizedItems.reduce((s, it) => s + it.subtotal, 0) * 100) / 100;
    const computedDiscountTotal = Math.round(normalizedItems.reduce((s, it) => s + it.discount, 0) * 100) / 100;

    // 0.1 Chave de idempotência opcional (vendas offline reenviadas pela fila)
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const safeClientId: string | null = typeof clientId === 'string' && UUID_RE.test(clientId) ? clientId : null;

    const client = await cloudDb.connect();

    // Schema garantido por /api/db-setup (migration única). Sem ALTERs no caminho quente.

    try {
      // 1.1 Dedupe: se esta venda já chegou antes (retry da fila), confirma sem tocar estoque
      if (safeClientId) {
        const dupe = await client.sql`
          SELECT id FROM nexo_sales WHERE client_id = ${safeClientId} AND user_id = ${userId} LIMIT 1;
        `;
        if (dupe.rows.length > 0) {
          return NextResponse.json({ success: true, id: dupe.rows[0].id, deduped: true }, { status: 200 });
        }
      }

      try {
        await client.sql`BEGIN`; // Inicia Transação Atômica

        // 2. Insere a Venda Primária (ON CONFLICT cobre corrida entre dois retries simultâneos)
        const saleResult = await client.sql`
          INSERT INTO nexo_sales (user_id, total_amount, payment_method, customer_id, amount_received, change_returned, created_at, client_id, discount_total)
          VALUES (${userId}, ${computedTotal}, ${paymentMethod}, ${customerId || null}, ${amountReceived || null}, ${change || null}, ${date || new Date().toISOString()}, ${safeClientId}, ${computedDiscountTotal})
          ON CONFLICT (client_id) DO NOTHING
          RETURNING id;
        `;
        if (saleResult.rows.length === 0) {
          // Outro retry venceu a corrida: desfaz e devolve a venda já existente
          await client.sql`ROLLBACK`;
          const existing = await client.sql`
            SELECT id FROM nexo_sales WHERE client_id = ${safeClientId} AND user_id = ${userId} LIMIT 1;
          `;
          return NextResponse.json({ success: true, id: existing.rows[0]?.id ?? null, deduped: true }, { status: 200 });
        }
        const newSaleId = saleResult.rows[0].id;

        // 3. Subtrai Estoque (congelando o custo) e insere os Itens
        for (const item of normalizedItems) {
          // unit_cost congelado: por padrão usa o custo do payload (fallback offline);
          // se o item tem produto, sobrescreve com o cost_price atual do servidor.
          let unitCost = item.unitCost;

          if (item.productId) {
            // Subtrai o estoque validando Criteriosamente Transações Concorrentes.
            // RETURNING traz o custo atual sem um SELECT extra.
            const { rows, rowCount } = await client.sql`
              UPDATE nexo_products
              SET stock = stock - ${item.quantity}
              WHERE id = ${item.productId} AND user_id = ${userId} AND stock >= ${item.quantity}
              RETURNING cost_price
            `;

            if (rowCount === 0) {
              // 409: falha permanente de negócio — a fila offline não deve re-tentar
              const err = new Error(`Estoque insuficiente para ${item.productName}.`) as Error & { status?: number };
              err.status = 409;
              throw err;
            }

            if (rows[0]?.cost_price != null) unitCost = Number(rows[0].cost_price);
          }

          await client.sql`
            INSERT INTO nexo_sale_items (sale_id, product_id, product_name, quantity, price_at_time, unit_cost, discount, subtotal)
            VALUES (${newSaleId}, ${item.productId || null}, ${item.productName}, ${item.quantity}, ${item.unitPrice}, ${unitCost}, ${item.discount}, ${item.subtotal})
          `;
        }

        await client.sql`COMMIT`; // Confirma Transação

        return NextResponse.json({ success: true, id: newSaleId }, { status: 201 });
      } catch (e: any) {
        await client.sql`ROLLBACK`; // Desfaz se houver algum erro no meio
        throw e;
      }
    } finally {
      client.release();
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.status ?? 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const saleId = searchParams.get('id');

    if (!saleId) return NextResponse.json({ error: "Missing sale id" }, { status: 400 });

    const client = await cloudDb.connect();

    try {
      try {
        await client.sql`BEGIN`;

        // 1. Pega os itens da venda antes de deletar, para podermos estornar o estoque
        const { rows: itemsToRestore } = await client.sql`
          SELECT product_id, quantity FROM nexo_sale_items WHERE sale_id = ${saleId}
        `;

        // 2. Apaga a venda (a tabela de itens será apagada automaticamente pelo ON DELETE CASCADE ou nos próximos passos manuais dependendo de como foi a FK)
        const { rowCount } = await client.sql`DELETE FROM nexo_sales WHERE id = ${saleId} AND user_id = ${userId}`;
        if (rowCount === 0) {
           throw new Error("Venda não encontrada ou sem permissão.");
        }

        // 3. Devolve os estoques pros produtos na prateleira!
        for (const item of itemsToRestore) {
          if (item.product_id) {
            await client.sql`
              UPDATE nexo_products
              SET stock = stock + ${item.quantity}
              WHERE id = ${item.product_id} AND user_id = ${userId}
            `;
          }
        }

        await client.sql`COMMIT`;

        return NextResponse.json({ success: true, message: "Venda estornada e itens devolvidos ao estoque." });
      } catch (e: any) {
        await client.sql`ROLLBACK`;
        throw e;
      }
    } finally {
      client.release();
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
