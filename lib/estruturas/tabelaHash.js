// Tabela hash com encadeamento separado (uma lista por bucket) e redimensionamento.
// Chaves são IDs inteiros. Função de dispersão: método da divisão, h(id) = id % capacidade.
// A capacidade começa em um número primo (11) e cresce para 2m + 1 (11 -> 23 -> 47 ...)
// quando o fator de carga passa de 75%, o que mantém as listas curtas (consulta O(1) em média).
export class TabelaHash {
  constructor(capacidade = 11, limiteCarga = 0.75, { nome = 'Hash', registrarEventos = true } = {}) {
    this.capacidade = capacidade;
    this.limiteCarga = limiteCarga;
    this.nome = nome;
    this.registrarEventos = registrarEventos;
    this.baldes = Array.from({ length: capacidade }, () => []);
    this.tamanho = 0;
    this.colisoes = 0; // colisões registradas desde a criação
    this.redimensionamentos = 0;
    this.eventos = [];
  }

  _evento(msg) {
    if (this.registrarEventos) this.eventos.push(`${this.nome}: ${msg}`);
  }

  // Função de dispersão (método da divisão)
  indice(chave) {
    if (!Number.isInteger(chave)) throw new Error(`${this.nome}: chave deve ser um ID inteiro`);
    return ((chave % this.capacidade) + this.capacidade) % this.capacidade;
  }

  setar(chave, valor) {
    const i = this.indice(chave);
    const balde = this.baldes[i];
    for (const par of balde) {
      if (par.chave === chave) { par.valor = valor; return; } // chave existente: só atualiza
    }
    if (balde.length > 0) {
      this.colisoes++;
      this._evento(`colisão no bucket ${i} — #${chave} encadeado com ${balde.map((p) => `#${p.chave}`).join(', ')}`);
    } else {
      this._evento(`#${chave} inserido no bucket ${i} (${chave} % ${this.capacidade} = ${i})`);
    }
    balde.push({ chave, valor });
    this.tamanho++;
    if (this.tamanho / this.capacidade > this.limiteCarga) this._redimensionar(this.capacidade * 2 + 1);
  }

  obter(chave) {
    for (const par of this.baldes[this.indice(chave)]) {
      if (par.chave === chave) return par.valor;
    }
    return undefined;
  }

  contem(chave) {
    return this.obter(chave) !== undefined;
  }

  remover(chave) {
    const i = this.indice(chave);
    const balde = this.baldes[i];
    for (let j = 0; j < balde.length; j++) {
      if (balde[j].chave === chave) {
        balde.splice(j, 1);
        this.tamanho--;
        this._evento(`#${chave} removido do bucket ${i}`);
        return true;
      }
    }
    return false;
  }

  _redimensionar(novaCapacidade) {
    const antiga = this.capacidade;
    const antigos = this.baldes;
    this.capacidade = novaCapacidade;
    this.baldes = Array.from({ length: novaCapacidade }, () => []);
    // Reespalha todos os pares com a nova capacidade (sem recontar colisões)
    for (const balde of antigos) {
      for (const par of balde) this.baldes[this.indice(par.chave)].push(par);
    }
    this.redimensionamentos++;
    this._evento(`carga acima de ${Math.round(this.limiteCarga * 100)}% — redimensionada de ${antiga} para ${novaCapacidade} buckets`);
  }

  chaves() {
    const out = [];
    for (const balde of this.baldes) for (const par of balde) out.push(par.chave);
    return out;
  }

  valores() {
    const out = [];
    for (const balde of this.baldes) for (const par of balde) out.push(par.valor);
    return out;
  }

  get carga() {
    return this.tamanho / this.capacidade;
  }

  // Buckets que hoje têm mais de um item
  colisoesAtuais() {
    let n = 0;
    for (const balde of this.baldes) if (balde.length > 1) n += balde.length - 1;
    return n;
  }

  // Confere: cada item no bucket certo, sem chaves repetidas e tamanho correto
  validar() {
    const vistas = new TabelaHash(this.capacidade, Infinity, { registrarEventos: false });
    let total = 0;
    this.baldes.forEach((balde, i) => {
      for (const par of balde) {
        if (this.indice(par.chave) !== i) throw new Error(`${this.nome}: #${par.chave} está no bucket errado`);
        if (vistas.contem(par.chave)) throw new Error(`${this.nome}: chave #${par.chave} duplicada`);
        vistas.setar(par.chave, true);
        total++;
      }
    });
    if (total !== this.tamanho) throw new Error(`${this.nome}: tamanho registrado incorreto`);
    return true;
  }

  drenarEventos() {
    const e = this.eventos;
    this.eventos = [];
    return e;
  }

  resumo() {
    return {
      capacidade: this.capacidade,
      tamanho: this.tamanho,
      carga: this.carga,
      colisoes: this.colisoes,
      colisoesAtuais: this.colisoesAtuais(),
      redimensionamentos: this.redimensionamentos,
      baldes: this.baldes.map((b, i) => ({ i, chaves: b.map((p) => p.chave) })),
    };
  }
}
