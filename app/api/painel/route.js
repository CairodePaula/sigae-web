import { NextResponse } from 'next/server';
import { painel } from '../../../lib/servico';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET() {
  return NextResponse.json(await painel(), {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}
