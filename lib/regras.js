// Regras de ordenação do SIGAE (funções puras, testáveis sem banco)

export const RISCOS = { 1: 'Emergência', 2: 'Muito urgente', 3: 'Urgente', 4: 'Pouco urgente', 5: 'Não urgente' };

// Paciente: prioridade clínica (1 = mais urgente), depois quem chegou antes, depois menor ID
export const cmpPaciente = (a, b) => a.risco - b.risco || a.chegada - b.chegada || a.id - b.id;

// Médico: menos atendimentos concluídos, depois quem está há mais tempo sem RECEBER paciente
// (ultimaAtribuicao = momento da última chamada; 0 = nunca recebeu), depois menor ID
export const cmpMedico = (a, b) =>
  a.concluidos - b.concluidos || (a.ultimaAtribuicao || 0) - (b.ultimaAtribuicao || 0) || a.id - b.id;
