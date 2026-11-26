import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { painel } from '../../../lib/servico';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [info] = await sql`SELECT current_database() AS banco, (SELECT count(*) FROM medicos)::int AS medicos`;
  const p = await painel();
  return NextResponse.json({
    host: new URL(process.env.DATABASE_URL).host,
    ...info,
    painel_medicos: p.medicos.length,
    painel_pacientes: p.pacientes.length,
  });
}
