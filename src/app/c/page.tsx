import { cloudDb } from '@/lib/cloudDb';
import CatalogClient from '@/components/CatalogClient';

export const revalidate = 0; // Garante que a Vitrine não sofra cache e exija dados em tempo real (Estoque real)

export default async function CatalogPage() {
  const client = await cloudDb.connect();

  // Extração Simultânea da Nuvem (Buscando das novas tabelas nexo_)
  const [pResult, cResult, sResult] = await Promise.all([
    client.sql`SELECT id as local_id, name, price, stock, category_id as categoryid, image_url as imageurl FROM nexo_products ORDER BY name ASC`.catch(() => ({ rows: [] })),
    client.sql`SELECT id as local_id, name FROM nexo_categories ORDER BY name ASC`.catch(() => ({ rows: [] })),
    client.sql`SELECT key, value FROM nexo_settings`.catch(() => ({ rows: [] }))
  ]);
  client.release();

  // Mapeamento dinâmico das configurações da loja (nome, zap)
  const settings: Record<string, string> = {};
  sResult.rows.forEach(row => {
    settings[row.key] = row.value;
  });

  return (
    <CatalogClient
      products={(pResult.rows as any[]) || []}
      categories={(cResult.rows as any[]) || []}
      settings={settings}
    />
  );
}

