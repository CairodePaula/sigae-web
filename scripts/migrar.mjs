// Executa um arquivo de migração SQL no banco apontado por DATABASE_URL.
// Uso: node --env-file=.env.local scripts/migrar.mjs db/migracoes/001_melhorias.sql
import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

const arquivo = process.argv[2];
if (!arquivo) {
  console.error('Informe o arquivo de migração.');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL não definida (confira o .env.local).');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const host = new URL(process.env.DATABASE_URL.replace(/^postgres(ql)?:/, 'http:')).hostname;
const blocos = readFileSync(arquivo, 'utf8')
  .split(/^-- >>>.*$/m)
  .map((b) => b.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n').trim())
  .filter(Boolean);

console.log(`Banco: ${host}`);
console.log(`Executando ${blocos.length} bloco(s) de ${arquivo}...`);
for (const [i, bloco] of blocos.entries()) {
  await sql(bloco);
  console.log(`  ${i + 1}/${blocos.length} ok`);
}
console.log('Migração concluída.');
