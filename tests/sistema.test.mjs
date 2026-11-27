// Cenários obrigatórios de teste e defesa (seção 7 do enunciado), executados no núcleo
// do SIGAE sem banco de dados. Toda operação termina com validar() verdadeiro.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SistemaSIGAE } from '../lib/sistema.js';

// Relógio simulado: cada chamada avança 1 minuto
function relogio(inicio = 1_000_000) {
  let t = inicio;
  return () => (t += 60_000);
}

function novoSistema(qtdMedicos = 3) {
  const s = new SistemaSIGAE();
  const nomes = ['Dr. A', 'Dr. B', 'Dr. C', 'Dr. D'];
  for (let i = 1; i <= qtdMedicos; i++) s.cadastrarMedico({ id: i, nome: nomes[i - 1], registro: `CRM-${i}` });
  return s;
}

let proximoId = 1;
function paciente(s, risco, chegada, nome) {
  const id = proximoId++;
  const r = s.cadastrarPaciente({ id, nome: nome || `Paciente ${id}`, risco, chegada });
  assert.equal(r.validacao.ok, true);
  return id;
}

const medicoDe = (s, pacienteId) => s.consultar(pacienteId).paciente.medicoId;

test('Seção 7: três médicos A, B e C com zero atendimentos recebem as primeiras chamadas de forma equilibrada', () => {
  proximoId = 1;
  const s = novoSistema(3);
  const agora = relogio();
  const ids = [paciente(s, 3, 1), paciente(s, 3, 2), paciente(s, 3, 3)];
  const atribuidos = ids.map(() => s.chamar(agora()).medico.id);
  assert.deepEqual(atribuidos, [1, 2, 3]); // empate em 0: nunca receberam, menor ID
});

test('Seção 7: após conclusões, o próximo médico escolhido é o que tem menos atendimentos concluídos', () => {
  proximoId = 1;
  const s = novoSistema(3);
  const agora = relogio();
  for (let i = 0; i < 5; i++) paciente(s, 3, i);
  const p1 = s.chamar(agora()).paciente.id; // A
  const p2 = s.chamar(agora()).paciente.id; // B
  const p3 = s.chamar(agora()).paciente.id; // C
  s.concluir(p1, agora()); // A = 1
  s.concluir(p2, agora()); // B = 1
  s.concluir(p3, agora()); // C = 1
  const p4 = s.chamar(agora()).paciente.id; // empate em 1 -> A (recebeu há mais tempo)
  s.concluir(p4, agora()); // A = 2
  const r = s.chamar(agora());
  assert.equal(r.medico.id, 2); // B tem 1 concluído e recebeu antes de C
  assert.equal(r.validacao.ok, true);
});

test('Seção 7: empate de contadores desempata por quem está há mais tempo sem receber paciente, depois menor ID', () => {
  proximoId = 1;
  const s = novoSistema(3);
  const agora = relogio();
  for (let i = 0; i < 6; i++) paciente(s, 3, i);
  const pA = s.chamar(agora()).paciente.id; // A recebe primeiro
  const pB = s.chamar(agora()).paciente.id; // B
  const pC = s.chamar(agora()).paciente.id; // C
  // Concluem em ordem inversa: C, B, A. Todos ficam com 1.
  s.concluir(pC, agora());
  s.concluir(pB, agora());
  s.concluir(pA, agora());
  // A regra é "há mais tempo sem RECEBER": A recebeu primeiro, então A é o escolhido
  assert.equal(s.chamar(agora()).medico.id, 1);
  assert.equal(s.chamar(agora()).medico.id, 2);
  assert.equal(s.chamar(agora()).medico.id, 3);
});

