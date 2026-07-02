import { NextResponse } from 'next/server';
import { cloudDb } from '@/lib/cloudDb';
import { auth } from '@clerk/nextjs/server';
import { serverError } from '@/lib/serverApi';

// Migração única dos clientes locais (Dexie) para a nuvem, PRESERVANDO o id por-usuário.
// Idempotente: ON CONFLICT (user_id, id) DO NOTHING. Não sobrescreve o que já existe.
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Esperado um array de clientes." }, { status: 400 });
    }

    let migrated = 0;
    const client = await cloudDb.connect();
    try {
      for (const c of body) {
        const id = Number(c?.id);
        const name = typeof c?.name === 'string' ? c.name.trim() : '';
        if (!Number.isInteger(id) || id <= 0 || !name) continue; // ignora entradas inválidas

        const { rowCount } = await client.sql`
          INSERT INTO nexo_customers (user_id, id, name, phone, email, document, created_at)
          VALUES (
            ${userId}, ${id}, ${name},
            ${c.phone || null}, ${c.email || null}, ${c.document || null},
            ${c.createdAt || new Date().toISOString()}
          )
          ON CONFLICT (user_id, id) DO NOTHING;
        `;
        migrated += rowCount ?? 0;
      }
    } finally {
      client.release();
    }

    return NextResponse.json({ success: true, migrated });
  } catch (error) {
    return serverError(error);
  }
}
