'use client';
import { NoArvore, RISCOS, Vazio, fmtHora, vetorParaArvore } from './comum';

function Baldes({ hash }) {
  return (
    <>
      <div className="metricas-hash">
        <span>Função: <b>ID mod {hash.capacidade}</b></span>
        <span>Itens: <b>{hash.tamanho}</b></span>
        <span>Carga: <b>{Math.round(hash.carga * 100)}%</b> (cresce para 2m+1 acima de 75%)</span>
        <span>Colisões registradas: <b>{hash.colisoes}</b></span>
        <span>Redimensionamentos: <b>{hash.redimensionamentos}</b></span>
      </div>
      <div className="baldes">
        {hash.baldes.map((b) => (
          <div key={b.i} className={`balde ${b.chaves.length > 1 ? 'colide' : ''} ${b.chaves.length === 0 ? 'vazio-b' : ''}`}>
            <small>{b.i}</small>
            {b.chaves.length === 0 ? <span>—</span> : b.chaves.map((id) => <span key={id}>{id}</span>)}
          </div>
        ))}
      </div>
    </>
  );
}

export default function Estruturas({ dados, enviar, abrirPaciente }) {
  const heap = vetorParaArvore(dados.heapPacientes);
  const heapMed = vetorParaArvore(dados.heapMedicos);
  const v = dados.validacao;

  return (
    <>
      <section className="painel">
        <div className="ferramentas">
          <div>
            <h2>Consistência dos índices</h2>
            <p className={v?.ok ? 'ok-txt' : 'erro-txt'} style={{ marginTop: 4 }}>
              {v?.ok
                ? 'Hash, Rubro-Negra e heap guardam os mesmos pacientes aguardando, e nenhum registro está órfão.'
                : v?.erros?.join('; ')}
            </p>
          </div>
          <div className="acoes">
            <button className="btn" onClick={() => enviar('/api/cenario', { tipo: 'normal' },
              'Restaurar o cenário apaga todos os pacientes e médicos atuais e cria 3 médicos (A, B e C) e 5 pacientes. Continuar?')}>Restaurar cenário</button>
            <button className="btn" onClick={() => enviar('/api/cenario', { tipo: 'colisoes' },
              'O cenário de colisões apaga os dados atuais e cria os pacientes 1000, 1011, 1022, 1033 e 1044, todos no mesmo bucket. Continuar?')}>Cenário de colisões</button>
          </div>
        </div>
      </section>

      <section className="painel">
        <div className="cabeca">
          <h2>Árvore Rubro-Negra: ordem de chegada</h2>
          <span className="legenda"><span><i className="rubro" />rubro</span><span><i className="negro" />negro</span><span>altura {dados.altura}</span></span>
        </div>
        <p className="nota">Chave: horário de chegada e número de atendimento. Clique em um nó para ver o paciente.</p>
        <div className="arvore">
          {dados.arvore ? (
            <NoArvore n={dados.arvore} classe={(n) => n.cor} onClick={(n) => abrirPaciente(n.id)}
              titulo={(n) => `${n.nome}, risco ${n.risco}`}
              conteudo={(n) => <><b>{n.id}</b><small>{fmtHora(n.chegada)}</small></>} />
          ) : <Vazio>Árvore vazia: não há pacientes aguardando.</Vazio>}
        </div>
      </section>

      <div className="colunas">
        <section className="painel">
          <h2>Heap de pacientes</h2>
          <p className="nota">A raiz é o próximo a ser chamado.</p>
          <p className="vetor">vetor = [{dados.heapPacientes.map((p) => p.id).join(', ')}]</p>
          <div className="arvore">
            {heap ? (
              <NoArvore n={heap} classe={(n) => (n.posicao === 0 ? 'heap raiz' : 'heap')} onClick={(n) => abrirPaciente(n.id)}
                titulo={(n) => `${n.nome}, ${RISCOS[n.risco]}, posição ${n.posicao}`}
                conteudo={(n) => <><b>{n.id}</b><small>risco {n.risco}, pos. {n.posicao}</small></>} />
            ) : <Vazio>Heap vazio.</Vazio>}
          </div>
        </section>
        <section className="painel">
          <h2>Heap de médicos livres</h2>
          <p className="nota">A raiz recebe a próxima chamada.</p>
          <p className="vetor">vetor = [{dados.heapMedicos.map((m) => m.id).join(', ')}]</p>
          <div className="arvore">
            {heapMed ? (
              <NoArvore n={heapMed} classe={(n) => (n.posicao === 0 ? 'heap raiz' : 'heap')}
                titulo={(n) => `${n.nome}, posição ${n.posicao}`}
                conteudo={(n) => <><b>{n.nome.split(' ').slice(0, 2).join(' ')}</b><small>{n.concluidos} concl., pos. {n.posicao}</small></>} />
            ) : <Vazio>Nenhum médico livre no momento.</Vazio>}
          </div>
        </section>
      </div>

      <section className="painel">
        <h2>Tabela hash de pacientes aguardando</h2>
        <p className="nota">Encadeamento separado: buckets com mais de um paciente aparecem destacados.</p>
        <Baldes hash={dados.hash} />
      </section>
      <section className="painel">
        <h2>Tabela hash de médicos</h2>
        <p className="nota">Índice adicional para consultar médicos pelo número.</p>
        <Baldes hash={dados.hashMedicos} />
      </section>
    </>
  );
}
