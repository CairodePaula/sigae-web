// Min-Heap binário implementado do zero sobre um vetor (árvore binária quase completa).
// cmp(a, b) < 0 significa que "a" sai antes de "b". A raiz (posição 0) é sempre o próximo.
// Um índice de posições (id -> posição no vetor), feito com a TabelaHash do próprio projeto,
// permite remover ou alterar a prioridade de um elemento qualquer em O(log n), sem varrer o vetor.
import { TabelaHash } from './tabelaHash.js';

export class MinHeap {
  constructor(cmp, { nome = 'Heap', chaveId = (x) => x.id, descrever = (x) => `#${chaveId(x)}` } = {}) {
    this.cmp = cmp;
    this.nome = nome;
    this.chaveId = chaveId;
    this.descrever = descrever;
    this.a = [];
    this.pos = new TabelaHash(11, 0.75, { registrarEventos: false });
    this.eventos = [];
  }

  get tamanho() { return this.a.length; }

  topo() { return this.a[0]; }

  contem(id) { return this.pos.contem(id); }

  obter(id) {
    const i = this.pos.obter(id);
    return i === undefined ? undefined : this.a[i];
  }

  vetor() { return this.a.slice(); }

  inserir(x) {
    const id = this.chaveId(x);
    if (this.pos.contem(id)) throw new Error(`${this.nome}: ID #${id} já está no heap`);
    this.a.push(x);
    this.pos.setar(id, this.a.length - 1);
    const de = this.a.length - 1;
    const para = this._sobe(de);
    this._evento(`inserir ${this.descrever(x)} na posição ${de}${para !== de ? `, subiu até a posição ${para}` : ''}${para === 0 ? ' (nova raiz)' : ''}`);
  }

  extrairTopo() {
    if (this.a.length === 0) return undefined;
    const top = this.a[0];
    this._removerNaPosicao(0);
    this._evento(`extrair mínimo ${this.descrever(top)}${this.a.length ? `; nova raiz ${this.descrever(this.a[0])}` : '; heap vazio'}`);
    return top;
  }

  removerPorId(id) {
    const i = this.pos.obter(id);
    if (i === undefined) return false;
    const x = this.a[i];
    this._removerNaPosicao(i);
    this._evento(`remover ${this.descrever(x)} da posição ${i}`);
    return true;
  }

  // Altera campos do elemento (ex.: risco) e o reposiciona subindo ou descendo
  atualizar(id, campos) {
    const i = this.pos.obter(id);
    if (i === undefined) return false;
    const x = this.a[i];
    const antes = this.descrever(x);
    Object.assign(x, campos);
    let j = this._sobe(i);
    if (j === i) j = this._desce(i);
    this._evento(`alterar prioridade ${antes} → ${this.descrever(x)}: posição ${i} → ${j}${j === 0 ? ' (nova raiz)' : ''}`);
    return true;
  }

  _removerNaPosicao(i) {
    const alvo = this.a[i];
    const ultimo = this.a.pop();
    this.pos.remover(this.chaveId(alvo));
    if (i < this.a.length) {
      // O último ocupa o buraco e é reposicionado
      this.a[i] = ultimo;
      this.pos.setar(this.chaveId(ultimo), i);
      if (this._sobe(i) === i) this._desce(i);
    }
    // se i era a última posição, o pop já removeu o elemento certo
  }

  _troca(i, j) {
    const t = this.a[i];
    this.a[i] = this.a[j];
    this.a[j] = t;
    this.pos.setar(this.chaveId(this.a[i]), i);
    this.pos.setar(this.chaveId(this.a[j]), j);
  }

  _sobe(i) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.cmp(this.a[i], this.a[p]) >= 0) break;
      this._troca(i, p);
      i = p;
    }
    return i;
  }

  _desce(i) {
    const n = this.a.length;
    for (;;) {
      let m = i;
      const l = 2 * i + 1, r = l + 1;
      if (l < n && this.cmp(this.a[l], this.a[m]) < 0) m = l;
      if (r < n && this.cmp(this.a[r], this.a[m]) < 0) m = r;
      if (m === i) return i;
      this._troca(i, m);
      i = m;
    }
  }

  // Confere a propriedade do heap (pai <= filhos) e o índice de posições
  validar() {
    if (this.pos.tamanho !== this.a.length) throw new Error(`${this.nome}: índice de posições com tamanho incorreto`);
    for (let i = 0; i < this.a.length; i++) {
      if (this.pos.obter(this.chaveId(this.a[i])) !== i) throw new Error(`${this.nome}: índice de posições incorreto`);
      if (i > 0 && this.cmp(this.a[(i - 1) >> 1], this.a[i]) > 0) throw new Error(`${this.nome}: propriedade do heap violada`);
    }
    return true;
  }

  // Ordem completa de saída sem destruir o heap (extrai de uma cópia)
  ordemDeSaida() {
    const copia = new MinHeap(this.cmp, { chaveId: this.chaveId });
    for (const x of this.a) copia.inserir(x);
    const out = [];
    while (copia.tamanho > 0) out.push(copia.extrairTopo());
    return out;
  }

  _evento(msg) { this.eventos.push(`${this.nome}: ${msg}`); }

  drenarEventos() {
    const e = this.eventos;
    this.eventos = [];
    return e;
  }
}
