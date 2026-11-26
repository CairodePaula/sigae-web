import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ArvoreRubroNegra } from '../lib/estruturas/arvoreRubroNegra.js';
import { MinHeap } from '../lib/estruturas/heapBinario.js';
import { TabelaHash } from '../lib/estruturas/tabelaHash.js';
import { cmpPaciente, cmpMedico } from '../lib/regras.js';

// Gerador pseudoaleatório determinístico: os testes são reproduzíveis
function rng(seed) {
  let s = seed;
  return () => {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
    return s;
  };
}

// Verifica as propriedades da Rubro-Negra: raiz preta, sem vermelho-vermelho,
// mesma altura negra em todos os caminhos e ponteiros pai consistentes
function verificarRubroNegra(arvore) {
  const nil = arvore.nil;
  assert.equal(arvore.raiz.cor, false, 'raiz deve ser preta');
  const alturaNegra = (n) => {
    if (n === nil) return 1;
    if (n.cor === true) {
      assert.equal(n.esq.cor, false, 'vermelho com filho vermelho à esquerda');
      assert.equal(n.dir.cor, false, 'vermelho com filho vermelho à direita');
    }
    if (n.esq !== nil) assert.equal(n.esq.pai, n, 'ponteiro pai inconsistente');
    if (n.dir !== nil) assert.equal(n.dir.pai, n, 'ponteiro pai inconsistente');
    const l = alturaNegra(n.esq);
    const r = alturaNegra(n.dir);
    assert.equal(l, r, 'alturas negras diferentes');
    return l + (n.cor === false ? 1 : 0);
  };
  alturaNegra(arvore.raiz);
}

const ordenar = (lista) => [...lista].sort((a, b) => a[0] - b[0] || a[1] - b[1]);

// ---------- Rubro-Negra ----------

test('RB: inserção mantém invariantes e ordem', () => {
  const r = rng(42);
  const arv = new ArvoreRubroNegra();
  const chaves = [];
  for (let i = 0; i < 500; i++) {
    const k = [r() % 1000, i];
    chaves.push(k);
    arv.inserir(k, i);
  }
  verificarRubroNegra(arv);
  assert.equal(arv.tamanho, 500);
  assert.deepEqual(arv.emOrdem().map((x) => x.chave), ordenar(chaves));
});

test('RB: busca encontra chaves existentes e não encontra ausentes', () => {
  const arv = new ArvoreRubroNegra();
  for (let i = 0; i < 100; i++) arv.inserir([i * 2, i], `v${i}`);
  assert.equal(arv.buscar([10, 5]), 'v5');
  assert.equal(arv.buscar([11, 5]), undefined);
});

test('RB: remoção de metade das chaves mantém invariantes e ordem', () => {
  const r = rng(7);
  const arv = new ArvoreRubroNegra();
  const chaves = [];
  for (let i = 0; i < 300; i++) {
    const k = [r() % 500, i];
    chaves.push(k);
    arv.inserir(k, i);
  }
  const removidas = chaves.filter((_, i) => i % 2 === 0);
  const restantes = chaves.filter((_, i) => i % 2 !== 0);
  for (const k of removidas) assert.equal(arv.remover(k), true);
  verificarRubroNegra(arv);
  assert.equal(arv.tamanho, restantes.length);
  assert.deepEqual(arv.emOrdem().map((x) => x.chave), ordenar(restantes));
  for (const k of removidas) assert.equal(arv.buscar(k), undefined);
});

test('RB: remover todas as chaves deixa a árvore vazia', () => {
  const arv = new ArvoreRubroNegra();
  for (let i = 0; i < 50; i++) arv.inserir([i, i], i);
  for (let i = 0; i < 50; i++) assert.equal(arv.remover([i, i]), true);
  assert.equal(arv.tamanho, 0);
  assert.equal(arv.raiz, arv.nil);
});

test('RB: chave repetida atualiza o valor sem duplicar o nó', () => {
  const arv = new ArvoreRubroNegra();
  arv.inserir([1, 1], 'a');
  arv.inserir([1, 1], 'b');
  assert.equal(arv.tamanho, 1);
  assert.equal(arv.buscar([1, 1]), 'b');
});

test('RB: inserção sequencial mantém altura logarítmica', () => {
  const arv = new ArvoreRubroNegra();
  const n = 1000;
  for (let i = 0; i < n; i++) arv.inserir([i, i], i);
  const altura = (no) => (no === arv.nil ? 0 : 1 + Math.max(altura(no.esq), altura(no.dir)));
  assert.ok(altura(arv.raiz) <= 2 * Math.log2(n + 1), 'altura acima do limite da Rubro-Negra');
  verificarRubroNegra(arv);
});

// ---------- Min-Heap ----------

