import { NextResponse } from 'next/server';
import { cloudDb } from '@/lib/cloudDb';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await cloudDb.connect();
    
    // Safety check para garantir que as colunas de promoção existam sem quebrar!
    await client.sql`ALTER TABLE nexo_products ADD COLUMN IF NOT EXISTS promotional_price NUMERIC(10, 2);`;
    await client.sql`ALTER TABLE nexo_products ADD COLUMN IF NOT EXISTS promotion_end_date TIMESTAMP;`;

    const { rows } = await client.sql`
      SELECT * FROM nexo_products 
      WHERE user_id = ${userId} 
      ORDER BY name ASC;
    `;
    client.release();
    
    return NextResponse.json(rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, price, stock, barcode, categoryId, image, promotionalPrice, promotionEndDate } = body;

    const client = await cloudDb.connect();

    // Safety check na inserção também
    await client.sql`ALTER TABLE nexo_products ADD COLUMN IF NOT EXISTS promotional_price NUMERIC(10, 2);`;
    await client.sql`ALTER TABLE nexo_products ADD COLUMN IF NOT EXISTS promotion_end_date TIMESTAMP;`;

    const { rows } = await client.sql`
      INSERT INTO nexo_products (user_id, name, price, stock, barcode, category_id, image_url, promotional_price, promotion_end_date)
      VALUES (${userId}, ${name}, ${price}, ${stock}, ${barcode || null}, ${categoryId || null}, ${image || null}, ${promotionalPrice || null}, ${promotionEndDate || null})
      RETURNING *;
    `;
    client.release();

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, name, price, stock, barcode, categoryId, image, promotionalPrice, promotionEndDate } = body;

    if (!id) return NextResponse.json({ error: "Product ID is required" }, { status: 400 });

    const client = await cloudDb.connect();
    
    await client.sql`ALTER TABLE nexo_products ADD COLUMN IF NOT EXISTS promotional_price NUMERIC(10, 2);`;
    await client.sql`ALTER TABLE nexo_products ADD COLUMN IF NOT EXISTS promotion_end_date TIMESTAMP;`;

    // Atualiza apenas os campos enviados no body
    const { rows } = await client.sql`
      UPDATE nexo_products 
      SET 
        name = COALESCE(${name}, name),
        price = COALESCE(${price}, price),
        stock = COALESCE(${stock}, stock),
        barcode = COALESCE(${barcode}, barcode),
        category_id = COALESCE(${categoryId}, category_id),
        image_url = COALESCE(${image}, image_url),
        promotional_price = COALESCE(${promotionalPrice}, promotional_price),
        promotion_end_date = COALESCE(${promotionEndDate}, promotion_end_date),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *;
    `;
    client.release();

    if (rows.length === 0) return NextResponse.json({ error: "Product not found or unauthorized" }, { status: 404 });

    return NextResponse.json(rows[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: "Product ID is required" }, { status: 400 });

    const client = await cloudDb.connect();
    const { rowCount } = await client.sql`DELETE FROM nexo_products WHERE id = ${id} AND user_id = ${userId}`;
    client.release();

    if (rowCount === 0) return NextResponse.json({ error: "Product not found or unauthorized" }, { status: 404 });

    return NextResponse.json({ success: true, message: "Produto deletado com sucesso!" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
