import type { Product } from '@/db/db';

/**
 * Formata um valor numérico para a moeda Real Brasileiro (BRL).
 * Ex: 12.9 -> "R$ 12,90"
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Verifica se o produto tem um preço promocional atrelado e válido (Data limite no futuro)
 */
export function isPromotionActive(product: Pick<Product, 'promotionalPrice' | 'promotionEndDate'>): boolean {
  if (product.promotionalPrice == null || !product.promotionEndDate) return false;
  
  const expireDate = new Date(product.promotionEndDate).getTime();
  const now = Date.now();
  
  return now <= expireDate;
}

/**
 * Retorna o preço ativo do produto (Preço promocional se ativo, ou o preço de balcão normal se não).
 */
export function getEffectivePrice(product: Pick<Product, 'price' | 'promotionalPrice' | 'promotionEndDate'>): number {
  return isPromotionActive(product) ? product.promotionalPrice! : product.price;
}
