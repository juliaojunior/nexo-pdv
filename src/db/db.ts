import Dexie, { type Table } from 'dexie';

// Enum canônico de pagamento mora em módulo isomórfico (sem Dexie) e é reexportado
// aqui por conveniência dos consumidores client. Ver [[payments]].
export { PAYMENT_METHODS, type PaymentMethod } from '@/lib/payments';
import type { PaymentMethod } from '@/lib/payments';

export interface Category {
  id?: number;
  name: string;
}

export interface Product {
  id?: number;
  name: string;
  categoryId: number;
  price: number;
  promotionalPrice?: number;
  promotionEndDate?: string;
  barcode?: string;
  image?: string; // Compressed Base64 string for PWA local storage
  stock: number;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id?: number;
  name: string;
  phone?: string;
  email?: string;
  document?: string; // CPF or CNPJ
  createdAt: string;
}

export interface Sale {
  id?: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountReceived?: number;
  change?: number;
  customerId?: number;
  date: string;
}

export interface SaleItem {
  id?: number;
  saleId: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;   // preço cheio unitário
  discount?: number;   // desconto da linha em R$ (0 = sem desconto)
  subtotal: number;    // líquido da linha: unitPrice*quantity - discount
}

// ===== Offline-first (v2) =====

// Payload espelha exatamente o body aceito pelo POST /api/sales
export interface SalePayloadItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;   // preço cheio unitário
  discount?: number;   // desconto da linha em R$ (0 = sem desconto)
  subtotal: number;    // líquido da linha: unitPrice*quantity - discount
}

export interface SalePayload {
  clientId: string; // UUID gerado no aparelho — chave de idempotência no servidor
  total: number;
  paymentMethod: PaymentMethod;
  amountReceived?: number;
  change?: number;
  customerId?: number;
  date: string;
  discountTotal?: number; // soma dos descontos das linhas (R$)
  items: SalePayloadItem[];
}

// Venda feita sem conexão, aguardando envio ao servidor
export interface PendingSale {
  clientId: string;
  payload: SalePayload;
  customerName?: string;
  createdAt: string;
  attempts: number;
  lastError?: string;
  status: 'pending' | 'failed'; // failed = rejeitada pelo servidor, exige revisão
}

// Última resposta boa de um GET de API, para servir leituras offline
export interface ApiCacheEntry {
  url: string;
  data: unknown;
  updatedAt: number;
}

export class NexoPDVDexie extends Dexie {
  // ponytail: LEGADO NÃO USADO — categories/products/sales/saleItems eram a base local
  // pré-offline-first; hoje a fonte da verdade é o servidor (/api/*). Ficam vazias e
  // sem leitura/escrita. Não migrar só por limpeza: um version(3) de delete roda no
  // aparelho de cada usuário e mexe no mesmo banco de `customers`/`pendingSales` (dados
  // ainda não sincronizados). Remover só num bump de schema já necessário por outro motivo.
  // Em uso de fato: customers, pendingSales, apiCache.
  categories!: Table<Category, number>;
  products!: Table<Product, number>;
  customers!: Table<Customer, number>;
  sales!: Table<Sale, number>;
  saleItems!: Table<SaleItem, number>;
  pendingSales!: Table<PendingSale, string>;
  apiCache!: Table<ApiCacheEntry, string>;

  constructor() {
    super('NexoPDVDatabase');

    // Define the schema and primary keys/indexes for the database
    this.version(1).stores({
      categories: '++id, name',
      products: '++id, name, categoryId, barcode',
      customers: '++id, name, document',
      sales: '++id, date, customerId',
      saleItems: '++id, saleId, productId'
    });

    // v2: fila de vendas offline + cache de leituras da API
    this.version(2).stores({
      pendingSales: 'clientId, createdAt, status',
      apiCache: 'url'
    });
  }
}

// Export a robust singleton instance of the database
export const db = new NexoPDVDexie();
