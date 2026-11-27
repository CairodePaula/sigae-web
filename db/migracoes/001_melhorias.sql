-- Migração 001 — aditiva e idempotente (pode rodar mais de uma vez).
-- Compatível com a versão anterior do sistema: só acrescenta colunas e restrições.
-- Rode com:  node --env-file=.env.local scripts/migrar.mjs db/migracoes/001_melhorias.sql
-- ou cole cada bloco no SQL Editor do Neon. Os blocos são separados por "-- >>>".

-- Momento em que o médico RECEBEU o último paciente (critério de desempate)
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS ultima_atribuicao TIMESTAMPTZ;
-- >>>
-- Momento em que o atendimento foi concluído ou cancelado
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS fim TIMESTAMPTZ;
-- >>>
-- Preenche a última atribuição dos médicos a partir dos atendimentos já existentes
UPDATE medicos m
   SET ultima_atribuicao = sub.ultimo
  FROM (SELECT medico_id, max(inicio) AS ultimo FROM pacientes WHERE medico_id IS NOT NULL GROUP BY medico_id) sub
 WHERE m.id = sub.medico_id AND m.ultima_atribuicao IS NULL;
-- >>>
DO $$ BEGIN
  ALTER TABLE pacientes ADD CONSTRAINT pacientes_situacao_chk
    CHECK (situacao IN ('Aguardando', 'Em atendimento', 'Concluido', 'Cancelado'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- >>>
DO $$ BEGIN
  ALTER TABLE medicos ADD CONSTRAINT medicos_situacao_chk
    CHECK (situacao IN ('Disponivel', 'Em atendimento'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
