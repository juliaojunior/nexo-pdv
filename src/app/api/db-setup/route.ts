import { NextResponse } from 'next/server';
import { cloudDb } from '@/lib/cloudDb';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    // Autenticação para segurança (Apenas logados podem recriar/rodar setup)
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Permissão negada. Você precisa estar logado." }, { status: 401 });
    }

    const client = await cloudDb.connect();

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

    // 5. Tabelas de Vendas do Caixa
    await client.sql`
      CREATE TABLE IF NOT EXISTS nexo_sales (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        total_amount NUMERIC(10, 2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.sql`
      CREATE TABLE IF NOT EXISTS nexo_sale_items (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER REFERENCES nexo_sales(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES nexo_products(id) ON DELETE SET NULL,
        quantity INTEGER NOT NULL,
        price_at_time NUMERIC(10, 2) NOT NULL
      );
    `;

    client.release();

    return NextResponse.json({ 
      success: true, 
      message: "Limpeza concluída! Tabelas 'nexo_' (Multi-Tenant) criadas com coluna user_id na raiz." 
    });

  } catch (error: any) {
    console.error("DB Setup Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
