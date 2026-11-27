import { NextResponse } from 'next/server';
import { consultarMedico } from '@/lib/servico';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  return NextResponse.json(await consultarMedico(params.id), { headers: { 'Cache-Control': 'no-store' } });
}
