// Camada de serviço: liga o núcleo do SIGAE (lib/sistema.js) ao banco Neon.
// A cada requisição: carrega as linhas do banco -> reconstrói as estruturas -> executa a operação
// nas estruturas -> grava os efeitos de forma atômica (UPDATEs condicionais em uma única instrução).
// A reconstrução é necessária porque funções serverless não mantêm memória entre requisições.
import { sql } from './db';
import { SistemaSIGAE, ErroSIGAE } from './sistema';
import { RISCOS } from './regras';

const ts = (d) => (d ? new Date(d).getTime() : null);
const iso = (ms) => new Date(ms).toISOString();

const normP = (p) => ({
  id: p.id,
  nome: p.nome,
  risco: p.risco,
  chegada: ts(p.chegada),
  situacao: p.situacao,
  medicoId: p.medico_id,
  inicio: ts(p.inicio),
  fim: ts(p.fim),
});

const normM = (m) => ({
  id: m.id,
  nome: m.nome,
  registro: m.registro,
  situacao: m.situacao,
  concluidos: m.concluidos,
  ultimaAtribuicao: ts(m.ultima_atribuicao) || 0,
});

// Lê pacientes e médicos na mesma fotografia do banco (transação somente leitura)
async function carregar() {
  const [pRows, mRows] = await sql.transaction(
    [
      sql`SELECT id, nome, chegada, risco, situacao, medico_id, inicio, fim FROM pacientes ORDER BY id`,
      sql`SELECT id, nome, registro, situacao, concluidos, ultima_atribuicao FROM medicos ORDER BY id`,
    ],
    { readOnly: true, isolationLevel: 'RepeatableRead' },
  );
  return SistemaSIGAE.carregar(pRows.map(normP), mRows.map(normM));
}

const CONFLITO = 'O estado mudou durante a operação (outra ação foi feita ao mesmo tempo). Nada foi gravado; tente novamente.';

// Converte erros de regra em resposta { erro } e mantém o formato das respostas
async function executar(fn) {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ErroSIGAE) return { erro: e.message };
    console.error(e);
    return { erro: 'Erro interno: ' + e.message };
  }
}

const resposta = (r) => ({ msg: r.msg, eventos: r.eventos || [], validacao: r.validacao });

// ---------- Leitura ----------

export async function painel() {
  const s = await carregar();
  const [seq] = await sql`SELECT last_value, is_called FROM pacientes_id_seq`;
  const proximoId = seq ? Number(seq.last_value) + (seq.is_called ? 1 : 0) : null;
  return { ...s.snapshot(), proximoId };
}

export async function consultarPaciente(id) {
  return executar(async () => {
    const s = await carregar();
    const r = s.consultar(Number(id));
    if (!r) return { erro: `Atendimento #${id} não localizado` };
    return r;
  });
}

export async function consultarMedico(id) {
  return executar(async () => {
    const s = await carregar();
    const r = s.consultarMedico(Number(id));
    if (!r) return { erro: `Médico #${id} não localizado` };
    return r;
  });
}

export async function validarIndices() {
  return executar(async () => {
    const s = await carregar();
    const v = s.validar();
    return { ...v, msg: v.ok ? 'Índices consistentes: Rubro-Negra, Heaps e Hashes válidos e com o mesmo conjunto de pacientes ativos.' : 'Inconsistências encontradas.' };
  });
}

// ---------- Cadastros ----------

