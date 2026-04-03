"use client";

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Category } from "@/db/db";
import { ChevronLeft, Store, Tags, Smartphone, Volume2, Trash2, Edit3, Plus, ArrowLeft, X, Cloud, CloudLightning } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function SettingsPage() {
  const router = useRouter();

  // ======= BLOCO 1: DADOS DA LOJA =======
  const [storeName, setStoreName] = useState("");
  const [storeDocument, setStoreDocument] = useState("");
  const [storePhone, setStorePhone] = useState("");

  // ======= BLOCO 3: PREFERENCIAS =======
  const [receiptAutoShow, setReceiptAutoShow] = useState(true);
  const [checkoutSounds, setCheckoutSounds] = useState(true);

  // ======= BLOCO 4: NUVEM E SINCRONIZACAO =======
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncText, setLastSyncText] = useState("Status: Não Sincronizado");

  const handleForceSync = async () => {
    // Busca todo o array cru offline usando função limpa em vez do estado da UI (que pode não ter montado tudo)
    const rawProducts = await db.products.toArray();
    if (rawProducts.length === 0) return toast.error("Seu catálogo está vazio.");
    
    setIsSyncing(true);
    const toastId = toast.loading("Comprimindo catálogo e enviando carga grossa para a Nuvem...");
    
    try {
      const res = await fetch('/api/cloud/sync/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: rawProducts })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "A Conexão com o Cofre da Vercel falhou. Verifique internet.");
      
      toast.success(`Arquitetura Cimentada! ${data.count} produtos sincronizados.`, { id: toastId });
      setLastSyncText(`Última sincronia rápida: Hoje às ${new Date().toLocaleTimeString('pt-BR')}`);
    } catch (e: any) {
      toast.error(`Falha: ${e.message}`, { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  // Initialization
  useEffect(() => {
    setStoreName(localStorage.getItem("nexo_storeName") || "");
    setStoreDocument(localStorage.getItem("nexo_storeDocument") || "");
    setStorePhone(localStorage.getItem("nexo_storePhone") || "");
    
    setReceiptAutoShow(localStorage.getItem("nexo_receiptAutoShow") !== "false");
    setCheckoutSounds(localStorage.getItem("nexo_checkoutSounds") !== "false");
  }, []);

  // Sync Logic
  const handleStoreUpdate = (field: 'name' | 'doc' | 'phone', val: string) => {
    if (field === 'name') { setStoreName(val); localStorage.setItem("nexo_storeName", val); }
    if (field === 'doc') { setStoreDocument(val); localStorage.setItem("nexo_storeDocument", val); }
    if (field === 'phone') { setStorePhone(val); localStorage.setItem("nexo_storePhone", val); }
  };

  const handlePrefUpdate = (field: 'receipt' | 'sound', val: boolean) => {
    if (field === 'receipt') { setReceiptAutoShow(val); localStorage.setItem("nexo_receiptAutoShow", String(val)); }
    if (field === 'sound') { setCheckoutSounds(val); localStorage.setItem("nexo_checkoutSounds", String(val)); }
  };


  // ======= BLOCO 2: CATEGORIAS =======
  const allCategories = useLiveQuery(() => db.categories.toArray()) || [];
  const allProducts = useLiveQuery(() => db.products.toArray()) || [];
  
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [editingCatId, setEditingCatId] = useState<number | null>(null);

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return toast.error("O nome da categoria é obrigatório.");

    try {
      if (editingCatId) {
        await db.categories.update(editingCatId, { name: newCatName.trim() });
        toast.success("Categoria renomeada!");
      } else {
        await db.categories.add({ name: newCatName.trim() });
        toast.success("Nova categoria gerada!");
      }
      setNewCatName("");
      setEditingCatId(null);
    } catch (err) {
      toast.error("Erro. É provável que esta categoria já exista.");
    }
  };

  const handleDeleteCategory = async (id?: number) => {
    if (!id) return;
    
    const productsInCat = allProducts.filter(p => p.categoryId === id);
    if (productsInCat.length > 0) {
      return toast.error(`Proteção Ativa: Essa categoria possui ${productsInCat.length} produto(s) vinculado(s). Altere-os antes de excluí-la.`);
    }

    if (confirm("Tem certeza que deseja apagar essa categoria?")) {
      try {
        await db.categories.delete(id);
        toast.success("Categoria removida.");
      } catch (err) {
        toast.error("Erro interno ao deletar.");
      }
    }
  };

  const openCatEditor = (cat: Category) => {
    if (cat.id) {
      setEditingCatId(cat.id);
      setNewCatName(cat.name);
    }
  };

  return (
    <div className="bg-[#121212] min-h-screen text-[#F3F4F6] font-['Inter'] relative w-full pb-32">
      
      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-[#121212]/90 backdrop-blur-md border-b border-[#484847]/30 px-4 pt-6 pb-4">
        <div className="flex items-center gap-4 max-w-md mx-auto">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full active:scale-90 transition-transform bg-[#20201f] text-[#adaaaa] hover:text-[#53ddfc]">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-[#53ddfc] font-black tracking-tighter text-2xl">Configurações</h1>
        </div>
      </header>

      <main className="px-4 pt-6 max-w-md mx-auto flex flex-col gap-8">
        
        {/* BLOCO 1: DADOS DO ESTABELECIMENTO */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3 mb-1">
            <Store size={20} className="text-[#06B6D4]" />
            <h2 className="text-white font-bold text-lg tracking-tight">Dados da Loja</h2>
          </div>
          
          <div className="bg-[#1a1a1a] border border-[#484847]/30 rounded-2xl p-4 flex flex-col gap-4 shadow-sm">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#adaaaa] uppercase tracking-widest pl-1">Nome Fantasia do Empório / Loja</label>
              <input 
                type="text" 
                value={storeName}
                onChange={e => handleStoreUpdate('name', e.target.value)}
                className="w-full bg-[#131313] border border-[#484847]/60 focus:border-[#53ddfc] rounded-xl h-12 px-4 text-white text-sm font-semibold outline-none transition-all placeholder:text-[#484847] shadow-inner"
                placeholder="Ex Ateliê da Maria"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#adaaaa] uppercase tracking-widest pl-1">Documento Comercial (CNPJ / CPF)</label>
              <input 
                type="text" 
                value={storeDocument}
                onChange={e => handleStoreUpdate('doc', e.target.value)}
                className="w-full bg-[#131313] border border-[#484847]/60 focus:border-[#53ddfc] rounded-xl h-12 px-4 text-white text-sm font-semibold outline-none transition-all placeholder:text-[#484847] shadow-inner"
                placeholder="00.000.000/0001-00"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#adaaaa] uppercase tracking-widest pl-1">WhatsApp de Contato Oficial</label>
              <input 
                type="tel" 
                value={storePhone}
                onChange={e => handleStoreUpdate('phone', e.target.value)}
                className="w-full bg-[#131313] border border-[#484847]/60 focus:border-[#53ddfc] rounded-xl h-12 px-4 text-white text-sm font-semibold outline-none transition-all placeholder:text-[#484847] shadow-inner"
                placeholder="(00) 90000-0000"
              />
            </div>
            <p className="text-[10px] text-[#adaaaa] leading-relaxed mt-1 px-1">
              * Estes dados serão imbuídos no cabeçalho dos envios dos seus Recibos Digitais e no seu Catálogo Web.
            </p>
          </div>
        </section>


        {/* BLOCO 2: CATEGORIAS */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3 mb-1">
            <Tags size={20} className="text-[#06B6D4]" />
            <h2 className="text-white font-bold text-lg tracking-tight">Gestão de Categorias</h2>
          </div>
          
          <button 
            onClick={() => setIsCatModalOpen(true)}
            className="bg-gradient-to-br from-[#1a1a1a] to-[#20201f] overflow-hidden border border-[#484847]/30 hover:border-[#53ddfc]/50 rounded-2xl p-4 flex items-center justify-between shadow-[0_4px_16px_rgba(0,0,0,0.2)] active:scale-[0.98] transition-all group"
          >
            <div className="flex flex-col text-left">
              <span className="font-bold text-white text-base tracking-tight mb-0.5">Gerenciar Departamentos</span>
              <span className="text-[#adaaaa] text-xs font-medium">Você possui {allCategories.length} categorias cadastradas</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#2a2a29] group-hover:bg-[#004b58]/40 border border-[#484847] flex items-center justify-center transition-colors">
              <Edit3 size={18} className="text-[#53ddfc]" />
            </div>
          </button>
        </section>


        {/* BLOCO 3: CHECKOUT E SISTEMA */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3 mb-1">
            <Smartphone size={20} className="text-[#06B6D4]" />
            <h2 className="text-white font-bold text-lg tracking-tight">Preferências do Caixa</h2>
          </div>
          
          <div className="bg-[#1a1a1a] border border-[#484847]/30 rounded-2xl flex flex-col shadow-sm overflow-hidden">
            
            {/* Toggle Recibo Automático */}
            <div className="p-4 border-b border-[#484847]/30 flex items-center justify-between bg-[#1a1a1a] transition-colors relative overflow-hidden">
              <div className="flex flex-col z-10 pr-4">
                <span className="font-bold text-white text-[15px] mb-1">Recibo Digital Automático</span>
                <span className="text-[#adaaaa] text-[11px] leading-tight font-medium">Renderiza instantaneamente um cupom visual na tela no fim da venda, pronto para ser enviado no WhatsApp do cliente via WebShare. Eliminando papel.</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer z-10 flex-shrink-0">
                <input type="checkbox" className="sr-only peer" checked={receiptAutoShow} onChange={e => handlePrefUpdate('receipt', e.target.checked)} />
                <div className="w-11 h-6 bg-[#484847] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#06B6D4]"></div>
              </label>
            </div>

            {/* Toggle Sons */}
            <div className="p-4 flex items-center justify-between bg-[#1a1a1a] transition-colors">
              <div className="flex flex-col pr-4">
                <span className="font-bold text-white text-[15px] mb-1 flex items-center gap-2">Sons do PDV <Volume2 size={16} className="text-[#adaaaa]" /></span>
                <span className="text-[#adaaaa] text-[11px] leading-tight font-medium">Toca o famoso bipe "blip" e sons de sucesso quando registrar produtos em alta velocidade no Checkout.</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input type="checkbox" className="sr-only peer" checked={checkoutSounds} onChange={e => handlePrefUpdate('sound', e.target.checked)} />
                <div className="w-11 h-6 bg-[#484847] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#06B6D4]"></div>
              </label>
            </div>

          </div>
        </section>

        {/* BLOCO 4: SINCRONIZAÇÃO NUVEM */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3 mb-1">
            <Cloud size={20} className="text-[#06B6D4]" />
            <h2 className="text-white font-bold text-lg tracking-tight">Nuvem e Backup</h2>
          </div>
          
          <div className="bg-[#1a1a1a] border border-[#484847]/30 rounded-2xl flex flex-col shadow-sm overflow-hidden p-4 group hover:border-[#53ddfc]/30 transition-all">
            <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col">
                  <span className="font-bold text-white text-[15px] mb-1">Backup de Catálogo</span>
                  <span className="text-[#adaaaa] text-[11px] leading-tight font-medium max-w-[200px]">Armazene seus produtos fisicamente na nuvem para não dependender da memória rotátil do celular. Indispensável para criar um Catálogo Web no futuro.</span>
                </div>
                {isSyncing ? (
                  <div className="w-10 h-10 rounded-full border border-[#53ddfc]/50 border-t-[#53ddfc] animate-spin shrink-0"></div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#004b58]/40 border border-[#484847] flex items-center justify-center transition-colors shadow-inner shrink-0">
                    <CloudLightning size={18} className="text-[#53ddfc]" />
                  </div>
                )}
            </div>

            <div className="flex items-center justify-between border-t border-[#484847]/30 pt-4 mt-1">
              <span className="text-[#adaaaa] text-[10px] font-bold uppercase tracking-widest">{lastSyncText}</span>
              <button 
                onClick={handleForceSync}
                disabled={isSyncing}
                className="bg-[#06B6D4] text-[#004b58] font-black text-xs uppercase px-4 py-3 rounded-lg active:scale-95 transition-transform shadow-[0_2px_10px_rgba(6,182,212,0.3)] disabled:opacity-50"
              >
                 {isSyncing ? 'Enviando Carga...' : 'Subir pra Nuvem!'}
              </button>
            </div>
          </div>
        </section>

      </main>

      {/* CATEGORY MANAGEMENT MODAL */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center sm:justify-center overflow-hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setIsCatModalOpen(false)}></div>
          
          <div className="relative w-full sm:max-w-md bg-[#131313] sm:rounded-3xl rounded-t-3xl border-t sm:border border-[#484847]/50 shadow-[0_-24px_48px_rgba(0,0,0,0.9)] flex flex-col h-[90vh] sm:h-[80vh] animate-in slide-in-from-bottom-full duration-300 mx-auto">
            
            <div className="w-full flex justify-center py-3 sm:hidden shrink-0" onClick={() => setIsCatModalOpen(false)}>
              <div className="w-12 h-1.5 bg-[#484847] rounded-full"></div>
            </div>

            <div className="px-5 pb-4 pt-1 flex justify-between items-center border-b border-[#484847]/30 shrink-0">
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <Tags size={22} className="text-[#53ddfc]" />
                Departamentos
              </h2>
              <button onClick={() => setIsCatModalOpen(false)} className="w-10 h-10 bg-[#20201f] text-[#adaaaa] rounded-full flex items-center justify-center hover:text-white active:scale-95 transition-all">
                <X size={20} />
              </button>
            </div>

            {/* List Array */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {allCategories.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-40 opacity-40 text-center">
                    <Tags size={32} className="text-[#adaaaa] mb-2" />
                    <p className="font-bold text-white">Nenhum setor criado</p>
                 </div>
              ) : (
                allCategories.map(cat => (
                  <div key={cat.id} className="bg-[#1a1a1a] border border-[#484847]/30 p-3 rounded-2xl flex items-center justify-between group hover:border-[#53ddfc]/30 transition-colors">
                    <span className="font-bold text-white truncate pr-4 text-[15px]">{cat.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                       <button onClick={() => openCatEditor(cat)} className="w-10 h-10 flex items-center justify-center text-[#adaaaa] hover:text-[#53ddfc] rounded-full bg-[#20201f] transition-colors">
                         <Edit3 size={16} />
                       </button>
                       <button onClick={() => handleDeleteCategory(cat.id)} className="w-10 h-10 flex items-center justify-center text-[#adaaaa] hover:text-[#ff716c] rounded-full bg-[#20201f] transition-colors">
                         <Trash2 size={16} />
                       </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Editor Box */}
            <form onSubmit={handleSaveCategory} className="p-4 border-t border-[#484847]/30 bg-[#171716] shrink-0 mb-safe sm:mb-0">
              <div className="flex items-center justify-between mb-2">
                 <span className="text-xs font-bold text-[#53ddfc] uppercase tracking-widest pl-1">
                   {editingCatId ? 'Renomear Setor' : 'Adicionar Novo'}
                 </span>
                 {editingCatId && (
                   <button type="button" onClick={() => { setEditingCatId(null); setNewCatName(''); }} className="text-[10px] text-[#ff716c] font-black uppercase tracking-widest bg-[#ff716c]/10 px-2 py-1 rounded-md">
                     Cancelar Edição
                   </button>
                 )}
              </div>
              <div className="flex gap-2">
                 <input 
                   type="text"
                   value={newCatName}
                   onChange={e => setNewCatName(e.target.value)}
                   className="flex-1 bg-[#121212] border border-[#484847] focus:border-[#53ddfc] rounded-xl h-14 px-4 text-white text-sm font-semibold outline-none transition-all placeholder:text-[#484847] shadow-inner"
                   placeholder="Ex: Roupas Femininas"
                 />
                 <button 
                  type="submit"
                  disabled={!newCatName.trim()}
                  className="w-14 h-14 shrink-0 bg-[#06B6D4] text-[#004b58] font-black rounded-xl flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50 disabled:bg-[#484847] disabled:text-[#adaaaa]"
                 >
                   {editingCatId ? <ArrowLeft size={24} className="text-white" /> : <Plus size={28} strokeWidth={2.5} />}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
