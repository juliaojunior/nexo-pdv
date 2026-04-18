// 🛡️ AVISO DO AUDITOR DE SEGURANÇA:
// Você escolheu NEUTRALIZAR o vetor legado de sincronismo.
// Estes endpoints (/api/cloud/*) permitiam infiltração IDOR global sem checagem de Login.
// Apague estes diretórios `src/app/api/cloud` quando for oportuno.

export async function GET() {
  return new Response(JSON.stringify({ error: "Endpoint legacy offline. Security lock." }), { status: 403 });
}

export async function POST() {
  return new Response(JSON.stringify({ error: "Endpoint legacy offline. Security lock." }), { status: 403 });
}
