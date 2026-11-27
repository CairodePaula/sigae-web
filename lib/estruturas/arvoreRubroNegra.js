// Árvore Rubro-Negra implementada do zero (inserção, remoção, busca, em ordem, rotações).
// Usada como índice de chegada: chave composta [horarioChegada, id].
// Segue o modelo da aula: nó sentinela NIL negro compartilhado e atributo PAI em cada nó.
const RED = true;
const BLACK = false;

class No {
  constructor(chave, valor, cor, nil) {
    this.chave = chave; this.valor = valor; this.cor = cor;
    this.esq = nil; this.dir = nil; this.pai = nil;
  }
}

export function compararChave(a, b) {
  if (a[0] !== b[0]) return a[0] < b[0] ? -1 : 1;
  if (a[1] === b[1]) return 0;
  return a[1] < b[1] ? -1 : 1;
}

export class ArvoreRubroNegra {
  constructor(cmp = compararChave, { nome = 'Rubro-Negra', rotulo = (k) => `#${k[1]}` } = {}) {
    this.cmp = cmp;
    this.nome = nome;
    this.rotulo = rotulo;
    this.nil = new No(null, null, BLACK, null);
    this.nil.esq = this.nil.dir = this.nil.pai = this.nil;
    this.raiz = this.nil;
    this.tamanho = 0;
    this.rotacoes = 0;
    this.recoloracoes = 0;
    this.eventos = [];
  }

  _evento(msg) { this.eventos.push(`${this.nome}: ${msg}`); }

  _r(no) { return this.rotulo(no.chave); }

  buscar(chave) {
    let x = this.raiz;
    while (x !== this.nil) {
      const c = this.cmp(chave, x.chave);
      if (c === 0) return x.valor;
      x = c < 0 ? x.esq : x.dir;
    }
    return undefined;
  }

  rotacaoEsq(x) {
    const y = x.dir;
    x.dir = y.esq;
    if (y.esq !== this.nil) y.esq.pai = x;
    y.pai = x.pai;
    if (x.pai === this.nil) this.raiz = y;
    else if (x === x.pai.esq) x.pai.esq = y;
    else x.pai.dir = y;
    y.esq = x; x.pai = y;
    this.rotacoes++;
    this._evento(`rotação à esquerda em ${this._r(x)} (${this._r(y)} sobe)`);
  }

  rotacaoDir(x) {
    const y = x.esq;
    x.esq = y.dir;
    if (y.dir !== this.nil) y.dir.pai = x;
    y.pai = x.pai;
    if (x.pai === this.nil) this.raiz = y;
    else if (x === x.pai.dir) x.pai.dir = y;
    else x.pai.esq = y;
    y.dir = x; x.pai = y;
    this.rotacoes++;
    this._evento(`rotação à direita em ${this._r(x)} (${this._r(y)} sobe)`);
  }

  inserir(chave, valor) {
    let y = this.nil, x = this.raiz;
    while (x !== this.nil) {
      y = x;
      const c = this.cmp(chave, x.chave);
      if (c === 0) { x.valor = valor; return; }
      x = c < 0 ? x.esq : x.dir;
    }
    const z = new No(chave, valor, RED, this.nil);
    z.pai = y;
    if (y === this.nil) this.raiz = z;
    else if (this.cmp(chave, y.chave) < 0) y.esq = z;
    else y.dir = z;
    this.tamanho++;
    this._evento(`inserir ${this._r(z)} como nó rubro${y === this.nil ? ' (raiz)' : ` filho de ${this._r(y)}`}`);
    this.corrigirInsercao(z);
  }

  corrigirInsercao(z) {
    while (z.pai.cor === RED) {
      if (z.pai === z.pai.pai.esq) {
        const t = z.pai.pai.dir;
        if (t.cor === RED) {
          this.recoloracoes++;
          this._evento(`caso 1 (tio ${this._r(t)} rubro): recoloração — pai e tio negros, avô ${this._r(z.pai.pai)} rubro`);
          z.pai.cor = BLACK; t.cor = BLACK; z.pai.pai.cor = RED; z = z.pai.pai;
        } else {
          if (z === z.pai.dir) {
            this._evento(`caso 2 (tio negro, zig-zag) em ${this._r(z)}`);
            z = z.pai; this.rotacaoEsq(z);
          }
          this._evento(`caso 3 (tio negro, linha reta): pai ${this._r(z.pai)} negro, avô ${this._r(z.pai.pai)} rubro`);
          this.recoloracoes++;
          z.pai.cor = BLACK; z.pai.pai.cor = RED; this.rotacaoDir(z.pai.pai);
        }
      } else {
        const t = z.pai.pai.esq;
        if (t.cor === RED) {
          this.recoloracoes++;
          this._evento(`caso 1 (tio ${this._r(t)} rubro): recoloração — pai e tio negros, avô ${this._r(z.pai.pai)} rubro`);
          z.pai.cor = BLACK; t.cor = BLACK; z.pai.pai.cor = RED; z = z.pai.pai;
        } else {
          if (z === z.pai.esq) {
            this._evento(`caso 2 (tio negro, zig-zag) em ${this._r(z)}`);
            z = z.pai; this.rotacaoDir(z);
          }
          this._evento(`caso 3 (tio negro, linha reta): pai ${this._r(z.pai)} negro, avô ${this._r(z.pai.pai)} rubro`);
          this.recoloracoes++;
          z.pai.cor = BLACK; z.pai.pai.cor = RED; this.rotacaoEsq(z.pai.pai);
        }
      }
    }
    if (this.raiz.cor === RED) {
      this.raiz.cor = BLACK;
      this._evento(`raiz ${this._r(this.raiz)} recolorida para negro`);
    }
  }

