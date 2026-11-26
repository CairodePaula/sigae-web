// Min-Heap binário implementado do zero. cmp(a, b) < 0 significa que a sai antes.
export class MinHeap {
  constructor(cmp) {
    this.cmp = cmp;
    this.a = [];
  }

  get tamanho() { return this.a.length; }

  topo() { return this.a[0]; }

  inserir(x) {
    this.a.push(x);
    this._sobe(this.a.length - 1);
  }

  extrairTopo() {
    if (this.a.length === 0) return undefined;
    const top = this.a[0];
    const ultimo = this.a.pop();
    if (this.a.length > 0) {
      this.a[0] = ultimo;
      this._desce(0);
    }
    return top;
  }

  // Remove o primeiro elemento que satisfaz o predicado (ex.: mesmo ID)
  remover(pred) {
    const i = this.a.findIndex(pred);
    if (i < 0) return false;
    const ultimo = this.a.pop();
    if (i < this.a.length) {
      this.a[i] = ultimo;
      this._sobe(i);
      this._desce(i);
    }
    return true;
  }

  _sobe(i) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.cmp(this.a[i], this.a[p]) >= 0) break;
      [this.a[i], this.a[p]] = [this.a[p], this.a[i]];
      i = p;
    }
  }

  _desce(i) {
    const n = this.a.length;
    for (;;) {
      let m = i;
      const l = 2 * i + 1, r = l + 1;
      if (l < n && this.cmp(this.a[l], this.a[m]) < 0) m = l;
      if (r < n && this.cmp(this.a[r], this.a[m]) < 0) m = r;
      if (m === i) break;
      [this.a[i], this.a[m]] = [this.a[m], this.a[i]];
      i = m;
    }
  }
}
