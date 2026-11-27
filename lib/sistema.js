// Núcleo do SIGAE: regras de atendimento executadas sobre as estruturas de dados.
// Não acessa o banco. Cada operação altera as estruturas, devolve os "efeitos" que o serviço
// deve gravar no banco e o registro de eventos (rotações, colisões, trocas no heap...).
//
// Índices mantidos:
//   - hashEspera + rb + heapPacientes: SEMPRE o mesmo conjunto de pacientes aguardando
//   - hashAtendimentos: pacientes em atendimento (por ID do paciente)
//   - hashHistorico: pacientes concluídos ou cancelados
//   - heapMedicos: médicos disponíveis (menos concluídos no topo)
//   - hashMedicos: todos os médicos, por ID
import { ArvoreRubroNegra } from './estruturas/arvoreRubroNegra.js';
import { MinHeap } from './estruturas/heapBinario.js';
import { TabelaHash } from './estruturas/tabelaHash.js';
import { cmpPaciente, cmpMedico, RISCOS } from './regras.js';

export const SITUACOES_PACIENTE = ['Aguardando', 'Em atendimento', 'Concluido', 'Cancelado'];

export class ErroSIGAE extends Error {}

const idsOrdenados = (lista) => lista.slice().sort((a, b) => a - b).join(',');

export class SistemaSIGAE {
  constructor() {
    this.hashEspera = new TabelaHash(11, 0.75, { nome: 'Hash (espera)' });
    this.rb = new ArvoreRubroNegra(undefined, { nome: 'Rubro-Negra' });
    this.heapPacientes = new MinHeap(cmpPaciente, {
      nome: 'Heap pacientes',
      descrever: (p) => `#${p.id} (P${p.risco})`,
    });
    this.hashAtendimentos = new TabelaHash(11, 0.75, { nome: 'Hash (atendimentos)', registrarEventos: false });
    this.hashHistorico = new TabelaHash(11, 0.75, { nome: 'Hash (histórico)', registrarEventos: false });
    this.heapMedicos = new MinHeap(cmpMedico, {
      nome: 'Heap médicos',
      descrever: (m) => `#${m.id} ${m.nome} (${m.concluidos} concl.)`,
    });
    this.hashMedicos = new TabelaHash(11, 0.75, { nome: 'Hash médicos' });
  }

  // Monta o estado a partir das linhas do banco (já normalizadas). Eventos da carga são descartados.
  static carregar(pacientes = [], medicos = []) {
    const s = new SistemaSIGAE();
    for (const m of medicos) s._indexarMedico({ ...m });
    for (const p of pacientes) {
      const pac = { ...p };
      if (pac.situacao === 'Aguardando') s._indexarEspera(pac);
      else if (pac.situacao === 'Em atendimento') s.hashAtendimentos.setar(pac.id, pac);
      else s.hashHistorico.setar(pac.id, pac);
    }
    s._drenarEventos();
    return s;
  }

  _indexarMedico(m) {
    this.hashMedicos.setar(m.id, m);
    if (m.situacao === 'Disponivel') this.heapMedicos.inserir(m);
  }

  _indexarEspera(p) {
    this.hashEspera.setar(p.id, p);
    this.rb.inserir([p.chegada, p.id], p);
    this.heapPacientes.inserir(p);
  }

  _retirarDaEspera(p) {
    this.heapPacientes.removerPorId(p.id);
    this.rb.remover([p.chegada, p.id]);
    this.hashEspera.remover(p.id);
  }

  _drenarEventos() {
    return [
      ...this.heapPacientes.drenarEventos(),
      ...this.rb.drenarEventos(),
      ...this.hashEspera.drenarEventos(),
      ...this.heapMedicos.drenarEventos(),
      ...this.hashMedicos.drenarEventos(),
      ...this.hashAtendimentos.drenarEventos(),
      ...this.hashHistorico.drenarEventos(),
    ];
  }

