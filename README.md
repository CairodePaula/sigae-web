# SIGAE Web

Simulador acadêmico de atendimento de emergência. Dados fictícios.
Next.js (App Router) + Neon (Postgres) + deploy na Vercel.

## Estrutura
- `lib/estruturas/arvoreRubroNegra.js` — índice de chegada (chave `[horário, id]`)
- `lib/estruturas/heapBinario.js` — Min-Heap de pacientes e de médicos
- `lib/estruturas/tabelaHash.js` — índice de pacientes por ID (encadeamento + redimensionamento)
- `lib/servico.js` — regras: chamada, conclusão, cancelamento, reclassificação
- `db/schema.sql` — tabelas

## Rodar local
1. `npm install`
2. Crie o banco no Neon e rode `db/schema.sql` no SQL Editor.
3. `cp .env.example .env.local` e preencha `DATABASE_URL`.
4. `npm run dev` → http://localhost:3000

## Deploy na Vercel
1. Suba o repositório no GitHub e importe na Vercel.
2. Em Settings > Environment Variables, adicione `DATABASE_URL`.
3. Deploy.

## Pendente (para o grupo)
- Testes automatizados das três estruturas (evidências para a entrega)
- Redimensionamento da hash exibido na interface
- Relatório técnico curto
- Refinar a interface (a versão atual é funcional e mínima)
