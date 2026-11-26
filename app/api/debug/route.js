import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const raw = await sql`SELECT * FROM medicos ORDER BY id`;
  return NextResponse.json({
    linhas: raw.length,
    tipo: Array.isArray(raw) ? 'array' : typeof raw,
    primeiro: raw[0] ?? null,
  });
}
