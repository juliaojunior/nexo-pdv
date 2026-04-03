import { NextResponse } from 'next/server';
import { cloudDb } from '@/lib/cloudDb';

export async function GET() {
  try {
    // A chave mestra para criarmos planilhas na Nuvem
    // Tabela de Produtos
    await cloudDb.sql`
      CREATE TABLE IF NOT EXISTS cloud_products (
        cloud_id SERIAL PRIMARY KEY,
        local_id INTEGER UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        price NUMERIC(10, 2) NOT NULL,
        stock INTEGER NOT NULL,
        barcode VARCHAR(100),
        categoryId INTEGER,
        imageUrl TEXT,
        last_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Tabela de Categorias
    await cloudDb.sql`
      CREATE TABLE IF NOT EXISTS cloud_categories (
        cloud_id SERIAL PRIMARY KEY,
        local_id INTEGER UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        last_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Tabela de Clientes
    await cloudDb.sql`
      CREATE TABLE IF NOT EXISTS cloud_customers (
        cloud_id SERIAL PRIMARY KEY,
        local_id INTEGER UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        email VARCHAR(100),
        document VARCHAR(50),
        createdAt VARCHAR(50),
        last_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Tabela de Vendas
    await cloudDb.sql`
      CREATE TABLE IF NOT EXISTS cloud_sales (
        cloud_id SERIAL PRIMARY KEY,
        local_id INTEGER UNIQUE NOT NULL,
        total NUMERIC(10, 2) NOT NULL,
        paymentMethod VARCHAR(50) NOT NULL,
        amountReceived NUMERIC(10, 2),
        change NUMERIC(10, 2),
        customerId INTEGER,
        date VARCHAR(50),
        last_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Tabela de Itens da Venda
    await cloudDb.sql`
      CREATE TABLE IF NOT EXISTS cloud_sale_items (
        cloud_id SERIAL PRIMARY KEY,
        local_id INTEGER UNIQUE NOT NULL,
        saleId INTEGER NOT NULL,
        productId INTEGER NOT NULL,
        productName VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL,
        unitPrice NUMERIC(10, 2) NOT NULL,
        subtotal NUMERIC(10, 2) NOT NULL
      );
    `;

    return NextResponse.json({ 
      success: true, 
      message: "Todas as 5 Tabelas Gêmeas construídas no Cofre da Vercel!" 
    });
  } catch (error: any) {
    console.error("Erro ao inicializar DB:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
