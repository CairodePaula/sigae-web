// Testes das três estruturas implementadas pela equipe (sem banco de dados)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ArvoreRubroNegra } from '../lib/estruturas/arvoreRubroNegra.js';
import { MinHeap } from '../lib/estruturas/heapBinario.js';
import { TabelaHash } from '../lib/estruturas/tabelaHash.js';
import { cmpPaciente } from '../lib/regras.js';

// Gerador pseudoaleatório determinístico: os testes são reproduzíveis
function rng(seed) {
  let s = seed;
  return () => {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
    return s;
  };
}

const ordenar = (lista) => [...lista].sort((a, b) => a[0] - b[0] || a[1] - b[1]);

// ---------- Árvore Rubro-Negra ----------

test('RB: inserção mantém as propriedades rubro-negras e a ordem', () => {
  const r = rng(42);
  const arv = new ArvoreRubroNegra();
  const chaves = [];
  for (let i = 0; i < 500; i++) {
    const k = [r() % 1000, i];
    chaves.push(k);
    arv.inserir(k, i);
    if (i % 50 === 0) assert.equal(arv.validar(), true);
  }
  assert.equal(arv.validar(), true);
  assert.equal(arv.tamanho, 500);
  assert.deepEqual(arv.emOrdem().map((x) => x.chave), ordenar(chaves));
});

test('RB: busca encontra chaves existentes e não encontra ausentes', () => {
  const arv = new ArvoreRubroNegra();
  for (let i = 0; i < 100; i++) arv.inserir([i * 2, i], `v${i}`);
  assert.equal(arv.buscar([10, 5]), 'v5');
  assert.equal(arv.buscar([11, 5]), undefined);
});

test('RB: remoção de metade das chaves mantém as propriedades e a ordem', () => {
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
  for (const k of removidas) {
    assert.equal(arv.remover(k), true);
    assert.equal(arv.validar(), true);
  }
  assert.equal(arv.tamanho, restantes.length);
  assert.deepEqual(arv.emOrdem().map((x) => x.chave), ordenar(restantes));
  for (const k of removidas) assert.equal(arv.buscar(k), undefined);
});

test('RB: remover todas as chaves deixa a árvore vazia; remover ausente devolve false', () => {
  const arv = new ArvoreRubroNegra();
  for (let i = 0; i < 50; i++) arv.inserir([i, i], i);
  assert.equal(arv.remover([999, 999]), false);
  for (let i = 0; i < 50; i++) assert.equal(arv.remover([i, i]), true);
  assert.equal(arv.tamanho, 0);
  assert.equal(arv.raiz, arv.nil);
  assert.equal(arv.validar(), true);
});

test('RB: chave repetida atualiza o valor sem duplicar o nó', () => {
  const arv = new ArvoreRubroNegra();
  arv.inserir([1, 1], 'a');
  arv.inserir([1, 1], 'b');
  assert.equal(arv.tamanho, 1);
  assert.equal(arv.buscar([1, 1]), 'b');
});

test('RB: inserção sequencial mantém altura logarítmica e registra rotações', () => {
  const arv = new ArvoreRubroNegra();
  const n = 1000;
  for (let i = 0; i < n; i++) arv.inserir([i, i], i);
  assert.ok(arv.altura() <= 2 * Math.log2(n + 1), 'altura acima do limite da Rubro-Negra');
  assert.ok(arv.rotacoes > 0 && arv.recoloracoes > 0);
  assert.equal(arv.validar(), true);
});

