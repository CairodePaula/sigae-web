import { neon } from '@neondatabase/serverless';

// Conexão HTTP com o Neon (funciona bem em funções serverless da Vercel)
export const sql = neon(process.env.DATABASE_URL);
