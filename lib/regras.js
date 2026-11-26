// Regras de ordenação do SIGAE (funções puras, testáveis sem banco)

// Paciente: prioridade clínica, depois chegada, depois ID
export const cmpPaciente = (a, b) => a.risco - b.risco || a.chegada - b.chegada || a.id - b.id;

// Médico: menos atendimentos concluídos, depois quem está há mais tempo sem paciente, depois ID
export const cmpMedico = (a, b) => a.concluidos - b.concluidos || a.ultimo - b.ultimo || a.id - b.id;
