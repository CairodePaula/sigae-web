import { NextResponse } from 'next/server';
import { chamarProximo } from '@/lib/servico';

export async function POST() {
  return NextResponse.json(await chamarProximo());
}
