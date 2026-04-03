import { createPool } from '@vercel/postgres';

// Usamos createPool para apontar explicitamente para o DATABASE_URL gerado pelo Neon/Vercel
// que está injetado no processo
export const cloudDb = createPool({
  connectionString: process.env.DATABASE_URL,
});
