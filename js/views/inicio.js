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
        { view: 'rspace', icon: 'layers', label: 'RSpace ELN', desc: 'Caderno eletrônico de laboratório, amostras e integração de experimentos.' },
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

    /**
     * Card único de resumo: linha de indicadores (.figures) e, abaixo de uma
     * divisória, metadados com micro-label em cima e valor em negrito.
     * metas: lista de [rótulo, valor]; itens falsos são ignorados.
     */
    function painelResumo(rotulo, figuras, metas) {
        const meta = (metas || []).filter(Boolean)
            .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
        return `
            <section class="kpi-panel fade-in" aria-label="${rotulo}">
                <div class="figures">${figuras}</div>
                ${meta ? `<dl class="kpi-meta">${meta}</dl>` : ''}
            </section>`;
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
    // DESTAQUE: AVISOS EM CARROSSEL (cabeçalho grafite + card branco)
    // Cada aviso: { tag, tom, titulo, texto, view, acao }. Sem rotação automática.
    // ==========================================
    function plural(n, um, varios) { return `${n} ${n === 1 ? um : varios}`; }

    function avisosDoColaborador(eu) {
        const avisos = [];
        if (eu.relata_no_mes && !eu.relato_do_mes_enviado) {
            avisos.push({ tag: 'Relato mensal', tom: 'warning', titulo: `Registre seu relato de ${esc(eu.mes_nome)}`,
                texto: 'Seu relato do planejamento mensal ainda não foi enviado. Informe o avanço de cada tópico de pesquisa.',
                view: 'pta', acao: 'Registrar relato' });
        }
        if (eu.atrasadas > 0) {
            avisos.push({ tag: 'Tarefas', tom: 'danger', titulo: `Você tem ${plural(eu.atrasadas, 'tarefa atrasada', 'tarefas atrasadas')}`,
                texto: 'Atualize o andamento ou combine um novo prazo com a coordenação.',
                view: 'tarefas', acao: 'Abrir tarefas' });
        }
        if (!avisos.length) {
            avisos.push({ tag: 'Em dia', tom: 'ok', titulo: 'Tudo em dia por aqui',
                texto: 'Nenhum relato pendente nem tarefa atrasada. Confira os POPs e a agenda dos equipamentos antes da próxima rotina de bancada.',
                view: 'equipments', acao: 'Ver equipamentos' });
        }
        return avisos;
    }

    function avisosDoGestor(resumo) {
        const avisos = [];
        const relatos = resumo.equipe.relatos;
        const ptaAnual = resumo.equipe.pta_anual;
        const tarefas = resumo.equipe.tarefas;
        if (resumo.cadastros_pendentes > 0) {
            avisos.push({ tag: 'Cadastro', tom: 'warning', titulo: `${plural(resumo.cadastros_pendentes, 'pedido', 'pedidos')} de cadastro aguardando aprovação`,
                texto: 'Revise os pedidos para liberar o acesso de novos membros ao portal.',
                view: 'admin', acao: 'Abrir administração' });
        }
        if (relatos.aguardando_avaliacao > 0) {
            avisos.push({ tag: 'Relatos', tom: 'brand', titulo: `${plural(relatos.aguardando_avaliacao, 'relato aguarda', 'relatos aguardam')} sua avaliação`,
                texto: `Relatos do planejamento mensal de ${esc(relatos.mes_nome)} enviados pela equipe.`,
                view: 'pta', acao: 'Avaliar relatos' });
        }
        if (resumo.papel === 'admin' && ptaAnual && ptaAnual.atrasados_qtd > 0) {
            avisos.push({ tag: 'PTA anual', tom: 'danger', titulo: `${plural(ptaAnual.atrasados_qtd, 'tópico', 'tópicos')} do planejamento anual com prazo vencido`,
                texto: 'Tópicos com previsão encerrada e avanço abaixo de 100%. Veja quais e combine a revisão com os responsáveis.',
                view: 'pta', acao: 'Ver planejamento' });
        }
        if (tarefas.atrasadas > 0) {
            avisos.push({ tag: 'Tarefas', tom: 'danger', titulo: `${plural(tarefas.atrasadas, 'tarefa atrasada', 'tarefas atrasadas')} na equipe`,
                texto: 'Abra a lista para ver quem está com entregas vencidas e redistribuir se for preciso.',
                view: 'tarefas', acao: 'Abrir tarefas' });
        }
        if (!avisos.length) {
            avisos.push({ tag: 'Em dia', tom: 'ok', titulo: 'Equipe em dia',
                texto: 'Nenhum pedido de cadastro, relato ou tarefa atrasada aguardando você.',
                view: 'tarefas', acao: 'Abrir tarefas' });
        }
        return avisos;
    }

    function renderDestaque(avisos) {
        const total = avisos.length;
        const slides = avisos.map((a, i) => `
            <div class="hero-slide" id="hero-slide-${i}" role="group" aria-roledescription="aviso" aria-label="${i + 1} de ${total}"
                 data-tag="${esc(a.tag)}" data-tom="${a.tom}" ${i ? 'hidden' : ''}>
                <div class="hero-card">
                    <h2>${a.titulo}</h2>
                    <p>${a.texto}</p>
                    <button type="button" class="btn btn-primary" onclick="UI.switchView('${a.view}')">${a.acao}</button>
                </div>
            </div>`).join('');

        const pontos = total > 1 ? `
            <div class="hero-dots" role="group" aria-label="Escolher aviso">
                ${avisos.map((a, i) => `<button type="button" class="hero-dot" data-hero-ir="${i}" aria-controls="hero-slide-${i}" aria-label="Aviso ${i + 1} de ${total}: ${esc(a.tag)}"${i === 0 ? ' aria-current="true"' : ''}></button>`).join('')}
            </div>` : '';

        return `
            <section class="hero fade-in" aria-roledescription="carrossel" aria-label="Avisos" data-hero>
                <div class="hero-stage">
                    <div class="hero-meta">
                        <span class="hero-tag is-${avisos[0].tom}" data-hero-tag>${esc(avisos[0].tag)}</span>
                        ${total > 1 ? `<span class="hero-count" data-hero-count aria-hidden="true">1 / ${total}</span>` : ''}
                    </div>
                    ${slides}
                </div>
                ${pontos}
            </section>`;
    }

    function ligarDestaque(raiz) {
        const hero = raiz.querySelector('[data-hero]');
        if (!hero) return;
        const slides = Array.from(hero.querySelectorAll('.hero-slide'));
        const pontos = Array.from(hero.querySelectorAll('.hero-dot'));
        let atual = 0;

        const mostrar = (i, focar) => {
            atual = (i + slides.length) % slides.length;
            slides.forEach((s, j) => { s.hidden = j !== atual; });
            pontos.forEach((p, j) => {
                if (j === atual) p.setAttribute('aria-current', 'true');
                else p.removeAttribute('aria-current');
            });
            const tag = hero.querySelector('[data-hero-tag]');
            if (tag) {
                tag.textContent = slides[atual].dataset.tag;
                tag.className = `hero-tag is-${slides[atual].dataset.tom}`;
            }
            const contador = hero.querySelector('[data-hero-count]');
            if (contador) contador.textContent = `${atual + 1} / ${slides.length}`;
            if (focar) pontos[atual]?.focus();
        };

        pontos.forEach(p => p.addEventListener('click', () => mostrar(Number(p.dataset.heroIr))));
        hero.addEventListener('keydown', (e) => {
            if (slides.length < 2 || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
            if (!e.target.closest('.hero-dots')) return;
            e.preventDefault();
            mostrar(atual + (e.key === 'ArrowRight' ? 1 : -1), true);
        });
    }

    // ==========================================
    // AGENDA: CALENDÁRIO MENSAL + LISTA DE ENTREGAS (coluna lateral)
    // ==========================================
    const fmt = (opcoes) => new Intl.DateTimeFormat('pt-BR', opcoes);
    const NOMES_MES = Array.from({ length: 12 }, (_, i) => fmt({ month: 'long' }).format(new Date(2000, i, 1)));
    const MES_CURTO = (data) => fmt({ month: 'short' }).format(data).replace('.', '');
    const DIAS_SEMANA = Array.from({ length: 7 }, (_, i) => new Date(2000, 0, 2 + i)); // 2/jan/2000 = domingo
    const chaveDia = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const LIMITE_DA_AGENDA = 6;

    function prepararEntregas(tarefas) {
        const vistos = new Set();
        return (tarefas || [])
            .filter(t => t && t.prazo)
            .map(t => ({ ...t, data: new Date(t.prazo) }))
            .filter(t => !Number.isNaN(t.data.getTime()))
            .filter(t => {
                const chave = `${t.id ?? ''}|${t.titulo}|${t.prazo}`;
                if (vistos.has(chave)) return false;
                vistos.add(chave);
                return true;
            })
            .sort((a, b) => a.data - b.data);
    }

    function renderAgenda() {
        const hoje = new Date();
        const anos = [hoje.getFullYear() - 1, hoje.getFullYear(), hoje.getFullYear() + 1];
        return `
            <section class="agenda-card fade-in" aria-labelledby="agenda-titulo" data-agenda>
                <div class="agenda-head">
                    <h2 id="agenda-titulo">Agenda de entregas</h2>
                    <button type="button" class="link-btn" data-agenda-hoje>Hoje</button>
                </div>
                <div class="agenda-controls">
                    <select aria-label="Mês" data-agenda-mes>
                        ${NOMES_MES.map((m, i) => `<option value="${i}">${m.charAt(0).toUpperCase() + m.slice(1)}</option>`).join('')}
                    </select>
                    <select aria-label="Ano" data-agenda-ano>
                        ${anos.map(a => `<option value="${a}">${a}</option>`).join('')}
                    </select>
                </div>
                <div class="mcal" data-agenda-cal></div>
                <div class="agenda-list-head">
                    <h3 data-agenda-rotulo aria-live="polite">Próximas entregas</h3>
                    <button type="button" class="link-btn" onclick="UI.switchView('tarefas')">Ver tarefas</button>
                </div>
                <ul class="event-list" data-agenda-lista></ul>
            </section>`;
    }

    function cartaoDeEntrega(t, agora) {
        const atrasada = t.atrasada || t.data < agora;
        const hora = fmt({ hour: '2-digit', minute: '2-digit' }).format(t.data);
        const diaSemana = fmt({ weekday: 'short', day: 'numeric', month: 'short' }).format(t.data).replace(/\./g, '');
        return `
            <li>
                <button type="button" class="event-card${atrasada ? ' is-late' : ''}" onclick="UI.switchView('tarefas')">
                    <span class="event-date" aria-hidden="true">
                        <span class="event-day">${String(t.data.getDate()).padStart(2, '0')}</span>
                        <span class="event-mon">${MES_CURTO(t.data)}</span>
                    </span>
                    <span class="event-body">
                        <span class="event-title">${esc(t.titulo)}</span>
                        <span class="event-pills">
                            <span class="pill">${window.Icon ? window.Icon('calendar', { size: 12 }) : ''}${diaSemana}</span>
                            <span class="pill">${window.Icon ? window.Icon('clock', { size: 12 }) : ''}${hora}</span>
                            ${atrasada ? '<span class="badge badge-danger">atrasada</span>' : t.status === 'em_revisao' ? etiquetaDaTarefa(t) : ''}
                        </span>
                    </span>
                </button>
            </li>`;
    }

    function ligarAgenda(raiz, tarefas) {
        const agenda = raiz.querySelector('[data-agenda]');
        if (!agenda) return;
        const entregas = prepararEntregas(tarefas);
        const porDia = new Map();
        entregas.forEach(t => {
            const k = chaveDia(t.data);
            if (!porDia.has(k)) porDia.set(k, []);
            porDia.get(k).push(t);
        });

        const hoje = new Date();
        const estado = { ano: hoje.getFullYear(), mes: hoje.getMonth(), dia: chaveDia(hoje) };
        const selMes = agenda.querySelector('[data-agenda-mes]');
        const selAno = agenda.querySelector('[data-agenda-ano]');
        const cal = agenda.querySelector('[data-agenda-cal]');
        const lista = agenda.querySelector('[data-agenda-lista]');
        const rotulo = agenda.querySelector('[data-agenda-rotulo]');

        function garantirAno(ano) {
            if (!selAno.querySelector(`option[value="${ano}"]`)) {
                selAno.insertAdjacentHTML('beforeend', `<option value="${ano}">${ano}</option>`);
            }
        }

        function desenharCalendario() {
            garantirAno(estado.ano);
            selMes.value = String(estado.mes);
            selAno.value = String(estado.ano);

            const primeiro = new Date(estado.ano, estado.mes, 1);
            const inicio = new Date(estado.ano, estado.mes, 1 - primeiro.getDay());
            const diasNoMes = new Date(estado.ano, estado.mes + 1, 0).getDate();
            const celulas = Math.ceil((primeiro.getDay() + diasNoMes) / 7) * 7;
            const chaveHoje = chaveDia(new Date());
            const agora = new Date();

            const dias = Array.from({ length: celulas }, (_, i) => {
                const d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
                const k = chaveDia(d);
                const itens = porDia.get(k) || [];
                const fora = d.getMonth() !== estado.mes;
                const atrasado = itens.some(t => t.atrasada || t.data < agora);
                const classes = ['mcal-day', fora && 'is-outside', k === chaveHoje && 'is-today', itens.length && 'has-items', atrasado && 'has-late'].filter(Boolean).join(' ');
                const nome = fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(d);
                const extra = itens.length ? `, ${plural(itens.length, 'entrega', 'entregas')}` : '';
                return `<button type="button" class="${classes}" data-dia="${k}" aria-pressed="${k === estado.dia}" aria-label="${nome}${extra}"${k === chaveHoje ? ' aria-current="date"' : ''}>${d.getDate()}</button>`;
            }).join('');

            cal.innerHTML = `
                <div class="mcal-week" aria-hidden="true">${DIAS_SEMANA.map(d =>
                    `<abbr title="${fmt({ weekday: 'long' }).format(d)}">${fmt({ weekday: 'short' }).format(d).replace('.', '').slice(0, 3)}</abbr>`).join('')}</div>
                <div class="mcal-days" role="group" aria-label="${NOMES_MES[estado.mes]} de ${estado.ano}">${dias}</div>`;
        }

        function desenharLista() {
            const agora = new Date();
            const [a, m, d] = estado.dia.split('-').map(Number);
            const selecionado = new Date(a, m - 1, d);
            const doDia = porDia.get(estado.dia) || [];
            const ehHoje = estado.dia === chaveDia(agora);
            let itens;

            if (doDia.length && !ehHoje) {
                itens = doDia;
                rotulo.textContent = `Entregas em ${fmt({ day: 'numeric', month: 'long' }).format(selecionado)}`;
            } else if (ehHoje) {
                // Hoje: primeiro o que já venceu, depois o que vem pela frente
                const vencidas = entregas.filter(t => t.atrasada || t.data < agora);
                const proximas = entregas.filter(t => !(t.atrasada || t.data < agora));
                itens = [...vencidas, ...proximas].slice(0, LIMITE_DA_AGENDA);
                rotulo.textContent = vencidas.length ? 'Vencidas e próximas entregas' : 'Próximas entregas';
            } else {
                itens = entregas.filter(t => t.data >= selecionado).slice(0, LIMITE_DA_AGENDA);
                rotulo.textContent = `A partir de ${fmt({ day: 'numeric', month: 'long' }).format(selecionado)}`;
            }

            lista.innerHTML = itens.length
                ? itens.map(t => cartaoDeEntrega(t, agora)).join('')
                : `<li>${window.UI.emptyState({ title: 'Nenhuma entrega nesta data', description: 'Escolha outro dia no calendário ou abra a lista completa de tarefas.' })}</li>`;
        }

        function selecionarDia(k) {
            estado.dia = k;
            const [a, m] = k.split('-').map(Number);
            const mudouMes = a !== estado.ano || m - 1 !== estado.mes;
            estado.ano = a;
            estado.mes = m - 1;
            if (mudouMes) desenharCalendario();
            else cal.querySelectorAll('.mcal-day').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.dia === k)));
            desenharLista();
            cal.querySelector(`[data-dia="${k}"]`)?.focus();
        }

        cal.addEventListener('click', (e) => {
            const botao = e.target.closest('[data-dia]');
            if (botao) selecionarDia(botao.dataset.dia);
        });
        // Setas movem o dia selecionado (←/→ um dia, ↑/↓ uma semana)
        cal.addEventListener('keydown', (e) => {
            const passos = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
            if (!passos || !e.target.closest('[data-dia]')) return;
            e.preventDefault();
            const [a, m, d] = estado.dia.split('-').map(Number);
            selecionarDia(chaveDia(new Date(a, m - 1, d + passos)));
        });
        const mudarMes = () => {
            estado.mes = Number(selMes.value);
            estado.ano = Number(selAno.value);
            const ultimo = new Date(estado.ano, estado.mes + 1, 0).getDate();
            const diaAtual = Math.min(Number(estado.dia.split('-')[2]), ultimo);
            estado.dia = chaveDia(new Date(estado.ano, estado.mes, diaAtual));
            desenharCalendario();
            desenharLista();
        };
        selMes.addEventListener('change', mudarMes);
        selAno.addEventListener('change', mudarMes);
        agenda.querySelector('[data-agenda-hoje]')?.addEventListener('click', () => selecionarDia(chaveDia(new Date())));

        desenharCalendario();
        desenharLista();
    }

    // ==========================================
    // VISÃO DO COLABORADOR
    // ==========================================
    function renderVisaoPessoal(eu) {
        const tarefas = eu.proximas.length
            ? listaDeTarefas(eu.proximas, false)
            : window.UI.emptyState({ title: 'Nenhuma tarefa em aberto', description: 'Quando uma tarefa for atribuída a você, ela aparece aqui.' });

        const statusRelato = !eu.relata_no_mes ? 'Não se aplica'
            : eu.relato_do_mes_enviado ? 'Enviado' : 'Pendente';
        const proxima = eu.proximas && eu.proximas.length ? formatarPrazo(eu.proximas[0].prazo) : 'Nenhuma';

        return `
            ${renderDestaque(avisosDoColaborador(eu))}
            ${painelResumo('Resumo das minhas tarefas', `
                ${cartao(eu.abertas, 'em aberto', '', 'clipboard', '')}
                ${cartao(eu.atrasadas, 'atrasadas', 'text-danger', 'alert-triangle', 'tone-danger')}
                ${cartao(eu.vencem_em_breve, 'vencem em 7 dias', 'text-warning', 'clock', 'tone-warning')}
                ${cartao(eu.em_revisao, 'em revisão', 'text-primary', 'check-circle', '')}`, [
                eu.mes_nome && [`Relato de ${esc(eu.mes_nome)}`, statusRelato],
                ['Próxima entrega', proxima],
            ])}
            ${secao('Minhas tarefas', '', tarefas)}`;
    }

    function renderMinhasTarefasDoGestor(eu) {
        return eu.proximas.length ? secao('Atribuídas a mim', '', listaDeTarefas(eu.proximas.slice(0, LIMITE_DE_ATENCAO), false)) : '';
    }

    // ==========================================
    // VISÃO DO GESTOR
    // ==========================================
    function renderPainelPrazosPTA(resumo) {
        if (resumo.papel !== 'admin') return '';
        const pta = resumo.equipe?.pta_anual;
        if (!pta || (pta.atrasados_qtd === 0 && pta.vencem_neste_mes_qtd === 0)) return '';

        const itens = [
            ...(pta.atrasados || []).map(item => ({ ...item, tipo: 'atrasado' })),
            ...(pta.vencem_neste_mes || []).map(item => ({ ...item, tipo: 'vence_mes' })),
        ];

        const cartoesHtml = itens.map(t => {
            const anoCurto = String(t.ano || '').slice(-2);
            const ini = String(t.mes_inicio || 1).padStart(2, '0');
            const fim = String(t.mes_fim || 12).padStart(2, '0');
            const prazoFmt = `${ini}/${anoCurto} → ${fim}/${anoCurto}`;
            const badge = t.tipo === 'atrasado'
                ? `<span class="badge badge-danger">atrasado · ${t.meses_atraso} ${t.meses_atraso === 1 ? 'mês' : 'meses'}</span>`
                : `<span class="badge badge-warning">vence neste mês (${fim}/${anoCurto})</span>`;
            const meterCls = t.tipo === 'atrasado' ? 'bad' : '';

            return `
                <article class="entry clickable" onclick="UI.switchView('pta')">
                    <div class="entry-head" style="flex-wrap:wrap; gap:6px;">
                        <h4 class="entry-title">${esc(t.titulo)}</h4>
                        ${badge}
                    </div>
                    <p class="meta">previsão: <span class="mono">${prazoFmt}</span></p>
                    <div class="meter">
                        <div class="meter-track"><div class="meter-fill ${meterCls}" style="width:${t.avanco || 0}%"></div></div>
                        <span class="meter-value">${t.avanco || 0}%</span>
                    </div>
                </article>
            `;
        }).join('');

        const complemento = `${pta.atrasados_qtd} atrasado(s) · ${pta.concluidos} de ${pta.total} concluído(s)`;
        return secao('Tópicos do PTA com prazo vencido ou no limite', complemento, `<div class="entries">${cartoesHtml}</div>`);
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
            ${renderDestaque(avisosDoGestor(resumo))}
            ${painelResumo('Resumo da equipe', `
                ${cartao(t.atrasadas, 'atrasadas', 'text-danger', 'alert-triangle', 'tone-danger')}
                ${cartao(t.em_revisao, 'aguardando revisão', 'text-primary', 'check-circle', '')}
                ${cartao(t.vencem_em_breve, 'vencem em 7 dias', 'text-warning', 'clock', 'tone-warning')}
                ${cartao(t.abertas, 'em aberto', '', 'clipboard', '')}`, [
                [`Relatos de ${esc(relatos.mes_nome)}`, `${relatos.enviaram} de ${relatos.esperados}`],
                ['Pessoas acompanhadas', String(pessoasRelevantes(equipe.pessoas).length)],
                typeof resumo.cadastros_pendentes === 'number' && ['Cadastros pendentes', String(resumo.cadastros_pendentes)],
                equipe.janela_dias && ['Janela de pontualidade', `${equipe.janela_dias} dias`],
            ])}
            ${secao('Precisa de atenção', restante > 0 ? `mais ${restante} em tarefas` : '', atencao)}
            ${secao('Equipe', `relatos de ${esc(relatos.mes_nome)}: ${relatos.enviaram} de ${relatos.esperados}`, renderTabelaDePessoas(equipe))}
            ${renderPainelPrazosPTA(resumo)}`;
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
    // CARREGAR O PAINEL (grid assimétrico: principal + agenda)
    // ==========================================
    function montarGrade(principal) {
        return `
            <div class="home-grid">
                <div class="home-main">${principal}</div>
                <aside class="home-aside" aria-label="Agenda">${renderAgenda()}</aside>
            </div>`;
    }

    async function carregarPainel() {
        const alvo = document.getElementById('painel-inicio');
        if (!alvo) return;
        try {
            const res = await window.api.fetchProtected('/painel/resumo');
            if (!res.ok) throw new Error('Falha ao carregar o painel');
            const resumo = await res.json();
            if (!document.getElementById('painel-inicio')) return;

            const principal = resumo.gestor
                ? renderVisaoDoGestor(resumo) + renderMinhasTarefasDoGestor(resumo.eu)
                : renderVisaoPessoal(resumo.eu) + renderAtalhos();
            const entregas = resumo.gestor
                ? [...(resumo.equipe.atencao || []), ...(resumo.eu.proximas || [])]
                : (resumo.eu.proximas || []);

            alvo.innerHTML = montarGrade(principal);
            ligarDestaque(alvo);
            ligarAgenda(alvo, entregas);
        } catch (erro) {
            if (document.getElementById('painel-inicio')) {
                alvo.innerHTML = window.UI.errorState('Não foi possível carregar o painel.');
            }
        }
    }

    // ==========================================
    // CONSTRUÇÃO DA TELA INICIAL
    // (a saudação com o nome fica na barra acima da área de trabalho)
    // ==========================================
    document.addEventListener('viewChanged', (e) => {
        if (e.detail.view !== 'inicio') return;
        const conteudo = document.getElementById('dynamic-content');

        conteudo.innerHTML = `
            <header class="page-head fade-in">
                <div>
                    <p class="eyebrow">painel do laboratório</p>
                    <h1>Visão geral</h1>
                    <p class="lede">Avisos, indicadores e entregas de pesquisa, procedimentos e tarefas do laboratório GMAE / LEQM.</p>
                </div>
            </header>
            <div id="painel-inicio">${window.UI.loading('Carregando o painel')}</div>`;

        carregarPainel();
    });
})();
