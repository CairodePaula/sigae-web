import { NextResponse } from 'next/server';
import { criarMedico } from '@/lib/servico';

export async function POST(request) {
  const { nome, registro } = await request.json();
  return NextResponse.json(await criarMedico(nome, registro));
}
