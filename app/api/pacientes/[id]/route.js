import { NextResponse } from 'next/server';
import { acaoPaciente, consultarPaciente } from '@/lib/servico';

export const dynamic = 'force-dynamic';

// Consulta por ID (feita pelas tabelas hash)
export async function GET(request, { params }) {
  return NextResponse.json(await consultarPaciente(params.id), { headers: { 'Cache-Control': 'no-store' } });
}

// Ações: reclassificar, concluir, cancelar
export async function POST(request, { params }) {
  const { acao, risco } = await request.json();
  return NextResponse.json(await acaoPaciente(params.id, acao, risco));
}
