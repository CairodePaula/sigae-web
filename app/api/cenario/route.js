import { NextResponse } from 'next/server';
import { restaurarCenario } from '@/lib/servico';

// Restaura o cenário de demonstração (apaga os dados atuais da simulação)
export async function POST(request) {
  const { tipo } = await request.json().catch(() => ({}));
  return NextResponse.json(await restaurarCenario(tipo === 'colisoes' ? 'colisoes' : 'normal'));
}