test('Seção 7: médico ocupado não é escolhido e, sem médico disponível, o paciente permanece na fila', () => {
  proximoId = 1;
  const s = novoSistema(2);
  const agora = relogio();
  const a = paciente(s, 2, 1);
  const b = paciente(s, 2, 2);
  const c = paciente(s, 2, 3);
  assert.equal(s.chamar(agora()).medico.id, 1);
  assert.equal(s.chamar(agora()).medico.id, 2); // o 1 está ocupado
  const r = s.chamar(agora());
  assert.equal(r.semMedico, true);
  assert.deepEqual(r.efeitos, []);
  // c continua aguardando, uma única vez, nas três estruturas
  assert.equal(s.consultar(c).onde, 'espera');
  assert.equal(s.hashEspera.tamanho, 1);
  assert.equal(s.rb.tamanho, 1);
  assert.equal(s.heapPacientes.tamanho, 1);
  assert.equal(r.validacao.ok, true);
  // ao concluir, o médico liberado recebe o paciente que esperava
  s.concluir(a, agora());
  const r2 = s.chamar(agora());
  assert.equal(r2.paciente.id, c);
  assert.equal(r2.medico.id, 1);
  assert.equal(medicoDe(s, b), 2);
});

test('Seção 7: a ordem de chamada respeita o heap de pacientes (risco, chegada, ID)', () => {
  proximoId = 1;
  const s = novoSistema(4);
  const agora = relogio();
  const naoUrgente = paciente(s, 5, 100);
  const urgente = paciente(s, 3, 200);
  const emergencia = paciente(s, 1, 300);
  const urgenteMesmaHora = paciente(s, 3, 200); // empata com "urgente" em risco e chegada; ID maior
  const ordem = [];
  for (let i = 0; i < 4; i++) ordem.push(s.chamar(agora()).paciente.id);
  assert.deepEqual(ordem, [emergencia, urgente, urgenteMesmaHora, naoUrgente]);
});

test('Seção 7: a distribuição de médicos nunca se sobrepõe à prioridade clínica', () => {
  proximoId = 1;
  const s = novoSistema(1);
  const agora = relogio();
  paciente(s, 4, 1);
  const grave = paciente(s, 1, 2);
  assert.equal(s.chamar(agora()).paciente.id, grave);
});

test('Seção 7: reclassificar reorganiza o heap sem criar duplicações', () => {
  proximoId = 1;
  const s = novoSistema(1);
  const a = paciente(s, 3, 1);
  const b = paciente(s, 4, 2);
  assert.equal(s.heapPacientes.topo().id, a);
  const r = s.reclassificar(b, 1);
  assert.equal(s.heapPacientes.topo().id, b); // nova raiz do heap
  assert.equal(s.heapPacientes.tamanho, 2);
  assert.equal(s.hashEspera.tamanho, 2);
  assert.equal(s.rb.tamanho, 2);
  assert.deepEqual(r.efeitos, [{ tipo: 'reclassificar', pacienteId: b, risco: 1 }]);
  assert.match(r.eventos.join(' | '), /alterar prioridade/);
  assert.equal(r.validacao.ok, true);
});

test('Seção 7: reclassificar paciente que não está aguardando é rejeitado', () => {
  proximoId = 1;
  const s = novoSistema(1);
  const a = paciente(s, 3, 1);
  s.chamar(5);
  assert.throws(() => s.reclassificar(a, 1), /não está aguardando/);
});

test('Seção 7: cancelamento antes da conclusão não aumenta o contador e libera o médico', () => {
  proximoId = 1;
  const s = novoSistema(1);
  const agora = relogio();
  const a = paciente(s, 2, 1);
  const b = paciente(s, 3, 2);
  s.chamar(agora());
  const r = s.cancelar(a, agora());
  assert.equal(s.hashMedicos.obter(1).concluidos, 0);
  assert.equal(s.hashMedicos.obter(1).situacao, 'Disponivel');
  assert.equal(s.consultar(a).onde, 'historico');
  assert.equal(s.consultar(a).paciente.situacao, 'Cancelado');
  assert.equal(r.validacao.ok, true);
  // o médico liberado pode receber o próximo
  assert.equal(s.chamar(agora()).paciente.id, b);
});

