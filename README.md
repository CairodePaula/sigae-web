# SIGAE Web

Simulador acadêmico de atendimento de emergência, desenvolvido para a disciplina de Estrutura de Dados Avançados (Universidade de Vassouras). Todos os dados são fictícios.

**Demonstração:** https://sigae-web.vercel.app

## O que o sistema faz

Cadastra pacientes com risco de 1 a 5 e médicos clínicos. Organiza a fila pela prioridade clínica, distribui os atendimentos entre médicos disponíveis (sempre o que tem menos atendimentos concluídos) e mantém histórico e indicadores.

## Estruturas de dados

- **Árvore Rubro-Negra** (`lib/estruturas/arvoreRubroNegra.js`): índice de chegada, com chave (horário, ID). Implementada com inserção, remoção, busca, percurso em ordem, recoloração e rotações.
- **Min-Heap** (`lib/estruturas/heapBinario.js`): usado para a ordem de chamada dos pacientes e para a escolha do médico.
- **Tabela hash** (`lib/estruturas/tabelaHash.js`): indexa os pacientes por ID, com encadeamento para colisões e redimensionamento acima de 75% de carga.

As regras de comparação ficam em `lib/regras.js`, e as ações do sistema em `lib/servico.js`.

## Estrutura do projeto

```
app/                  interface (page.js) e rotas da API
app/api/              endpoints: painel, pacientes, medicos, chamar
lib/estruturas/       Rubro-Negra, heap e tabela hash
lib/regras.js         critérios de desempate
lib/servico.js        regras de atendimento e acesso ao banco
lib/db.js             conexão com o Neon
db/schema.sql         tabelas
tests/                testes automatizados
RELATORIO.md          relatório técnico
```

## Como executar

1. Instale as dependências: `npm install`
2. Crie um banco no Neon e execute `db/schema.sql` no SQL Editor.
3. Copie `.env.example` para `.env.local` e preencha `DATABASE_URL`.
4. Rode localmente: `npm run dev` e acesse http://localhost:3000

## Testes

```bash
npm test
```

São 16 testes cobrindo as três estruturas e as regras de negócio. Não precisam de banco.

## Deploy

O projeto está configurado para a Vercel. Ao importar o repositório, adicione a integração com o Neon, que cria a variável `DATABASE_URL` automaticamente. Depois execute `db/schema.sql` no banco e faça o deploy.

## Limitações

A árvore e os heaps são reconstruídos a cada requisição, porque funções serverless não mantêm estado entre chamadas. O sistema não tem autenticação, por ser um simulador acadêmico. O Next.js 14.2.15 tem aviso de segurança, com atualização recomendada como próximo passo.
