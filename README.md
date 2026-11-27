# SIGAE Web

Simulador acadêmico de atendimento de emergência, desenvolvido para a disciplina de Estrutura de Dados Avançados (Universidade de Vassouras). Todos os dados são fictícios.

**Demonstração:** https://sigae-web.vercel.app

## O que o sistema faz

- Cadastra pacientes (nome, hora de chegada, risco de 1 a 5) e médicos clínicos.
- Organiza a fila pela prioridade clínica.
- Distribui os atendimentos entre os médicos disponíveis, sempre para o que tem menos atendimentos concluídos, com desempate determinístico.
- Mantém histórico e indicadores.

## Estruturas de dados (implementadas pela equipe)

| Estrutura | Arquivo | Papel |
|---|---|---|
| Árvore Rubro-Negra | `lib/estruturas/arvoreRubroNegra.js` | Índice de chegada, chave (horário, ID) |
| Min-Heap binário | `lib/estruturas/heapBinario.js` | Fila de pacientes (risco, chegada, ID) e de médicos (concluídos, última atribuição, ID) |
| Tabela Hash | `lib/estruturas/tabelaHash.js` | Pacientes e médicos por ID: `ID % capacidade`, encadeamento, redimensionamento 11 → 23 → 47 |

Cada operação (cadastrar, chamar, reclassificar, concluir, cancelar) é executada nas estruturas pelo núcleo `lib/sistema.js`. A interface mostra o registro de eventos de cada operação: rotações, recolorações, colisões, redimensionamentos e trocas no heap. Detalhes em `RELATORIO.md`.

## Estrutura do projeto

```
app/page.js, app/componentes/   interface (7 telas, navegação lateral)
app/api/                        painel, pacientes, pacientes/[id], medicos, medicos/[id], chamar, validar, cenario
lib/estruturas/                 Rubro-Negra, heap e tabela hash
lib/sistema.js                  regras de atendimento sobre as estruturas (sem banco)
lib/servico.js                  integração com o banco (leitura + gravação atômica)
lib/regras.js                   critérios de prioridade e desempate
db/schema.sql                   esquema completo (banco novo)
db/migracoes/                   migrações para banco existente
scripts/migrar.mjs              executa uma migração
tests/                          testes automatizados
docs/evidencias-testes.txt      saída dos testes
RELATORIO.md                    relatório técnico
```

## Como executar localmente

1. `npm install`
2. Crie um banco no Neon (ou uma branch do banco existente).
   - **Banco novo:** rode `db/schema.sql` no SQL Editor.
   - **Banco existente:** rode `node --env-file=.env.local scripts/migrar.mjs db/migracoes/001_melhorias.sql`.
3. Copie `.env.example` para `.env.local` e preencha `DATABASE_URL`.
4. `npm run dev` e acesse http://localhost:3000.
5. Na aba **Estruturas**, use **Restaurar cenário** para criar 3 médicos (A, B, C) e 5 pacientes de exemplo.

Requer Node.js 20.6 ou superior (por causa de `--env-file`).

## Testes

```bash
npm test
```

São 31 testes. Cobrem as três estruturas e os cenários obrigatórios da seção 7 do enunciado e não precisam de banco.

## Roteiro rápido de demonstração

1. **Estruturas → Restaurar cenário:** 3 médicos com zero atendimentos e 5 pacientes.
2. **Chamar próximo** 3 vezes: os pacientes são distribuídos para A, B e C.
3. **Chamar próximo** de novo: sem médico disponível, o paciente permanece na fila.
4. **Atendimentos → Concluir** um atendimento e chamar: o médico liberado (com menos concluídos) recebe o próximo.
5. **Triagem → Reclassificar** um paciente para risco 1: ele passa a ser a raiz do heap.
6. **Cancelar** um aguardando e um em atendimento: o contador do médico não sobe.
7. **Estruturas → Cenário de colisões:** IDs 1000, 1011, 1022, 1033 e 1044 no mesmo bucket. Consulte-os em **Pacientes**. Cadastre mais 4 pacientes para ver a hash redimensionar de 11 para 23.
8. **Validar índices** a qualquer momento.

## Deploy

A Vercel faz o build a cada commit na branch `main`. A variável `DATABASE_URL` vem da integração com o Neon. Antes de publicar esta versão em um banco existente, rode a migração `db/migracoes/001_melhorias.sql`.