test('Heap: extrai sempre o menor elemento', () => {
  const r = rng(3);
  const h = new MinHeap((a, b) => a - b);
  const vals = Array.from({ length: 200 }, () => r() % 1000);
  vals.forEach((v) => h.inserir(v));
  const saida = [];
  while (h.tamanho > 0) saida.push(h.extrairTopo());
  assert.deepEqual(saida, [...vals].sort((a, b) => a - b));
});

test('Heap: remover por predicado mantém a ordem', () => {
  const h = new MinHeap((a, b) => a - b);
  [9, 4, 7, 1, 8, 2].forEach((v) => h.inserir(v));
  assert.equal(h.remover((x) => x === 7), true);
  assert.equal(h.remover((x) => x === 99), false);
  const saida = [];
  while (h.tamanho > 0) saida.push(h.extrairTopo());
  assert.deepEqual(saida, [1, 2, 4, 8, 9]);
});

// ---------- Tabela hash ----------

test('Hash: inserir, obter, atualizar e remover', () => {
  const t = new TabelaHash(8);
  t.setar(1, 'a');
  t.setar(2, 'b');
  t.setar(1, 'c');
  assert.equal(t.obter(1), 'c');
  assert.equal(t.tamanho, 2);
  assert.equal(t.remover(2), true);
  assert.equal(t.obter(2), undefined);
  assert.equal(t.remover(2), false);
});

test('Hash: colisões são contadas e tratadas por encadeamento', () => {
  const t = new TabelaHash(2, 10); // capacidade pequena, sem redimensionar
  for (let i = 1; i <= 5; i++) t.setar(i, `p${i}`);
  const ocupados = t.baldes.filter((b) => b.length > 0).length;
  assert.equal(t.colisoes, 5 - ocupados);
  for (let i = 1; i <= 5; i++) assert.equal(t.obter(i), `p${i}`);
});

test('Hash: redimensiona acima de 75% de carga e preserva os dados', () => {
  const t = new TabelaHash(4, 0.75);
  for (let i = 1; i <= 4; i++) t.setar(i, i * 10);
  assert.equal(t.capacidade, 8);
  assert.equal(t.tamanho, 4);
  for (let i = 1; i <= 4; i++) assert.equal(t.obter(i), i * 10);
});

// ---------- Regras do SIGAE ----------

test('Regra: prioridade clínica prevalece sobre a ordem de chegada', () => {
  const h = new MinHeap(cmpPaciente);
  h.inserir({ id: 1, risco: 3, chegada: 100 });
  h.inserir({ id: 2, risco: 1, chegada: 200 });
  assert.equal(h.extrairTopo().id, 2);
});

test('Regra: empate de risco desempata por chegada e depois por ID', () => {
  const h = new MinHeap(cmpPaciente);
  h.inserir({ id: 5, risco: 2, chegada: 300 });
  h.inserir({ id: 9, risco: 2, chegada: 100 });
  h.inserir({ id: 3, risco: 2, chegada: 100 });
  assert.deepEqual([h.extrairTopo().id, h.extrairTopo().id, h.extrairTopo().id], [3, 9, 5]);
});

test('Regra: médico com menos atendimentos concluídos é escolhido primeiro', () => {
  const h = new MinHeap(cmpMedico);
  h.inserir({ id: 1, concluidos: 2, ultimo: 0 });
  h.inserir({ id: 2, concluidos: 1, ultimo: 999 });
  assert.equal(h.extrairTopo().id, 2);
});

test('Regra: empate de contagem favorece quem está há mais tempo sem paciente, depois menor ID', () => {
  const h = new MinHeap(cmpMedico);
  h.inserir({ id: 4, concluidos: 1, ultimo: 500 });
  h.inserir({ id: 7, concluidos: 1, ultimo: 100 });
  h.inserir({ id: 2, concluidos: 1, ultimo: 100 });
  assert.deepEqual([h.extrairTopo().id, h.extrairTopo().id, h.extrairTopo().id], [2, 7, 4]);
});

test('Regra: três médicos recebem distribuição equilibrada nas primeiras chamadas', () => {
  let medicos = [
    { id: 1, concluidos: 0, ultimo: 0 },
    { id: 2, concluidos: 0, ultimo: 0 },
    { id: 3, concluidos: 0, ultimo: 0 },
  ];
  const ordem = [];
  let relogio = 1;
  for (let i = 0; i < 6; i++) {
    const h = new MinHeap(cmpMedico);
    medicos.forEach((m) => h.inserir(m));
    const escolhido = h.extrairTopo();
    ordem.push(escolhido.id);
    medicos = medicos.map((m) =>
      m.id === escolhido.id ? { ...m, concluidos: m.concluidos + 1, ultimo: relogio++ } : m
    );
  }
  assert.deepEqual(ordem, [1, 2, 3, 1, 2, 3]);
});
