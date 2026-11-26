import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { ArvoreRubroNegra } from '../../../lib/estruturas/arvoreRubroNegra';
import { MinHeap } from '../../../lib/estruturas/heapBinario';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const ts = (d) => (d ? new Date(d).getTime() : 0);
const cmpPaciente = (a, b) => a.risco - b.risco || a.chegada - b.chegada || a.id - b.id;

export async function GET() {
  const rows = await sql`SELECT id, nome, chegada, risco, situacao, medico_id FROM pacientes ORDER BY id`;
  const medicos = await sql`SELECT id, nome, registro, situacao, concluidos, ultimo_atendimento FROM medicos ORDER BY id`;
  const pacientes = rows.map((p) => ({ ...p, chegada: ts(p.chegada) }));
  const aguardando = pacientes.filter((p) => p.situacao === 'Aguardando');

  const arvore = new ArvoreRubroNegra();
  aguardando.forEach((p) => arvore.inserir([p.chegada, p.id], p));
  const cronologica = arvore.emOrdem().map((x) => x.valor);

  const heap = new MinHeap(cmpPaciente);
  aguardando.forEach((p) => heap.inserir(p));
  const fila = [];
  while (heap.tamanho > 0) fila.push(heap.extrairTopo());

  return NextResponse.json(
    { fila, cronologica, pacientes, medicos },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
