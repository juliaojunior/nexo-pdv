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
  unitPrice: number;
  subtotal: number;
}

// ===== Offline-first (v2) =====

// Payload espelha exatamente o body aceito pelo POST /api/sales
export interface SalePayloadItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface SalePayload {
  clientId: string; // UUID gerado no aparelho — chave de idempotência no servidor
  total: number;
  paymentMethod: PaymentMethod;
  amountReceived?: number;
  change?: number;
  customerId?: number;
  date: string;
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

  // Realiza o fluxo atômico da venda garantindo a integridade dos dados
  async finalizeSale(saleData: Omit<Sale, 'id'>, items: Omit<SaleItem, 'id' | 'saleId'>[]) {
    // Escopo da transação (qualquer erro lança abort em todas as tabelas citadas)
    return await this.transaction('rw', this.sales, this.saleItems, this.products, async () => {
      // 1. Salva o registro da venda
      const saleId = await this.sales.add(saleData) as number;

      // 2. Salva os items e desconta do estoque
      for (const item of items) {
        const product = await this.products.get(item.productId);
        
        if (!product) {
          throw new Error(`Produto não encontrado: ${item.productName}`);
        }

        // Aborta a transação lançando um erro customizado se tentar vender mais que o estoque atual
        if (product.stock < item.quantity) {
          throw new Error(`Estoque insuficiente para o produto: ${product.name}. Disponível: ${product.stock}`);
        }

        // Grava o item vinculado à venda recém criada
        await this.saleItems.add({
          ...item,
          saleId
        });

        // Efetua a atualização (decremento) de estoque
        await this.products.update(item.productId, {
          stock: product.stock - item.quantity,
          updatedAt: new Date().toISOString()
        });
      }

      // Se todas as Promises passaram, o motor do Dexie consolida o commit e retorna o id da venda.
      return saleId;
    });
  }

  // Estorno Seguro de Venda (Reestabelece estoque e apaga histórico)
  async revertSale(saleId: number) {
    return await this.transaction('rw', this.sales, this.saleItems, this.products, async () => {
      // Puxa todos os items associados daquela venda especifica
      const items = await this.saleItems.where('saleId').equals(saleId).toArray();

      // Devolve a quantidade de cada item de volta pro estoque físico da Vitrine
      for (const item of items) {
        const product = await this.products.get(item.productId);
        if (product) {
          await this.products.update(item.productId, {
             stock: product.stock + item.quantity,
             updatedAt: new Date().toISOString()
          });
        }
      }

      // Expulsa os items e a venda inteira da base de dados local
      await this.saleItems.where('saleId').equals(saleId).delete();
      await this.sales.delete(saleId);
    });
  }
}

// Export a robust singleton instance of the database
export const db = new NexoPDVDexie();
