"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Customer } from "@/db/db";
import { ChevronLeft, Search, Plus, User, Phone, Trash2, Edit3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function CustomersPage() {
  const router = useRouter();
  const allCustomers = useLiveQuery(() => db.customers.toArray()) || [];
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [document, setDocument] = useState("");

  const filteredCustomers = allCustomers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.document && c.document.includes(searchTerm))
  );

  const openForm = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setName(customer.name);
      setPhone(customer.phone || "");
      setEmail(customer.email || "");
      setDocument(customer.document || "");
    } else {
      setEditingCustomer(null);
      setName("");
      setPhone("");
      setEmail("");
      setDocument("");
    }
    setIsModalOpen(true);
  };

  const closeForm = () => {
    setIsModalOpen(false);
    setTimeout(() => setEditingCustomer(null), 300); // delay to prevent visual jump during exit transiton
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("O nome é obrigatório!");

    try {
      const payload: Customer = {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        document: document.trim() || undefined,
        createdAt: editingCustomer ? editingCustomer.createdAt : new Date().toISOString(),
      };

      if (editingCustomer && editingCustomer.id) {
        payload.id = editingCustomer.id;
        // db.customers.put handles both add and update
        await db.customers.put(payload);
        toast.success("Cliente atualizado!");
      } else {
        await db.customers.add(payload);
        toast.success("Cliente registrado!");
      }

      closeForm();
    } catch (err) {
      toast.error("Erro interno ao salvar o cliente.");
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!editingCustomer || !editingCustomer.id) return;
    
    if (confirm(`Tem certeza que deseja apagar ${editingCustomer.name}?`)) {
      try {
        await db.customers.delete(editingCustomer.id);
        toast.success("Cadastro removido.");
        closeForm();
      } catch (err) {
        toast.error("Erro ao deletar.");
      }
    }
  };

  return (
    <div className="bg-background min-h-screen text-foreground font-['Inter'] relative w-full pb-32">
      
      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/30 px-4 pt-6 pb-4">
        <div className="flex items-center gap-4 max-w-md mx-auto">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full active:scale-90 transition-transform bg-surface-raised text-muted hover:text-primary-bright">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-primary-bright font-black tracking-tighter text-2xl">Clientes</h1>
        </div>
        
        {/* BUSCA */}
        <div className="mt-4 max-w-md mx-auto">
          <div className="relative group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary-bright transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou CPF..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface border border-border/50 focus:border-primary rounded-xl h-12 pl-12 pr-4 text-sm font-medium outline-none transition-all placeholder:text-border shadow-inner"
            />
          </div>
        </div>
      </header>

      {/* FEED (LIST) */}
      <main className="px-4 pt-6 max-w-md mx-auto">
        {filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-40 text-center">
            <div className="w-20 h-20 rounded-full border border-dashed border-muted/50 flex items-center justify-center mb-4 text-muted">
              <User size={32} />
            </div>
            <p className="font-bold text-lg text-white">Nenhum Cliente</p>
            <p className="text-sm mt-1">Busque ou cadastre novos registros.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredCustomers.map(customer => (
              <div 
                key={customer.id}
                onClick={() => openForm(customer)}
                className="bg-surface border border-border/30 rounded-2xl p-4 flex items-center justify-between shadow-sm active:scale-[0.98] transition-transform cursor-pointer hover:border-primary-bright/30 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary-deep to-background border border-primary/30 flex items-center justify-center font-black text-lg text-primary-bright shadow-inner group-hover:from-primary group-hover:text-background transition-colors">
                    {customer.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-white text-base tracking-tight truncate max-w-[180px]">{customer.name}</span>
                    {customer.phone ? (
                      <span className="text-muted text-xs font-medium mt-0.5 flex items-center gap-1">
                        <Phone size={10} /> {customer.phone}
                      </span>
                    ) : (
                      <span className="text-border text-xs font-medium mt-0.5">Sem contatos</span>
                    )}
                  </div>
                </div>
                <Edit3 size={18} className="text-border group-hover:text-primary-bright transition-colors" />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* FAB (Floating Action Button) */}
      <button 
        onClick={() => openForm()}
        className="fixed bottom-24 right-4 sm:right-auto sm:left-1/2 sm:ml-[150px] w-14 h-14 bg-primary text-primary-deep rounded-full flex items-center justify-center shadow-glow hover:bg-primary-bright active:scale-90 transition-all z-20"
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>

      {/* BOTTOM SHEET MODAL (CREATE / EDIT) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={closeForm}
          ></div>
          
          {/* Sheet */}
          <div className="relative w-full sm:max-w-md bg-background sm:rounded-3xl rounded-t-3xl border-t sm:border border-border/50 shadow-overlay flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-full duration-300">
            {/* Grabber */}
            <div className="w-full flex justify-center py-3 sm:hidden" onClick={closeForm}>
              <div className="w-12 h-1.5 bg-border rounded-full"></div>
            </div>

            <div className="px-6 pb-4 pt-2 sm:pt-6 flex justify-between items-center border-b border-border/30">
              <h2 className="text-xl font-black text-white tracking-tight">
                {editingCustomer ? 'Editar Perfil' : 'Novo Cliente'}
              </h2>
              {editingCustomer && (
                <button type="button" onClick={handleDelete} className="p-2 text-danger bg-danger/10 rounded-full active:scale-95 transition-transform">
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted uppercase tracking-widest pl-1">Nome Completo *</label>
                <input 
                  type="text" 
                  autoFocus
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-surface border border-border focus:border-primary-bright rounded-xl h-14 px-4 text-white font-semibold outline-none transition-all placeholder:text-border placeholder:font-normal"
                  placeholder="Ex: João Silva"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted uppercase tracking-widest pl-1">WhatsApp / Celular</label>
                <input 
                  type="tel" 
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full bg-surface border border-border focus:border-primary-bright rounded-xl h-14 px-4 text-white font-semibold outline-none transition-all placeholder:text-border placeholder:font-normal"
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted uppercase tracking-widest pl-1">Documento (CPF / CNPJ)</label>
                <input 
                  type="text" 
                  value={document}
                  onChange={e => setDocument(e.target.value)}
                  className="w-full bg-surface border border-border focus:border-primary-bright rounded-xl h-14 px-4 text-white font-semibold outline-none transition-all placeholder:text-border placeholder:font-normal"
                  placeholder="000.000.000-00"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted uppercase tracking-widest pl-1">E-mail</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-surface border border-border focus:border-primary-bright rounded-xl h-14 px-4 text-white font-semibold outline-none transition-all placeholder:text-border placeholder:font-normal"
                  placeholder="contato@empresa.com"
                />
              </div>

              <div className="mt-8 mb-2">
                <button 
                  type="submit"
                  disabled={!name.trim()}
                  className="w-full h-14 bg-primary text-primary-deep font-black text-lg rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:bg-border disabled:text-muted disabled:shadow-none"
                >
                  {editingCustomer ? 'Salvar Edições' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
