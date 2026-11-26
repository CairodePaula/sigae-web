# SIGAE Web: Relatório técnico

## 1. Objetivo

O SIGAE Web é um simulador acadêmico de atendimento de emergência, desenvolvido para a disciplina de Estrutura de Dados Avançados. O sistema registra pacientes, classifica o risco, organiza a fila de espera, distribui atendimentos entre médicos clínicos e mantém o histórico. Todos os dados são fictícios.

## 2. Arquitetura

A aplicação usa Next.js 14 (App Router) com processamento no servidor, banco PostgreSQL no Neon e deploy na Vercel. A cada requisição, as funções carregam pacientes e médicos do banco e reconstroem as estruturas de dados em memória. Essa escolha é necessária porque funções serverless não mantêm estado entre requisições. Como consequência, o índice de chegada não persiste entre chamadas, o que é discutido na seção de limitações.

## 3. Estruturas de dados

A Árvore Rubro-Negra (`lib/estruturas/arvoreRubroNegra.js`) foi implementada do zero, com inserção, remoção, busca, percurso em ordem, recoloração e rotações. Ela funciona como índice de chegada, com chave composta (horário de chegada, ID), e sua estrutura é exibida na tela com a cor de cada nó e a altura da árvore.

Dois Min-Heaps (`lib/estruturas/heapBinario.js`) são usados. O primeiro organiza os pacientes pela chave (risco, chegada, ID) e define a ordem de chamada. O segundo organiza os médicos disponíveis pela chave (atendimentos concluídos, último atendimento, ID) e define quem é o próximo médico.

A tabela hash (`lib/estruturas/tabelaHash.js`) indexa os pacientes por ID. Ela usa uma função de dispersão multiplicativa, trata colisões por encadeamento e redimensiona o vetor de baldes quando a carga passa de 75%. A busca de paciente usada nas ações passa por essa tabela.

## 4. Regras de negócio

A prioridade clínica prevalece sobre a ordem de chegada. Em caso de empate de risco, atende primeiro quem chegou antes e, persistindo o empate, o de menor ID. Na chamada, o sistema escolhe um médico disponível com o menor número de atendimentos concluídos. Havendo empate, escolhe o que está há mais tempo sem paciente e, depois, o de menor ID.

Ao chamar um paciente, o médico passa a "Em atendimento" e não pode ser escolhido de novo até a conclusão ou o cancelamento. A conclusão soma um ao contador do médico e o libera. O cancelamento libera o médico sem somar atendimento. Se não houver médico disponível, o paciente permanece na fila, sem perda nem duplicação de registros. Os updates são condicionais, o que evita chamadas duplicadas em requisições concorrentes.

## 5. Testes

O arquivo `tests/sigae.test.mjs` cobre as três estruturas e as regras de negócio. Para a Rubro-Negra, os testes verificam as propriedades após inserções e remoções em massa: raiz preta, ausência de vermelho com filho vermelho, mesma altura negra em todos os caminhos, ponteiros pai consistentes e ordem correta. Também verificam que a altura cresce de forma logarítmica. Para os heaps, verificam a ordem de extração e a remoção por predicado. Para a hash, verificam colisões, encadeamento e redimensionamento. Para as regras, verificam a prioridade clínica, os critérios de desempate e a distribuição equilibrada entre três médicos. Os testes rodam sem banco de dados, com o comando `npm test`.

## 6. Limitações

A árvore e os heaps são reconstruídos a cada requisição, e não persistidos. Uma evolução seria manter o estado em memória ou em tabelas dedicadas, o que exigiria controle de concorrência. O sistema não tem autenticação, pois é um simulador de uso acadêmico. O Next.js 14.2.15 tem um aviso de segurança publicado pelo fornecedor, e a atualização para uma versão 14.2 mais recente é o próximo passo.

## 7. Como executar

Instale as dependências com `npm install`. Crie o banco no Neon e execute `db/schema.sql`. Para rodar localmente, copie `.env.example` para `.env.local` e preencha `DATABASE_URL`, depois use `npm run dev`. Para executar os testes, use `npm test`.
