import { neon } from '@neondatabase/serverless';

// Conexão HTTP com o Neon (funciona bem em funções serverless da Vercel).
// O cliente é criado só no primeiro uso: assim o build não depende da variável
// DATABASE_URL e um ambiente sem banco configurado mostra um erro claro.
let cliente = null;

function obterCliente() {
  if (!cliente) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL não está configurada neste ambiente');
    cliente = neon(process.env.DATABASE_URL);
  }
  return cliente;
}

export function sql(...args) {
  return obterCliente()(...args);
}

sql.transaction = (...args) => obterCliente().transaction(...args);
