// ==========================================
// TELA INICIAL: PAINEL DO GESTOR E DO COLABORADOR
// ==========================================
(function () {
    const esc = (valor) => window.escapeHTML(valor);
    const LIMITE_DE_ATENCAO = 5;

    const SECOES = [
        { view: 'pta', icon: 'calendar', label: 'Planejamento mensal', desc: 'Registre o avanço do mês em cada tópico de pesquisa.' },
        { view: 'tarefas', icon: 'check-square', label: 'Tarefas', desc: 'O que está em andamento e o que a equipe já concluiu.' },
        { view: 'processes', icon: 'flask', label: 'Processos de P&amp;D', desc: 'Mapeie um processo e acompanhe sua linha do tempo.' },
        { view: 'equipments', icon: 'microscope', label: 'Equipamentos', desc: 'Consulte vídeos de treinamento e os POPs de cada equipamento.' },
        { view: 'pops', icon: 'file-text', label: 'POPs', desc: 'Procedimentos operacionais padrão do laboratório.' },
        { view: 'articles', icon: 'book-open', label: 'Artigos', desc: 'Busque literatura científica e guarde o que importa.' },
    ];

    // ==========================================
    // FORMATAÇÃO
    // ==========================================
    function formatarPrazo(prazo) {
        if (!prazo) return 'sem prazo';
        return new Date(prazo).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    }

    function numero(valor, classeSeAlerta) {
        return valor > 0 && classeSeAlerta ? `<span class="${classeSeAlerta} font-bold">${valor}</span>` : String(valor);
    }

    // ==========================================
    // BLOCOS REUTILIZÁVEIS
    // ==========================================
    function cartao(valor, rotulo, classe, icone, tone) {
        const toneCls = (valor > 0 && tone) ? ` ${tone}` : '';
        const iconHtml = icone && window.Icon ? window.Icon(icone, { size: 14 }) : '';
        return `<div class="figure${toneCls}">
            <span class="v${classe && valor > 0 ? ' ' + classe : ''}">${valor}</span>
            <span class="k"><span>${rotulo}</span>${iconHtml}</span>
        </div>`;
    }

    function etiquetaDaTarefa(tarefa) {
        if (tarefa.status === 'em_revisao') return '<span class="badge badge-accent">em revisão</span>';
        if (tarefa.atrasada) return '<span class="badge badge-danger">atrasada</span>';
        return '<span class="badge badge-info badge-live">em andamento</span>';
    }

    function listaDeTarefas(tarefas, mostrarPessoas) {
        return `<div class="entries">${tarefas.map(t => `
            <article class="entry clickable" onclick="UI.switchView('tarefas')">
                <div class="entry-head">
                    <h4 class="entry-title">${esc(t.titulo)}</h4>
                    ${etiquetaDaTarefa(t)}
                </div>
                <div class="entry-foot">
                    <span class="meta">${window.Icon ? window.Icon('clock', { size: 12 }) : ''} prazo: ${formatarPrazo(t.prazo)}</span>
                    ${mostrarPessoas && t.atribuidos && t.atribuidos.length ? window.UI.avatarStack(t.atribuidos, 2) : ''}
                </div>
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
                <p><span class="mono">relato mensal</span>Você ainda não registrou seu relato de ${esc(eu.mes_nome)}.</p>
                <button type="button" class="link-btn" onclick="UI.switchView('pta')">Registrar agora ${window.Icon ? window.Icon('arrow-right', { size: 13 }) : ''}</button>
            </div>` : '';

        const tarefas = eu.proximas.length
            ? listaDeTarefas(eu.proximas, false)
            : window.UI.emptyState({ title: 'Nenhuma tarefa em aberto', description: 'Quando uma tarefa for atribuída a você, ela aparece aqui.' });

        return `
            ${avisoRelato}
            ${secao('Minhas tarefas', '', `
                <div class="figures">
                    ${cartao(eu.abertas, 'em aberto', '', 'clipboard', '')}
                    ${cartao(eu.atrasadas, 'atrasadas', 'text-danger', 'alert-triangle', 'tone-danger')}
                    ${cartao(eu.vencem_em_breve, 'vencem em 7 dias', 'text-warning', 'clock', 'tone-warning')}
                    ${cartao(eu.em_revisao, 'em revisão', 'text-primary', 'check-circle', '')}
                </div>
                ${tarefas}`)}`;
    }

    function renderMinhasTarefasDoGestor(eu) {
        return eu.proximas.length ? secao('Atribuídas a mim', '', listaDeTarefas(eu.proximas.slice(0, LIMITE_DE_ATENCAO), false)) : '';
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
                <button type="button" class="link-btn" onclick="UI.switchView('${view}')">${acao} ${window.Icon ? window.Icon('arrow-right', { size: 13 }) : ''}</button>
            </div>`).join('');
    }

    function pessoasRelevantes(pessoas) {
        return pessoas
            .filter(p => p.abertas > 0 || p.concluidas > 0 || p.relata_no_mes)
            .sort((a, b) => b.atrasadas - a.atrasadas || b.abertas - a.abertas || a.nome.localeCompare(b.nome));
    }

    function renderTabelaDePessoas(equipe) {
        const pessoas = pessoasRelevantes(equipe.pessoas);
        if (!pessoas.length) {
            return window.UI.emptyState({ title: 'Ninguém com tarefas ou relatos', description: 'Atribua uma tarefa para começar a acompanhar a equipe.' });
        }

        const linhas = pessoas.map(p => `
            <tr>
                <td>${window.UI.avatar ? window.UI.avatar(p.nome, { strong: true }) : `<strong>${esc(p.nome)}</strong>`}</td>
                <td class="num">${p.abertas}</td>
                <td class="num">${numero(p.atrasadas, 'text-danger')}</td>
                <td>${window.UI.progressBar ? window.UI.progressBar(p.no_prazo_pct) : (p.no_prazo_pct === null ? '—' : p.no_prazo_pct + '%')}</td>
                <td>${!p.relata_no_mes ? '<span class="text-faint">—</span>' : p.relato_do_mes_enviado
                    ? '<span class="badge badge-success">enviado</span>'
                    : '<span class="badge badge-warning">pendente</span>'}</td>
            </tr>`).join('');

        return `
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Pesquisador</th>
                            <th>Abertas</th>
                            <th>Atrasadas</th>
                            <th>No prazo</th>
                            <th>Relato PTA</th>
                        </tr>
                    </thead>
                    <tbody>${linhas}</tbody>
                </table>
            </div>
            <p class="help mt-xs">No prazo: taxa de entregas pontuais dos últimos ${equipe.janela_dias} dias.</p>`;
    }

    function renderVisaoDoGestor(resumo) {
        const equipe = resumo.equipe;
        const t = equipe.tarefas;
        const relatos = equipe.relatos;

        const visiveis = equipe.atencao.slice(0, LIMITE_DE_ATENCAO);
        const restante = equipe.atencao_total - visiveis.length;
        const atencao = visiveis.length
            ? listaDeTarefas(visiveis, true)
            : window.UI.emptyState({ title: 'Nada pendente', description: 'Nenhuma tarefa atrasada ou aguardando revisão.' });

        return `
            ${renderAvisosDoGestor(resumo)}
            <div class="figures fade-in">
                ${cartao(t.atrasadas, 'atrasadas', 'text-danger', 'alert-triangle', 'tone-danger')}
                ${cartao(t.em_revisao, 'aguardando revisão', 'text-primary', 'check-circle', '')}
                ${cartao(t.vencem_em_breve, 'vencem em 7 dias', 'text-warning', 'clock', 'tone-warning')}
                ${cartao(t.abertas, 'em aberto', '', 'clipboard', '')}
            </div>
            <div class="columns">
                ${secao('Precisa de atenção', restante > 0 ? `mais ${restante} em tarefas` : '', atencao)}
                ${secao('Equipe', `relatos de ${esc(relatos.mes_nome)}: ${relatos.enviaram} de ${relatos.esperados}`, renderTabelaDePessoas(equipe))}
            </div>`;
    }

    // ==========================================
    // ATALHOS PARA AS SEÇÕES
    // ==========================================
    function renderAtalhos() {
        return secao('Módulos do laboratório', '', `
            <ul class="index-list">
                ${SECOES.map((s, i) => `
                    <li>
                        <button type="button" class="index-row" onclick="UI.switchView('${s.view}')">
                            <span class="n">${String(i + 1).padStart(2, '0')}</span>
                            <span class="ic">${window.Icon(s.icon, { size: 15 })}</span>
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
                ? renderVisaoDoGestor(resumo) + renderMinhasTarefasDoGestor(resumo.eu)
                : renderVisaoPessoal(resumo.eu) + renderAtalhos();
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
                    <p class="lede">Painel operacional de pesquisa, procedimentos e entregas do laboratório GMAE / LEQM.</p>
                </div>
            </header>
            <div id="painel-inicio">${window.UI.loading('Carregando o painel')}</div>`;

        carregarPainel();
    });
})();
