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

O SIGAE Web é um simulador acadêmico de pronto atendimento. Ele registra pacientes, classifica o risco, organiza a fila de espera, distribui os atendimentos entre médicos clínicos e mantém histórico e indicadores. Todos os dados são fictícios.

Acesso: https://sigae-web.vercel.app

## 2. Arquitetura

Next.js 14 (App Router), com processamento no servidor, banco PostgreSQL no Neon e deploy na Vercel.

```
app/page.js + app/componentes/   interface (7 telas)
app/api/*                        rotas HTTP
lib/servico.js                   carrega o banco, executa a operação, grava os efeitos
lib/sistema.js                   núcleo: regras de atendimento sobre as estruturas (sem banco)
lib/estruturas/                  Rubro-Negra, Min-Heap e Tabela Hash (implementadas pela equipe)
lib/regras.js                    critérios de prioridade e desempate
```

**Fluxo de cada ação.** (1) As linhas de pacientes e médicos são lidas em uma única transação somente leitura. (2) `SistemaSIGAE.carregar` reconstrói os índices. (3) A operação é executada nas estruturas: inserções, remoções, extrações do mínimo, alteração de prioridade. (4) `validar()` confere a consistência. (5) Os efeitos são gravados no banco.

A gravação é atômica. Na chamada, paciente e médico são alterados por uma única instrução SQL, que trava as duas linhas e só atualiza se ambos ainda estiverem elegíveis (`Aguardando` / `Disponivel`): ou os dois mudam, ou nenhum. Se o estado mudou nesse meio-tempo, por exemplo com dois cliques simultâneos, nada é gravado e o usuário é avisado.

**Por que reconstruir a cada requisição.** Funções serverless não guardam memória entre chamadas. O banco é a fonte única dos dados e as estruturas são os índices em memória sobre ele. Cada resposta traz o registro de eventos das estruturas (rotações, recolorações, colisões, redimensionamentos, trocas no heap), exibido na interface. Assim, todas as operações das estruturas podem ser demonstradas durante o uso do sistema.

## 3. Estruturas de dados

### 3.1 Árvore Rubro-Negra — índice de chegada (`lib/estruturas/arvoreRubroNegra.js`)

- Chave composta `(horário de chegada, ID)`. O percurso em ordem reproduz a sequência de chegadas.
- Segue o modelo da aula: nó sentinela NIL negro compartilhado e atributo `pai` em cada nó.
- **Inserção:** o nó entra rubro e é corrigido pelos casos 1 (tio rubro: recoloração), 2 (zig-zag: rotação) e 3 (linha reta: rotação no avô e troca de cores).
- **Remoção:** transplante e sucessor, com correção de duplo negro (4 casos espelhados).
- **Busca, percurso em ordem, altura e `validar()`.** `validar()` confere: raiz e NIL negros, nenhum rubro com filho rubro, mesma altura negra em todos os caminhos, ponteiros `pai` corretos, ordem de ABB e tamanho.
- **No sistema:** o paciente entra na árvore no cadastro e sai quando é chamado ou cancelado. A tela Estruturas desenha a árvore com as cores e a altura.

### 3.2 Min-Heap binário — duas filas de prioridade (`lib/estruturas/heapBinario.js`)

- Vetor representando uma árvore binária quase completa. Os filhos de `i` ficam em `2i+1` e `2i+2`.
- **Índice de posições** `id → posição`, feito com a Tabela Hash do próprio projeto. Com ele, `removerPorId` e `atualizar` (alterar prioridade) rodam em **O(log n)**, sem varrer o vetor.
- **Heap de pacientes:** chave `(risco, chegada, ID)`, onde 1 é a maior urgência. A raiz é o próximo a ser chamado. A reclassificação altera o risco e reposiciona o elemento, subindo ou descendo, sem duplicar.
- **Heap de médicos:** contém só os médicos disponíveis, com chave `(concluídos, última atribuição, ID)`. Na chamada sai a raiz. Na conclusão, o médico volta ao heap com o contador +1. No cancelamento, volta sem somar.
- `validar()` confere a propriedade do heap (pai ≤ filhos) e o índice de posições.

### 3.3 Tabela Hash — consultas rápidas (`lib/estruturas/tabelaHash.js`)

- **Função de dispersão:** método da divisão, `h(ID) = ID % capacidade`.
- **Colisões:** encadeamento separado (uma lista por bucket).
- **Redimensionamento:** a capacidade começa em 11, um número primo. Quando a carga passa de 75%, a tabela vai para `2m + 1` (11 → 23 → 47) e todos os itens são reespalhados.
- **Consulta, remoção e `validar()`.** `validar()` confere se cada item está no bucket certo, se não há chaves repetidas e se o tamanho está correto.
- **Uso:**
  - `hashEspera`: pacientes aguardando. Mantém o mesmo conjunto de IDs da Rubro-Negra e do heap.
  - `hashAtendimentos` e `hashHistorico`: pacientes em atendimento e encerrados. A consulta por ID percorre as três, sem varrer listas.
  - `hashMedicos`: a hash adicional recomendada pelo enunciado.
  - Índice de posições dos heaps.
- **Demonstração de colisão:** o cenário "Cenário de colisões" cria os pacientes 1000, 1011, 1022, 1033 e 1044, que caem todos no bucket 10 (`ID % 11`). Basta cadastrar mais pacientes até passar de 75% para ver o redimensionamento 11 → 23.

