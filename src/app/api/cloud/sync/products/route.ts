import { NextResponse } from 'next/server';
import { cloudDb } from '@/lib/cloudDb';

export async function POST(req: Request) {
  try {
    const { products } = await req.json();

    if (!Array.isArray(products)) {
        return NextResponse.json({ error: "Payload no formato incorreto." }, { status: 400 });
    }

    // Abre os canos de conexão com o painel Vercel
    const client = await cloudDb.connect();
    
    // Força a criação da tabela "On the Fly" para evitar o "relation cloud_products does not exist" no primeiro sync
    await client.sql`
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

    let syncedCount = 0;

    // Loop de Upsert: Para cada produto local, empurra para a nuvem. 
    // Se o 'local_id' já existir lá, ele atualiza as alterações em vez de duplicar.
    for (const p of products) {
        await client.sql`
            INSERT INTO cloud_products (local_id, name, price, stock, barcode, categoryId, imageUrl, last_synced)
            VALUES (
              ${p.id}, 
              ${p.name}, 
              ${p.price}, 
              ${p.stock}, 
              ${p.barcode || null}, 
              ${p.categoryId || null}, 
              ${p.imageUrl || null}, 
              CURRENT_TIMESTAMP
            )
            ON CONFLICT (local_id) 
            DO UPDATE SET 
                name = EXCLUDED.name, 
                price = EXCLUDED.price, 
                stock = EXCLUDED.stock, 
                barcode = EXCLUDED.barcode, 
                categoryId = EXCLUDED.categoryId, 
                imageUrl = EXCLUDED.imageUrl,
                last_synced = CURRENT_TIMESTAMP;
        `;
        syncedCount++;
    }

    client.release(); // Sempre fechar o cano para não sobrecarregar o plano free

    return NextResponse.json({ success: true, count: syncedCount });
  } catch (error: any) {
    console.error("Cloud Sync Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