  transplantar(u, v) {
    if (u.pai === this.nil) this.raiz = v;
    else if (u === u.pai.esq) u.pai.esq = v;
    else u.pai.dir = v;
    v.pai = u.pai;
  }

  minimo(x) {
    while (x.esq !== this.nil) x = x.esq;
    return x;
  }

  remover(chave) {
    let z = this.raiz;
    while (z !== this.nil) {
      const c = this.cmp(chave, z.chave);
      if (c === 0) break;
      z = c < 0 ? z.esq : z.dir;
    }
    if (z === this.nil) return false;
    this._evento(`remover ${this._r(z)}`);

    let y = z, corY = y.cor, x;
    if (z.esq === this.nil) { x = z.dir; this.transplantar(z, z.dir); }
    else if (z.dir === this.nil) { x = z.esq; this.transplantar(z, z.esq); }
    else {
      y = this.minimo(z.dir);
      this._evento(`${this._r(z)} tem dois filhos: sucessor ${this._r(y)} ocupa o lugar`);
      corY = y.cor;
      x = y.dir;
      if (y.pai === z) x.pai = y;
      else {
        this.transplantar(y, y.dir);
        y.dir = z.dir; y.dir.pai = y;
      }
      this.transplantar(z, y);
      y.esq = z.esq; y.esq.pai = y; y.cor = z.cor;
    }
    if (corY === BLACK) {
      this._evento('nó negro removido: correção de cores/rotações');
      this.corrigirRemocao(x);
    }
    this.tamanho--;
    return true;
  }

  corrigirRemocao(x) {
    while (x !== this.raiz && x.cor === BLACK) {
      if (x === x.pai.esq) {
        let w = x.pai.dir;
        if (w.cor === RED) { this.recoloracoes++; w.cor = BLACK; x.pai.cor = RED; this.rotacaoEsq(x.pai); w = x.pai.dir; }
        if (w.esq.cor === BLACK && w.dir.cor === BLACK) { this.recoloracoes++; w.cor = RED; x = x.pai; }
        else {
          if (w.dir.cor === BLACK) { this.recoloracoes++; w.esq.cor = BLACK; w.cor = RED; this.rotacaoDir(w); w = x.pai.dir; }
          this.recoloracoes++;
          w.cor = x.pai.cor; x.pai.cor = BLACK; w.dir.cor = BLACK;
          this.rotacaoEsq(x.pai); x = this.raiz;
        }
      } else {
        let w = x.pai.esq;
        if (w.cor === RED) { this.recoloracoes++; w.cor = BLACK; x.pai.cor = RED; this.rotacaoDir(x.pai); w = x.pai.esq; }
        if (w.dir.cor === BLACK && w.esq.cor === BLACK) { this.recoloracoes++; w.cor = RED; x = x.pai; }
        else {
          if (w.esq.cor === BLACK) { this.recoloracoes++; w.dir.cor = BLACK; w.cor = RED; this.rotacaoEsq(w); w = x.pai.esq; }
          this.recoloracoes++;
          w.cor = x.pai.cor; x.pai.cor = BLACK; w.esq.cor = BLACK;
          this.rotacaoDir(x.pai); x = this.raiz;
        }
      }
    }
    x.cor = BLACK;
    this.nil.cor = BLACK;
  }

  emOrdem() {
    const out = [];
    const percorrer = (n) => {
      if (n === this.nil) return;
      percorrer(n.esq);
      out.push({ chave: n.chave, valor: n.valor });
      percorrer(n.dir);
    };
    percorrer(this.raiz);
    return out;
  }

  altura() {
    const h = (n) => (n === this.nil ? 0 : 1 + Math.max(h(n.esq), h(n.dir)));
    return h(this.raiz);
  }

  // Árvore como objeto aninhado, para a interface desenhar
  serializar(mapear = (valor) => valor) {
    const walk = (n) => (n === this.nil ? null : {
      chave: n.chave,
      cor: n.cor === RED ? 'vermelho' : 'preto',
      ...mapear(n.valor),
      esq: walk(n.esq),
      dir: walk(n.dir),
    });
    return walk(this.raiz);
  }

  // Confere as propriedades rubro-negras e de ABB; lança erro se algo estiver errado
  validar() {
    const nil = this.nil;
    if (nil.cor !== BLACK) throw new Error(`${this.nome}: folha NIL deve ser negra`);
    if (this.raiz !== nil && this.raiz.cor !== BLACK) throw new Error(`${this.nome}: raiz deve ser negra`);
    let contagem = 0;
    const dfs = (n, min, max) => {
      if (n === nil) return 1;
      contagem++;
      if ((min && this.cmp(n.chave, min) <= 0) || (max && this.cmp(n.chave, max) >= 0)) throw new Error(`${this.nome}: ordem de ABB violada`);
      if (n.cor === RED && (n.esq.cor === RED || n.dir.cor === RED)) throw new Error(`${this.nome}: nó rubro com filho rubro`);
      if ((n.esq !== nil && n.esq.pai !== n) || (n.dir !== nil && n.dir.pai !== n)) throw new Error(`${this.nome}: ponteiro pai inconsistente`);
      const l = dfs(n.esq, min, n.chave);
      const r = dfs(n.dir, n.chave, max);
      if (l !== r) throw new Error(`${this.nome}: alturas negras diferentes`);
      return l + (n.cor === BLACK ? 1 : 0);
    };
    dfs(this.raiz, null, null);
    if (contagem !== this.tamanho) throw new Error(`${this.nome}: tamanho registrado incorreto`);
    return true;
  }

  drenarEventos() {
    const e = this.eventos;
    this.eventos = [];
    return e;
  }
}
