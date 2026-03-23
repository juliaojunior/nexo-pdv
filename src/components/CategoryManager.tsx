"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { Plus, Edit2, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";

export function CategoryManager() {
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const products = useLiveQuery(() => db.products.toArray()) || [];
  
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;
    
    // Safety: verifica se categoria já existe (case insensitive)
    const exists = categories.some((c) => c.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      toast.error(`A categoria "${name}" já existe.`);
      return;
    }

    try {
      await db.categories.add({ name });
      toast.success(`Categoria "${name}" criada!`);
      setNewCategoryName("");
    } catch {
      toast.error("Erro ao criar a categoria.");
    }
  };

  const handleStartEdit = (cat: { id?: number; name: string }) => {
    if (!cat.id) return;
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const name = editName.trim();
    if (!name) {
      toast.error("O nome da categoria não pode ficar vazio.");
      return;
    }

    // Impede duplicata ao renomear
    const exists = categories.some(
      (c) => c.id !== editingId && c.name.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      toast.error(`Já existe outra categoria com esse nome.`);
      return;
    }

    try {
      await db.categories.update(editingId, { name });
      toast.success("Categoria atualizada com sucesso.");
      setEditingId(null);
    } catch {
      toast.error("Erro ao atualizar categoria.");
    }
  };

  const handleDelete = async (cat: { id?: number; name: string }) => {
    if (!cat.id) return;
    
    // Verificação Estrita: Impede que categorias com produtos vinculados sejam excluídas
    const usedByProducts = products.filter(p => p.categoryId === cat.id);
    if (usedByProducts.length > 0) {
      toast.error(`Existem ${usedByProducts.length} itens usando a categoria "${cat.name}". Mude seus produtos primeiro!`, {
        duration: 5000,
      });
      return;
    }

    if (window.confirm(`Tem certeza que deseja apagar a categoria "${cat.name}"?`)) {
      try {
        await db.categories.delete(cat.id);
        toast.success("Categoria excluída com sucesso.");
      } catch {
        toast.error("Erro ao tentar excluir a categoria.");
      }
    }
  };

  return (
    <div className="bg-[#1a1a1a] rounded-2xl border border-[#484847]/30 p-4 shadow-sm">
      <h3 className="font-black text-lg text-white mb-4 tracking-tight">Gerenciar Categorias</h3>
      
      {/* Bloco Rápido de Inserção */}
      <form onSubmit={handleAddCategory} className="flex gap-2 mb-6">
        <input 
          type="text" 
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="Ex: Bebidas"
          className="flex-1 bg-[#20201f] rounded-xl px-4 py-3 outline-none text-white border border-[#484847]/50 focus:border-[#06B6D4] font-medium placeholder:text-[#adaaaa]/50"
        />
        <button 
          type="submit"
          disabled={!newCategoryName.trim()}
          className="bg-[#20201f] text-[#53ddfc] p-3 rounded-xl border border-[#484847]/50 hover:bg-[#004b58] active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
      </form>

      {/* Listagem de Categorias */}
      <div className="flex flex-col gap-2">
        {categories.length === 0 ? (
          <p className="text-[#adaaaa] text-sm text-center py-6 border-2 border-dashed border-[#484847]/30 rounded-xl">
            Nenhuma categoria para listar.
          </p>
        ) : (
          categories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between bg-[#20201f] p-3 rounded-xl border border-[#484847]/20">
              {editingId === cat.id ? (
                // Modo Edição
                <div className="flex-1 flex items-center gap-2 mr-2">
                  <input 
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                       if (e.key === 'Enter') handleSaveEdit();
                       if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="flex-1 bg-transparent text-[#06B6D4] font-bold text-sm w-full outline-none border-b-2 border-[#06B6D4] pb-0.5"
                  />
                  <div className="flex shrink-0 gap-1 ml-1 text-white">
                     <button onClick={handleSaveEdit} className="text-[#53ddfc] p-2 bg-[#004b58]/50 rounded-lg hover:bg-[#06B6D4]/30">
                       <Check size={16} strokeWidth={3} />
                     </button>
                     <button onClick={() => setEditingId(null)} className="text-[#ff716c] p-2 hover:bg-[#484847]/40 rounded-lg">
                       <X size={16} strokeWidth={3} />
                     </button>
                  </div>
                </div>
              ) : (
                // Modo Visualização
                <>
                  <span className="font-bold text-white text-sm truncate pr-2 flex-1">{cat.name}</span>
                  <div className="flex shrink-0 gap-1.5 ml-2">
                    <button 
                      onClick={() => handleStartEdit(cat as any)} 
                      className="text-[#adaaaa] hover:text-[#53ddfc] p-2 bg-[#1a1a1a] rounded-lg transition-colors border border-transparent hover:border-[#53ddfc]/30 active:scale-90 shadow-sm"
                      title="Renomear Categoria"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(cat as any)} 
                      className="text-[#adaaaa] hover:text-[#ff716c] p-2 bg-[#1a1a1a] rounded-lg transition-colors border border-transparent hover:border-[#ff716c]/30 active:scale-90 shadow-sm relative group"
                      title="Apagar Categoria"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
