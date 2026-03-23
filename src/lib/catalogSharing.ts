import LZString from "lz-string";
import type { Product, Category } from "@/db/db";
import { getEffectivePrice } from "./utils";

export function generateCatalogLink(products: Product[], categories: Category[]): string {
    // Minimiza para Arrays posicionais (em vez de Chave/Valor do Object) para altíssima compressão baseando em WhatsApp limits
    const minimalProducts = products.filter(p => p.stock > 0).map(p => {
         const price = getEffectivePrice(p);
         // Se a imagem for uma URL externa (Como o ImgBB), enviamos no link.
         // Se for um Base64 monstruoso (legacy local database ou offline), limamos ela para não explodir a URL.
         const cleanImage = (p.image && p.image.startsWith("http")) ? p.image : "";
         
         return [
             p.id, 
             p.categoryId, 
             p.name, 
             price, 
             p.stock, 
             cleanImage
         ];
    });
    
    // Mapeia Cats de forma simples "Id:Name"
    const cats = categories.map(c => [c.id, c.name]);

    const payload = JSON.stringify({ p: minimalProducts, c: cats });
    
    // Transformação LZ77 Algoritmo - Codificado e Seguro para URIs de navegadores web!
    const compressed = LZString.compressToEncodedURIComponent(payload);
    
    const baseUrl = window.location.origin;
    return `${baseUrl}/menu?data=${compressed}`;
}

export function parseCatalogLink(compressedData: string): { products: any[], categories: any[] } | null {
   try {
       // Conserta o bug do URLSearchParams/Browser que esmaga caracteres de '+' contidos na URI por ' ' (espaços em branco) 
       const safeData = compressedData.replace(/ /g, "+");
       const decompressed = LZString.decompressFromEncodedURIComponent(safeData);
       if (!decompressed) {
          console.error("Null decompressed data. Input was:", safeData);
          return null;
       }
       
       const parsed = JSON.parse(decompressed);
       
       const categories = parsed.c.map((c: any) => ({
           id: c[0],
           name: c[1]
       }));

       const products = parsed.p.map((item: any) => ({
           id: item[0],
           categoryId: item[1],
           name: item[2],
           price: item[3],
           stock: item[4],
           image: item[5] || undefined,
       }));
       
       return { products, categories };
   } catch (error) {
       console.error("Link corrompido ou payload do WhatsApp falhou:", error);
       return null;
   }
}
