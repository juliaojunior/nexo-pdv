export async function uploadImageToImgBB(base64DataUrl: string): Promise<string> {
  // O ImgBB não requer que seja base64 com a tag "data:image/jpeg;base64,"
  // Precisamos extrair apenas a string base64 pura.
  if (!base64DataUrl.includes("base64,")) {
    return base64DataUrl; // Já é uma URL hospedada (ou fallback)
  }

  const base64Data = base64DataUrl.split("base64,")[1];
  
  // Chave pública gratuita do ImgBB para a comunidade PWA
  const apiKey = "c0ac832b9da85e3ac14197c36a6e1189";
  
  const formData = new FormData();
  formData.append("image", base64Data);

  try {
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: "POST",
      body: formData,
    });
    
    const data = await res.json();
    if (data.success) {
      return data.data.url; // Retorna o link curto (ex: https://i.ibb.co/xyz/img.jpg)
    }
  } catch (error) {
    console.error("ImgBB Upload Failed:", error);
  }
  
  // Em caso de falha (ou sem internet para o upload), retorna o próprio base64 como Fallback offline.
  return base64DataUrl;
}