export async function criarPaciente(nome, risco, chegada) {
  return executar(async () => {
    nome = String(nome || '').trim();
    risco = Number(risco);
    if (nome.length < 2 || nome.length > 90) return { erro: 'Informe um nome válido (2 a 90 caracteres)' };
    if (!RISCOS[risco]) return { erro: 'Classificação de risco inválida (1 a 5)' };
    let quando = Date.now();
    if (chegada) {
      quando = new Date(chegada).getTime();
      if (Number.isNaN(quando)) return { erro: 'Horário de chegada inválido' };
      if (quando > Date.now() + 60_000) return { erro: 'O horário de chegada não pode estar no futuro' };
    }

    const s = await carregar();
    const [row] = await sql`INSERT INTO pacientes (nome, risco, chegada) VALUES (${nome}, ${risco}, ${iso(quando)})
                            RETURNING id, nome, chegada, risco, situacao, medico_id, inicio, fim`;
    try {
      return { ...resposta(s.cadastrarPaciente(normP(row))), id: row.id };
    } catch (e) {
      await sql`DELETE FROM pacientes WHERE id = ${row.id}`; // desfaz se as estruturas recusarem
      throw e;
    }
  });
}

export async function criarMedico(nome, registro) {
  return executar(async () => {
    nome = String(nome || '').trim();
    registro = String(registro || '').trim();
    if (nome.length < 2 || !registro) return { erro: 'Nome e registro profissional (fictício) são obrigatórios' };

    const s = await carregar();
    if (s.hashMedicos.valores().some((m) => m.registro.toLowerCase() === registro.toLowerCase())) {
      return { erro: `Já existe médico com o registro ${registro}` };
    }
    const [row] = await sql`INSERT INTO medicos (nome, registro) VALUES (${nome}, ${registro})
                            RETURNING id, nome, registro, situacao, concluidos, ultima_atribuicao`;
    try {
      return { ...resposta(s.cadastrarMedico(normM(row))), id: row.id };
    } catch (e) {
      await sql`DELETE FROM medicos WHERE id = ${row.id}`;
      throw e;
    }
  });
}

// ---------- Fluxo de atendimento ----------

export async function chamarProximo() {
  return executar(async () => {
    const s = await carregar();
    const agora = Date.now();
    const r = s.chamar(agora);
    if (r.semMedico) return resposta(r);
    const { pacienteId, medicoId } = r.efeitos[0];

    // Paciente e médico só mudam juntos, e só se ainda estiverem elegíveis
    const ok = await sql`
      WITH alvo AS (
        SELECT p.id AS pid, m.id AS mid
          FROM pacientes p, medicos m
         WHERE p.id = ${pacienteId} AND p.situacao = 'Aguardando'
           AND m.id = ${medicoId} AND m.situacao = 'Disponivel'
           FOR UPDATE OF p, m
      ), medico AS (
        UPDATE medicos SET situacao = 'Em atendimento', ultima_atribuicao = ${iso(agora)}
         WHERE id IN (SELECT mid FROM alvo) RETURNING id
      )
      UPDATE pacientes SET situacao = 'Em atendimento', medico_id = ${medicoId}, inicio = ${iso(agora)}
       WHERE id IN (SELECT pid FROM alvo) RETURNING id`;
    if (ok.length === 0) return { erro: CONFLITO };
    return resposta(r);
  });
}

