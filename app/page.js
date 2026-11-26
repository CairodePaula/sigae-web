'use client';
import { useEffect, useState, useCallback } from 'react';

const RISCOS = { 1: 'Emergência', 2: 'Muito urgente', 3: 'Urgente', 4: 'Pouco urgente', 5: 'Não urgente' };
const VAZIO = {
  fila: [], cronologica: [], arvore: null, altura: 0,
  hash: { capacidade: 0, tamanho: 0, colisoes: 0, baldes: [] },
  proximoMedico: null, pacientes: [], medicos: [],
};
const fmtHora = (ms) => (ms ? new Date(ms).toLocaleTimeString('pt-BR') : '—');

function Risco({ n }) {
  return <span className={`risco r${n}`}>{n} · {RISCOS[n]}</span>;
}

function Badge({ situacao }) {
  const cls = situacao === 'Disponivel' ? 'badge b-disp' : situacao === 'Em atendimento' ? 'badge b-atend' : 'badge';
  return <span className={cls}>{situacao === 'Disponivel' ? 'Disponível' : situacao}</span>;
}

function No({ n }) {
  return (
    <div className="no-wrap">
      <div className={`no ${n.cor}`}>
        <b>#{n.id}</b>
        <span>{n.nome}</span>
        <small>risco {n.risco} · {fmtHora(n.chegada)}</small>
      </div>
      {(n.esq || n.dir) && (
        <div className="filhos">
          <div>{n.esq && <No n={n.esq} />}</div>
          <div>{n.dir && <No n={n.dir} />}</div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [dados, setDados] = useState(VAZIO);
  const [msg, setMsg] = useState('');
  const [nome, setNome] = useState('');
  const [risco, setRisco] = useState(3);
  const [nomeMed, setNomeMed] = useState('');
  const [registro, setRegistro] = useState('');

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`/api/painel?t=${Date.now()}`, { cache: 'no-store' });
      if (!r.ok) throw new Error(`painel respondeu ${r.status}`);
      setDados(await r.json());
    } catch (e) {
      setMsg('Erro ao carregar painel: ' + e.message);
    }
  }, []);

  const enviar = async (url, corpo) => {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo || {}),
      });
      const j = await r.json();
      setMsg(j.erro || j.msg || 'OK');
    } catch (e) {
      setMsg('Erro de rede: ' + e.message);
    }
    await carregar();
  };

  useEffect(() => { carregar(); }, [carregar]);

  const proximo = dados.fila[0];
  const emAtendimento = dados.pacientes.filter((p) => p.situacao === 'Em atendimento');
  const encerrados = dados.pacientes.filter((p) => p.situacao === 'Concluido' || p.situacao === 'Cancelado');
  const disponiveis = dados.medicos.filter((m) => m.situacao === 'Disponivel').length;
  const h = dados.hash;

  return (
    <>
      <header className="topo">
        <div>
          <h1>SIGAE Web</h1>
          <small>Sistema de atendimento de emergência · dados fictícios</small>
        </div>
        <div className="acoes">
          <button className="sec" onClick={carregar}>Atualizar</button>
        </div>
      </header>

      <main className="container">
        {msg && <div className="msg">{msg}</div>}

        <section className="hero">
          <div>
            <small>Próximo a ser chamado · Min-Heap de prioridade</small>
            <h2>{proximo ? `#${proximo.id} ${proximo.nome}` : 'Ninguém aguardando'}</h2>
            {proximo && <Risco n={proximo.risco} />}
            {dados.proximoMedico && (
              <p className="sub">
                Médico previsto: #{dados.proximoMedico.id} {dados.proximoMedico.nome}
                {' '}({dados.proximoMedico.concluidos} concluídos)
              </p>
            )}
          </div>
          <button className="chamar" onClick={() => enviar('/api/chamar')}>Chamar próximo</button>
        </section>

        <section className="card">
          <div className="stats">
            <div className="stat"><b>{dados.fila.length}</b><span>Aguardando</span></div>
            <div className="stat"><b>{emAtendimento.length}</b><span>Em atendimento</span></div>
            <div className="stat"><b>{disponiveis}</b><span>Médicos disponíveis</span></div>
            <div className="stat"><b>{dados.medicos.length}</b><span>Médicos cadastrados</span></div>
          </div>
        </section>

        <section className="card">
          <h2>Indicadores</h2>
          <div className="stats">
            {['Aguardando', 'Em atendimento', 'Concluido', 'Cancelado'].map((s) => (
              <div className="stat" key={s}>
                <b>{dados.pacientes.filter((p) => p.situacao === s).length}</b>
                <span>Pacientes: {s}</span>
              </div>
            ))}
          </div>
          <p className="sub">
            Atendimentos concluídos por médico:{' '}
            {dados.medicos.map((m) => `#${m.id} ${m.nome} (${m.concluidos})`).join(' · ') || '—'}
          </p>
        </section>

        <div className="grid2">
          <section className="card">
            <h2>Cadastrar paciente</h2>
            <div className="form">
              <input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
              <select value={risco} onChange={(e) => setRisco(Number(e.target.value))}>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} - {RISCOS[n]}</option>)}
              </select>
              <button onClick={() => { enviar('/api/pacientes', { nome, risco }); setNome(''); }}>Cadastrar</button>
            </div>
          </section>

          <section className="card">
            <h2>Cadastrar médico</h2>
            <div className="form">
              <input placeholder="Nome" value={nomeMed} onChange={(e) => setNomeMed(e.target.value)} />
              <input placeholder="Registro fictício" value={registro} onChange={(e) => setRegistro(e.target.value)} />
              <button onClick={() => { enviar('/api/medicos', { nome: nomeMed, registro }); setNomeMed(''); setRegistro(''); }}>Cadastrar</button>
            </div>
          </section>
        </div>

        <section className="card">
          <h2>Fila de espera · ordem de chamada (Min-Heap)</h2>
          <p className="sub">Próximo = menor (risco, chegada, ID). Prioridade clínica prevalece sobre a ordem de chegada.</p>
          {dados.fila.length === 0 ? <div className="vazio">Nenhum paciente aguardando.</div> : (
            <table>
              <thead><tr><th>Ordem</th><th>ID</th><th>Nome</th><th>Risco</th><th>Chegada</th><th>Ações</th></tr></thead>
              <tbody>
                {dados.fila.map((p, i) => (
                  <tr key={p.id}>
                    <td>{i + 1}º</td>
                    <td>#{p.id}</td>
                    <td>{p.nome}</td>
                    <td><Risco n={p.risco} /></td>
                    <td>{fmtHora(p.chegada)}</td>
                    <td className="acoes">
                      <button className="sec" onClick={() => {
                        const r = window.prompt('Novo risco (1 a 5)', p.risco);
                        if (r) enviar(`/api/pacientes/${p.id}`, { acao: 'reclassificar', risco: r });
                      }}>Reclassificar</button>
                      <button className="sec" onClick={() => enviar(`/api/pacientes/${p.id}`, { acao: 'cancelar' })}>Cancelar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card">
          <div className="cardhead">
            <h2>Árvore Rubro-Negra · índice de chegada</h2>
            <span className="legenda">
              <i className="sw v" /> vermelho <i className="sw p" /> preto · altura {dados.altura}
            </span>
          </div>
          <p className="sub">
            Chave (chegada, ID). Inserções em ordem de chegada: {dados.cronologica.map((p) => `#${p.id}`).join(' → ') || '—'}
          </p>
          <div className="arvore-scroll">
            {dados.arvore ? <No n={dados.arvore} /> : <div className="vazio">Árvore vazia.</div>}
          </div>
        </section>

        <section className="card">
          <h2>Tabela hash · pacientes por ID</h2>
          <p className="sub">
            Capacidade {h.capacidade} · {h.tamanho} itens · colisões {h.colisoes} · redimensiona acima de 75% de carga
          </p>
          <div className="baldes">
            {h.baldes.map((b) => (
              <div key={b.i} className={`balde ${b.chaves.length > 1 ? 'colide' : ''}`}>
                <small>posição {b.i}</small>
                {b.chaves.length === 0 ? <em>vazio</em> : b.chaves.map((id) => <span key={id}>#{id}</span>)}
              </div>
            ))}
          </div>
        </section>

        <div className="grid2">
          <section className="card">
            <h2>Em atendimento</h2>
            {emAtendimento.length === 0 && <div className="vazio">Nenhum atendimento em andamento.</div>}
            {emAtendimento.map((p) => (
              <div key={p.id} className="atend-item">
                <span>
                  #{p.id} <strong>{p.nome}</strong> → médico #{p.medico_id}
                  <br /><small className="sub">início {fmtHora(p.inicio)}</small>
                </span>
                <span className="acoes">
                  <button className="ok" onClick={() => enviar(`/api/pacientes/${p.id}`, { acao: 'concluir' })}>Concluir</button>
                  <button className="sec" onClick={() => enviar(`/api/pacientes/${p.id}`, { acao: 'cancelar' })}>Cancelar</button>
                </span>
              </div>
            ))}
          </section>

          <section className="card hist">
            <h2>Histórico</h2>
            {encerrados.length === 0 && <div className="vazio">Sem atendimentos encerrados.</div>}
            <ul>
              {encerrados.map((p) => <li key={p.id}>#{p.id} {p.nome} — {p.situacao}</li>)}
            </ul>
          </section>
        </div>

        <section className="card">
          <h2>Médicos</h2>
          <table>
            <thead><tr><th>ID</th><th>Nome</th><th>Registro</th><th>Situação</th><th>Concluídos</th></tr></thead>
            <tbody>
              {dados.medicos.map((m) => (
                <tr key={m.id}>
                  <td>#{m.id}</td>
                  <td>{m.nome}</td>
                  <td>{m.registro}</td>
                  <td><Badge situacao={m.situacao} /></td>
                  <td>{m.concluidos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}
