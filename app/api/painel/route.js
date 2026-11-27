import { NextResponse } from 'next/server';
import { painel } from '@/lib/servico';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET() {
  const headers = { 'Cache-Control': 'no-store, max-age=0' };
  try {
    return NextResponse.json(await painel(), { headers });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ erro: e.message }, { status: 500, headers });
  }
}
