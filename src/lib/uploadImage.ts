// Sobe a foto do produto para o Vercel Blob via /api/upload (autenticado).
// Mesmo contrato do antigo uploadImageToImgBB: recebe data URL; se já for URL
// hospedada devolve como está; se o upload falhar, devolve o base64 (fallback
// offline — o produto salva com a imagem embutida).
export async function uploadProductImage(base64DataUrl: string): Promise<string> {
  if (!base64DataUrl.includes("base64,")) {
    return base64DataUrl; // Já é uma URL hospedada
  }

  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64DataUrl }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.url) return data.url;
    }
  } catch (error) {
    console.error("Upload de imagem falhou:", error);
  }

  return base64DataUrl;
}
