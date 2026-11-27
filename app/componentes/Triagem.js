'use client';
import { useState } from 'react';
import { OpcoesRisco, Risco, Vazio, fmtHora } from './comum';

function LinhaFila({ p, ordem, enviar, abrirPaciente }) {
  const [novo, setNovo] = useState(p.risco);
  return (
    <tr className={`r${p.risco}`}>
      <td className="faixa"><i /></td>
      <td className="id">{ordem}º</td>
      <td><a onClick={() => abrirPaciente(p.id)}>{p.nome}</a><div className="id">#{p.id}</div></td>
      <td><Risco n={p.risco} /></td>
      <td className="id">{fmtHora(p.chegada)}</td>
      <td>
        <div className="acoes">
          <select value={novo} onChange={(e) => setNovo(Number(e.target.value))} aria-label={`Nova classificação para ${p.nome}`}><OpcoesRisco /></select>
          <button className="btn pequeno" disabled={novo === p.risco}
            onClick={() => enviar(`/api/pacientes/${p.id}`, { acao: 'reclassificar', risco: novo })}>Reclassificar</button>
          <button className="btn pequeno perigo"
            onClick={() => enviar(`/api/pacientes/${p.id}`, { acao: 'cancelar' }, `Cancelar o cadastro de ${p.nome} (#${p.id})?`)}>Cancelar</button>
        </div>
      </td>
    </tr>
  );
}

export default function Triagem({ dados, enviar, abrirPaciente }) {
  return (
    <section className="painel">
      <h2>Ordem de chamada</h2>
      <p className="nota">
        Vem primeiro o risco mais grave; com o mesmo risco, quem chegou antes; com a mesma hora, o menor número de atendimento.
        A reclassificação muda a posição do paciente no heap sem duplicar o registro.
      </p>
      {dados.fila.length === 0 ? <Vazio>Ninguém aguardando. Novas entradas aparecem aqui assim que são registradas.</Vazio> : (
        <div className="rolagem">
          <table className="tabela">
            <thead><tr><th /><th>Ordem</th><th>Paciente</th><th>Risco</th><th>Chegada</th><th>Triagem</th></tr></thead>
            <tbody>
              {dados.fila.map((p, i) => (
                <LinhaFila key={`${p.id}-${p.risco}`} p={p} ordem={i + 1} enviar={enviar} abrirPaciente={abrirPaciente} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
