'use client';
import { Risco, Situacao, Vazio, fmtHora } from './comum';

const CLASSE = { Concluido: 'feito', Cancelado: 'cancelado', 'Em atendimento': 'andamento' };

export default function Historico({ dados, abrirPaciente }) {
  const estados = ['Aguardando', 'Em atendimento', 'Concluido', 'Cancelado'];

  return (
    <>
      <div className="colunas larga-esq">
        <section className="painel">
          <h2>Atendimentos por médico</h2>
          <p className="nota">Verde: concluído. Riscado: cancelado. Laranja: em andamento.</p>
          {dados.medicos.length === 0 ? <Vazio>Nenhum médico cadastrado.</Vazio> : (
            <div className="lista-medicos">
              {dados.medicos.map((m) => {
                const lista = dados.pacientes.filter((p) => p.medicoId === m.id);
                return (
                  <div key={m.id}>
                    <span>{m.nome}<span className="id" style={{ marginLeft: 8 }}>{m.concluidos} concluído{m.concluidos === 1 ? '' : 's'}</span></span>
                    <span className="pacs">
                      {lista.length === 0 ? <span className="id">sem atendimentos</span> : lista.map((p) => (
                        <span key={p.id} className={`etiqueta ${CLASSE[p.situacao] || ''}`} onClick={() => abrirPaciente(p.id)} title={p.nome}>#{p.id}</span>
                      ))}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        <section className="painel">
          <h2>Pacientes por situação</h2>
          <p className="nota">Total desde o início da simulação.</p>
          <div className="estados">
            {estados.map((s) => (
              <div key={s}><b>{dados.pacientes.filter((p) => p.situacao === s).length}</b><Situacao s={s} /></div>
            ))}
          </div>
        </section>
      </div>

      <section className="painel">
        <h2>Chegadas em ordem</h2>
        <p className="sequencia">
          Quem ainda aguarda, pelo percurso em ordem da Rubro-Negra: <code>{dados.cronologica.map((p) => p.id).join('  ›  ') || 'fila vazia'}</code>
        </p>
        {dados.chegadas.length === 0 ? <Vazio>Nenhum paciente registrado ainda.</Vazio> : (
          <div className="rolagem">
            <table className="tabela">
              <thead><tr><th /><th>Chegada</th><th>Paciente</th><th>Risco</th><th>Situação</th><th>Médico</th><th>Início</th><th>Fim</th></tr></thead>
              <tbody>
                {dados.chegadas.map((p) => (
                  <tr key={p.id} className={`clicavel r${p.risco}`} onClick={() => abrirPaciente(p.id)}>
                    <td className="faixa"><i /></td>
                    <td className="id">{fmtHora(p.chegada)}</td><td>{p.nome}</td><td><Risco n={p.risco} /></td>
                    <td><Situacao s={p.situacao} /></td><td>{p.medicoNome || '—'}</td>
                    <td className="id">{fmtHora(p.inicio)}</td><td className="id">{fmtHora(p.fim)}</td>
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