### 3.4 Complexidade

| Operação | Estrutura | Custo |
|---|---|---|
| Cadastrar paciente | Hash + Rubro-Negra + Heap | O(1) médio + O(log n) + O(log n) |
| Chamar próximo | Heap (extrair mínimo) + Rubro-Negra (remover) + Hash (remover) + Heap de médicos | O(log n) + O(log m) |
| Reclassificar | Hash (localizar) + Heap (alterar prioridade) | O(1) médio + O(log n) |
| Concluir / cancelar | Hash + Heap de médicos | O(1) médio + O(log m) |
| Consultar por ID | Hash | O(1) médio |
| Listar por chegada | Rubro-Negra (em ordem) | O(n) |

### 3.5 Mecanismos auxiliares (justificativa)

O enunciado permite mecanismos auxiliares desde que justificados. Nenhum deles substitui as três estruturas:

- **Vetores (Array) do JavaScript:** usados como memória contígua do heap e como lista de cada bucket da hash, papel equivalente ao das listas do `hash.py` da aula. Não usamos `Map`, `Set` nem bibliotecas de árvore ou heap.
- **Ordenações com `sort`:** só para apresentar listas na tela (histórico, tabelas) e para comparar conjuntos de IDs no `validar()`. A ordem de chamada e a ordem cronológica vêm do heap e da Rubro-Negra.
- **PostgreSQL:** guarda os dados entre requisições. A escolha do paciente e do médico é feita pelos heaps, não por `ORDER BY`.

## 4. Regras de negócio

- **Prioridade:** a prioridade clínica prevalece sobre a ordem de chegada. Empate: atende quem chegou antes. Persistindo o empate, o menor ID.
- **Escolha do médico:** um médico disponível com o **menor número de atendimentos concluídos**. Empate: o que está há mais tempo sem **receber** paciente (campo `ultima_atribuicao`, gravado na chamada). Persistindo o empate, o menor ID.
- **Ordem da decisão:** a distribuição de médicos nunca se sobrepõe à prioridade clínica. O paciente é escolhido primeiro e o médico depois.
- **Após a chamada:** o médico fica *Em atendimento* e sai do heap, então não pode ser escolhido de novo.
- **Conclusão:** soma 1 ao contador, torna o médico disponível e o reinsere no heap.
- **Cancelamento:**
  - de cadastro: o paciente sai das três estruturas;
  - de atendimento: o médico é liberado **sem** somar concluído.
- **Sem médico disponível:** a chamada não altera nada. O paciente permanece na fila, sem perda nem duplicação.
- **Reclassificação:** só para pacientes aguardando.
- **Validação dos índices** (automática, após cada operação, com indicador na lateral):
  - mesmo conjunto de IDs aguardando na hash, na Rubro-Negra e no heap;
  - nenhum paciente em atendimento ou encerrado nos índices de espera;
  - todo médico ocupado com exatamente um paciente e todo disponível com nenhum;
  - heap de médicos igual ao conjunto de médicos disponíveis.

## 5. Interface

Sete telas, com navegação lateral e endereço próprio para cada uma (`#triagem`, `#estruturas`...): **Painel geral**, **Pacientes**, **Triagem/Fila**, **Médicos**, **Atendimentos**, **Histórico** e **Estruturas**.

- **Pacientes:** cadastro com hora de chegada e busca por ID pela hash.
- **Triagem/Fila:** fila na ordem do heap, com reclassificação e cancelamento.
- **Médicos:** cadastro, consulta e contadores.
- **Atendimentos:** paciente e médico vinculados, status e início.
- **Histórico:** atendimentos por médico, pacientes por estado e lista cronológica de chegadas.
- **Estruturas:** desenho da Rubro-Negra e dos dois heaps, buckets das hashes, validação e cenários de demonstração.

Cada operação mostra o registro de eventos das estruturas. Clicar em um paciente (inclusive nos nós das árvores) abre os detalhes dele.

## 6. Testes

São 31 testes automatizados em `tests/`, rodados com `npm test` (módulo nativo `node:test`, sem banco). A saída está em `docs/evidencias-testes.txt`.

- **Estruturas (18):**
  - Rubro-Negra: propriedades após inserções e remoções em massa, altura logarítmica, casos de rotação, detecção de árvore corrompida.
  - Heap: extração, `removerPorId` e alteração de prioridade com índice de posições.
  - Hash: colisão de IDs 1 e 12 com `% 11` e redimensionamento 11 → 23.
- **Cenários da seção 7 do enunciado (13):**
  - três médicos A, B e C com distribuição equilibrada;
  - escolha do médico com menos concluídos;
  - empate e desempates;
  - médico ocupado e ausência de médico disponível;
  - ordem de chamada pelo heap;
  - prioridade clínica acima da distribuição;
  - reclassificação sem duplicar;
  - cancelamentos sem somar e sem registros órfãos;
  - colisões e redimensionamento no fluxo;
  - 300 operações aleatórias com `validar()` verdadeiro a cada passo.

## 7. Limitações

- As estruturas são reconstruídas a cada requisição, como explicado na seção 2. Com o volume de uma simulação acadêmica, o custo de reconstrução é desprezível.
- Não há autenticação, por ser um simulador acadêmico.
- Os botões de cenário apagam os dados da simulação e pedem confirmação antes.

## 8. Como executar

Ver `README.md`.
