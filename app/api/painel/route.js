import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const pacientes = await sql`SELECT id, nome, chegada, risco, situacao, medico_id FROM pacientes ORDER BY id`;
  const medicos = await sql`SELECT id, nome, registro, situacao, concluidos, ultimo_atendimento FROM medicos ORDER BY id`;
  const fila = pacientes
    .filter((p) => p.situacao === 'Aguardando')
    .sort((a, b) => a.risco - b.risco || new Date(a.chegada) - new Date(b.chegada) || a.id - b.id);
  return NextResponse.json({ fila, pacientes, medicos });
}
