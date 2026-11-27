'use client';
import { Risco, Vazio, fmtHora } from './comum';

export default function Atendimentos({ dados, enviar, abrirPaciente }) {
  return (
    <section className="painel">
      <h2>Consultas em andamento</h2>
      <p className="nota">Concluir soma um atendimento ao médico e o libera. Cancelar libera o médico sem somar.</p>
      {dados.atendimentos.length === 0 ? <Vazio>Nenhuma consulta em andamento. Use “Chamar próximo” para iniciar uma.</Vazio> : (
        <div className="rolagem">
          <table className="tabela">
            <thead><tr><th /><th>Paciente</th><th>Risco</th><th>Médico</th><th>Início</th><th /></tr></thead>
            <tbody>
              {dados.atendimentos.map((p) => (
                <tr key={p.id} className={`r${p.risco}`}>
                  <td className="faixa"><i /></td>
                  <td><a onClick={() => abrirPaciente(p.id)}>{p.nome}</a><div className="id">#{p.id}</div></td>
                  <td><Risco n={p.risco} /></td>
                  <td>{p.medicoNome}</td>
                  <td className="id">{fmtHora(p.inicio)}</td>
                  <td>
                    <div className="acoes">
                      <button className="btn pequeno sucesso" onClick={() => enviar(`/api/pacientes/${p.id}`, { acao: 'concluir' })}>Concluir</button>
                      <button className="btn pequeno perigo" onClick={() => enviar(`/api/pacientes/${p.id}`, { acao: 'cancelar' },
                        `Cancelar a consulta de ${p.nome}? ${p.medicoNome} será liberado sem somar atendimento.`)}>Cancelar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
