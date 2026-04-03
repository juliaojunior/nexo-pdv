import { NextResponse } from 'next/server';
import { cloudDb } from '@/lib/cloudDb';

export async function GET() {
  try {
    // A chave mestra para criarmos planilhas na Nuvem
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

    return NextResponse.json({ 
      success: true, 
      message: "Tabela cloud_products gerada com sucesso na Nuvem!" 
    });
  } catch (error: any) {
    console.error("Erro ao inicializar DB:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
