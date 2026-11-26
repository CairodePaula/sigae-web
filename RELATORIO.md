# SIGAE Web: Relatório técnico

**Disciplina:** Estrutura de Dados Avançados
**Instituição:** Universidade de Vassouras · Engenharia de Software
**Professor:** Márcio Garrido
**Data de entrega:** 26/11/2026

## Integrantes

| Nome | Matrícula |
|---|---|
| Cairo de Paula Cunha Gomes | 202413140 |
| Guilherme Ramos Rangel | 202413388 |
| Gustavo França Mendes | 202222046 |
| João Victor Oliveira | 202322005 |
| Yago Correa | 202322065 |
| Luiz Henrique Mendes Barbosa | 202413283 |

## 1. Objetivo

O SIGAE Web é um simulador acadêmico de atendimento de emergência. O sistema registra pacientes, classifica o risco, organiza a fila de espera, distribui atendimentos entre médicos clínicos e mantém o histórico. Todos os dados são fictícios.

## 2. Arquitetura

A aplicação usa Next.js 14 (App Router), com processamento no servidor, banco PostgreSQL no Neon e deploy na Vercel. A cada requisição, as funções carregam pacientes e médicos do banco e reconstroem as estruturas de dados em memória. Essa escolha é necessária porque funções serverless não mantêm estado entre requisições. Como consequência, o índice de chegada não persiste entre chamadas, o que é discutido na seção de limitações.

## 3. Estruturas de dados

A **Árvore Rubro-Negra** (`lib/estruturas/arvoreRubroNegra.js`) foi implementada do zero, com inserção, remoção, busca, percurso em ordem, recoloração e rotações. Funciona como índice de chegada, com chave composta (horário de chegada, ID). Na interface, cada nó é exibido com sua cor, e a altura da árvore é informada.

Dois **Min-Heaps** (`lib/estruturas/heapBinario.js`) são usados. O primeiro organiza os pacientes pela chave (risco, chegada, ID) e define a ordem de chamada. O segundo organiza os médicos pela chave (atendimentos concluídos, último atendimento, ID) e define quem é o próximo médico previsto.

A **tabela hash** (`lib/estruturas/tabelaHash.js`) indexa os pacientes por ID. Usa função de dispersão multiplicativa, trata colisões por encadeamento e redimensiona o vetor de baldes quando a carga passa de 75%. A busca de paciente usada nas ações passa por essa tabela.

## 4. Regras de negócio

A prioridade clínica prevalece sobre a ordem de chegada. Em caso de empate de risco, atende primeiro quem chegou antes e, persistindo o empate, o de menor ID.

Na chamada, o sistema escolhe um médico disponível com o menor número de atendimentos concluídos. Havendo empate, escolhe o que está há mais tempo sem paciente e, depois, o de menor ID.

Ao chamar um paciente, o médico passa a "Em atendimento" e não pode ser escolhido de novo até a conclusão ou o cancelamento. A conclusão soma um ao contador do médico e o libera. O cancelamento libera o médico sem somar atendimento. Se não houver médico disponível, o paciente permanece na fila, sem perda nem duplicação de registros. Os updates são condicionais, o que evita chamadas duplicadas em requisições concorrentes.

## 5. Testes

O arquivo `tests/sigae.test.mjs` cobre as três estruturas e as regras de negócio, com 16 testes executados por `npm test`, todos aprovados.

Para a Rubro-Negra, os testes verificam as propriedades após inserções e remoções em massa: raiz preta, ausência de vermelho com filho vermelho, mesma altura negra em todos os caminhos, ponteiros pai consistentes e ordem correta. Também verificam que a altura cresce de forma logarítmica.

Para os heaps, verificam a ordem de extração e a remoção por predicado. Para a hash, verificam colisões, encadeamento e redimensionamento. Para as regras, verificam a prioridade clínica, os critérios de desempate e a distribuição equilibrada entre três médicos.

## 6. Demonstração

A versão em produção está em https://sigae-web.vercel.app. Na tela, a árvore Rubro-Negra é desenhada com as cores dos nós e a altura, a tabela hash mostra capacidade, itens e colisões, e a fila de espera segue a ordem de prioridade do heap. Os indicadores exibem pacientes por situação e atendimentos concluídos por médico.

## 7. Limitações

A árvore e os heaps são reconstruídos a cada requisição e não são persistidos. Uma evolução seria manter o estado em memória ou em tabelas dedicadas, o que exigiria controle de concorrência. O sistema não tem autenticação, pois é um simulador de uso acadêmico.

O Next.js 14.2.15 tem aviso de segurança publicado pelo fornecedor. A atualização para uma versão 14.2.x mais recente é o próximo passo recomendado.

## 8. Como executar

Instale as dependências com `npm install`. Crie o banco no Neon e execute `db/schema.sql`. Para rodar localmente, copie `.env.example` para `.env.local`, preencha `DATABASE_URL` e use `npm run dev`. Para executar os testes, use `npm test`.
