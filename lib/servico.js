// Regras do SIGAE: usa as estruturas sobre dados carregados do Neon a cada requisição.
import { sql } from './db';
import { ArvoreRubroNegra } from './estruturas/arvoreRubroNegra';
import { MinHeap } from './estruturas/heapBinario';
import { TabelaHash } from './estruturas/tabelaHash';

const ts = (d) => (d ? new Date(d).getTime() : 0);
const normP = (p) => ({ id: p.id, nome: p.nome, risco: p.risco, chegada: ts(p.chegada), situacao: p.situacao, medico_id: p.medico_id });
const normM = (m) => ({ id: m.id, nome: m.nome, registro: m.registro, situacao: m.situacao, concluidos: m.concluidos, ultimo: ts(m.ultimo_atendimento) });

// Paciente: prioridade clínica, depois chegada, depois ID
const cmpPaciente = (a, b) => a.risco - b.risco || a.chegada - b.chegada || a.id - b.id;
// Médico: menos atendimentos, depois quem está há mais tempo sem paciente, depois ID
const cmpMedico = (a, b) => a.concluidos - b.concluidos || a.ultimo - b.ultimo || a.id - b.id;

export async function painel() {
  const pacientes = (await sql`SELECT * FROM pacientes ORDER BY id`).map(normP);
  const medicos = (await sql`SELECT * FROM medicos ORDER BY id`).map(normM);
  const arvore = new ArvoreRubroNegra();
  pacientes.filter((p) => p.situacao === 'Aguardando').forEach((p) => arvore.inserir([p.chegada, p.id], p));
  return { fila: arvore.emOrdem().map((x) => x.valor), pacientes, medicos };
}

async function buscarPaciente(id) {
  const tabela = new TabelaHash();
  (await sql`SELECT * FROM pacientes`).map(normP).forEach((p) => tabela.setar(p.id, p));
  return tabela.obter(id);
}

export async function criarPaciente(nome, risco) {
  if (!nome || ![1, 2, 3, 4, 5].includes(Number(risco))) return { erro: 'Nome e risco (1 a 5) são obrigatórios' };
  await sql`INSERT INTO pacientes (nome, risco) VALUES (${nome}, ${Number(risco)})`;
  return { msg: 'Paciente cadastrado' };
}

export async function criarMedico(nome, registro) {
  if (!nome || !registro) return { erro: 'Nome e registro são obrigatórios' };
  await sql`INSERT INTO medicos (nome, registro) VALUES (${nome}, ${registro})`;
  return { msg: 'Médico cadastrado' };
}

export async function acaoPaciente(id, acao, risco) {
  const p = await buscarPaciente(Number(id));
  if (!p) return { erro: 'Paciente não encontrado' };

  if (acao === 'reclassificar') {
    if (![1, 2, 3, 4, 5].includes(Number(risco))) return { erro: 'Risco inválido' };
    await sql`UPDATE pacientes SET risco = ${Number(risco)} WHERE id = ${p.id}`;
    return { msg: 'Risco atualizado; fila reorganizada' };
  }

  if (acao === 'cancelar') {
    if (p.situacao === 'Concluido' || p.situacao === 'Cancelado') return { erro: 'Atendimento já encerrado' };
    if (p.situacao === 'Em atendimento' && p.medico_id) {
      // Cancelamento não soma atendimento concluído; só libera o médico
      await sql`UPDATE medicos SET situacao = 'Disponivel' WHERE id = ${p.medico_id}`;
    }
    await sql`UPDATE pacientes SET situacao = 'Cancelado' WHERE id = ${p.id}`;
    return { msg: 'Atendimento cancelado' };
  }

  if (acao === 'concluir') {
    if (p.situacao !== 'Em atendimento' || !p.medico_id) return { erro: 'Paciente não está em atendimento' };
    await sql`UPDATE pacientes SET situacao = 'Concluido' WHERE id = ${p.id}`;
    await sql`UPDATE medicos SET concluidos = concluidos + 1, situacao = 'Disponivel', ultimo_atendimento = now() WHERE id = ${p.medico_id}`;
    return { msg: 'Atendimento concluído' };
  }

  return { erro: 'Ação desconhecida' };
}

export async function chamarProximo() {
  const pacientes = (await sql`SELECT * FROM pacientes WHERE situacao = 'Aguardando'`).map(normP);
  const medicos = (await sql`SELECT * FROM medicos WHERE situacao = 'Disponivel'`).map(normM);
  if (pacientes.length === 0) return { erro: 'Nenhum paciente aguardando' };
  if (medicos.length === 0) return { erro: 'Nenhum médico disponível; paciente permanece na fila' };

  const heapPacientes = new MinHeap(cmpPaciente);
  pacientes.forEach((p) => heapPacientes.inserir(p));
  const heapMedicos = new MinHeap(cmpMedico);
  medicos.forEach((m) => heapMedicos.inserir(m));

  const paciente = heapPacientes.extrairTopo();
  const medico = heapMedicos.extrairTopo();

  // Updates condicionais evitam chamada duplicada em requisições concorrentes
  const [ok] = await sql`UPDATE pacientes SET situacao = 'Em atendimento', medico_id = ${medico.id}, inicio = now()
                         WHERE id = ${paciente.id} AND situacao = 'Aguardando' RETURNING id`;
  if (!ok) return { erro: 'Conflito na chamada; tente novamente' };
  await sql`UPDATE medicos SET situacao = 'Em atendimento' WHERE id = ${medico.id}`;
  return { msg: `Paciente ${paciente.id} atribuído ao médico ${medico.id}` };
}
