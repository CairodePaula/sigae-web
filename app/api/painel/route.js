import { NextResponse } from 'next/server';
import { painel } from '@/lib/servico';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await painel());
}