  // Executa uma operação, coleta eventos e valida os índices ao final
  // Se a própria operação quebrar a consistência, lança erro: o serviço não grava nada no banco.
  _executar(fn) {
    this._drenarEventos();
    const estavaOk = this.validar().ok;
    const r = fn();
    const eventos = this._drenarEventos();
    const validacao = this.validar();
    if (estavaOk && !validacao.ok) throw new ErroSIGAE('Inconsistência nos índices: ' + validacao.erros.join('; '));
    return { efeitos: [], ...r, eventos, validacao };
  }

  // ---------- Operações ----------

  cadastrarPaciente(p) {
    return this._executar(() => {
      if (!Number.isInteger(p.id) || p.id <= 0) throw new ErroSIGAE('ID inválido');
      if (this.hashEspera.contem(p.id) || this.hashAtendimentos.contem(p.id) || this.hashHistorico.contem(p.id)) {
        throw new ErroSIGAE(`ID #${p.id} já utilizado`);
      }
      if (!RISCOS[p.risco]) throw new ErroSIGAE('Classificação de risco inválida');
      const pac = { ...p, situacao: 'Aguardando' };
      this._indexarEspera(pac);
      return { msg: `Paciente #${pac.id} ${pac.nome} cadastrado (${RISCOS[pac.risco]})`, paciente: pac };
    });
  }

  cadastrarMedico(m) {
    return this._executar(() => {
      if (this.hashMedicos.contem(m.id)) throw new ErroSIGAE(`Médico #${m.id} já cadastrado`);
      const med = { concluidos: 0, ultimaAtribuicao: 0, ...m, situacao: 'Disponivel' };
      this._indexarMedico(med);
      return { msg: `Médico #${med.id} ${med.nome} cadastrado` };
    });
  }

  reclassificar(id, risco) {
    return this._executar(() => {
      if (!RISCOS[risco]) throw new ErroSIGAE('Classificação de risco inválida');
      const p = this.hashEspera.obter(id);
      if (!p) throw new ErroSIGAE(`Paciente #${id} não está aguardando; só é possível reclassificar quem está na fila`);
      const anterior = p.risco;
      if (anterior === risco) return { msg: `#${id} já está com risco ${risco}`, efeitos: [] };
      this.heapPacientes.atualizar(id, { risco });
      return {
        msg: `#${id} ${p.nome}: ${RISCOS[anterior]} → ${RISCOS[risco]}. Fila reorganizada`,
        efeitos: [{ tipo: 'reclassificar', pacienteId: id, risco }],
      };
    });
  }

  chamar(agora = Date.now()) {
    return this._executar(() => {
      if (this.heapPacientes.tamanho === 0) throw new ErroSIGAE('Nenhum paciente aguardando');
      if (this.heapMedicos.tamanho === 0) {
        // A chamada não altera nada: o paciente permanece na fila, sem perda nem duplicação
        return { msg: 'Nenhum médico disponível; o paciente permanece na fila', efeitos: [], semMedico: true };
      }
      // 1º a prioridade clínica decide o paciente; só depois o médico é escolhido
      const p = this.heapPacientes.extrairTopo();
      this.rb.remover([p.chegada, p.id]);
      this.hashEspera.remover(p.id);
      const m = this.heapMedicos.extrairTopo();

      p.situacao = 'Em atendimento';
      p.medicoId = m.id;
      p.inicio = agora;
      m.situacao = 'Em atendimento';
      m.ultimaAtribuicao = agora;
      this.hashAtendimentos.setar(p.id, p);

      return {
        msg: `Paciente #${p.id} ${p.nome} (${RISCOS[p.risco]}) atribuído a ${m.nome} (#${m.id}, ${m.concluidos} concluídos)`,
        efeitos: [{ tipo: 'chamar', pacienteId: p.id, medicoId: m.id }],
        paciente: p,
        medico: m,
      };
    });
  }

