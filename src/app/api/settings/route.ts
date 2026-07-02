import { NextResponse } from 'next/server';
import { cloudDb } from '@/lib/cloudDb';
import { auth } from '@clerk/nextjs/server';
// Allow-list pública compartilhada com a vitrine (/c/[storeId]). Tudo fora dela
// só é devolvido para a própria loja autenticada — evita vazamento entre lojas.
import { PUBLIC_SETTINGS_KEYS, serverError } from '@/lib/serverApi';

// Lê as configurações do usuário da Nuvem
export async function GET(req: Request) {
  try {
    const { userId } = await auth();

    // Se não estiver logado, checa se tem param ?userId=... (Vindo da Vitrine Pública)
    const { searchParams } = new URL(req.url);
    const publicUserId = searchParams.get('userId');

    // Autenticado lê o próprio user_id; público lê via param (acesso restrito).
    const targetUserId = userId || publicUserId;
    const isPublic = !userId && !!publicUserId;

    if (!targetUserId) {
      return NextResponse.json({ error: "No userId provided" }, { status: 400 });
    }

    const client = await cloudDb.connect();

    let rows;
    try {
      const result = await client.sql`
        SELECT key, value FROM nexo_settings WHERE user_id = ${targetUserId};
      `;
      rows = result.rows;
    } finally {
      client.release();
    }

    // Converte de array [{key: 'name', value: 'LojaX'}] para Object {name: 'LojaX'}
    const settingsMap = rows.reduce((acc, row) => {
      // Requisição pública só enxerga a allow-list; autenticada vê tudo.
      if (isPublic && !PUBLIC_SETTINGS_KEYS.includes(row.key)) return acc;
      acc[row.key] = row.value;
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json(settingsMap);
  } catch (error) {
    return serverError(error);
  }
}

// Salva e Sincroniza Configurações na Nuvem
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json(); // { key: 'nexo_storeName', value: 'Minha Loja' }
    
    // Suporta Multi-Upsert (se for array) ou Upsert Singular (se for objeto)
    const settingsToUpdate = Array.isArray(body) ? body : [body];

    const client = await cloudDb.connect();

    try {
      await client.sql`BEGIN`;
      
      for (const setting of settingsToUpdate) {
        if (!setting.key || setting.value === undefined) continue;
        
        // Upsert Dinâmico: Se a chave já existir para o usuário, atualiza. Se não, insere.
        await client.sql`
          INSERT INTO nexo_settings (user_id, key, value)
          VALUES (${userId}, ${setting.key}, ${setting.value})
          ON CONFLICT (user_id, key) DO UPDATE 
          SET value = EXCLUDED.value;
        `;
      }

      await client.sql`COMMIT`;
    } catch (e) {
      await client.sql`ROLLBACK`;
      throw e;
    } finally {
      client.release();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError(error);
  }
}
