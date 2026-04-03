import { NextResponse } from 'next/server';
import { cloudDb } from '@/lib/cloudDb';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const client = await cloudDb.connect();

    // 1. Tenta inicializar tabelas caso venha direto sem init manual (O Terraplanador unificado)
    await client.sql`
      CREATE TABLE IF NOT EXISTS cloud_products ( cloud_id SERIAL PRIMARY KEY, local_id INTEGER UNIQUE NOT NULL, name VARCHAR(255) NOT NULL, price NUMERIC(10, 2) NOT NULL, stock INTEGER NOT NULL, barcode VARCHAR(100), categoryId INTEGER, imageUrl TEXT, last_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP );
    `;
    await client.sql`CREATE TABLE IF NOT EXISTS cloud_categories ( cloud_id SERIAL PRIMARY KEY, local_id INTEGER UNIQUE NOT NULL, name VARCHAR(255) NOT NULL, last_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`;
    await client.sql`CREATE TABLE IF NOT EXISTS cloud_customers ( cloud_id SERIAL PRIMARY KEY, local_id INTEGER UNIQUE NOT NULL, name VARCHAR(255) NOT NULL, phone VARCHAR(50), email VARCHAR(100), document VARCHAR(50), createdAt VARCHAR(50), last_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`;
    await client.sql`CREATE TABLE IF NOT EXISTS cloud_sales ( cloud_id SERIAL PRIMARY KEY, local_id INTEGER UNIQUE NOT NULL, total NUMERIC(10, 2) NOT NULL, paymentMethod VARCHAR(50) NOT NULL, amountReceived NUMERIC(10, 2), change NUMERIC(10, 2), customerId INTEGER, date VARCHAR(50), last_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`;
    await client.sql`CREATE TABLE IF NOT EXISTS cloud_sale_items ( cloud_id SERIAL PRIMARY KEY, local_id INTEGER UNIQUE NOT NULL, saleId INTEGER NOT NULL, productId INTEGER NOT NULL, productName VARCHAR(255) NOT NULL, quantity INTEGER NOT NULL, unitPrice NUMERIC(10, 2) NOT NULL, subtotal NUMERIC(10, 2) NOT NULL);`;
    await client.sql`CREATE TABLE IF NOT EXISTS cloud_settings ( local_id VARCHAR(50) PRIMARY KEY, value TEXT, last_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP );`;

    let sProd = 0, sCat = 0, sCus = 0, sSal = 0, sSet = 0;

    // Configurações (localStorage)
    if (payload.settings) {
      for (const [key, val] of Object.entries(payload.settings)) {
        await client.sql`INSERT INTO cloud_settings (local_id, value) VALUES (${key}, ${String(val)}) ON CONFLICT (local_id) DO UPDATE SET value = EXCLUDED.value, last_synced = CURRENT_TIMESTAMP;`;
        sSet++;
      }
    }

    // Categorias
    if (Array.isArray(payload.categories)) {
      for (const c of payload.categories) {
        await client.sql`INSERT INTO cloud_categories (local_id, name) VALUES (${c.id}, ${c.name}) ON CONFLICT (local_id) DO UPDATE SET name = EXCLUDED.name, last_synced = CURRENT_TIMESTAMP;`;
        sCat++;
      }
    }

    // Produtos - AQUI A CORREÇÂO DA IMAGEM (Dexie usa p.image e a nuvem imageUrl)
    if (Array.isArray(payload.products)) {
      for (const p of payload.products) {
        const productImg = p.image || p.imageUrl || null;
        await client.sql`INSERT INTO cloud_products (local_id, name, price, stock, barcode, categoryId, imageUrl) VALUES (${p.id}, ${p.name}, ${p.price}, ${p.stock}, ${p.barcode || null}, ${p.categoryId || null}, ${productImg}) ON CONFLICT (local_id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock, barcode = EXCLUDED.barcode, categoryId = EXCLUDED.categoryId, imageUrl = EXCLUDED.imageUrl, last_synced = CURRENT_TIMESTAMP;`;
        sProd++;
      }
    }


    // Clientes
    if (Array.isArray(payload.customers)) {
      for (const c of payload.customers) {
        await client.sql`INSERT INTO cloud_customers (local_id, name, phone, email, document, createdAt) VALUES (${c.id}, ${c.name}, ${c.phone || null}, ${c.email || null}, ${c.document || null}, ${c.createdAt || null}) ON CONFLICT (local_id) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, email = EXCLUDED.email, document = EXCLUDED.document, last_synced = CURRENT_TIMESTAMP;`;
        sCus++;
      }
    }

    // Vendas (Sales and Items)
    if (Array.isArray(payload.sales)) {
      for (const s of payload.sales) {
        await client.sql`INSERT INTO cloud_sales (local_id, total, paymentMethod, amountReceived, change, customerId, date) VALUES (${s.id}, ${s.total}, ${s.paymentMethod}, ${s.amountReceived || null}, ${s.change || null}, ${s.customerId || null}, ${s.date}) ON CONFLICT (local_id) DO UPDATE SET total = EXCLUDED.total, paymentMethod = EXCLUDED.paymentMethod, amountReceived = EXCLUDED.amountReceived, change = EXCLUDED.change, customerId = EXCLUDED.customerId, date = EXCLUDED.date, last_synced = CURRENT_TIMESTAMP;`;
        sSal++;
      }
    }
    
    if (Array.isArray(payload.saleItems)) {
      for (const si of payload.saleItems) {
        await client.sql`INSERT INTO cloud_sale_items (local_id, saleId, productId, productName, quantity, unitPrice, subtotal) VALUES (${si.id}, ${si.saleId}, ${si.productId}, ${si.productName}, ${si.quantity}, ${si.unitPrice}, ${si.subtotal}) ON CONFLICT (local_id) DO NOTHING;`;
      }
    }

    client.release();
    return NextResponse.json({ success: true, count: { products: sProd, categories: sCat, customers: sCus, sales: sSal } });
  } catch (error: any) {
    console.error('Unified Sync POST Error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const client = await cloudDb.connect();
    
    // Dispara leituras simultâneas para não gargalar o DB (catch no caso da tabela nao existir)
    const [p, c, cus, s, si, set] = await Promise.all([
      client.sql`SELECT * FROM cloud_products ORDER BY name ASC;`.catch(() => ({ rows: [] })),
      client.sql`SELECT * FROM cloud_categories ORDER BY name ASC;`.catch(() => ({ rows: [] })),
      client.sql`SELECT * FROM cloud_customers ORDER BY name ASC;`.catch(() => ({ rows: [] })),
      client.sql`SELECT * FROM cloud_sales ORDER BY cloud_id ASC;`.catch(() => ({ rows: [] })),
      client.sql`SELECT * FROM cloud_sale_items;`.catch(() => ({ rows: [] })),
      client.sql`SELECT * FROM cloud_settings;`.catch(() => ({ rows: [] }))
    ]);
    
    client.release();
    
    // Transforma o array de settings num dicionario { key: value }
    const settingsObj: Record<string, string> = {};
    for (const r of set.rows) {
      settingsObj[r.local_id] = r.value;
    }
    
    return NextResponse.json({ 
       success: true, 
       data: {
          products: p.rows,
          categories: c.rows,
          customers: cus.rows,
          sales: s.rows,
          saleItems: si.rows,
          settings: settingsObj
       }
    });
  } catch (error: any) {
     console.error('Unified Sync GET Error', error);
     return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