  concluir(id, agora = Date.now()) {
    return this._executar(() => {
      const p = this.hashAtendimentos.obter(id);
      if (!p) throw new ErroSIGAE(`Paciente #${id} não está em atendimento`);
      const m = this.hashMedicos.obter(p.medicoId);
      if (!m) throw new ErroSIGAE(`Médico #${p.medicoId} não encontrado`);

      this.hashAtendimentos.remover(id);
      p.situacao = 'Concluido';
      p.fim = agora;
      this.hashHistorico.setar(id, p);

      m.concluidos += 1;
      m.situacao = 'Disponivel';
      this.heapMedicos.inserir(m); // volta ao heap na posição dada pelo novo contador

      return {
        msg: `Atendimento #${id} concluído; ${m.nome} agora tem ${m.concluidos} concluído(s) e está disponível`,
        efeitos: [{ tipo: 'concluir', pacienteId: id, medicoId: m.id }],
      };
    });
  }

  cancelar(id, agora = Date.now()) {
    return this._executar(() => {
      const aguardando = this.hashEspera.obter(id);
      if (aguardando) {
        this._retirarDaEspera(aguardando);
        aguardando.situacao = 'Cancelado';
        aguardando.fim = agora;
        this.hashHistorico.setar(id, aguardando);
        return {
          msg: `Cadastro #${id} cancelado; paciente retirado da fila e dos índices`,
          efeitos: [{ tipo: 'cancelarEspera', pacienteId: id }],
        };
      }
      const p = this.hashAtendimentos.obter(id);
      if (p) {
        const m = this.hashMedicos.obter(p.medicoId);
        this.hashAtendimentos.remover(id);
        p.situacao = 'Cancelado';
        p.fim = agora;
        this.hashHistorico.setar(id, p);
        if (m) {
          m.situacao = 'Disponivel'; // liberado SEM somar atendimento concluído
          this.heapMedicos.inserir(m);
        }
        return {
          msg: `Atendimento #${id} cancelado; ${m ? m.nome : 'médico'} liberado sem somar concluído`,
          efeitos: [{ tipo: 'cancelarAtendimento', pacienteId: id, medicoId: p.medicoId }],
        };
      }
      if (this.hashHistorico.contem(id)) throw new ErroSIGAE(`Atendimento #${id} já foi encerrado`);
      throw new ErroSIGAE(`Paciente #${id} não encontrado`);
    });
  }

  // Consulta por ID usando exclusivamente as tabelas hash
  consultar(id) {
    const espera = this.hashEspera.obter(id);
    if (espera) {
      const posicao = this.heapPacientes.ordemDeSaida().findIndex((p) => p.id === id) + 1;
      return { onde: 'espera', paciente: espera, posicaoNaFila: posicao, bucket: this.hashEspera.indice(id) };
    }
    const atend = this.hashAtendimentos.obter(id);
    if (atend) return { onde: 'atendimento', paciente: atend, medico: this.hashMedicos.obter(atend.medicoId) };
    const hist = this.hashHistorico.obter(id);
    if (hist) return { onde: 'historico', paciente: hist, medico: hist.medicoId ? this.hashMedicos.obter(hist.medicoId) : null };
    return null;
  }

  consultarMedico(id) {
    const m = this.hashMedicos.obter(id);
    if (!m) return null;
    const atendendo = this.hashAtendimentos.valores().find((p) => p.medicoId === id) || null;
    return { medico: m, atendendo, bucket: this.hashMedicos.indice(id) };
  }

  // ---------- Validação de consistência ----------

