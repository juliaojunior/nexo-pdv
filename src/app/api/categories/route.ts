import { NextResponse } from 'next/server';
import { cloudDb } from '@/lib/cloudDb';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await cloudDb.connect();
    const { rows } = await client.sql`
      SELECT * FROM nexo_categories 
      WHERE user_id = ${userId} 
      ORDER BY name ASC;
    `;
    client.release();
    
    return NextResponse.json(rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { z } from 'zod';

const categorySchema = z.object({
  name: z.string().min(2, "Nome da categoria precisa ter ao menos 2 caracteres").max(50, "Nome muito longo")
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parseResult = categorySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: "Nome de categoria inválido.", details: parseResult.error.format() }, { status: 400 });
    }

    const { name } = parseResult.data;

    const client = await cloudDb.connect();
    const { rows } = await client.sql`
      INSERT INTO nexo_categories (user_id, name)
      VALUES (${userId}, ${name})
      RETURNING *;
    `;
    client.release();

    return NextResponse.json(rows[0], { status: 201 });
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

    if (!id) return NextResponse.json({ error: "Category ID is required" }, { status: 400 });

    const client = await cloudDb.connect();
    const { rowCount } = await client.sql`DELETE FROM nexo_categories WHERE id = ${id} AND user_id = ${userId}`;
    client.release();

    if (rowCount === 0) return NextResponse.json({ error: "Category not found or unauthorized" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
