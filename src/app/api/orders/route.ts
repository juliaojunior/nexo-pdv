import { cloudDb } from '@/lib/cloudDb';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Map em memória para agir como Rate Limiter rápido (Defesa contra DoS / Spam)
const rateLimitMap = new Map<string, { count: number, lastTime: number }>();

export async function POST(request: Request) {
  try {
    // 0. RATE LIMITING (Anti-Spam DDoS na Vitrine)
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 'ip-desconhecido';
    const now = Date.now();
    const WINDOW_MS = 60 * 1000; // 1 minuto
    const MAX_REQUESTS = 3; // Max 3 pedidos por minuto por IP

    if (clientIp !== 'ip-desconhecido') {
       const rateData = rateLimitMap.get(clientIp);
       if (rateData) {
          if (now - rateData.lastTime < WINDOW_MS) {
             if (rateData.count >= MAX_REQUESTS) {
                return NextResponse.json({ error: 'Muitos pedidos seguidos. Aguarde 1 minuto para enviar um novo pedido.' }, { status: 429 });
             }
             rateData.count += 1;
          } else {
             // Reset após o tempo passar
             rateLimitMap.set(clientIp, { count: 1, lastTime: now });
          }
       } else {
          rateLimitMap.set(clientIp, { count: 1, lastTime: now });
       }
    }

    const body = await request.json();
    const { storeId, customerName, customerPhone, paymentMethod, cartItems } = body;

    if (!storeId || !customerName || !cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return NextResponse.json({ error: 'Faltam dados essenciais do pedido.' }, { status: 400 });
    }

    // 1. TRAVA DE ESTOQUE NEGATIVO (Bloqueia hackers tentando enviar quantidade negativa)
    for (const item of cartItems) {
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
         return NextResponse.json({ error: `A quantidade do item ${item.name || 'desconhecido'} é inválida.` }, { status: 400 });
      }
    }

    const client = await cloudDb.connect();

    // Cria a Tabela se não existir (Mantido)
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

    // 2. ANTI PRICE SPOOFING (Cálculo real de preços usando o Banco Blindado)
    let realTotalPrice = 0;
    const realCartItems = [];

    for (const item of cartItems) {
       if (!item.productId) continue;

       const { rows } = await client.sql`SELECT name, price, promotional_price, promotion_end_date FROM nexo_products WHERE id = ${item.productId} AND user_id = ${storeId}`;
       
       if (rows.length === 0) {
          client.release();
          return NextResponse.json({ error: `Produto indisponível ou apagado. ID: ${item.productId}` }, { status: 404 });
       }

       let productRealPrice = Number(rows[0].price);
       
       // Aplica a promoção se existir e estiver no prazo válido
       if (rows[0].promotional_price && rows[0].promotion_end_date) {
          const promoExpire = new Date(rows[0].promotion_end_date).getTime();
          if (Date.now() <= promoExpire) {
             productRealPrice = Number(rows[0].promotional_price);
          }
       }

       realTotalPrice += productRealPrice * item.quantity;

       realCartItems.push({
         productId: item.productId,
         name: rows[0].name, // Usa o nome real do banco pra evitar spoofing de nomes!
         price: productRealPrice,
         quantity: item.quantity
       });
    }

    // 3. Registra o Pedido na Tabela do Lojista COM PREÇOS REAIS CALCUADOS
    const result = await client.sql`
      INSERT INTO nexo_orders (
        user_id, customer_name, customer_phone, payment_method, cart_items, total_price
      ) VALUES (
        ${storeId}, ${customerName}, ${customerPhone}, ${paymentMethod}, ${JSON.stringify(realCartItems)}, ${realTotalPrice}
      )
      RETURNING id
    `;

    client.release();
    return NextResponse.json({ success: true, orderId: result.rows[0].id, realTotal: realTotalPrice });
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