  validar() {
    const erros = [];
    const checar = (fn) => { try { fn(); } catch (e) { erros.push(e.message); } };

    checar(() => this.rb.validar());
    checar(() => this.heapPacientes.validar());
    checar(() => this.heapMedicos.validar());
    checar(() => this.hashEspera.validar());
    checar(() => this.hashAtendimentos.validar());
    checar(() => this.hashHistorico.validar());
    checar(() => this.hashMedicos.validar());

    // Mesmo conjunto de IDs aguardando nas três estruturas
    const idsHash = idsOrdenados(this.hashEspera.chaves());
    const idsRB = idsOrdenados(this.rb.emOrdem().map((x) => x.valor.id));
    const idsHeap = idsOrdenados(this.heapPacientes.vetor().map((p) => p.id));
    if (idsHash !== idsRB || idsHash !== idsHeap) erros.push('Hash, Rubro-Negra e Heap não têm o mesmo conjunto de pacientes aguardando');

    for (const p of this.hashEspera.valores()) {
      if (p.situacao !== 'Aguardando') erros.push(`#${p.id} está na espera com situação ${p.situacao}`);
    }
    for (const p of this.hashAtendimentos.valores()) {
      if (this.hashEspera.contem(p.id)) erros.push(`#${p.id} em atendimento ainda indexado na espera`);
      const m = this.hashMedicos.obter(p.medicoId);
      if (!m) erros.push(`#${p.id} em atendimento sem médico (registro órfão)`);
      else if (m.situacao !== 'Em atendimento') erros.push(`#${p.id} vinculado a ${m.nome}, que não está em atendimento`);
    }
    for (const p of this.hashHistorico.valores()) {
      if (this.hashEspera.contem(p.id) || this.hashAtendimentos.contem(p.id)) erros.push(`#${p.id} encerrado ainda indexado como ativo`);
    }

    // Médicos: heap = exatamente os disponíveis; cada médico ocupado tem exatamente um paciente
    const disponiveis = this.hashMedicos.valores().filter((m) => m.situacao === 'Disponivel').map((m) => m.id);
    if (idsOrdenados(disponiveis) !== idsOrdenados(this.heapMedicos.vetor().map((m) => m.id))) {
      erros.push('Heap de médicos diferente do conjunto de médicos disponíveis');
    }
    const atendimentos = this.hashAtendimentos.valores();
    for (const m of this.hashMedicos.valores()) {
      const n = atendimentos.filter((p) => p.medicoId === m.id).length;
      if (m.situacao === 'Em atendimento' && n !== 1) erros.push(`${m.nome} está em atendimento com ${n} paciente(s)`);
      if (m.situacao === 'Disponivel' && n !== 0) erros.push(`${m.nome} está disponível mas tem paciente vinculado`);
    }

    return {
      ok: erros.length === 0,
      erros,
      resumo: {
        aguardando: this.hashEspera.tamanho,
        emAtendimento: this.hashAtendimentos.tamanho,
        encerrados: this.hashHistorico.tamanho,
        medicos: this.hashMedicos.tamanho,
        medicosDisponiveis: this.heapMedicos.tamanho,
      },
    };
  }

  // ---------- Fotografia para a interface ----------

  snapshot() {
    const medicos = this.hashMedicos.valores().sort((a, b) => a.id - b.id);
    const nomeMedico = (id) => this.hashMedicos.obter(id)?.nome || null;
    const comMedico = (p) => ({ ...p, medicoNome: p.medicoId ? nomeMedico(p.medicoId) : null });
    const resumoPac = (p) => ({ id: p.id, nome: p.nome, risco: p.risco, chegada: p.chegada });
    const todos = [
      ...this.hashEspera.valores(),
      ...this.hashAtendimentos.valores(),
      ...this.hashHistorico.valores(),
    ].sort((a, b) => a.id - b.id);

    return {
      fila: this.heapPacientes.ordemDeSaida(),
      heapPacientes: this.heapPacientes.vetor().map(resumoPac),
      cronologica: this.rb.emOrdem().map((x) => x.valor),
      arvore: this.rb.serializar(resumoPac),
      altura: this.rb.altura(),
      hash: this.hashEspera.resumo(),
      hashMedicos: this.hashMedicos.resumo(),
      heapMedicos: this.heapMedicos.vetor().map((m) => ({ id: m.id, nome: m.nome, concluidos: m.concluidos })),
      proximoMedico: this.heapMedicos.topo() || null,
      atendimentos: this.hashAtendimentos.valores().sort((a, b) => a.inicio - b.inicio).map(comMedico),
      historico: this.hashHistorico.valores().sort((a, b) => (b.fim || 0) - (a.fim || 0)).map(comMedico),
      chegadas: todos.slice().sort((a, b) => a.chegada - b.chegada || a.id - b.id).map(comMedico),
      pacientes: todos.map(comMedico),
      medicos,
      validacao: this.validar(),
    };
  }
}
