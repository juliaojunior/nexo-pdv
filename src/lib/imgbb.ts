export async function uploadImageToImgBB(base64DataUrl: string): Promise<string> {
  // O ImgBB não requer que seja base64 com a tag "data:image/jpeg;base64,"
  // Precisamos extrair apenas a string base64 pura.
  if (!base64DataUrl.includes("base64,")) {
    return base64DataUrl; // Já é uma URL hospedada (ou fallback)
  }

  const base64Data = base64DataUrl.split("base64,")[1];
  
  const formData = new FormData();
  formData.append("source", base64Data);
  formData.append("key", "6d207e02198a847aa98d0a2a901485a5"); // PWA Community Key from FreeImage.Host
  formData.append("action", "upload");

  try {
    const res = await fetch(`https://freeimage.host/api/1/upload`, {
      method: "POST",
      body: formData,
    });
    
    const data = await res.json();
    if (data.status_code === 200 && data.image && data.image.url) {
      return data.image.url; // Retorna o link curto oficial
    }
  } catch (error) {
    console.error("FreeImage Host Upload Failed:", error);
  }
  
  // Em caso de falha (ou sem internet para o upload), retorna o próprio base64 como Fallback offline.
  return base64DataUrl;
}
