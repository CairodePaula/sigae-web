import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [info] = await sql`
    SELECT
      current_database() AS banco,
      current_schema() AS schema_atual,
      (SELECT count(*) FROM public.medicos)::int AS medicos_public,
      (SELECT string_agg(table_schema || '.' || table_name, ', ')
         FROM information_schema.tables WHERE table_name = 'medicos') AS tabelas_medicos
  `;
  return NextResponse.json(info);
}
