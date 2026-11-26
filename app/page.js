'use client';
import { useEffect, useState, useCallback } from 'react';

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
  const card = { background: '#fff', borderRadius: 8, padding: 16, marginBottom: 16 };

  return (
    <main>
      <h1>SIGAE Web</h1>
      {msg && <p><strong>{msg}</strong></p>}

      <section style={card}>
        <h2>Painel</h2>
        <p>Aguardando: {aguardando} · Médicos disponíveis: {disponiveis}</p>
        <button onClick={() => enviar('/api/chamar')}>Chamar próximo</button>
        <button onClick={carregar} style={{ marginLeft: 8 }}>Atualizar</button>
      </section>

      <section style={card}>
        <h2>Cadastrar paciente</h2>
        <input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />{' '}
        <select value={risco} onChange={(e) => setRisco(Number(e.target.value))}>
          <option value={1}>1 - Emergência</option>
          <option value={2}>2 - Muito urgente</option>
          <option value={3}>3 - Urgente</option>
          <option value={4}>4 - Pouco urgente</option>
          <option value={5}>5 - Não urgente</option>
        </select>{' '}
        <button onClick={() => { enviar('/api/pacientes', { nome, risco }); setNome(''); }}>Cadastrar</button>
      </section>

      <section style={card}>
        <h2>Cadastrar médico</h2>
        <input placeholder="Nome" value={nomeMed} onChange={(e) => setNomeMed(e.target.value)} />{' '}
        <input placeholder="Registro fictício" value={registro} onChange={(e) => setRegistro(e.target.value)} />{' '}
        <button onClick={() => { enviar('/api/medicos', { nome: nomeMed, registro }); setNomeMed(''); setRegistro(''); }}>Cadastrar</button>
      </section>

      <section style={card}>
        <h2>Fila de espera (ordem por prioridade)</h2>
        <table cellPadding={6} style={{ width: '100%' }}>
          <thead><tr><th align="left">ID</th><th align="left">Nome</th><th>Risco</th><th align="left">Chegada</th><th /></tr></thead>
          <tbody>
            {dados.fila.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td><td>{p.nome}</td><td align="center">{p.risco}</td>
                <td>{new Date(p.chegada).toLocaleTimeString('pt-BR')}</td>
                <td>
                  <button onClick={() => {
                    const r = window.prompt('Novo risco (1 a 5)', p.risco);
                    if (r) enviar(`/api/pacientes/${p.id}`, { acao: 'reclassificar', risco: r });
                  }}>Reclassificar</button>{' '}
                  <button onClick={() => enviar(`/api/pacientes/${p.id}`, { acao: 'cancelar' })}>Cancelar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={card}>
        <h2>Em atendimento</h2>
        {emAtendimento.map((p) => (
          <div key={p.id} style={{ marginBottom: 8 }}>
            #{p.id} {p.nome} → médico {p.medico_id}{' '}
            <button onClick={() => enviar(`/api/pacientes/${p.id}`, { acao: 'concluir' })}>Concluir</button>{' '}
            <button onClick={() => enviar(`/api/pacientes/${p.id}`, { acao: 'cancelar' })}>Cancelar</button>
          </div>
        ))}
      </section>

      <section style={card}>
        <h2>Médicos</h2>
        <table cellPadding={6} style={{ width: '100%' }}>
          <thead><tr><th align="left">ID</th><th align="left">Nome</th><th align="left">Registro</th><th>Situação</th><th>Concluídos</th></tr></thead>
          <tbody>
            {dados.medicos.map((m) => (
              <tr key={m.id}>
                <td>{m.id}</td><td>{m.nome}</td><td>{m.registro}</td>
                <td align="center">{m.situacao}</td><td align="center">{m.concluidos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={card}>
        <h2>Histórico</h2>
        <ul>
          {encerrados.map((p) => <li key={p.id}>#{p.id} {p.nome} — {p.situacao}</li>)}
        </ul>
      </section>
    </main>
  );
}