test('RB: três chegadas em ordem geram rotação à esquerda (caso 3) e o evento é registrado', () => {
  const arv = new ArvoreRubroNegra();
  arv.inserir([1, 1], 'a');
  arv.inserir([2, 2], 'b');
  arv.inserir([3, 3], 'c');
  const eventos = arv.drenarEventos().join(' | ');
  assert.match(eventos, /caso 3/);
  assert.match(eventos, /rotação à esquerda em #1/);
  assert.equal(arv.raiz.chave[1], 2);
});

test('RB: validar detecta árvore corrompida', () => {
  const arv = new ArvoreRubroNegra();
  for (let i = 0; i < 10; i++) arv.inserir([i, i], i);
  arv.raiz.cor = true; // raiz rubra é inválida
  assert.throws(() => arv.validar(), /raiz deve ser negra/);
});

// ---------- Min-Heap ----------

test('Heap: extrai sempre o menor elemento', () => {
  const r = rng(3);
  const h = new MinHeap((a, b) => a.v - b.v || a.id - b.id);
  const vals = Array.from({ length: 200 }, (_, id) => ({ id, v: r() % 1000 }));
  vals.forEach((x) => h.inserir(x));
  assert.equal(h.validar(), true);
  const saida = [];
  while (h.tamanho > 0) saida.push(h.extrairTopo());
  assert.deepEqual(saida.map((x) => x.id), [...vals].sort((a, b) => a.v - b.v || a.id - b.id).map((x) => x.id));
});

test('Heap: removerPorId usa o índice de posições e mantém o heap válido', () => {
  const h = new MinHeap((a, b) => a.v - b.v);
  [9, 4, 7, 1, 8, 2].forEach((v) => h.inserir({ id: v, v }));
  assert.equal(h.removerPorId(4), true); // elemento do meio do vetor
  assert.equal(h.contem(4), false);
  assert.equal(h.validar(), true);
  h.inserir({ id: 4, v: 4 });
  assert.equal(h.removerPorId(7), true);
  assert.equal(h.removerPorId(99), false);
  assert.equal(h.contem(7), false);
  assert.equal(h.validar(), true);
  const saida = [];
  while (h.tamanho > 0) saida.push(h.extrairTopo().v);
  assert.deepEqual(saida, [1, 2, 4, 8, 9]);
});

test('Heap: alterar prioridade sobe o paciente até a raiz sem duplicar', () => {
  const h = new MinHeap(cmpPaciente);
  h.inserir({ id: 1, risco: 3, chegada: 100 });
  h.inserir({ id: 2, risco: 2, chegada: 200 });
  h.inserir({ id: 3, risco: 4, chegada: 300 });
  h.inserir({ id: 4, risco: 5, chegada: 400 });
  assert.equal(h.topo().id, 2);
  h.atualizar(4, { risco: 1 });
  assert.equal(h.topo().id, 4);
  assert.equal(h.tamanho, 4);
  h.atualizar(4, { risco: 5 }); // desce de volta
  assert.equal(h.topo().id, 2);
  assert.equal(h.validar(), true);
});

test('Heap: ID repetido é rejeitado', () => {
  const h = new MinHeap((a, b) => a.v - b.v);
  h.inserir({ id: 1, v: 1 });
  assert.throws(() => h.inserir({ id: 1, v: 5 }), /já está no heap/);
});

test('Heap: ordemDeSaida não altera o heap original', () => {
  const h = new MinHeap((a, b) => a.v - b.v);
  [5, 3, 8].forEach((v) => h.inserir({ id: v, v }));
  assert.deepEqual(h.ordemDeSaida().map((x) => x.v), [3, 5, 8]);
  assert.equal(h.tamanho, 3);
});

// ---------- Tabela Hash ----------

test('Hash: inserir, obter, atualizar e remover', () => {
  const t = new TabelaHash();
  t.setar(1, 'a');
  t.setar(2, 'b');
  t.setar(1, 'c');
  assert.equal(t.obter(1), 'c');
  assert.equal(t.tamanho, 2);
  assert.equal(t.remover(2), true);
  assert.equal(t.obter(2), undefined);
  assert.equal(t.remover(2), false);
  assert.equal(t.validar(), true);
});

test('Hash: h(id) = id % 11 — IDs 1 e 12 colidem e ambos são encontrados', () => {
  const t = new TabelaHash(11);
  t.setar(1, 'Ana');
  t.setar(12, 'Bruno');
  assert.equal(t.indice(1), 1);
  assert.equal(t.indice(12), 1);
  assert.equal(t.colisoes, 1);
  assert.equal(t.colisoesAtuais(), 1);
  assert.equal(t.obter(1), 'Ana');
  assert.equal(t.obter(12), 'Bruno');
  assert.match(t.drenarEventos().join(' | '), /colisão no bucket 1/);
});

test('Hash: redimensiona de 11 para 23 ao passar de 75% de carga e preserva os dados', () => {
  const t = new TabelaHash(11, 0.75);
  for (let i = 1; i <= 8; i++) t.setar(i, i * 10); // 8/11 = 72,7%
  assert.equal(t.capacidade, 11);
  t.setar(9, 90); // 9/11 = 81,8% -> redimensiona
  assert.equal(t.capacidade, 23);
  assert.equal(t.redimensionamentos, 1);
  for (let i = 1; i <= 9; i++) assert.equal(t.obter(i), i * 10);
  assert.equal(t.validar(), true);
  assert.match(t.drenarEventos().join(' | '), /de 11 para 23/);
});

test('Hash: chave não inteira é rejeitada', () => {
  const t = new TabelaHash();
  assert.throws(() => t.setar('abc', 1), /ID inteiro/);
});
