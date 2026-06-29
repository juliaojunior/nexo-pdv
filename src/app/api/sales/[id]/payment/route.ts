import { NextResponse } from 'next/server';
import { cloudDb } from '@/lib/cloudDb';
import { auth } from '@clerk/nextjs/server';

// Registra um pagamento (parcela) de uma venda fiado e incrementa amount_paid.
// Tudo numa transação: insere a parcela E atualiza o saldo, travado em [0, total].
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: saleId } = await props.params;
    const body = await req.json();

    const amount = Math.round((Number(body.amount) || 0) * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Valor do pagamento inválido." }, { status: 400 });
    }
    const note: string | null = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null;
    // paidAt opcional: permite lançar pagamento com data passada. Default = agora.
    const paidAt = typeof body.paidAt === 'string' && !Number.isNaN(Date.parse(body.paidAt))
      ? body.paidAt
      : new Date().toISOString();

    const client = await cloudDb.connect();
    try {
      try {
        await client.sql`BEGIN`;

        // Trava a linha da venda (FOR UPDATE) para o saldo não correr com pagamentos simultâneos
        const { rows } = await client.sql`
          SELECT total_amount, amount_paid, payment_method
          FROM nexo_sales WHERE id = ${saleId} AND user_id = ${userId} FOR UPDATE
        `;
        if (rows.length === 0) {
          await client.sql`ROLLBACK`;
          return NextResponse.json({ error: "Venda não encontrada ou sem permissão." }, { status: 404 });
        }

        const sale = rows[0];
        if (sale.payment_method !== 'Fiado') {
          await client.sql`ROLLBACK`;
          return NextResponse.json({ error: "Só vendas fiado aceitam registro de pagamento." }, { status: 400 });
        }

        const total = Number(sale.total_amount);
        const paid = Number(sale.amount_paid);
        const remaining = Math.round((total - paid) * 100) / 100;
        if (amount > remaining + 0.001) {
          await client.sql`ROLLBACK`;
          return NextResponse.json({ error: `Valor acima do saldo devedor (${remaining.toFixed(2)}).` }, { status: 400 });
        }

        await client.sql`
          INSERT INTO nexo_sale_payments (sale_id, user_id, amount, paid_at, note)
          VALUES (${saleId}, ${userId}, ${amount}, ${paidAt}, ${note})
        `;

        // LEAST garante que nunca passe do total mesmo com arredondamento
        const { rows: upd } = await client.sql`
          UPDATE nexo_sales
          SET amount_paid = LEAST(total_amount, amount_paid + ${amount})
          WHERE id = ${saleId} AND user_id = ${userId}
          RETURNING total_amount, amount_paid
        `;

        await client.sql`COMMIT`;

        const newPaid = Number(upd[0].amount_paid);
        const newTotal = Number(upd[0].total_amount);
        return NextResponse.json({
          success: true,
          amountPaid: newPaid,
          balance: Math.round((newTotal - newPaid) * 100) / 100,
        }, { status: 201 });
      } catch (e) {
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

// Estorna um pagamento (erro de digitação): apaga a parcela e decrementa amount_paid.
export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: saleId } = await props.params;
    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get('paymentId');
    if (!paymentId) return NextResponse.json({ error: "paymentId é obrigatório." }, { status: 400 });

    const client = await cloudDb.connect();
    try {
      try {
        await client.sql`BEGIN`;

        const { rows } = await client.sql`
          SELECT amount FROM nexo_sale_payments
          WHERE id = ${paymentId} AND sale_id = ${saleId} AND user_id = ${userId} FOR UPDATE
        `;
        if (rows.length === 0) {
          await client.sql`ROLLBACK`;
          return NextResponse.json({ error: "Pagamento não encontrado ou sem permissão." }, { status: 404 });
        }
        const amount = Number(rows[0].amount);

        await client.sql`DELETE FROM nexo_sale_payments WHERE id = ${paymentId} AND user_id = ${userId}`;

        // GREATEST evita saldo pago negativo por arredondamento
        const { rows: upd } = await client.sql`
          UPDATE nexo_sales
          SET amount_paid = GREATEST(0, amount_paid - ${amount})
          WHERE id = ${saleId} AND user_id = ${userId}
          RETURNING total_amount, amount_paid
        `;

        await client.sql`COMMIT`;

        const newPaid = Number(upd[0].amount_paid);
        const newTotal = Number(upd[0].total_amount);
        return NextResponse.json({
          success: true,
          amountPaid: newPaid,
          balance: Math.round((newTotal - newPaid) * 100) / 100,
        });
      } catch (e) {
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
