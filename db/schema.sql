-- Rode no SQL Editor do Neon (uma vez)
CREATE TABLE IF NOT EXISTS medicos (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  registro TEXT NOT NULL,
  situacao TEXT NOT NULL DEFAULT 'Disponivel',   -- Disponivel | Em atendimento
  concluidos INT NOT NULL DEFAULT 0,
  ultimo_atendimento TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS pacientes (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  chegada TIMESTAMPTZ NOT NULL DEFAULT now(),
  risco INT NOT NULL CHECK (risco BETWEEN 1 AND 5),  -- 1 Emergencia ... 5 Nao urgente
  situacao TEXT NOT NULL DEFAULT 'Aguardando',       -- Aguardando | Em atendimento | Concluido | Cancelado
  medico_id INT REFERENCES medicos(id),
  inicio TIMESTAMPTZ
);
