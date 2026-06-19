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

// Shape mínimo e isomórfico aceito pelas funções de promoção.
// Tolera number|string|null para cobrir tanto objetos do app (camelCase, números)
// quanto linhas cruas do Postgres já normalizadas na borda (strings).
type PriceLike = number | string | null | undefined;
export interface PromotionInput {
  price: PriceLike;
  promotionalPrice?: PriceLike;
  promotionEndDate?: string | Date | null;
}

/**
 * Verifica se o produto tem um preço promocional atrelado e válido (Data limite no futuro).
 * Fonte única de verdade — usada no client e no backend (anti price spoofing).
 */
export function isPromotionActive(product: PromotionInput): boolean {
  if (product.promotionalPrice == null || product.promotionalPrice === '' || !product.promotionEndDate) return false;

  const expireDate = new Date(product.promotionEndDate).getTime();
  if (Number.isNaN(expireDate)) return false;

  return Date.now() <= expireDate;
}

/**
 * Retorna o preço ativo do produto (Preço promocional se ativo, ou o preço de balcão normal se não).
 */
export function getEffectivePrice(product: PromotionInput): number {
  return isPromotionActive(product) ? Number(product.promotionalPrice) : Number(product.price);
}
