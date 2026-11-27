'use client';
import { Risco, Vazio, fmtHora } from './comum';

export default function Painel({ dados, enviar, abrirPaciente }) {
  const proximo = dados.fila[0];
  const med = dados.proximoMedico;
  const cont = (s) => dados.pacientes.filter((p) => p.situacao === s).length;
  const disponiveis = dados.medicos.filter((m) => m.situacao === 'Disponivel').length;

  return (
    <>
      <section className={`proximo ${proximo ? `r${proximo.risco}` : ''}`}>
        <div>
          <p className="rotulo">Próximo a ser chamado</p>
          <p className="nome">
            {proximo ? <a onClick={() => abrirPaciente(proximo.id)}>{proximo.nome}</a> : 'Ninguém aguardando'}
          </p>
          {proximo ? (
            <div className="linha-info">
              <Risco n={proximo.risco} />
              <span>Atendimento #{proximo.id}</span>
              <span>Chegou às {fmtHora(proximo.chegada)}</span>
              <span>{med ? `Vai para ${med.nome}, com ${med.concluidos} concluído${med.concluidos === 1 ? '' : 's'}` : 'Nenhum médico livre: o paciente seguirá na fila'}</span>
            </div>
          ) : (
            <div className="linha-info"><span>Registre uma entrada na tela Pacientes.</span></div>
          )}
        </div>
        <button className="btn primario grande" onClick={() => enviar('/api/chamar')} disabled={!proximo}>Chamar próximo</button>
      </section>

      <section className="indicadores" aria-label="Indicadores">
        <div><b>{cont('Aguardando')}</b><span>aguardando</span></div>
        <div><b>{cont('Em atendimento')}</b><span>em atendimento</span></div>
        <div><b>{cont('Concluido')}</b><span>concluídos</span></div>
        <div><b>{cont('Cancelado')}</b><span>cancelados</span></div>
        <div><b>{disponiveis} de {dados.medicos.length}</b><span>médicos livres</span></div>
      </section>

      <div className="colunas">
        <section className="painel">
          <h2>Fila de espera</h2>
          <p className="nota">Os cinco primeiros na ordem de chamada.</p>
          {dados.fila.length === 0 ? <Vazio>A fila está vazia.</Vazio> : (
            <div className="rolagem"><table className="tabela">
              <tbody>
                {dados.fila.slice(0, 5).map((p, i) => (
                  <tr key={p.id} className={`clicavel r${p.risco}`} onClick={() => abrirPaciente(p.id)}>
                    <td className="faixa"><i /></td>
                    <td className="id">{i + 1}º</td>
                    <td>{p.nome}</td>
                    <td><Risco n={p.risco} /></td>
                    <td className="id">{fmtHora(p.chegada)}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </section>
        <section className="painel">
          <h2>Em atendimento</h2>
          <p className="nota">Paciente, médico responsável e horário de início.</p>
          {dados.atendimentos.length === 0 ? <Vazio>Nenhuma consulta em andamento.</Vazio> : (
            <div className="rolagem"><table className="tabela">
              <tbody>
                {dados.atendimentos.map((p) => (
                  <tr key={p.id} className={`clicavel r${p.risco}`} onClick={() => abrirPaciente(p.id)}>
                    <td className="faixa"><i /></td>
                    <td>{p.nome}</td>
                    <td>{p.medicoNome}</td>
                    <td className="id">{fmtHora(p.inicio)}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </section>
      </div>
    </>
  );
}
