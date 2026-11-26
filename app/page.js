'use client';
import { useEffect, useState, useCallback } from 'react';

const RISCOS = { 1: 'Emergência', 2: 'Muito urgente', 3: 'Urgente', 4: 'Pouco urgente', 5: 'Não urgente' };
const fmtHora = (ms) => new Date(ms).toLocaleTimeString('pt-BR');

function Risco({ n }) {
  return <span className={`risco r${n}`} title={RISCOS[n]}>{n} · {RISCOS[n]}</span>;
}

function Badge({ situacao }) {
  const cls = situacao === 'Disponivel' ? 'badge b-disp' : situacao === 'Em atendimento' ? 'badge b-atend' : 'badge';
  return <span className={cls}>{situacao === 'Disponivel' ? 'Disponível' : situacao}</span>;
}

export default function Home() {
  const [dados, setDados] = useState({ fila: [], pacientes: [], medicos: [] });
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

  const aguardando = dados.pacientes.filter((p) => p.situacao === 'Aguardando').length;
  const disponiveis = dados.medicos.filter((m) => m.situacao === 'Disponivel').length;
  const emAtendimento = dados.pacientes.filter((p) => p.situacao === 'Em atendimento');
  const encerrados = dados.pacientes.filter((p) => p.situacao === 'Concluido' || p.situacao === 'Cancelado');

  return (
    <>
      <header className="topo">
        <div>
          <h1>SIGAE Web</h1>
          <small>Sistema de atendimento de emergência · dados fictícios</small>
        </div>
        <div className="acoes">
          <button onClick={() => enviar('/api/chamar')}>Chamar próximo</button>
          <button className="sec" onClick={carregar}>Atualizar</button>
        </div>
      </header>

      <main className="container">
        {msg && <div className="msg">{msg}</div>}

        <section className="card">
          <div className="stats">
            <div className="stat"><b>{aguardando}</b><span>Aguardando</span></div>
            <div className="stat"><b>{emAtendimento.length}</b><span>Em atendimento</span></div>
            <div className="stat"><b>{disponiveis}</b><span>Médicos disponíveis</span></div>
            <div className="stat"><b>{dados.medicos.length}</b><span>Médicos cadastrados</span></div>
          </div>
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
          <h2>Fila de espera (ordem cronológica · Rubro-Negra)</h2>
          {dados.fila.length === 0 ? <div className="vazio">Nenhum paciente aguardando.</div> : (
            <table>
              <thead><tr><th>ID</th><th>Nome</th><th>Risco</th><th>Chegada</th><th>Ações</th></tr></thead>
              <tbody>
                {dados.fila.map((p) => (
                  <tr key={p.id}>
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

        <div className="grid2">
          <section className="card">
            <h2>Em atendimento</h2>
            {emAtendimento.length === 0 && <div className="vazio">Nenhum atendimento em andamento.</div>}
            {emAtendimento.map((p) => (
              <div key={p.id} className="atend-item">
                <span>#{p.id} <strong>{p.nome}</strong> → médico #{p.medico_id}</span>
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