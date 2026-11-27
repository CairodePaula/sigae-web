import { NextResponse } from 'next/server';
import { validarIndices } from '@/lib/servico';

export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(await validarIndices());
}
