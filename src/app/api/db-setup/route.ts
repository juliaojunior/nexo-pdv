import { NextResponse } from 'next/server';
import { cloudDb } from '@/lib/cloudDb';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    // Rota destrutiva (DROP/CREATE de tabelas globais): só admins explícitos.
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Permissão negada. Você precisa estar logado." }, { status: 401 });
    }

    const adminIds = (process.env.ADMIN_USER_IDS || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (!adminIds.includes(userId)) {
      return NextResponse.json({ error: "Permissão negada. Rota restrita a administradores." }, { status: 403 });
    }

    const client = await cloudDb.connect();

    try {
    // 1. Opcionalmente limpar as tabelas velhas de teste (se a gente ainda usasse as antigas, mas vamos criar novas com prefixo nexo_)
    await client.sql`DROP TABLE IF EXISTS cloud_products CASCADE;`;
    await client.sql`DROP TABLE IF EXISTS cloud_categories CASCADE;`;
    await client.sql`DROP TABLE IF EXISTS cloud_settings CASCADE;`;

    // 2. Tabela de Categorias
    await client.sql`
      CREATE TABLE IF NOT EXISTS nexo_categories (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 3. Tabela de Produtos (Mestre)
    await client.sql`
      CREATE TABLE IF NOT EXISTS nexo_products (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        price NUMERIC(10, 2) NOT NULL,
        stock INTEGER NOT NULL,
        barcode VARCHAR(100),
        category_id INTEGER REFERENCES nexo_categories(id) ON DELETE SET NULL,
        image_url TEXT,
        description TEXT,
        promotional_price NUMERIC(10, 2),
        promotion_end_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 4. Tabela de Configurações da Loja
    await client.sql`
      CREATE TABLE IF NOT EXISTS nexo_settings (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        key VARCHAR(100) NOT NULL,
        value TEXT NOT NULL,
        UNIQUE (user_id, key)
      );
    `;

    // 5. Tabelas de Vendas do Caixa (schema canônico — espelha o usado em /api/sales)
    await client.sql`
      CREATE TABLE IF NOT EXISTS nexo_sales (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        total_amount NUMERIC(10, 2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        customer_id INTEGER,
        amount_received NUMERIC(10, 2),
        change_returned NUMERIC(10, 2),
        client_id UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Índice único da chave de idempotência (dedupe de vendas reenviadas pela fila offline)
    await client.sql`CREATE UNIQUE INDEX IF NOT EXISTS nexo_sales_client_id_key ON nexo_sales (client_id);`;

    await client.sql`
      CREATE TABLE IF NOT EXISTS nexo_sale_items (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER REFERENCES nexo_sales(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES nexo_products(id) ON DELETE SET NULL,
        product_name VARCHAR(255),
        quantity INTEGER NOT NULL,
        price_at_time NUMERIC(10, 2) NOT NULL,
        subtotal NUMERIC(10, 2)
      );
    `;

    } finally {
      client.release();
    }

    return NextResponse.json({
      success: true,
      message: "Limpeza concluída! Tabelas 'nexo_' (Multi-Tenant) criadas com coluna user_id na raiz."
    });

  } catch (error: any) {
    console.error("DB Setup Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
