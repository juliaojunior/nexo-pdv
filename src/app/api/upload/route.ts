import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { put } from '@vercel/blob';
import { serverError } from '@/lib/serverApi';

// Upload de foto de produto para o Vercel Blob (substitui o FreeImage.host:
// terceiro sem deleção nem controle). Recebe data URL base64 do form.
const MAX_BYTES = 5 * 1024 * 1024; // fotos já chegam comprimidas do client
const MIME_RE = /^data:(image\/(?:jpeg|png|webp|gif));base64,/;

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { image } = await req.json();
    const match = typeof image === 'string' ? image.match(MIME_RE) : null;
    if (!match) {
      return NextResponse.json({ error: 'Imagem inválida.' }, { status: 400 });
    }

    const contentType = match[1];
    const buffer = Buffer.from(image.slice(match[0].length), 'base64');
    if (buffer.length === 0 || buffer.length > MAX_BYTES) {
      return NextResponse.json({ error: 'Imagem vazia ou grande demais (máx. 5MB).' }, { status: 400 });
    }

    const ext = contentType.split('/')[1];
    const blob = await put(`products/${userId}/${crypto.randomUUID()}.${ext}`, buffer, {
      access: 'public',
      contentType,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    return serverError(error);
  }
}
