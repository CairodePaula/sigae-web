// Árvore Rubro-Negra implementada do zero (inserção, remoção, busca, em ordem, rotações).
// Usada como índice de chegada: chave composta [horarioChegada, id].
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
  constructor(cmp = compararChave) {
    this.cmp = cmp;
    this.nil = new No(null, null, BLACK, null);
    this.nil.esq = this.nil.dir = this.nil.pai = this.nil;
    this.raiz = this.nil;
    this.tamanho = 0;
  }

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
    this.corrigirInsercao(z);
  }

  corrigirInsercao(z) {
    while (z.pai.cor === RED) {
      if (z.pai === z.pai.pai.esq) {
        const t = z.pai.pai.dir;
        if (t.cor === RED) {
          z.pai.cor = BLACK; t.cor = BLACK; z.pai.pai.cor = RED; z = z.pai.pai;
        } else {
          if (z === z.pai.dir) { z = z.pai; this.rotacaoEsq(z); }
          z.pai.cor = BLACK; z.pai.pai.cor = RED; this.rotacaoDir(z.pai.pai);
        }
      } else {
        const t = z.pai.pai.esq;
        if (t.cor === RED) {
          z.pai.cor = BLACK; t.cor = BLACK; z.pai.pai.cor = RED; z = z.pai.pai;
        } else {
          if (z === z.pai.esq) { z = z.pai; this.rotacaoDir(z); }
          z.pai.cor = BLACK; z.pai.pai.cor = RED; this.rotacaoEsq(z.pai.pai);
        }
      }
    }
    this.raiz.cor = BLACK;
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

    let y = z, corY = y.cor, x;
    if (z.esq === this.nil) { x = z.dir; this.transplantar(z, z.dir); }
    else if (z.dir === this.nil) { x = z.esq; this.transplantar(z, z.esq); }
    else {
      y = this.minimo(z.dir);
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
    if (corY === BLACK) this.corrigirRemocao(x);
    this.tamanho--;
    return true;
  }

  corrigirRemocao(x) {
    while (x !== this.raiz && x.cor === BLACK) {
      if (x === x.pai.esq) {
        let w = x.pai.dir;
        if (w.cor === RED) { w.cor = BLACK; x.pai.cor = RED; this.rotacaoEsq(x.pai); w = x.pai.dir; }
        if (w.esq.cor === BLACK && w.dir.cor === BLACK) { w.cor = RED; x = x.pai; }
        else {
          if (w.dir.cor === BLACK) { w.esq.cor = BLACK; w.cor = RED; this.rotacaoDir(w); w = x.pai.dir; }
          w.cor = x.pai.cor; x.pai.cor = BLACK; w.dir.cor = BLACK;
          this.rotacaoEsq(x.pai); x = this.raiz;
        }
      } else {
        let w = x.pai.esq;
        if (w.cor === RED) { w.cor = BLACK; x.pai.cor = RED; this.rotacaoDir(x.pai); w = x.pai.esq; }
        if (w.dir.cor === BLACK && w.esq.cor === BLACK) { w.cor = RED; x = x.pai; }
        else {
          if (w.esq.cor === BLACK) { w.dir.cor = BLACK; w.cor = RED; this.rotacaoEsq(w); w = x.pai.esq; }
          w.cor = x.pai.cor; x.pai.cor = BLACK; w.esq.cor = BLACK;
          this.rotacaoDir(x.pai); x = this.raiz;
        }
      }
    }
    x.cor = BLACK;
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
}