export async function acaoPaciente(id, acao, risco) {
  return executar(async () => {
    id = Number(id);
    if (!Number.isInteger(id)) return { erro: 'ID inválido' };
    const s = await carregar();
    const agora = Date.now();

    if (acao === 'reclassificar') {
      const r = s.reclassificar(id, Number(risco));
      if (r.efeitos.length === 0) return resposta(r);
      const ok = await sql`UPDATE pacientes SET risco = ${Number(risco)}
                            WHERE id = ${id} AND situacao = 'Aguardando' RETURNING id`;
      if (ok.length === 0) return { erro: CONFLITO };
      return resposta(r);
    }

    if (acao === 'concluir') {
      const r = s.concluir(id, agora);
      const ok = await sql`
        WITH alvo AS (
          SELECT p.id AS pid, m.id AS mid
            FROM pacientes p JOIN medicos m ON m.id = p.medico_id
           WHERE p.id = ${id} AND p.situacao = 'Em atendimento' AND m.situacao = 'Em atendimento'
             FOR UPDATE OF p, m
        ), medico AS (
          UPDATE medicos SET concluidos = concluidos + 1, situacao = 'Disponivel'
           WHERE id IN (SELECT mid FROM alvo) RETURNING id
        )
        UPDATE pacientes SET situacao = 'Concluido', fim = ${iso(agora)}
         WHERE id IN (SELECT pid FROM alvo) RETURNING id`;
      if (ok.length === 0) return { erro: CONFLITO };
      return resposta(r);
    }

    if (acao === 'cancelar') {
      const r = s.cancelar(id, agora);
      const efeito = r.efeitos[0];
      let ok;
      if (efeito.tipo === 'cancelarEspera') {
        ok = await sql`UPDATE pacientes SET situacao = 'Cancelado', fim = ${iso(agora)}
                        WHERE id = ${id} AND situacao = 'Aguardando' RETURNING id`;
      } else {
        // Cancelamento antes da conclusão: libera o médico SEM somar atendimento concluído
        ok = await sql`
          WITH alvo AS (
            SELECT p.id AS pid, m.id AS mid
              FROM pacientes p JOIN medicos m ON m.id = p.medico_id
             WHERE p.id = ${id} AND p.situacao = 'Em atendimento'
               FOR UPDATE OF p, m
          ), medico AS (
            UPDATE medicos SET situacao = 'Disponivel' WHERE id IN (SELECT mid FROM alvo) RETURNING id
          )
          UPDATE pacientes SET situacao = 'Cancelado', fim = ${iso(agora)}
           WHERE id IN (SELECT pid FROM alvo) RETURNING id`;
      }
      if (ok.length === 0) return { erro: CONFLITO };
      return resposta(r);
    }

    return { erro: 'Ação desconhecida' };
  });
}

// ---------- Cenários de demonstração ----------

const MEDICOS_DEMO = [
  ['Dra. Ana Lima (A)', 'CRM-SIM 0001'],
  ['Dr. Bruno Reis (B)', 'CRM-SIM 0002'],
  ['Dra. Carla Souza (C)', 'CRM-SIM 0003'],
];
const PACIENTES_DEMO = [
  // nome, risco, minutos antes de agora
  ['Ana Ribeiro', 4, 20],
  ['Bruno Souza', 2, 15],
  ['Carlos Mendes', 5, 10],
  ['Daniela Costa', 1, 5],
  ['Eduardo Silva', 3, 0],
];

// tipo 'normal': IDs 1000..1004 | tipo 'colisoes': IDs 1000, 1011, 1022... (todos no bucket 10 de 11)
export async function restaurarCenario(tipo = 'normal') {
  return executar(async () => {
    const agora = Date.now();
    const passo = tipo === 'colisoes' ? 11 : 1;
    const ids = PACIENTES_DEMO.map((_, i) => 1000 + i * passo);
    await sql.transaction([
      sql`TRUNCATE pacientes, medicos RESTART IDENTITY`,
      ...MEDICOS_DEMO.map(([nome, registro]) => sql`INSERT INTO medicos (nome, registro) VALUES (${nome}, ${registro})`),
      ...PACIENTES_DEMO.map(([nome, risco, min], i) =>
        sql`INSERT INTO pacientes (id, nome, risco, chegada) VALUES (${ids[i]}, ${nome}, ${risco}, ${iso(agora - min * 60_000)})`),
      sql`SELECT setval('pacientes_id_seq', ${ids[ids.length - 1]})`,
    ]);
    const s = await carregar();
    return {
      msg: tipo === 'colisoes'
        ? `Cenário de colisões: pacientes ${ids.map((i) => '#' + i).join(', ')} caem todos no bucket ${ids[0] % 11} (ID % 11). Três médicos com zero atendimentos.`
        : 'Cenário restaurado: três médicos (A, B, C) com zero atendimentos e cinco pacientes aguardando.',
      eventos: [],
      validacao: s.validar(),
    };
  });
}
