'use client';
import { useCallback, useEffect, useState } from 'react';
import Painel from './componentes/Painel';
import Pacientes from './componentes/Pacientes';
import Triagem from './componentes/Triagem';
import Medicos from './componentes/Medicos';
import Atendimentos from './componentes/Atendimentos';
import Historico from './componentes/Historico';
import Estruturas from './componentes/Estruturas';
import { Icone, RISCOS, Risco, Situacao, fmtDataHora, fmtHora } from './componentes/comum';

const HASH_VAZIA = { capacidade: 0, tamanho: 0, carga: 0, colisoes: 0, colisoesAtuais: 0, redimensionamentos: 0, baldes: [] };
const VAZIO = {
  fila: [], heapPacientes: [], cronologica: [], arvore: null, altura: 0,
  hash: HASH_VAZIA, hashMedicos: HASH_VAZIA, heapMedicos: [], proximoMedico: null,
  atendimentos: [], historico: [], chegadas: [], pacientes: [], medicos: [], validacao: null, proximoId: null,
};

const TELAS = {
  painel: { titulo: 'Painel geral', sub: 'Quem é o próximo, quem está em atendimento e como está a unidade agora.', Componente: Painel },
  pacientes: { titulo: 'Pacientes', sub: 'Registro de entrada, consulta por número de atendimento e lista completa.', Componente: Pacientes },
  triagem: { titulo: 'Triagem e fila', sub: 'Ordem de chamada pela prioridade clínica. Reclassifique ou cancele aqui.', Componente: Triagem },
  medicos: { titulo: 'Médicos', sub: 'Cadastro, situação e atendimentos concluídos de cada médico clínico.', Componente: Medicos },
  atendimentos: { titulo: 'Atendimentos', sub: 'Pacientes em consulta e o médico responsável por cada um.', Componente: Atendimentos },
  historico: { titulo: 'Histórico', sub: 'Atendimentos por médico, pacientes por situação e chegadas em ordem.', Componente: Historico },
  estruturas: { titulo: 'Estruturas de dados', sub: 'Rubro-Negra, heaps e tabelas hash que sustentam cada operação.', Componente: Estruturas },
};
const NAV = ['painel', 'pacientes', 'triagem', 'medicos', 'atendimentos', 'historico'];

function Registro({ registro, fechar }) {
  if (!registro) return null;
  const n = registro.eventos?.length || 0;
  return (
    <section className={`registro ${registro.erro ? 'falha' : ''}`} aria-live="polite">
      <div className="cabeca">
        <b>{registro.erro ? 'Operação não realizada' : 'Última operação'}<span className="hora">{fmtHora(registro.quando)}</span></b>
        <button className="fechar" onClick={fechar} aria-label="Fechar registro">Fechar</button>
      </div>
      <p className="msg">{registro.erro || registro.msg}</p>
      {registro.erros?.length > 0 && <p className="erro-txt">{registro.erros.join('; ')}</p>}
      {n > 0 && (
        <details>
          <summary>Ver o que mudou nas estruturas ({n} {n === 1 ? 'evento' : 'eventos'})</summary>
          <ol className="eventos">{registro.eventos.map((e, i) => <li key={i}>{e}</li>)}</ol>
        </details>
      )}
      {registro.validacao && (
        <p className={`validado ${registro.validacao.ok ? 'ok-txt' : 'erro-txt'}`}>
          {registro.validacao.ok ? 'Índices conferidos após a operação.' : registro.validacao.erros.join('; ')}
        </p>
      )}
    </section>
  );
}

