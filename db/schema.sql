-- Esquema completo do SIGAE (rode no SQL Editor do Neon em um banco novo).
-- Em um banco já existente, use db/migracoes/001_melhorias.sql.
CREATE TABLE IF NOT EXISTS medicos (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  registro TEXT NOT NULL,
  situacao TEXT NOT NULL DEFAULT 'Disponivel'
    CONSTRAINT medicos_situacao_chk CHECK (situacao IN ('Disponivel', 'Em atendimento')),
  concluidos INT NOT NULL DEFAULT 0,
  ultimo_atendimento TIMESTAMPTZ,   -- legado (não usado pela versão atual)
  ultima_atribuicao TIMESTAMPTZ     -- quando recebeu o último paciente (desempate)
);

CREATE TABLE IF NOT EXISTS pacientes (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  chegada TIMESTAMPTZ NOT NULL DEFAULT now(),
  risco INT NOT NULL CHECK (risco BETWEEN 1 AND 5),  -- 1 Emergência ... 5 Não urgente
  situacao TEXT NOT NULL DEFAULT 'Aguardando'
    CONSTRAINT pacientes_situacao_chk CHECK (situacao IN ('Aguardando', 'Em atendimento', 'Concluido', 'Cancelado')),
  medico_id INT REFERENCES medicos(id),
  inicio TIMESTAMPTZ,
  fim TIMESTAMPTZ
);
