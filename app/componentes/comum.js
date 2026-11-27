'use client';
// Componentes e utilitários compartilhados pelas telas
import { RISCOS } from '@/lib/regras';

export { RISCOS };

export const fmtHora = (ms) => (ms ? new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—');
export const fmtDataHora = (ms) => (ms ? new Date(ms).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');

const SITUACOES = {
  Aguardando: ['Aguardando', 's-aguardando'],
  'Em atendimento': ['Em atendimento', 's-atendimento'],
  Concluido: ['Concluído', 's-concluido'],
  Cancelado: ['Cancelado', 's-cancelado'],
  Disponivel: ['Disponível', 's-disponivel'],
};

// Risco clínico: quadrado na cor da escala + nome. "compacto" mostra só o nível.
export function Risco({ n, compacto = false }) {
  return (
    <span className={`risco r${n} ${compacto ? 'compacto' : ''}`} title={`Risco ${n}: ${RISCOS[n]}`}>
      <i />{compacto ? `Nível ${n}` : RISCOS[n]}
    </span>
  );
}

export function Situacao({ s }) {
  const [rotulo, classe] = SITUACOES[s] || [s, ''];
  return <span className={`situacao ${classe}`}>{rotulo}</span>;
}

export function Vazio({ children }) {
  return <p className="vazio">{children}</p>;
}

export function OpcoesRisco() {
  return [1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} – {RISCOS[n]}</option>);
}

// Desenho genérico de árvore binária (usado pela Rubro-Negra e pelos heaps)
export function NoArvore({ n, classe, conteudo, onClick, titulo }) {
  return (
    <div className="no-wrap">
      <button type="button" className={`no ${classe(n)}`} onClick={() => onClick?.(n)} title={titulo?.(n)}>
        {conteudo(n)}
      </button>
      {(n.esq || n.dir) && (
        <div className="filhos">
          <div>{n.esq && <NoArvore n={n.esq} classe={classe} conteudo={conteudo} onClick={onClick} titulo={titulo} />}</div>
          <div>{n.dir && <NoArvore n={n.dir} classe={classe} conteudo={conteudo} onClick={onClick} titulo={titulo} />}</div>
        </div>
      )}
    </div>
  );
}

// Converte o vetor do heap em árvore: filhos de i ficam em 2i+1 e 2i+2
export function vetorParaArvore(vetor, i = 0) {
  if (i >= vetor.length) return null;
  return { ...vetor[i], posicao: i, esq: vetorParaArvore(vetor, 2 * i + 1), dir: vetorParaArvore(vetor, 2 * i + 2) };
}

// Converte "HH:MM" de hoje (horário local do navegador) em ISO; vazio = agora
export function horaParaISO(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

// Ícones de traço simples (24x24)
const TRACOS = {
  painel: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  pacientes: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.4 3.3-5.5 6.5-5.5s5.9 2.1 6.5 5.5" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.7.8 2.8 2.6 3 5.2" /></>,
  triagem: <><path d="M4 6h16M4 12h10M4 18h6" /><path d="M17 15l3 3-3 3" /></>,
  medicos: <><path d="M6 3v5a4 4 0 0 0 8 0V3" /><path d="M10 12v3a5 5 0 0 0 10 0v-2" /><circle cx="20" cy="11" r="2" /></>,
  atendimentos: <><path d="M3 12h4l2-6 4 12 2-6h6" /></>,
  historico: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l3 2" /></>,
  estruturas: <><circle cx="12" cy="4.5" r="2" /><circle cx="6" cy="13" r="2" /><circle cx="18" cy="13" r="2" /><circle cx="3.5" cy="20" r="1.5" /><circle cx="9" cy="20" r="1.5" /><path d="M11 6.2 7 11.3M13 6.2l4 5.1M5.3 14.8 4.2 18.6M6.8 14.8l1.5 3.8" /></>,
};

export function Icone({ nome }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {TRACOS[nome]}
    </svg>
  );
}
