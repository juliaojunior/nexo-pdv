import { cloudDb } from '@/lib/cloudDb';
import CatalogClient from '@/components/CatalogClient';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

export const revalidate = 0; // Garante que a Vitrine não sofra cache e exija dados em tempo real (Estoque real)

// Função que muda a 'Cara' e o 'Texto' do Link quando ele é colado no WhatsApp
export async function generateMetadata(props: { params: Promise<{ storeId: string }> }): Promise<Metadata> {
  const params = await props.params;
  const storeId = params.storeId;
  const client = await cloudDb.connect();
  
  let storeName = "Nexo Loja";
  try {
     const res = await client.sql`SELECT value FROM nexo_settings WHERE user_id = ${storeId} AND key = 'nexo_storeName'`;
     if (res.rowCount && res.rows[0].value) storeName = res.rows[0].value;
  } catch(e) {}
  finally { client.release(); }

  const formattedName = `✨ ${storeName} ✨`;

  return {
    title: formattedName,
    description: `🚀 Acesse nosso Catálogo Digital Online e faça seu pedido agora mesmo!`,
    openGraph: {
       title: formattedName,
       description: `🚀 Acesse o nosso Catálogo Digital Online e faça o seu pedido de forma rápida!`,
       type: "website",
    }
  };
}

export default async function StoreCatalogPage(props: { params: Promise<{ storeId: string }> }) {
  const params = await props.params;
  const storeId = params.storeId;
  
  if (!storeId) return notFound();

  const client = await cloudDb.connect();

  try {
    // Extração Restrita! Apenas da Loja (storeId correspondente)
    const [pResult, cResult, sResult] = await Promise.all([
      client.sql`SELECT id as local_id, name, price, stock, category_id as categoryid, image_url as imageurl, promotional_price as "promotionalPrice", promotion_end_date as "promotionEndDate" FROM nexo_products WHERE user_id = ${storeId} ORDER BY name ASC`,
      client.sql`SELECT id as local_id, name FROM nexo_categories WHERE user_id = ${storeId} ORDER BY name ASC`,
      client.sql`SELECT key, value FROM nexo_settings WHERE user_id = ${storeId}`
    ]);

    // Oculta a vitrine se o usuário não tem tabela gerada / não existe
    if (sResult.rowCount === 0 && pResult.rowCount === 0) {
       return (
         <div className="min-h-screen bg-[#121212] flex items-center justify-center font-[Inter] text-white p-4 text-center">
            <div className="bg-[#1a1a1a] border border-[#484847]/30 p-8 rounded-3xl w-full max-w-sm flex flex-col gap-4">
              <h1 className="text-2xl font-black text-[#ff716c]">Loja Fechada</h1>
              <p className="text-[#adaaaa] text-sm font-medium">Não encontramos nenhum catálogo associado a este Link. Verifique a ortografia do link com o seu vendedor.</p>
            </div>
         </div>
       );
    }

    // Mapeamento dinâmico das configurações da loja (nome, zap)
    const settings: Record<string, string> = {};
    sResult.rows.forEach(row => {
      settings[row.key] = row.value;
    });

    return (
      <CatalogClient
        products={pResult.rows as any[]}
        categories={cResult.rows as any[]}
        settings={settings}
      />
    );
  } catch (err) {
    console.error(err);
    return notFound();
  } finally {
    client.release();
  }
}
