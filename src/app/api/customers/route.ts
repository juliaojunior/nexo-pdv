import { NextResponse } from 'next/server';
import { cloudDb } from '@/lib/cloudDb';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';

// Cliente na nuvem. id é POR USUÁRIO (preservado do Dexie); chave (user_id, id).
const customerSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  document: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await cloudDb.connect();
    try {
      const { rows } = await client.sql`
        SELECT id, name, phone, email, document, created_at as "createdAt"
        FROM nexo_customers WHERE user_id = ${userId} ORDER BY name ASC;
      `;
      return NextResponse.json(rows);
    } finally {
      client.release();
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = customerSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados do cliente inválidos.", details: parsed.error.format() }, { status: 400 });
    }
    const { name, phone, email, document } = parsed.data;

    const client = await cloudDb.connect();
    try {
      // id = MAX(id)+1 por usuário, atômico no próprio INSERT...SELECT.
      // Em corrida (duplo submit), a PK (user_id,id) barra com 23505 → re-tenta.
      for (let attempt = 0; ; attempt++) {
        try {
          const { rows } = await client.sql`
            INSERT INTO nexo_customers (user_id, id, name, phone, email, document)
            SELECT ${userId}, COALESCE(MAX(id), 0) + 1, ${name}, ${phone || null}, ${email || null}, ${document || null}
            FROM nexo_customers WHERE user_id = ${userId}
            RETURNING id, name, phone, email, document, created_at as "createdAt";
          `;
          return NextResponse.json(rows[0], { status: 201 });
        } catch (e: any) {
          if (e?.code === '23505' && attempt < 4) continue; // colisão de id concorrente
          throw e;
        }
      }
    } finally {
      client.release();
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const id = Number(body.id);
    if (!Number.isInteger(id)) return NextResponse.json({ error: "ID do cliente é obrigatório." }, { status: 400 });

    const parsed = customerSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados do cliente inválidos.", details: parsed.error.format() }, { status: 400 });
    }
    const { name, phone, email, document } = parsed.data;

    const client = await cloudDb.connect();
    try {
      const { rows } = await client.sql`
        UPDATE nexo_customers SET
          name = COALESCE(${name ?? null}, name),
          phone = ${phone ?? null},
          email = ${email ?? null},
          document = ${document ?? null}
        WHERE user_id = ${userId} AND id = ${id}
        RETURNING id, name, phone, email, document, created_at as "createdAt";
      `;
      if (rows.length === 0) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
      return NextResponse.json(rows[0]);
    } finally {
      client.release();
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));
    if (!Number.isInteger(id)) return NextResponse.json({ error: "ID do cliente é obrigatório." }, { status: 400 });

    const client = await cloudDb.connect();
    try {
      const { rowCount } = await client.sql`
        DELETE FROM nexo_customers WHERE user_id = ${userId} AND id = ${id};
      `;
      if (rowCount === 0) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
