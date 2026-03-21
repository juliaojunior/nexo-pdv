# Regras de Arquitetura - Nexo PDV

## Stack Tecnológica
- **Framework:** Next.js (App Router)
- **Linguagem:** TypeScript (Strict mode habilitado)
- **Estilização:** Tailwind CSS + Lucide React (ícones)
- **Banco de Dados Local:** Dexie.js (Wrapper para IndexedDB)
- **Gerenciamento de Estado:** Zustand
- **Validação de Formulários:** Zod + React Hook Form
- **Notificações:** Sonner (Toasts)

## Princípios de Desenvolvimento
1. **OfflineFirst:** A aplicação deve funcionar 100% sem internet. Todos os dados devem ser salvos no Dexie.js antes de qualquer sincronização externa.
2. **PWA Real:** O aplicativo deve ser instalável (requer `next-pwa` e `manifest.json`).
3. **Imutabilidade:** O estado global (Zustand) nunca deve ser mutado diretamente. Use spread operator ou métodos imutáveis.
4. **Transações Seguras:** Qualquer operação que envolva vendas e baixa de estoque DEVE usar transações atômicas (`db.transaction`) do Dexie.js.
5. **Hidratação Segura:** Componentes que usam estado do cliente (Zustand/Dexie) no Next.js App Router devem usar a diretiva `'use client'` e lidar com o *Hydration Mismatch*.
