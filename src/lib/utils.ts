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