function DetalhePaciente({ paciente, fechar }) {
  useEffect(() => {
    if (!paciente) return undefined;
    const esc = (e) => e.key === 'Escape' && fechar();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [paciente, fechar]);
  if (!paciente) return null;
  return (
    <div className="modal-fundo" onClick={fechar}>
      <div className={`modal r${paciente.risco}`} role="dialog" aria-modal="true" aria-label={paciente.nome} onClick={(e) => e.stopPropagation()}>
        <div className="topo-modal">
          <div>
            <h2>{paciente.nome}</h2>
            <p>Atendimento #{paciente.id}</p>
          </div>
          <button className="fechar" onClick={fechar}>Fechar</button>
        </div>
        <dl className="detalhe">
          <dt>Risco</dt><dd><Risco n={paciente.risco} /></dd>
          <dt>Situação</dt><dd><Situacao s={paciente.situacao} /></dd>
          <dt>Chegada</dt><dd>{fmtDataHora(paciente.chegada)}</dd>
          <dt>Médico</dt><dd>{paciente.medicoNome || '—'}</dd>
          <dt>Início</dt><dd>{fmtDataHora(paciente.inicio)}</dd>
          <dt>Fim</dt><dd>{fmtDataHora(paciente.fim)}</dd>
        </dl>
      </div>
    </div>
  );
}

export default function Home() {
  const [dados, setDados] = useState(VAZIO);
  const [tela, setTela] = useState('painel');
  const [registro, setRegistro] = useState(null);
  const [detalheId, setDetalheId] = useState(null);
  const [processando, setProcessando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`/api/painel?t=${Date.now()}`, { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok || j.erro) throw new Error(j.erro || `o servidor respondeu ${r.status}`);
      setDados({ ...VAZIO, ...j });
    } catch (e) {
      setRegistro({ erro: 'Não foi possível carregar os dados: ' + e.message, quando: Date.now() });
    }
  }, []);

  // Envia uma ação; devolve true se deu certo
  const enviar = async (url, corpo, confirmacao) => {
    if (confirmacao && !window.confirm(confirmacao)) return false;
    setProcessando(true);
    let ok = false;
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo || {}) });
      const j = await r.json();
      ok = !j.erro;
      setRegistro({ ...j, quando: Date.now() });
    } catch (e) {
      setRegistro({ erro: 'Sem conexão com o servidor: ' + e.message, quando: Date.now() });
    }
    await carregar();
    setProcessando(false);
    return ok;
  };

  const consultar = async (url) => {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      return await r.json();
    } catch (e) {
      return { erro: 'Sem conexão com o servidor: ' + e.message };
    }
  };

  useEffect(() => { carregar(); }, [carregar]);

  // Cada tela tem endereço próprio (#triagem, #estruturas...), útil para abrir direto na demonstração
  useEffect(() => {
    const lerHash = () => {
      const id = window.location.hash.slice(1);
      if (TELAS[id]) setTela(id);
    };
    lerHash();
    window.addEventListener('hashchange', lerHash);
    return () => window.removeEventListener('hashchange', lerHash);
  }, []);

  const irPara = (id) => {
    setTela(id);
    window.history.replaceState(null, '', `#${id}`);
  };

  const { titulo, sub, Componente } = TELAS[tela];
  const detalhe = detalheId ? dados.pacientes.find((p) => p.id === detalheId) : null;
  const contagem = { triagem: dados.fila.length, atendimentos: dados.atendimentos.length };
  const valido = dados.validacao?.ok;
  const proximo = dados.fila[0];

  const BotaoNav = ({ id }) => (
    <button className={tela === id ? 'ativa' : ''} onClick={() => irPara(id)} aria-current={tela === id ? 'page' : undefined}
      title={TELAS[id].titulo} aria-label={TELAS[id].titulo}>
      <Icone nome={id} /><span className="rotulo-nav">{TELAS[id].titulo}</span>
      {contagem[id] ? <span className="contador">{contagem[id]}</span> : null}
    </button>
  );

  return (
    <div className="app">
      <aside className="lateral">
        <div className="marca">
          <strong>SIGAE</strong>
          <span>Simulador de pronto atendimento com dados fictícios</span>
        </div>
        <nav className="nav" aria-label="Telas">
          {NAV.map((id) => <BotaoNav key={id} id={id} />)}
          <div className="divisor" />
          <BotaoNav id="estruturas" />
        </nav>
        <div className="lateral-rodape">
          <div className="estado" title={valido ? 'Índices consistentes' : 'Índices com inconsistência'}>
            <span className={`ponto ${valido === undefined ? '' : valido ? 'ok' : 'erro'}`} />
            <span className="texto-estado">{valido === undefined ? 'Carregando…' : valido ? 'Índices consistentes' : 'Índices com inconsistência'}</span>
          </div>
        </div>
      </aside>

      <div className="principal">
        <header className="topo">
          <div>
            <h1>{titulo}</h1>
            <p>{sub}</p>
          </div>
          <div className="acoes-topo">
            {processando && <span className="processando">Processando…</span>}
            <button className="btn" onClick={carregar}>Atualizar</button>
            {tela !== 'painel' && (
              <button className="btn primario" onClick={() => enviar('/api/chamar')} disabled={!proximo}
                title={proximo ? `Próximo: #${proximo.id} ${proximo.nome} (${RISCOS[proximo.risco]})` : 'Ninguém aguardando'}>
                Chamar próximo
              </button>
            )}
          </div>
        </header>

        <main className="conteudo">
          <Registro registro={registro} fechar={() => setRegistro(null)} />
          <Componente dados={dados} enviar={enviar} consultar={consultar} abrirPaciente={setDetalheId} />
        </main>
      </div>

      <DetalhePaciente paciente={detalhe} fechar={() => setDetalheId(null)} />
    </div>
  );
}
