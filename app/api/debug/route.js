import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [contagem] = await sql`SELECT count(*)::int AS n FROM medicos`;
  const selectStar = await sql`SELECT * FROM medicos`;
  const colunas = await sql`SELECT id, nome FROM medicos`;
  const [rls] = await sql`
    SELECT relrowsecurity AS rls_ativo, relforcerowsecurity AS rls_forcado
    FROM pg_class WHERE relname = 'medicos'
  `;
  return NextResponse.json({
    contagem: contagem.n,
    select_star: selectStar.length,
    select_colunas: colunas.length,
    rls,
  });
}
