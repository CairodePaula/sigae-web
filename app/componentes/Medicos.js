'use client';
import { useState } from 'react';
import { Situacao, Vazio, fmtHora } from './comum';

export default function Medicos({ dados, enviar, consultar, abrirPaciente }) {
  const [nome, setNome] = useState('');
  const [registro, setRegistro] = useState('');
  const [idBusca, setIdBusca] = useState('');
  const [resultado, setResultado] = useState(null);

  const cadastrar = async (e) => {
    e.preventDefault();
    const ok = await enviar('/api/medicos', { nome, registro });
    if (ok) { setNome(''); setRegistro(''); }
  };
  const buscar = async (e) => {
    e.preventDefault();
    if (idBusca) setResultado(await consultar(`/api/medicos/${Number(idBusca)}`));
  };
  const posicaoNoHeap = (id) => dados.heapMedicos.findIndex((m) => m.id === id);
  const r = resultado && !resultado.erro ? resultado : null;

  return (
    <>
      <div className="colunas">
        <section className="painel">
          <h2>Cadastrar médico clínico</h2>
          <p className="nota">O médico entra disponível e com zero atendimentos concluídos.</p>
          <form className="campos" onSubmit={cadastrar}>
            <label>Nome<input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome fictício" required /></label>
            <label>Registro profissional<input value={registro} onChange={(e) => setRegistro(e.target.value)} placeholder="Ex.: CRM-SIM 0004" required /></label>
            <div><button className="btn primario" type="submit">Cadastrar médico</button></div>
          </form>
        </section>
        <section className="painel">
          <h2>Consultar médico</h2>
          <p className="nota">Busca pelo número do médico na hash de médicos.</p>
          <form className="campos linha" onSubmit={buscar}>
            <input type="number" min="1" placeholder="Ex.: 2" value={idBusca} onChange={(e) => setIdBusca(e.target.value)} aria-label="Número do médico" />
            <button className="btn" type="submit">Consultar</button>
          </form>
          {resultado?.erro && <p className="erro-txt">{resultado.erro}</p>}
          {r && (
            <div className="resultado">
              <div className="titulo">{r.medico.nome}<Situacao s={r.medico.situacao} /></div>
              <p className="detalhe-txt">{r.medico.registro}. {r.medico.concluidos} atendimento(s) concluído(s). Bucket {r.bucket} da hash de médicos.</p>
              {r.atendendo && <p className="detalhe-txt">Atendendo <a onClick={() => abrirPaciente(r.atendendo.id)}>{r.atendendo.nome}</a> desde {fmtHora(r.atendendo.inicio)}.</p>}
            </div>
          )}
        </section>
      </div>

      <section className="painel">
        <h2>Equipe</h2>
        <p className="nota">
          Na chamada, recebe o paciente o médico livre com menos atendimentos concluídos. Em caso de empate, quem está há mais tempo sem receber paciente; depois, o menor número.
        </p>
        {dados.medicos.length === 0 ? <Vazio>Nenhum médico cadastrado. Cadastre ao menos um para começar as chamadas.</Vazio> : (
          <div className="rolagem">
            <table className="tabela">
              <thead><tr><th>Nº</th><th>Nome</th><th>Registro</th><th>Situação</th><th>Concluídos</th><th>Último paciente</th><th>Atendendo</th><th>Fila de médicos</th></tr></thead>
              <tbody>
                {dados.medicos.map((m) => {
                  const atual = dados.atendimentos.find((p) => p.medicoId === m.id);
                  const pos = posicaoNoHeap(m.id);
                  return (
                    <tr key={m.id}>
                      <td className="id">{m.id}</td><td>{m.nome}</td><td className="id">{m.registro}</td><td><Situacao s={m.situacao} /></td>
                      <td><b>{m.concluidos}</b></td><td className="id">{fmtHora(m.ultimaAtribuicao)}</td>
                      <td>{atual ? <a onClick={() => abrirPaciente(atual.id)}>{atual.nome}</a> : '—'}</td>
                      <td className="id">{pos === 0 ? 'próximo a receber' : pos > 0 ? `posição ${pos} no heap` : 'ocupado'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
