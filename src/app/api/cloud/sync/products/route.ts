// 🛡️ AVISO DO AUDITOR DE SEGURANÇA: Neutralizado (IDOR Risk)
export async function POST() {
  return new Response("Security Lock", { status: 403 });
}
