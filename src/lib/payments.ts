// Enum canônico de formas de pagamento. Fonte única de verdade para gravação de
// vendas (nexo_sales), filtros e badges de relatório. Isomórfico (sem dependências
// de client/Dexie) para poder ser validado também no backend (/api/sales).
export const PAYMENT_METHODS = ['Dinheiro', 'PIX', 'Crédito', 'Débito', 'Fiado'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === 'string' && (PAYMENT_METHODS as readonly string[]).includes(value);
}
