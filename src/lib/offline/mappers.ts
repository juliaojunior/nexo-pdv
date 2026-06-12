// Converte a row do Postgres (snake_case) para o shape camelCase usado nas telas
export interface ProductView {
  id: number;
  name: string;
  price: number;
  stock: number;
  barcode?: string;
  categoryId?: number;
  image?: string;
  promotionalPrice?: number;
  promotionEndDate?: string;
  description?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapProductRow(p: any): ProductView {
  return {
    id: p.id,
    name: p.name,
    price: Number(p.price),
    stock: p.stock,
    barcode: p.barcode,
    categoryId: p.category_id,
    image: p.image_url,
    promotionalPrice: p.promotional_price ? Number(p.promotional_price) : undefined,
    promotionEndDate: p.promotion_end_date,
    description: p.description,
  };
}
