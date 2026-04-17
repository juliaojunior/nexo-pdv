import { cloudDb } from '@/lib/cloudDb';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storeId, customerName, customerPhone, paymentMethod, cartItems, total } = body;

    if (!storeId || !customerName || !cartItems || !total) {
      return NextResponse.json({ error: 'Faltam dados essenciais do pedido.' }, { status: 400 });
    }

    const client = await cloudDb.connect();

    // 1. Cria a Tabela se não existir!
    await client.sql`
      CREATE TABLE IF NOT EXISTS nexo_orders (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        payment_status VARCHAR(50) DEFAULT 'PENDING',
        order_status VARCHAR(50) DEFAULT 'PENDING',
        cart_items JSONB NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 2. Registra o Pedido na Tabela do Lojista (storeId == user_id)
    const result = await client.sql`
      INSERT INTO nexo_orders (
        user_id, customer_name, customer_phone, payment_method, cart_items, total_price
      ) VALUES (
        ${storeId}, ${customerName}, ${customerPhone}, ${paymentMethod}, ${JSON.stringify(cartItems)}, ${total}
      )
      RETURNING id
    `;

    client.release();
    return NextResponse.json({ success: true, orderId: result.rows[0].id });
  } catch (error: any) {
    console.error('Erro ao registrar pedido:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    // Apenas o Lojista pode ver seus pedidos (KDS)
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'PENDING';

    const client = await cloudDb.connect();
    
    const result = await client.sql`
      SELECT * FROM nexo_orders 
      WHERE user_id = ${userId} AND order_status = ${status}
      ORDER BY created_at ASC
    `;

    client.release();
    return NextResponse.json({ orders: result.rows });
  } catch (error: any) {
    console.error('Erro ao buscar pedidos:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
