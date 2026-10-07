// ==========================================
// TELA INICIAL: PAINEL DO GESTOR E DO COLABORADOR
// ==========================================
(function () {
    const esc = (valor) => window.escapeHTML(valor);

    const SECOES = [
        { view: 'pta', label: 'Planejamento mensal', desc: 'Registre o avanço do mês em cada tópico de pesquisa.' },
        { view: 'tarefas', label: 'Tarefas', desc: 'O que está em andamento e o que a equipe já concluiu.' },
        { view: 'processes', label: 'Processos de P&amp;D', desc: 'Mapeie um processo e acompanhe sua linha do tempo.' },
        { view: 'equipments', label: 'Equipamentos', desc: 'Consulte vídeos de treinamento e os POPs de cada equipamento.' },
        { view: 'pops', label: 'POPs', desc: 'Procedimentos operacionais padrão do laboratório.' },
        { view: 'articles', label: 'Artigos', desc: 'Busque literatura científica e guarde o que importa.' },
    ];

    // ==========================================
    // FORMATAÇÃO
    // ==========================================
    function formatarPrazo(prazo) {
        if (!prazo) return 'sem prazo';
        return new Date(prazo).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    }

    function formatarDuracao(segundos) {
        if (segundos === null || segundos === undefined) return '—';
        const dias = segundos / 86400;
        if (dias >= 1) return `${dias.toFixed(dias >= 10 ? 0 : 1).replace('.', ',')} d`;
        return `${Math.max(1, Math.round(segundos / 3600))} h`;
    }

    function numero(valor, classeSeAlerta) {
        return valor > 0 && classeSeAlerta ? `<span class="${classeSeAlerta}">${valor}</span>` : String(valor);
    }

    // ==========================================
    // BLOCOS REUTILIZÁVEIS
    // ==========================================
    function cartao(valor, rotulo, classe) {
        return `<div class="figure"><span class="v${classe && valor > 0 ? ' ' + classe : ''}">${valor}</span><span class="k">${rotulo}</span></div>`;
    }

    function etiquetaDaTarefa(tarefa) {
        if (tarefa.status === 'em_revisao') return '<span class="badge badge-accent">em revisão</span>';
        if (tarefa.atrasada) return '<span class="badge badge-danger">atrasada</span>';
        return '<span class="badge">em andamento</span>';
    }

    function listaDeTarefas(tarefas, mostrarPessoas) {
        return `<div class="entries">${tarefas.map(t => `
            <article class="entry clickable" onclick="UI.switchView('tarefas')">
                <div class="entry-head">
                    <h4 class="entry-title">${esc(t.titulo)}</h4>
                    ${etiquetaDaTarefa(t)}
                </div>
                <p class="meta">prazo: ${formatarPrazo(t.prazo)}${mostrarPessoas && t.atribuidos.length ? ` · ${esc(t.atribuidos.join(', '))}` : ''}</p>
            </article>`).join('')}</div>`;
    }

    function secao(titulo, complemento, conteudo) {
        return `
            <section class="section fade-in">
                <div class="section-head"><h3>${titulo}</h3>${complemento ? `<span class="meta">${complemento}</span>` : ''}</div>
                ${conteudo}
            </section>`;
    }

    // ==========================================
    // VISÃO DO COLABORADOR
    // ==========================================
    function renderVisaoPessoal(eu) {
        const avisoRelato = eu.relata_no_mes && !eu.relato_do_mes_enviado ? `
            <div class="notice-row">
                <p><span class="mono">relato</span>Você ainda não registrou seu relato de ${esc(eu.mes_nome)}.</p>
                <button type="button" class="link-btn" onclick="UI.switchView('pta')">Registrar agora</button>
            </div>` : '';

        const tarefas = eu.proximas.length
            ? listaDeTarefas(eu.proximas, false)
            : window.UI.emptyState({ title: 'Nenhuma tarefa em aberto', description: 'Quando uma tarefa for atribuída a você, ela aparece aqui.' });

        return `
            ${avisoRelato}
            ${secao('Minhas tarefas', '', `
                <div class="figures">
                    ${cartao(eu.abertas, 'em aberto')}
                    ${cartao(eu.atrasadas, 'atrasadas', 'text-danger')}
                    ${cartao(eu.vencem_em_breve, 'vencem em 7 dias', 'text-warning')}
                    ${cartao(eu.em_revisao, 'em revisão')}
                </div>
                ${tarefas}`)}`;
    }

    // ==========================================
    // VISÃO DO GESTOR
    // ==========================================
    function renderAvisosDoGestor(resumo) {
        const avisos = [];
        const relatos = resumo.equipe.relatos;
        if (resumo.cadastros_pendentes > 0) {
            avisos.push(['cadastro', `${resumo.cadastros_pendentes} pedido(s) de cadastro aguardando aprovação.`, 'admin', 'Abrir administração']);
        }
        if (relatos.aguardando_avaliacao > 0) {
            avisos.push(['relatos', `${relatos.aguardando_avaliacao} relato(s) do planejamento mensal aguardando sua avaliação.`, 'pta', 'Avaliar relatos']);
        }
        return avisos.map(([tag, texto, view, acao]) => `
            <div class="notice-row fade-in">
                <p><span class="mono">${tag}</span>${texto}</p>
                <button type="button" class="link-btn" onclick="UI.switchView('${view}')">${acao}</button>
            </div>`).join('');
    }

    function renderTabelaDePessoas(equipe) {
        const linhas = equipe.pessoas.map(p => `
            <tr>
                <td><strong>${esc(p.nome)}</strong><br><span class="meta">${esc(p.role)}</span></td>
                <td class="num">${p.abertas}</td>
                <td class="num">${numero(p.atrasadas, 'text-danger')}</td>
                <td class="num">${p.em_revisao}</td>
                <td class="num">${p.concluidas}</td>
                <td class="num">${p.no_prazo_pct === null ? '—' : p.no_prazo_pct + '%'}</td>
                <td class="num">${formatarDuracao(p.tempo_medio_segundos)}</td>
                <td class="num">${p.devolucoes}</td>
                <td class="num">${p.processos_ativos}</td>
                <td>${!p.relata_no_mes ? '<span class="text-faint">—</span>' : p.relato_do_mes_enviado
                    ? '<span class="badge badge-success">enviado</span>'
                    : '<span class="badge badge-warning">pendente</span>'}</td>
            </tr>`).join('');

        return `
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Pessoa</th>
                            <th>Abertas</th>
                            <th>Atrasadas</th>
                            <th>Em revisão</th>
                            <th>Concluídas</th>
                            <th>No prazo</th>
                            <th>Tempo médio</th>
                            <th>Devoluções</th>
                            <th>Processos</th>
                            <th>Relato do mês</th>
                        </tr>
                    </thead>
                    <tbody>${linhas}</tbody>
                </table>
            </div>
            <p class="help">Concluídas, no prazo, tempo médio e devoluções consideram os últimos ${equipe.janela_dias} dias. Processos conta os que não estão concluídos.</p>`;
    }

    function renderVisaoDoGestor(resumo) {
        const equipe = resumo.equipe;
        const t = equipe.tarefas;
        const relatos = equipe.relatos;

        const atencao = equipe.atencao.length
            ? listaDeTarefas(equipe.atencao, true)
            : window.UI.emptyState({ title: 'Nada pendente', description: 'Nenhuma tarefa atrasada ou aguardando revisão.' });
        const restante = equipe.atencao_total - equipe.atencao.length;

        const faltam = relatos.faltam.length
            ? `<p class="dialog-text">Ainda não enviaram: ${relatos.faltam.map(esc).join(', ')}.</p>`
            : '<p class="dialog-text">Todos já enviaram o relato deste mês.</p>';

        return `
            ${renderAvisosDoGestor(resumo)}
            ${secao('Tarefas da equipe', '', `
                <div class="figures">
                    ${cartao(t.abertas, 'em aberto')}
                    ${cartao(t.atrasadas, 'atrasadas', 'text-danger')}
                    ${cartao(t.em_revisao, 'aguardando revisão', 'text-primary')}
                    ${cartao(t.vencem_em_breve, 'vencem em 7 dias', 'text-warning')}
                    ${cartao(t.sem_prazo, 'sem prazo')}
                    ${cartao(t.concluidas_na_janela, `concluídas em ${equipe.janela_dias} dias`)}
                </div>`)}
            <div class="columns">
                ${secao('Precisa de atenção', restante > 0 ? `mais ${restante} na tela de tarefas` : '', atencao)}
                ${secao(`Relatos de ${esc(relatos.mes_nome)}`, `${relatos.enviaram} de ${relatos.esperados} enviados`, faltam)}
            </div>
            ${secao('Pessoas', 'carga atual e desempenho recente', renderTabelaDePessoas(equipe))}`;
    }

    // ==========================================
    // ATALHOS PARA AS SEÇÕES
    // ==========================================
    function renderAtalhos() {
        return secao('Seções', '', `
            <ul class="index-list">
                ${SECOES.map((s, i) => `
                    <li>
                        <button type="button" class="index-row" onclick="UI.switchView('${s.view}')">
                            <span class="n">${String(i + 1).padStart(2, '0')}</span>
                            <span class="t">${s.label}</span>
                            <span class="d">${s.desc}</span>
                            <span class="go">${window.Icon('arrow-right', { size: 16 })}</span>
                        </button>
                    </li>`).join('')}
            </ul>`);
    }

    // ==========================================
    // CARREGAR O PAINEL
    // ==========================================
    async function carregarPainel() {
        const alvo = document.getElementById('painel-inicio');
        if (!alvo) return;
        try {
            const res = await window.api.fetchProtected('/painel/resumo');
            if (!res.ok) throw new Error('Falha ao carregar o painel');
            const resumo = await res.json();
            if (!document.getElementById('painel-inicio')) return;

            alvo.innerHTML = resumo.gestor
                ? renderVisaoDoGestor(resumo) + (resumo.eu.abertas > 0 ? renderVisaoPessoal(resumo.eu) : '')
                : renderVisaoPessoal(resumo.eu);
        } catch (erro) {
            if (document.getElementById('painel-inicio')) {
                alvo.innerHTML = window.UI.errorState('Não foi possível carregar o painel.');
            }
        }
    }

    // ==========================================
    // CONSTRUÇÃO DA TELA INICIAL
    // ==========================================
    document.addEventListener('viewChanged', (e) => {
        if (e.detail.view !== 'inicio') return;
        const conteudo = document.getElementById('dynamic-content');
        const user = JSON.parse(localStorage.getItem('user_data') || '{}');
        const primeiroNome = (user.nome || 'Pesquisador').split(' ')[0];

        const agora = new Date();
        const hora = agora.getHours();
        const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
        const dataExtenso = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

        conteudo.innerHTML = `
            <header class="page-head fade-in">
                <div>
                    <p class="eyebrow">${dataExtenso}</p>
                    <h1>${saudacao}, ${esc(primeiroNome)}.</h1>
                </div>
            </header>
            <div id="painel-inicio">${window.UI.loading('Carregando o painel')}</div>
            ${renderAtalhos()}`;

        carregarPainel();
    });
})();
