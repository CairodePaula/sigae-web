'use client';
import { useState } from 'react';
import { OpcoesRisco, Risco, Situacao, Vazio, fmtHora, horaParaISO } from './comum';

export default function Pacientes({ dados, enviar, abrirPaciente, consultar }) {
  const [nome, setNome] = useState('');
  const [hora, setHora] = useState('');
  const [risco, setRisco] = useState(3);
  const [idBusca, setIdBusca] = useState('');
  const [resultado, setResultado] = useState(null);

  const registrar = async (e) => {
    e.preventDefault();
    const ok = await enviar('/api/pacientes', { nome, risco, chegada: horaParaISO(hora) });
    if (ok) { setNome(''); setHora(''); }
  };

  const buscar = async (e) => {
    e.preventDefault();
    if (idBusca) setResultado(await consultar(`/api/pacientes/${Number(idBusca)}`));
  };

  const r = resultado && !resultado.erro ? resultado : null;

  return (
    <>
      <div className="colunas">
        <section className="painel">
          <h2>Registrar entrada</h2>
          <p className="nota">O número de atendimento é gerado automaticamente. Deixe a hora em branco para usar o horário atual.</p>
          <form className="campos" onSubmit={registrar}>
            <label>Número de atendimento<input value={dados.proximoId ?? '—'} disabled /></label>
            <label>Nome do paciente<input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome fictício" required /></label>
            <div className="colunas">
              <label>Hora de chegada<input type="time" value={hora} onChange={(e) => setHora(e.target.value)} /></label>
              <label>Classificação de risco
                <select value={risco} onChange={(e) => setRisco(Number(e.target.value))}><OpcoesRisco /></select>
              </label>
            </div>
            <div><button className="btn primario" type="submit">Registrar entrada</button></div>
          </form>
        </section>

        <section className="painel">
          <h2>Consultar atendimento</h2>
          <p className="nota">A busca é feita pelo número de atendimento, direto na tabela hash.</p>
          <form className="campos linha" onSubmit={buscar}>
            <input type="number" min="1" placeholder="Ex.: 1003" value={idBusca} onChange={(e) => setIdBusca(e.target.value)} aria-label="Número de atendimento" />
            <button className="btn" type="submit">Consultar</button>
          </form>
          {resultado?.erro && <p className="erro-txt">{resultado.erro}</p>}
          {r && (
            <div className="resultado">
              <div className="titulo"><a onClick={() => abrirPaciente(r.paciente.id)}>{r.paciente.nome}</a><Situacao s={r.paciente.situacao} /></div>
              <div><Risco n={r.paciente.risco} /> <span className="detalhe-txt">chegou às {fmtHora(r.paciente.chegada)}</span></div>
              <p className="detalhe-txt">
                {r.onde === 'espera' && `Na fila, em ${r.posicaoNaFila}º lugar. Encontrado no bucket ${r.bucket} da hash de espera (${r.paciente.id} mod ${dados.hash.capacidade}).`}
                {r.onde === 'atendimento' && `Em consulta com ${r.medico?.nome} desde ${fmtHora(r.paciente.inicio)}.`}
                {r.onde === 'historico' && `Atendimento encerrado${r.medico ? `, com ${r.medico.nome}` : ''}.`}
              </p>
            </div>
          )}
        </section>
      </div>

      <section className="painel">
        <h2>Todos os pacientes</h2>
        <p className="nota">Clique em uma linha para ver os detalhes.</p>
        {dados.pacientes.length === 0 ? <Vazio>Nenhum paciente registrado ainda.</Vazio> : (
          <div className="rolagem">
            <table className="tabela">
              <thead><tr><th /><th>Nº</th><th>Nome</th><th>Risco</th><th>Chegada</th><th>Situação</th><th>Médico</th></tr></thead>
              <tbody>
                {dados.pacientes.map((p) => (
                  <tr key={p.id} className={`clicavel r${p.risco}`} onClick={() => abrirPaciente(p.id)}>
                    <td className="faixa"><i /></td>
                    <td className="id">{p.id}</td><td>{p.nome}</td><td><Risco n={p.risco} /></td>
                    <td className="id">{fmtHora(p.chegada)}</td><td><Situacao s={p.situacao} /></td><td>{p.medicoNome || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
