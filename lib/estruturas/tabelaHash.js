// Tabela hash com encadeamento (listas por balde) e redimensionamento.
// Função de dispersão: multiplicativa (h*31 + código), compatível com o hash.py da aula.
export class TabelaHash {
  constructor(capacidade = 8, limiteCarga = 0.75) {
    this.capacidade = capacidade;
    this.limiteCarga = limiteCarga;
    this.baldes = Array.from({ length: capacidade }, () => []);
    this.tamanho = 0;
    this.colisoes = 0;
  }

  _indice(chave) {
    let h = 0;
    for (const c of String(chave)) h = (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0;
    return h % this.capacidade;
  }

  setar(chave, valor) {
    const balde = this.baldes[this._indice(chave)];
    const par = balde.find((p) => p.chave === chave);
    if (par) { par.valor = valor; return; }
    if (balde.length > 0) this.colisoes++;
    balde.push({ chave, valor });
    this.tamanho++;
    if (this.tamanho / this.capacidade > this.limiteCarga) this._redimensionar(this.capacidade * 2);
  }

  obter(chave) {
    const par = this.baldes[this._indice(chave)].find((p) => p.chave === chave);
    return par ? par.valor : undefined;
  }

  remover(chave) {
    const balde = this.baldes[this._indice(chave)];
    const i = balde.findIndex((p) => p.chave === chave);
    if (i < 0) return false;
    balde.splice(i, 1);
    this.tamanho--;
    return true;
  }

  _redimensionar(novaCapacidade) {
    const antigos = this.baldes;
    this.capacidade = novaCapacidade;
    this.baldes = Array.from({ length: novaCapacidade }, () => []);
    this.tamanho = 0;
    this.colisoes = 0;
    for (const balde of antigos) for (const p of balde) this.setar(p.chave, p.valor);
  }
}
