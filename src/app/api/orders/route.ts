import { cloudDb } from '@/lib/cloudDb';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getEffectivePrice } from '@/lib/utils';
import { serverError } from '@/lib/serverApi';

export async function POST(request: Request) {
  try {
    // Na Vercel o x-forwarded-for é escrito pela plataforma (não spoofável pelo cliente)
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'ip-desconhecido';
    const MAX_REQUESTS = 3; // Max 3 pedidos por minuto por IP

    const body = await request.json();
    const { storeId, customerName, customerPhone, paymentMethod, cartItems } = body;

    if (!storeId || !customerName || !cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return NextResponse.json({ error: 'Faltam dados essenciais do pedido.' }, { status: 400 });
    }

    // 1. TRAVA DE ESTOQUE NEGATIVO (Bloqueia hackers tentando enviar quantidade negativa)
    for (const item of cartItems) {
      // Inteiro com teto: rota pública — sem isso, quantidade fracionada ou
      // absurda estoura o DECIMAL(10,2) do total e vira 500.
      if (!Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > 9999) {
         return NextResponse.json({ error: `A quantidade do item ${item.name || 'desconhecido'} é inválida.` }, { status: 400 });
      }
    }

    const client = await cloudDb.connect();
    try {
      // 0. RATE LIMITING persistente por IP (janela fixa de 60s) no próprio Postgres:
      // o contador sobrevive a cold starts e vale para todas as instâncias serverless.
      // Upsert atômico — sem corrida entre requisições simultâneas.
      // ponytail: janela fixa em SQL cobre spam/flood casual; migrar p/ Upstash/Redis
      // se pedidos públicos escalarem a ponto de pesar no banco.
      if (clientIp !== 'ip-desconhecido') {
        await client.sql`
          CREATE TABLE IF NOT EXISTS nexo_rate_limit (
            key TEXT PRIMARY KEY,
            count INTEGER NOT NULL,
            window_start TIMESTAMPTZ NOT NULL
          )
        `;
        const { rows: rl } = await client.sql`
          INSERT INTO nexo_rate_limit (key, count, window_start)
          VALUES (${'orders:' + clientIp}, 1, NOW())
          ON CONFLICT (key) DO UPDATE SET
            count = CASE WHEN nexo_rate_limit.window_start < NOW() - INTERVAL '60 seconds'
                         THEN 1 ELSE nexo_rate_limit.count + 1 END,
            window_start = CASE WHEN nexo_rate_limit.window_start < NOW() - INTERVAL '60 seconds'
                                THEN NOW() ELSE nexo_rate_limit.window_start END
          RETURNING count;
        `;
        if (rl[0].count > MAX_REQUESTS) {
          return NextResponse.json({ error: 'Muitos pedidos seguidos. Aguarde 1 minuto para enviar um novo pedido.' }, { status: 429 });
        }
      }

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

      // 1.5 Valida que a loja existe (evita pedidos-fantasma com storeId arbitrário)
      const storeCheck = await client.sql`
        SELECT 1 FROM nexo_products WHERE user_id = ${storeId} LIMIT 1;
      `;
      if (storeCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Loja inválida ou sem produtos cadastrados.' }, { status: 404 });
      }

      // 2. ANTI PRICE SPOOFING (Cálculo real de preços usando o Banco Blindado)
      let realTotalPrice = 0;
      const realCartItems = [];

      for (const item of cartItems) {
         if (!item.productId) continue;

         const { rows } = await client.sql`SELECT name, price, promotional_price, promotion_end_date FROM nexo_products WHERE id = ${item.productId} AND user_id = ${storeId}`;

         if (rows.length === 0) {
            return NextResponse.json({ error: `Produto indisponível ou apagado. ID: ${item.productId}` }, { status: 404 });
         }

         // Fonte única de verdade de preço promocional (mesma usada no client). Ver getEffectivePrice.
         const productRealPrice = getEffectivePrice({
           price: rows[0].price,
           promotionalPrice: rows[0].promotional_price,
           promotionEndDate: rows[0].promotion_end_date,
         });

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

      return NextResponse.json({ success: true, orderId: result.rows[0].id, realTotal: realTotalPrice });
    } finally {
      client.release();
    }
  } catch (error) {
    return serverError(error);
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
    try {
      const result = await client.sql`
        SELECT * FROM nexo_orders
        WHERE user_id = ${userId} AND order_status = ${status}
        ORDER BY created_at ASC
      `;
      return NextResponse.json({ orders: result.rows });
    } finally {
      client.release();
    }
  } catch (error) {
    return serverError(error);
  }
}
