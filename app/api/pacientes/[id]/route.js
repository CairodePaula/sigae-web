import { NextResponse } from 'next/server';
import { acaoPaciente } from '@/lib/servico';

export async function POST(request, { params }) {
  const { acao, risco } = await request.json();
  return NextResponse.json(await acaoPaciente(params.id, acao, risco));
}
