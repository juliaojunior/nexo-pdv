import { NextResponse } from 'next/server';

// Chaves de nexo_settings expostas publicamente (vitrine sem login).
// Fonte única: usada pela rota /api/settings E pela página /c/[storeId].
export const PUBLIC_SETTINGS_KEYS = ['nexo_storeName', 'nexo_storePhone'];

// Erro 500 padrão: loga o detalhe no servidor e devolve mensagem genérica
// (não vaza nomes de tabela/coluna do Postgres para o cliente).
export function serverError(error: unknown) {
  console.error(error);
  return NextResponse.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 });
}
