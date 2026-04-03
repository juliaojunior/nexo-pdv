import { cloudDb } from '@/lib/cloudDb';
import CatalogClient from '@/components/CatalogClient';

export const revalidate = 0; // Garante que a Vitrine não sofra cache e exija dados em tempo real (Estoque real)

export default async function CatalogPage() {
  const client = await cloudDb.connect();
  
  // Extração Simuntânea da Nuvem
  const [pResult, cResult, sResult] = await Promise.all([
    client.sql`SELECT * FROM cloud_products ORDER BY name ASC`.catch(() => ({ rows: [] })),
    client.sql`SELECT * FROM cloud_categories ORDER BY name ASC`.catch(() => ({ rows: [] })),
    client.sql`SELECT * FROM cloud_settings`.catch(() => ({ rows: [] }))
  ]);
  client.release();

  // Mapeamento dinâmico das configurações da loja (nome, zap)
  const settings: Record<string, string> = {};
  sResult.rows.forEach(row => {
    settings[row.local_id] = row.value;
  });

  return (
    <CatalogClient 
      products={pResult.rows || []} 
      categories={cResult.rows || []} 
      settings={settings} 
    />
  );
}