test('Seção 7: cancelar cadastro na fila remove o paciente das três estruturas', () => {
  proximoId = 1;
  const s = novoSistema(1);
  const a = paciente(s, 3, 1);
  const b = paciente(s, 3, 2);
  const c = paciente(s, 3, 3);
  const r = s.cancelar(b, 10);
  assert.equal(s.hashEspera.contem(b), false);
  assert.equal(s.heapPacientes.contem(b), false);
  assert.equal(s.rb.buscar([2, b]), undefined);
  assert.deepEqual(s.rb.emOrdem().map((x) => x.valor.id), [a, c]);
  assert.match(r.eventos.join(' | '), /Rubro-Negra: remover #2/);
  assert.throws(() => s.cancelar(b, 11), /já foi encerrado/);
});

test('Seção 7: concluir, cancelar e reclassificar em sequência mantêm os índices consistentes', () => {
  proximoId = 1;
  const s = novoSistema(3);
  const agora = relogio();
  const r = rngSimples(11);
  for (let passo = 0; passo < 300; passo++) {
    const op = r() % 5;
    try {
      if (op === 0) paciente(s, 1 + (r() % 5), r() % 1000);
      else if (op === 1 && s.heapPacientes.tamanho) s.chamar(agora());
      else if (op === 2 && s.hashAtendimentos.tamanho) s.concluir(s.hashAtendimentos.chaves()[0], agora());
      else if (op === 3 && s.hashEspera.tamanho) s.reclassificar(s.hashEspera.chaves()[0], 1 + (r() % 5));
      else if (op === 4 && s.hashEspera.tamanho + s.hashAtendimentos.tamanho) {
        const alvo = s.hashAtendimentos.tamanho ? s.hashAtendimentos.chaves()[0] : s.hashEspera.chaves()[0];
        s.cancelar(alvo, agora());
      }
    } catch (e) {
      assert.fail(`passo ${passo}: ${e.message}`);
    }
    const v = s.validar();
    assert.equal(v.ok, true, v.erros.join('; '));
  }
  const total = s.hashEspera.tamanho + s.hashAtendimentos.tamanho + s.hashHistorico.tamanho;
  assert.equal(total, proximoId - 1); // nenhum paciente perdido ou duplicado
});

test('Seção 7: colisões na hash de espera são tratadas e os dois pacientes são localizados', () => {
  const s = new SistemaSIGAE();
  s.cadastrarPaciente({ id: 1000, nome: 'Ana', risco: 4, chegada: 1 });
  const r = s.cadastrarPaciente({ id: 1011, nome: 'Bruno', risco: 2, chegada: 2 }); // 1000 % 11 = 1011 % 11 = 10
  assert.match(r.eventos.join(' | '), /colisão no bucket 10/);
  assert.equal(s.consultar(1000).paciente.nome, 'Ana');
  assert.equal(s.consultar(1011).paciente.nome, 'Bruno');
});

test('Seção 7: a hash de espera redimensiona com o crescimento da fila', () => {
  const s = new SistemaSIGAE();
  let ultimo;
  for (let id = 1; id <= 9; id++) ultimo = s.cadastrarPaciente({ id, nome: `P${id}`, risco: 3, chegada: id });
  assert.equal(s.hashEspera.capacidade, 23);
  assert.match(ultimo.eventos.join(' | '), /de 11 para 23/);
  assert.equal(ultimo.validacao.ok, true);
});

test('Carregar do banco reconstrói os índices e detecta registro órfão', () => {
  const pacientes = [
    { id: 1, nome: 'Ana', risco: 3, chegada: 1, situacao: 'Aguardando' },
    { id: 2, nome: 'Bia', risco: 2, chegada: 2, situacao: 'Em atendimento', medicoId: 1, inicio: 5 },
    { id: 3, nome: 'Caio', risco: 1, chegada: 3, situacao: 'Concluido', medicoId: 1 },
  ];
  const medicos = [
    { id: 1, nome: 'Dr. A', situacao: 'Em atendimento', concluidos: 1, ultimaAtribuicao: 5 },
    { id: 2, nome: 'Dr. B', situacao: 'Disponivel', concluidos: 0, ultimaAtribuicao: 0 },
  ];
  const s = SistemaSIGAE.carregar(pacientes, medicos);
  assert.equal(s.validar().ok, true);
  assert.equal(s.consultar(2).medico.nome, 'Dr. A');

  // médico marcado disponível, mas com paciente vinculado: inconsistência apontada
  const quebrado = SistemaSIGAE.carregar(pacientes, [{ ...medicos[0], situacao: 'Disponivel' }, medicos[1]]);
  const v = quebrado.validar();
  assert.equal(v.ok, false);
  assert.ok(v.erros.some((e) => e.includes('Dr. A')));
});

function rngSimples(seed) {
  let s = seed;
  return () => {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
    return s;
  };
}
