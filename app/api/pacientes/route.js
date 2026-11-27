import { NextResponse } from 'next/server';
import { criarPaciente } from '@/lib/servico';

export async function POST(request) {
  const { nome, risco, chegada } = await request.json();
  return NextResponse.json(await criarPaciente(nome, risco, chegada));
}
