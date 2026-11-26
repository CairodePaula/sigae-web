import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [info] = await sql`SELECT current_database() AS banco, (SELECT count(*) FROM medicos)::int AS medicos`;
  return NextResponse.json({ host: new URL(process.env.DATABASE_URL).host, ...info });
}
