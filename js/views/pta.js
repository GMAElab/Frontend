// ==========================================
// PLANEJAMENTO MENSAL (PTA)
// Quem relata: uma "folha do mês" com uma linha por tópico.
// Coordenação: abas Avaliar · Visão do ano · Tópicos · Importar e exportar.
// ==========================================
(function () {
    'use strict';

    const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const SECOES = [
        { chave: 'realizado', titulo: 'Realizado', ajuda: 'Experimentos, ensaios e entregas do mês', linhas: 4 },
        { chave: 'resultados', titulo: 'Resultados', ajuda: 'O que foi obtido ou concluído', linhas: 3 },
        { chave: 'dificuldades', titulo: 'Dificuldades', ajuda: 'Bloqueios, falhas, falta de insumo (opcional)', linhas: 2 },
        { chave: 'proximos', titulo: 'Próximos passos', ajuda: 'Vira o ponto de partida do próximo mês', linhas: 2 },
        { chave: 'justificativa', titulo: 'Justificativa da redução', ajuda: '', linhas: 2, oculta: true },
    ];
    const MOTIVOS_RAPIDOS = [
        'Detalhe melhor os resultados obtidos.',
        'O avanço informado não condiz com as atividades descritas.',
        'Faltou informar os próximos passos.',
        'Relato está no tópico errado.',
    ];

    const esc = (v) => window.escapeHTML(v);
    const icone = (nome, size = 14) => (window.Icon ? window.Icon(nome, { size }) : '');
    const capital = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');
    const nomeMes = (m) => capital(MESES[(m || 1) - 1]);
    const mesAno = (m, a) => `${nomeMes(m)} de ${a}`;
    const usuario = () => { try { return JSON.parse(localStorage.getItem('user_data') || '{}'); } catch (e) { return {}; } };
    const ehGestor = () => ['coordenador', 'admin'].includes(usuario().role);
    const ehAdmin = () => usuario().role === 'admin';
    const hoje = () => { const d = new Date(); return { mes: d.getMonth() + 1, ano: d.getFullYear() }; };
    const chave = (a, m) => a * 12 + m;

    function dataHora(iso) {
        if (!iso) return '';
        const texto = /[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`;
        const d = new Date(texto);
        if (Number.isNaN(d.getTime())) return '';
        return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    }

    function prazoTopico(t) {
        if (!t || !t.mes_fim) return t && t.ano ? `${t.ano} · sem prazo` : 'sem prazo';
        const a = String(t.ano).slice(-2);
        return `${String(t.mes_inicio || 1).padStart(2, '0')}/${a} → ${String(t.mes_fim).padStart(2, '0')}/${a}`;
    }

    async function req(caminho, opcoes = {}) {
        const op = { ...opcoes };
        if (op.json !== undefined) {
            op.body = JSON.stringify(op.json);
            op.headers = { 'Content-Type': 'application/json', ...(op.headers || {}) };
            delete op.json;
        }
        const res = await window.api.fetchProtected(caminho, op);
        const dados = await res.json().catch(() => ({}));
        if (!res.ok) {
            const det = Array.isArray(dados.detail) ? dados.detail.map(d => d.msg).join('; ') : dados.detail;
            throw new Error(det || 'Não foi possível concluir a ação.');
        }
        return dados;
    }

    function erroToast(err) { window.UI.showToast(err.message || 'Falha de conexão.', 'error'); }

    async function comBotao(btn, rotulo, fn) {
        if (!btn) return fn();
        const original = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner" aria-hidden="true"></span> ${rotulo}`;
        try { return await fn(); } finally { if (btn.isConnected) { btn.disabled = false; btn.innerHTML = original; } }
    }

    // ==========================================
    // STATUS, NÚMEROS E MINIGRÁFICO
    // ==========================================
    const STATUS = {
        pendente: { rotulo: 'Pendente', classe: 'badge-warning' },
        rascunho: { rotulo: 'Rascunho', classe: '' },
        aguardando_aprovacao: { rotulo: 'Enviado', classe: 'badge-info' },
        devolvido: { rotulo: 'Devolvido', classe: 'badge-danger' },
        consolidado: { rotulo: 'Aprovado', classe: 'badge-success' },
        concluido: { rotulo: 'Tópico concluído', classe: 'badge-success' },
        fora: { rotulo: 'Ainda não começou', classe: '' },
    };
    const badge = (st) => `<span class="badge ${STATUS[st]?.classe || ''}">${STATUS[st]?.rotulo || esc(st)}</span>`;

    const abaixoDoEsperado = (atual, esperado) => esperado !== null && esperado !== undefined && atual < esperado - 15;

    /** O que foi relatado no tópico no mês anterior. `resumo`: só o "Realizado", em poucas linhas (tabela). */
    function mesAnteriorHTML(ma, { resumo = false } = {}) {
        if (!ma) return '';
        const relatos = ma.relatos || [];
        if (!relatos.length) {
            return `<span class="pta-anterior-vazio">Nada relatado em ${esc(nomeMes(ma.mes).toLowerCase())}${ma.mes === 12 ? ` de ${ma.ano}` : ''}.</span>`;
        }
        const varios = relatos.length > 1;
        const rotuloDe = (r) => [varios || !r.meu ? (r.meu ? 'Você' : r.autor) : '', `${r.percentual_avanco}%`,
            r.status === 'consolidado' ? '' : (STATUS[r.status]?.rotulo || '').toLowerCase()].filter(Boolean).join(' · ');
        if (resumo) {
            return `<div class="pta-anterior-resumo">${relatos.map(r => {
                const partes = lerDescricao(r.descricao);
                return `<p><span class="pta-anterior-autor">${esc(rotuloDe(r))}</span> ${esc(partes.realizado || partes.resultados || r.descricao)}</p>`;
            }).join('')}</div>`;
        }
        return relatos.map(r => `
            <div class="pta-anterior-item">
                <p class="pta-anterior-autor">${esc(rotuloDe(r))}</p>
                ${descricaoHTML(r.descricao)}
            </div>`).join('');
    }

    // ==========================================
    // DESCRIÇÃO ESTRUTURADA
    // Fica salva como texto simples com cabeçalhos ("Realizado:"),
    // então a importação, a exportação e a síntese por IA continuam lendo o mesmo campo.
    // ==========================================
    function lerDescricao(texto) {
        const saida = {};
        const titulos = SECOES.map(s => s.titulo);
        const padrao = new RegExp(`^(${titulos.join('|')}):\\s*$`);
        let atual = null;
        let achou = false;
        String(texto || '').split(/\r?\n/).forEach(linha => {
            const m = linha.trim().match(padrao);
            if (m) { atual = SECOES.find(s => s.titulo === m[1]).chave; achou = true; saida[atual] = saida[atual] || []; return; }
            if (!atual) { atual = 'realizado'; saida[atual] = []; }
            saida[atual].push(linha);
        });
        Object.keys(saida).forEach(k => { saida[k] = saida[k].join('\n').trim(); });
        if (!achou) return { realizado: String(texto || '').trim() };
        return saida;
    }

    function comporDescricao(partes) {
        return SECOES.filter(s => (partes[s.chave] || '').trim())
            .map(s => `${s.titulo}:\n${partes[s.chave].trim()}`).join('\n\n');
    }

    function descricaoHTML(texto, recolher = false) {
        const partes = lerDescricao(texto);
        const blocos = SECOES.filter(s => partes[s.chave]).map(s =>
            `<div><h6>${esc(s.titulo)}</h6><p>${esc(partes[s.chave])}</p></div>`).join('');
        if (!blocos) return '<p class="text-muted text-small">Sem descrição.</p>';
        return `<div class="pta-desc${recolher ? ' is-recolhida' : ''}">${blocos}</div>`;
    }

    // ==========================================
    // MODAIS
    // ==========================================
    function abrirModal({ id, eyebrow = '', titulo, corpo, rodape = '', tamanho = 'modal-md' }) {
        document.getElementById(id)?.remove();
        const modal = document.createElement('div');
        modal.id = id;
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content ${tamanho}" role="dialog" aria-modal="true" aria-labelledby="${id}-titulo">
                <div class="modal-header">
                    <div>${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}<h3 id="${id}-titulo">${esc(titulo)}</h3></div>
                    <button type="button" class="modal-close" data-role="cancel" aria-label="Fechar">${icone('x', 16)}</button>
                </div>
                ${corpo}
                ${rodape ? `<div class="modal-footer">${rodape}</div>` : ''}
            </div>`;
        document.body.appendChild(modal);
        const fechar = () => modal.remove();
        modal.querySelectorAll('[data-role="cancel"]').forEach(b => b.addEventListener('click', fechar));
        modal.addEventListener('click', (e) => { if (e.target === modal) fechar(); });
        return modal;
    }

    async function abrirHistorico(relatoId, titulo) {
        const modal = abrirModal({ id: 'pta-historico', eyebrow: 'histórico do relato', titulo, corpo: `<div id="pta-historico-corpo">${window.UI.loading()}</div>`, tamanho: 'modal-sm' });
        try {
            const eventos = await req(`/pta/relatorios/${relatoId}/historico`);
            const corpo = modal.querySelector('#pta-historico-corpo');
            corpo.innerHTML = eventos.length ? `<ol class="timeline">${eventos.map(e => `
                <li class="tl-item">
                    <span class="tl-title">${esc(e.rotulo)}</span>
                    <p>${esc([e.autor, dataHora(e.quando)].filter(Boolean).join(' · '))}</p>
                    ${e.detalhe ? `<p class="tl-quote">${esc(e.detalhe)}</p>` : ''}
                </li>`).join('')}</ol>` : window.UI.emptyState({ title: 'Sem eventos registrados' });
        } catch (err) {
            modal.querySelector('#pta-historico-corpo').innerHTML = window.UI.errorState(esc(err.message));
        }
    }

    function notasHTML(notas) {
        if (!notas || !notas.length) return '';
        return `<div class="pta-notas">${notas.map(n => `
            <div class="pta-nota${n.da_chefia ? ' is-chefia' : ''}">
                <div class="pta-nota-autor"><span>${esc(n.da_chefia ? `Coordenação · ${n.autor_nome}` : n.autor_nome)}</span><span class="text-muted">${esc(dataHora(n.criado_em))}</span></div>
                <p>${esc(n.texto)}</p>
            </div>`).join('')}</div>`;
    }

    function navMes(acao, mes, ano) {
        return `<div class="pta-mes-nav">
            <button type="button" class="icon-btn" data-acao="${acao}" data-delta="-1" aria-label="Mês anterior">${icone('chevron-left', 16)}</button>
            <span class="pta-mes-label" aria-live="polite">${esc(mesAno(mes, ano))}</span>
            <button type="button" class="icon-btn" data-acao="${acao}" data-delta="1" aria-label="Próximo mês">${icone('chevron-right', 16)}</button>
        </div>`;
    }

    function somarMes(mes, ano, d) {
        const k = chave(ano, mes) - 1 + d;
        return { mes: (k % 12) + 1, ano: Math.floor(k / 12) };
    }

    // ==========================================
    // ROTEADOR
    // ==========================================
    document.addEventListener('viewChanged', (e) => {
        if (e.detail.view !== 'pta') return;
        if (ehGestor()) renderPTACoordenador(); else renderPTAPesquisador();
    });

    // ==========================================
    // FOLHA DO MÊS (QUEM RELATA)
    // ==========================================
    const P = { mes: null, ano: null, dados: null, aberto: null };

    function renderPTAPesquisador(opcoes = {}) {
        const h = hoje();
        P.mes = opcoes.mes || P.mes || h.mes;
        P.ano = opcoes.ano || P.ano || h.ano;
        P.aberto = opcoes.abrir || null;
        const main = document.getElementById('dynamic-content');
        main.innerHTML = `
            <div id="pta-raiz">
                <header class="page-head fade-in">
                    <div>
                        <p class="eyebrow">PTA mensal</p>
                        <h1>Planejamento mensal</h1>
                        <p class="lede">Uma linha por tópico. Preencha, guarde como rascunho e envie quando estiver pronto.</p>
                    </div>
                    <div class="page-actions">
                        ${navMes('mes-folha', P.mes, P.ano)}
                        <button type="button" class="btn btn-secondary btn-sm${P.mes === h.mes && P.ano === h.ano ? ' hidden' : ''}" data-acao="mes-atual">Mês atual</button>
                        ${ehGestor() ? '<button type="button" class="btn btn-secondary btn-sm" data-acao="ir-coordenacao">Painel da coordenação</button>' : ''}
                    </div>
                </header>
                <div id="pta-devolvidos"></div>
                <div id="pta-progresso"></div>
                <div class="table-container fade-in">
                    <table class="data-table pta-folha">
                        <thead><tr>
                            <th>Tópico</th>
                            <th class="col-hide-sm" id="pta-th-anterior">Feito em ${esc(nomeMes(somarMes(P.mes, P.ano, -1).mes).toLowerCase())}</th>
                            <th class="num">Último</th>
                            <th class="num">Este mês</th>
                            <th class="num col-hide-xs">Esperado</th>
                            <th>Situação</th>
                            <th class="end"><span class="sr-only">Ações</span></th>
                        </tr></thead>
                        <tbody id="pta-folha-corpo"><tr><td colspan="7">${window.UI.loading('Carregando seus tópicos')}</td></tr></tbody>
                    </table>
                </div>
                <div class="pta-rodape" id="pta-rodape"></div>
            </div>`;
        const raiz = document.getElementById('pta-raiz');
        raiz.addEventListener('click', aoClicarFolha);
        raiz.addEventListener('input', aoDigitarFolha);
        carregarFolha();
    }

    async function carregarFolha() {
        try {
            P.dados = await req(`/pta/meu-mes?mes=${P.mes}&ano=${P.ano}`);
            renderFolha();
        } catch (err) {
            const corpo = document.getElementById('pta-folha-corpo');
            if (corpo) corpo.innerHTML = `<tr><td colspan="7">${window.UI.errorState(esc(err.message))}</td></tr>`;
        }
    }

    function situacaoDe(t) {
        if (t.meu) return t.meu.status;
        if (t.concluido) return 'concluido';
        if (!t.no_periodo) return 'fora';
        return 'pendente';
    }

    function renderFolha() {
        const d = P.dados;
        if (!d || !document.getElementById('pta-folha-corpo')) return;

        // Devoluções (de qualquer mês) ficam sempre no topo.
        const dev = document.getElementById('pta-devolvidos');
        dev.innerHTML = d.devolvidos.length ? `
            <div class="note danger pta-devolvidos" role="alert">
                <strong>${d.devolvidos.length === 1 ? '1 relato devolvido para ajuste' : `${d.devolvidos.length} relatos devolvidos para ajuste`}</strong>
                <ul>${d.devolvidos.map(r => `
                    <li>
                        <span><strong>${esc(r.topico_titulo || 'Tópico')}</strong> · ${esc(mesAno(r.mes, r.ano))}${r.motivo ? `<br><span class="pta-motivo">“${esc(r.motivo)}”${r.avaliador ? ` · ${esc(r.avaliador)}` : ''}</span>` : ''}</span>
                        <button type="button" class="btn btn-secondary btn-sm" data-acao="corrigir" data-topico="${r.topico_id}" data-mes="${r.mes}" data-ano="${r.ano}">Corrigir</button>
                    </li>`).join('')}</ul>
            </div>` : '';

        const ativos = d.topicos.filter(t => t.no_periodo && !(t.concluido && !t.meu));
        const enviados = ativos.filter(t => t.meu && ['aguardando_aprovacao', 'consolidado'].includes(t.meu.status)).length;
        const aprovados = ativos.filter(t => t.meu && t.meu.status === 'consolidado').length;
        const rascunhos = d.topicos.filter(t => t.meu && t.meu.status === 'rascunho');
        document.getElementById('pta-progresso').innerHTML = ativos.length ? `
            <div class="pta-progresso">
                <span class="pta-progresso-texto">${enviados} de ${ativos.length} ${ativos.length === 1 ? 'tópico enviado' : 'tópicos enviados'} em ${esc(nomeMes(P.mes).toLowerCase())}</span>
                <span class="cluster">
                    ${aprovados ? `<span class="badge badge-success">${aprovados} aprovado${aprovados > 1 ? 's' : ''}</span>` : ''}
                    ${rascunhos.length ? `<span class="badge">${rascunhos.length} rascunho${rascunhos.length > 1 ? 's' : ''}</span>` : ''}
                    ${ativos.length - enviados - rascunhos.length > 0 ? `<span class="badge badge-warning">${ativos.length - enviados - rascunhos.length} sem relato</span>` : ''}
                </span>
            </div>` : '';

        const corpo = document.getElementById('pta-folha-corpo');
        if (!d.topicos.length) {
            corpo.innerHTML = `<tr><td colspan="7">${window.UI.emptyState({
                title: 'Nenhum tópico para este mês',
                description: 'Não há tópicos de pesquisa cadastrados para este ano em que você participe. Fale com a coordenação.',
            })}</td></tr>`;
        } else {
            let html = '';
            let grupoConcluidos = false;
            d.topicos.forEach(t => {
                if (t.concluido && !t.meu && !grupoConcluidos) {
                    grupoConcluidos = true;
                    html += '<tr class="pta-grupo-row"><td colspan="7">Tópicos já concluídos (100%)</td></tr>';
                }
                html += linhaTopico(t);
                if (P.aberto === t.id) html += linhaEditor(t);
            });
            corpo.innerHTML = html;
            if (P.aberto) prepararEditor(P.aberto);
        }

        const rodape = document.getElementById('pta-rodape');
        const prontos = rascunhos.filter(t => (t.meu.descricao_atividades || '').trim());
        rodape.innerHTML = prontos.length ? `
            <span>${prontos.length === 1 ? 'Há 1 rascunho pronto para enviar.' : `Há ${prontos.length} rascunhos prontos para enviar.`}</span>
            <button type="button" class="btn btn-primary btn-sm" data-acao="enviar-rascunhos">Enviar ${prontos.length === 1 ? 'rascunho' : `${prontos.length} rascunhos`}</button>` : '';
    }

    function linhaTopico(t) {
        const st = situacaoDe(t);
        const atual = t.meu ? t.meu.percentual_avanco : null;
        const aberto = P.aberto === t.id;
        const rotuloAcao = !t.meu ? (t.concluido ? 'Ver' : 'Preencher') : t.meu.status === 'consolidado' ? 'Ver' : t.meu.status === 'devolvido' ? 'Corrigir' : 'Editar';
        return `
            <tr class="clickable${aberto ? ' is-aberto' : ''}${st === 'fora' || (t.concluido && !t.meu) ? ' is-dimmed' : ''}" tabindex="0" data-acao="alternar" data-topico="${t.id}" aria-expanded="${aberto}">
                <td>
                    <strong>${esc(t.titulo)}</strong><span class="pta-topico-sub">${esc(prazoTopico(t))}${t.membros_definidos ? '' : ' · toda a equipe'}${t.prazo_vencido ? ' · <span class="text-danger">prazo vencido</span>' : ''}</span>
                    <div class="pta-anterior-curto"><span class="pta-anterior-titulo">Feito em ${esc(nomeMes(t.mes_anterior?.mes || 1).toLowerCase())}</span>${mesAnteriorHTML(t.mes_anterior, { resumo: true })}</div>
                </td>
                <td class="col-hide-sm pta-anterior-td">${mesAnteriorHTML(t.mes_anterior, { resumo: true })}</td>
                <td class="num">${t.ultimo_avanco}%</td>
                <td class="num">${atual === null ? '<span class="text-faint">—</span>' : `<strong>${atual}%</strong>`}</td>
                <td class="num col-hide-xs">${t.esperado === null ? '<span class="text-faint">—</span>' : `${t.esperado}%`}</td>
                <td>${badge(st)}</td>
                <td class="end"><button type="button" class="link-btn" data-acao="alternar" data-topico="${t.id}">${rotuloAcao}</button></td>
            </tr>`;
    }

    function linhaEditor(t) {
        const meu = t.meu;
        const somenteLeitura = (meu && meu.status === 'consolidado') || (t.concluido && !meu);
        if (somenteLeitura) return linhaLeitura(t);

        const partes = lerDescricao(meu ? meu.descricao_atividades : '');
        const valor = meu ? meu.percentual_avanco : t.ultimo_avanco;
        const plano = t.plano_anterior ? (lerDescricao(t.plano_anterior.descricao).proximos || '') : '';
        const devolucao = meu && meu.status === 'devolvido' ? (meu.notas || []).filter(n => n.da_chefia).pop() : null;
        const id = (k) => `pta-${t.id}-${k}`;

        return `
            <tr class="pta-editor-row"><td colspan="7">
                <form class="pta-editor" id="pta-form-${t.id}" data-topico="${t.id}" novalidate>
                    <div class="pta-editor-grid">
                        <div class="pta-editor-main">
                            ${devolucao ? `<div class="note danger"><strong>Devolvido por ${esc(devolucao.autor_nome)}:</strong> ${esc(devolucao.texto)}</div>` : ''}
                            <div class="pta-painel pta-anterior">
                                <div class="label-row">
                                    <h5>O que foi feito em ${esc(mesAno(t.mes_anterior.mes, t.mes_anterior.ano).toLowerCase())}</h5>
                                    ${plano ? `<button type="button" class="link-btn" data-acao="copiar-plano" data-topico="${t.id}">Copiar seus próximos passos para “Realizado”</button>` : ''}
                                </div>
                                ${mesAnteriorHTML(t.mes_anterior)}
                                ${plano ? `<template id="${id('plano')}">${esc(plano)}</template>` : ''}
                            </div>
                            ${SECOES.map(s => `
                                <div class="input-group${s.oculta ? ' hidden' : ''}" id="${id(s.chave)}-grupo">
                                    <div class="label-row"><label for="${id(s.chave)}">${esc(s.titulo)}</label>${s.ajuda ? `<span class="pta-ajuda-secao">${esc(s.ajuda)}</span>` : ''}</div>
                                    <textarea id="${id(s.chave)}" rows="${s.linhas}" data-secao="${s.chave}">${esc(partes[s.chave] || '')}</textarea>
                                </div>`).join('')}
                            <div class="pta-ferramentas">
                                <button type="button" class="link-btn" data-acao="importar-rspace" data-topico="${t.id}">${icone('layers', 13)} Importar experimentos do RSpace</button>
                                ${t.tarefas_concluidas.length ? `<button type="button" class="link-btn" data-acao="incluir-tarefas" data-topico="${t.id}">${icone('check-square', 13)} Incluir ${t.tarefas_concluidas.length === 1 ? '1 tarefa concluída' : `${t.tarefas_concluidas.length} tarefas concluídas`} no mês</button>` : ''}
                            </div>
                        </div>
                        <aside class="pta-editor-side">
                            <div class="pta-painel">
                                <h5><label for="${id('avanco-num')}">Avanço geral do tópico</label></h5>
                                <div class="range-field">
                                    <input type="range" id="${id('avanco')}" min="0" max="100" value="${valor}" aria-label="Avanço em porcentagem" data-acao-input="avanco-range" data-topico="${t.id}">
                                    <div class="num-suffix">
                                        <input type="number" id="${id('avanco-num')}" min="0" max="100" step="1" value="${valor}" inputmode="numeric" data-acao-input="avanco-num" data-topico="${t.id}">
                                        <span aria-hidden="true">%</span>
                                    </div>
                                </div>
                                <div class="pta-numeros mt-sm">
                                    <span>Último <strong>${t.ultimo_avanco}%</strong></span>
                                    <span>Esperado <strong>${t.esperado === null ? '—' : `${t.esperado}%`}</strong></span>
                                </div>
                                <p class="pta-avanco-aviso" id="${id('aviso')}" aria-live="polite"></p>
                            </div>
                            ${meu ? `
                                <div class="pta-painel">
                                    <h5>Conversa com a coordenação</h5>
                                    ${notasHTML(meu.notas) || '<p class="text-muted text-small">Nenhuma nota ainda.</p>'}
                                    <div class="pta-comentar mt-sm">
                                        <input type="text" class="form-control" id="${id('comentario')}" placeholder="Escreva uma nota" maxlength="2000" aria-label="Nova nota">
                                        <button type="button" class="btn btn-secondary btn-sm" data-acao="comentar" data-topico="${t.id}" data-relato="${meu.id}">Enviar</button>
                                    </div>
                                    <button type="button" class="link-btn muted mt-sm" data-acao="historico" data-relato="${meu.id}" data-titulo="${esc(t.titulo)}">Ver histórico do relato</button>
                                </div>` : ''}
                        </aside>
                    </div>
                    <div class="pta-editor-acoes">
                        <span class="pta-salvo-em">${meu ? `${STATUS[meu.status]?.rotulo || ''} · atualizado ${esc(dataHora(meu.atualizado_em))}` : 'Ainda não salvo'}</span>
                        <button type="button" class="btn btn-secondary" data-acao="fechar" data-topico="${t.id}">Fechar</button>
                        <button type="button" class="btn btn-secondary" data-acao="salvar" data-topico="${t.id}">Salvar rascunho</button>
                        <button type="button" class="btn btn-primary" data-acao="enviar" data-topico="${t.id}">${meu && meu.status === 'aguardando_aprovacao' ? 'Atualizar envio' : meu && meu.status === 'devolvido' ? 'Reenviar para avaliação' : 'Enviar para avaliação'}</button>
                    </div>
                </form>
            </td></tr>`;
    }

    function linhaLeitura(t) {
        const meu = t.meu;
        const conteudo = meu ? `
            <div class="pta-editor-grid">
                <div class="pta-editor-main">
                    <div class="pta-painel pta-anterior"><h5>O que foi feito em ${esc(mesAno(t.mes_anterior.mes, t.mes_anterior.ano).toLowerCase())}</h5>${mesAnteriorHTML(t.mes_anterior)}</div>
                    <div class="pta-painel"><h5>Seu relato de ${esc(nomeMes(P.mes).toLowerCase())}</h5>${descricaoHTML(meu.descricao_atividades)}</div>
                </div>
                <aside class="pta-editor-side">
                    <div class="pta-painel">
                        <h5>Aprovado</h5>
                        <div class="pta-numeros"><span>Avanço <strong>${meu.percentual_avanco}%</strong></span><span>${esc(meu.avaliado_por_nome || '')}</span></div>
                        <p class="text-muted text-small mt-sm">${esc(dataHora(meu.avaliado_em))}</p>
                    </div>
                    ${notasHTML(meu.notas)}
                    <button type="button" class="link-btn muted" data-acao="historico" data-relato="${meu.id}" data-titulo="${esc(t.titulo)}">Ver histórico do relato</button>
                </aside>
            </div>` : `
            <div class="note ok"><strong>Este tópico já chegou a 100%.</strong> Não é preciso relatar novos meses.</div>
            <div class="pta-painel mt-md"><h5>Meses aprovados</h5>
                ${t.historico.length ? `<ul class="pta-aprovados-lista">${t.historico.map(p => `<li><span>${esc(mesAno(p.mes, p.ano))}</span><strong>${p.avanco}%</strong></li>`).join('')}</ul>` : '<p class="text-muted text-small">Sem meses aprovados.</p>'}
            </div>`;
        return `<tr class="pta-editor-row"><td colspan="7"><div class="pta-editor">${conteudo}
            <div class="pta-editor-acoes"><button type="button" class="btn btn-secondary" data-acao="fechar" data-topico="${t.id}">Fechar</button></div></div></td></tr>`;
    }

    function topicoDaFolha(id) { return (P.dados?.topicos || []).find(t => t.id === Number(id)); }

    function prepararEditor(tid) {
        const form = document.getElementById(`pta-form-${tid}`);
        if (!form) return;
        window.Salvaguardas?.vincularRascunho(form, `pta-${P.ano}-${P.mes}-${tid}`);
        atualizarAvisoAvanco(tid);
        const primeiro = form.querySelector('textarea');
        if (primeiro && !primeiro.value) primeiro.focus({ preventScroll: true });
        form.closest('tr')?.previousElementSibling?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    function lerAvanco(tid) {
        const v = parseInt(document.getElementById(`pta-${tid}-avanco-num`)?.value, 10);
        return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;
    }

    function atualizarAvisoAvanco(tid) {
        const t = topicoDaFolha(tid);
        const aviso = document.getElementById(`pta-${tid}-aviso`);
        if (!t || !aviso) return;
        const v = lerAvanco(tid);
        const reduziu = v < t.ultimo_avanco;
        document.getElementById(`pta-${tid}-justificativa-grupo`)?.classList.toggle('hidden', !reduziu && !document.getElementById(`pta-${tid}-justificativa`)?.value.trim());
        let texto = '';
        let classe = 'text-muted';
        if (reduziu) { texto = `Menor que o último (${t.ultimo_avanco}%). Explique a redução no campo abaixo.`; classe = 'text-danger'; }
        else if (v === t.ultimo_avanco && t.ultimo_avanco > 0) { texto = 'Mesmo avanço do mês anterior.'; classe = 'text-warning'; }
        else if (t.esperado !== null && v < t.esperado - 15) { texto = `Abaixo do esperado para o mês (${t.esperado}%). Vale citar as dificuldades.`; classe = 'text-warning'; }
        aviso.className = `pta-avanco-aviso ${classe}`;
        aviso.textContent = texto;
    }

    function lerEditor(tid) {
        const partes = {};
        SECOES.forEach(s => { partes[s.chave] = document.getElementById(`pta-${tid}-${s.chave}`)?.value || ''; });
        return { partes, avanco: lerAvanco(tid) };
    }

    async function salvarTopico(tid, enviar, btn) {
        const t = topicoDaFolha(tid);
        if (!t) return;
        const { partes, avanco } = lerEditor(tid);
        if (enviar) {
            if (!partes.realizado.trim() && !partes.resultados.trim()) {
                window.UI.showToast('Descreva o que foi realizado no mês antes de enviar.', 'error');
                document.getElementById(`pta-${tid}-realizado`)?.focus();
                return;
            }
            if (avanco < t.ultimo_avanco && !partes.justificativa.trim()) {
                window.UI.showToast('Explique por que o avanço ficou menor que o último.', 'error');
                document.getElementById(`pta-${tid}-justificativa`)?.focus();
                return;
            }
            if (avanco === t.ultimo_avanco && t.ultimo_avanco > 0) {
                const ok = await window.UI.confirm(`O avanço informado (${avanco}%) é o mesmo do último relato deste tópico. Enviar assim mesmo?`, { title: 'Avanço repetido', confirmText: 'Enviar' });
                if (!ok) return;
            }
        }
        if (avanco >= t.ultimo_avanco) partes.justificativa = '';
        const payload = {
            topico_id: t.id, mes_referencia: P.mes, ano_referencia: P.ano,
            percentual_avanco: avanco, descricao_atividades: comporDescricao(partes),
            status: enviar ? 'aguardando_aprovacao' : 'rascunho',
        };
        await comBotao(btn, enviar ? 'Enviando' : 'Salvando', async () => {
            try {
                await req('/pta/salvar', { method: 'POST', json: payload });
                const form = document.getElementById(`pta-form-${tid}`);
                if (form) { delete form.dataset.sujo; window.Salvaguardas?.apagarRascunho(form); }
                window.UI.showToast(enviar ? 'Relato enviado para avaliação.' : 'Rascunho salvo.', 'success');
                if (enviar) P.aberto = null;
                await carregarFolha();
            } catch (err) { erroToast(err); }
        });
    }

    async function enviarRascunhos(btn) {
        const prontos = (P.dados?.topicos || []).filter(t => t.meu && t.meu.status === 'rascunho' && (t.meu.descricao_atividades || '').trim());
        if (!prontos.length) return;
        const ok = await window.UI.confirm(`Enviar para avaliação: ${prontos.map(t => t.titulo).join(', ')}.`, { title: `Enviar ${prontos.length} rascunho(s)?`, confirmText: 'Enviar' });
        if (!ok) return;
        await comBotao(btn, 'Enviando', async () => {
            try {
                const r = await req('/pta/salvar-lote', { method: 'POST', json: { itens: prontos.map(t => ({
                    topico_id: t.id, mes_referencia: P.mes, ano_referencia: P.ano,
                    percentual_avanco: t.meu.percentual_avanco, descricao_atividades: t.meu.descricao_atividades,
                    status: 'aguardando_aprovacao',
                })) } });
                if (r.erros.length) window.UI.showToast(`${r.salvos.length} enviado(s). Falhou: ${r.erros.map(e => e.erro).join('; ')}`, 'warning');
                else window.UI.showToast(`${r.salvos.length} relato(s) enviado(s) para avaliação.`, 'success');
                await carregarFolha();
            } catch (err) { erroToast(err); }
        });
    }

    async function podeSairDoEditor() {
        const form = P.aberto && document.getElementById(`pta-form-${P.aberto}`);
        if (!form || !form.dataset.sujo) return true;
        return window.UI.confirm('As alterações deste tópico ainda não foram salvas. Elas ficam guardadas neste navegador como rascunho local.', { title: 'Sair sem salvar?', confirmText: 'Sair', cancelText: 'Continuar editando' });
    }

    async function irParaMes(mes, ano, abrir = null) {
        if (!(await podeSairDoEditor())) return;
        const form = P.aberto && document.getElementById(`pta-form-${P.aberto}`);
        if (form) delete form.dataset.sujo;
        renderPTAPesquisador({ mes, ano, abrir });
    }

    function anexarTexto(textarea, texto) {
        if (!textarea) return;
        textarea.value = textarea.value.trim() ? `${textarea.value.trim()}\n${texto}` : texto;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.focus();
    }

    async function importarRSpace(tid, btn) {
        await comBotao(btn, 'Consultando o RSpace', async () => {
            try {
                const data = await req(`/rspace/documents?mes=${P.mes}&ano=${P.ano}&limit=30`);
                const docs = data.documents || [];
                if (!docs.length) { window.UI.showToast(`Nenhum experimento seu foi modificado no RSpace em ${nomeMes(P.mes).toLowerCase()}.`, 'warning'); return; }
                const linhas = docs.map(d => `• [${d.global_id}] ${d.titulo}${d.tags && d.tags.length ? ` (${d.tags.join(', ')})` : ''}`);
                anexarTexto(document.getElementById(`pta-${tid}-realizado`), linhas.join('\n'));
                window.UI.showToast(`${docs.length} experimento(s) incluído(s) em “Realizado”. Revise antes de enviar.`, 'success');
            } catch (err) { erroToast(err); }
        });
    }

    function aoClicarFolha(e) {
        const alvo = e.target.closest('[data-acao]');
        if (!alvo || alvo.dataset.acaoInput) return;
        const acao = alvo.dataset.acao;
        const tid = Number(alvo.dataset.topico);
        if (acao === 'alternar') {
            if (e.target.closest('.pta-editor')) return;
            e.preventDefault();
            (async () => {
                if (P.aberto === tid) { if (await podeSairDoEditor()) { P.aberto = null; renderFolha(); } return; }
                if (!(await podeSairDoEditor())) return;
                P.aberto = tid;
                renderFolha();
            })();
        } else if (acao === 'fechar') {
            (async () => { if (await podeSairDoEditor()) { P.aberto = null; renderFolha(); } })();
        } else if (acao === 'salvar') salvarTopico(tid, false, alvo);
        else if (acao === 'enviar') salvarTopico(tid, true, alvo);
        else if (acao === 'enviar-rascunhos') enviarRascunhos(alvo);
        else if (acao === 'mes-folha') { const n = somarMes(P.mes, P.ano, Number(alvo.dataset.delta)); irParaMes(n.mes, n.ano); }
        else if (acao === 'mes-atual') { const h = hoje(); irParaMes(h.mes, h.ano); }
        else if (acao === 'ir-coordenacao') renderPTACoordenador();
        else if (acao === 'corrigir') irParaMes(Number(alvo.dataset.mes), Number(alvo.dataset.ano), tid);
        else if (acao === 'historico') abrirHistorico(Number(alvo.dataset.relato), alvo.dataset.titulo || 'Relato');
        else if (acao === 'importar-rspace') importarRSpace(tid, alvo);
        else if (acao === 'copiar-plano') {
            anexarTexto(document.getElementById(`pta-${tid}-realizado`), document.getElementById(`pta-${tid}-plano`)?.content.textContent || '');
        } else if (acao === 'incluir-tarefas') {
            const t = topicoDaFolha(tid);
            const linhas = t.tarefas_concluidas.map(x => `• ${x.titulo}${x.resultado ? ` — ${x.resultado}` : ''}`);
            anexarTexto(document.getElementById(`pta-${tid}-resultados`), linhas.join('\n'));
        } else if (acao === 'comentar') {
            const input = document.getElementById(`pta-${tid}-comentario`);
            const texto = input?.value.trim();
            if (!texto) return;
            comBotao(alvo, '', async () => {
                try {
                    await req(`/pta/relatorios/${alvo.dataset.relato}/notas`, { method: 'POST', json: { texto } });
                    input.value = '';
                    window.UI.showToast('Nota enviada.', 'success');
                    const form = document.getElementById(`pta-form-${tid}`);
                    const sujo = form?.dataset.sujo;
                    if (!sujo) await carregarFolha();
                } catch (err) { erroToast(err); }
            });
        }
    }

    function aoDigitarFolha(e) {
        const el = e.target;
        const tipo = el.dataset.acaoInput;
        if (!tipo) return;
        const tid = el.dataset.topico;
        const range = document.getElementById(`pta-${tid}-avanco`);
        const num = document.getElementById(`pta-${tid}-avanco-num`);
        if (tipo === 'avanco-range') num.value = range.value;
        else if (num.value !== '') range.value = Math.max(0, Math.min(100, Number(num.value)));
        atualizarAvisoAvanco(tid);
    }

    // ==========================================
    // COORDENAÇÃO
    // ==========================================
    const G = { aba: 'avaliar', mes: null, ano: null, anoVisao: null, dados: null, resumo: null, selecionados: new Set(), recentes: new Map(), painel: null, equipe: null, previa: null };
    const ABAS = [
        { id: 'avaliar', rotulo: 'Avaliar' },
        { id: 'ano', rotulo: 'Visão do ano' },
        { id: 'topicos', rotulo: 'Tópicos' },
        { id: 'dados', rotulo: 'Importar e exportar' },
    ];

    async function renderPTACoordenador(opcoes = {}) {
        const h = hoje();
        G.aba = opcoes.aba || G.aba || 'avaliar';
        G.anoVisao = G.anoVisao || h.ano;
        const main = document.getElementById('dynamic-content');
        main.innerHTML = `
            <div id="pta-raiz-gestao">
                <header class="page-head fade-in">
                    <div>
                        <p class="eyebrow">coordenação</p>
                        <h1>Planejamento mensal</h1>
                        <p class="lede">Avalie os relatos do mês, acompanhe quem falta e feche o texto consolidado.</p>
                    </div>
                    <div class="page-actions">
                        <button type="button" class="btn btn-secondary btn-sm" data-acao="ir-folha">Preencher meu PTA</button>
                    </div>
                    <nav class="tabs" role="tablist" aria-label="Seções do planejamento">
                        ${ABAS.map(a => `<button type="button" class="tab-btn${G.aba === a.id ? ' active' : ''}" role="tab" aria-selected="${G.aba === a.id}" data-acao="aba" data-aba="${a.id}">${a.rotulo}${a.id === 'avaliar' ? '<span class="tab-count hidden" id="pta-contador-fila"></span>' : ''}</button>`).join('')}
                    </nav>
                </header>
                <div id="pta-gestao-conteudo" class="fade-in">${window.UI.loading()}</div>
            </div>`;
        const raiz = document.getElementById('pta-raiz-gestao');
        raiz.addEventListener('click', aoClicarGestao);
        raiz.addEventListener('change', aoMudarGestao);

        if (!G.mes) {
            // Abre no mês mais recente com relatos esperando avaliação (geralmente o anterior, no começo do mês).
            G.mes = h.mes; G.ano = h.ano;
            try {
                const resumo = await req(`/pta/chefia/resumo-ano?ano=${h.ano}`);
                const comFila = resumo.filter(m => m.mes <= h.mes && m.aguardando > 0).map(m => m.mes);
                if (comFila.length && !resumo[h.mes - 1].aguardando) G.mes = comFila[comFila.length - 1];
            } catch (e) { /* segue no mês atual */ }
        }
        if (opcoes.mes) { G.mes = opcoes.mes; G.ano = opcoes.ano; }
        renderAba();
    }

    function renderAba() {
        document.querySelectorAll('#pta-raiz-gestao .tab-btn').forEach(b => {
            const ativa = b.dataset.aba === G.aba;
            b.classList.toggle('active', ativa);
            b.setAttribute('aria-selected', String(ativa));
        });
        const alvo = document.getElementById('pta-gestao-conteudo');
        if (!alvo) return;
        alvo.innerHTML = window.UI.loading();
        if (G.aba === 'avaliar') carregarAvaliacao();
        else if (G.aba === 'ano') carregarAno();
        else if (G.aba === 'topicos') carregarTopicos();
        else renderDados();
    }

    // ---------- AVALIAR ----------
    async function carregarAvaliacao() {
        try {
            G.dados = await req(`/pta/chefia/mes?mes=${G.mes}&ano=${G.ano}`);
            renderAvaliacao();
        } catch (err) {
            const alvo = document.getElementById('pta-gestao-conteudo');
            if (alvo) alvo.innerHTML = window.UI.errorState(esc(err.message));
        }
    }

    function topicosVisiveis(d) {
        const comRelato = new Set(d.relatos.map(r => r.topico_id));
        return d.topicos.filter(t => t.no_periodo || comRelato.has(t.id));
    }

    function pessoasSemRelato(d) {
        const relataram = new Set(d.relatos.map(r => r.usuario_id));
        return d.pessoas.filter(p => p.esperado && !relataram.has(p.id));
    }

    function renderAvaliacao() {
        const d = G.dados;
        const alvo = document.getElementById('pta-gestao-conteudo');
        if (!alvo || !d) return;
        const fila = d.relatos.filter(r => r.status === 'aguardando_aprovacao');
        const aprovados = d.relatos.filter(r => r.status === 'consolidado');
        const devolvidos = d.relatos.filter(r => r.status === 'devolvido');
        const semRelato = pessoasSemRelato(d);
        const esperados = d.pessoas.filter(p => p.esperado).length;
        G.selecionados = new Set([...G.selecionados].filter(id => fila.some(r => r.id === id)));

        const cont = document.getElementById('pta-contador-fila');
        if (cont) { cont.textContent = fila.length; cont.classList.toggle('hidden', !fila.length); }

        alvo.innerHTML = `
            <div class="pta-toolbar">
                ${navMes('mes-gestao', G.mes, G.ano)}
                <div class="cluster">
                    ${semRelato.length ? `<button type="button" class="btn btn-secondary btn-sm" data-acao="cobrar">${icone('clock', 14)} Cobrar quem falta (${semRelato.length})</button>` : ''}
                </div>
            </div>
            <div class="figures">
                <div class="figure"><span class="v">${fila.length}</span><span class="k">aguardando avaliação</span></div>
                <div class="figure"><span class="v">${aprovados.length}</span><span class="k">aprovados</span></div>
                <div class="figure${devolvidos.length ? ' tone-danger' : ''}"><span class="v">${devolvidos.length}</span><span class="k">devolvidos, aguardando correção</span></div>
                <div class="figure${semRelato.length ? ' tone-warning' : ''}"><span class="v">${esperados - semRelato.length}/${esperados}</span><span class="k">pessoas que já relataram</span></div>
            </div>

            <section class="pta-secao">
                <div class="section-head"><h3>Aguardando avaliação</h3><p class="meta">agrupado por tópico</p></div>
                <div id="pta-fila">${renderFila(d, fila)}</div>
            </section>

            <section class="pta-secao">
                <div class="section-head"><h3>Quem já relatou</h3><p class="meta">pessoas × tópicos em ${esc(nomeMes(G.mes).toLowerCase())}</p></div>
                ${renderMatriz(d)}
            </section>

            <section class="pta-secao">
                <div class="section-head">
                    <h3>Aprovados e texto consolidado</h3>
                    ${aprovados.length ? '<button type="button" class="btn btn-secondary btn-sm" data-acao="gerar-todas">' + icone('sparkles', 14) + ' Gerar textos que faltam</button>' : ''}
                </div>
                ${renderAprovados(d, aprovados)}
            </section>

            ${devolvidos.length ? `
                <section class="pta-secao">
                    <div class="section-head"><h3>Devolvidos</h3><p class="meta">o autor já foi avisado por e-mail</p></div>
                    <div class="table-container"><table class="data-table"><thead><tr><th>Pessoa</th><th>Tópico</th><th>Motivo</th><th class="end"></th></tr></thead><tbody>
                        ${devolvidos.map(r => {
                            const t = d.topicos.find(x => x.id === r.topico_id);
                            const motivo = (r.notas || []).filter(n => n.da_chefia).pop();
                            return `<tr><td>${window.UI.avatar(r.usuario_nome || '', { strong: true })}</td><td>${esc(t?.titulo || '')}</td>
                                <td><span class="truncate" title="${esc(motivo?.texto || '')}">${esc(motivo?.texto || '—')}</span></td>
                                <td class="end"><button type="button" class="link-btn muted" data-acao="historico" data-relato="${r.id}" data-titulo="${esc(t?.titulo || '')}">Histórico</button></td></tr>`;
                        }).join('')}
                    </tbody></table></div>
                </section>` : ''}`;
    }

    function renderFila(d, fila) {
        const recentes = d.relatos.filter(r => G.recentes.has(r.id) && r.status === 'consolidado');
        if (!fila.length && !recentes.length) {
            return window.UI.emptyState({ title: 'Nada aguardando avaliação', description: `Nenhum relato de ${nomeMes(G.mes).toLowerCase()} está na fila.` });
        }
        const total = fila.length;
        const sel = G.selecionados.size;
        let html = total ? `
            <div class="pta-bulk">
                <label class="check-inline"><input type="checkbox" data-acao-change="selecionar-todos" ${sel && sel === total ? 'checked' : ''}> Selecionar todos</label>
                <span>${sel ? `${sel} selecionado${sel > 1 ? 's' : ''}` : `${total} na fila`}</span>
                <button type="button" class="btn btn-primary btn-sm" data-acao="aprovar-selecionados" ${sel ? '' : 'disabled'}>Aprovar selecionados</button>
                <span class="pta-atalhos"><kbd>J</kbd>/<kbd>K</kbd> navegar · <kbd>X</kbd> selecionar · <kbd>A</kbd> aprovar · <kbd>D</kbd> devolver</span>
            </div>` : '';
        topicosVisiveis(d).concat(d.topicos.filter(t => !topicosVisiveis(d).includes(t))).forEach(t => {
            const doTopico = fila.filter(r => r.topico_id === t.id);
            const recentesDoTopico = recentes.filter(r => r.topico_id === t.id);
            if (!doTopico.length && !recentesDoTopico.length) return;
            html += `
                <div class="pta-grupo">
                    <div class="pta-grupo-head">
                        <h4>${esc(t.titulo)}</h4>
                        <span class="meta">aprovado até agora ${t.avanco_anterior}%${t.esperado !== null ? ` · esperado para o mês ${t.esperado}%` : ''}${t.prazo_vencido ? ' · <span class="text-danger">prazo vencido</span>' : ''}</span>
                    </div>
                    ${(t.mes_anterior?.relatos || []).length ? `
                    <details class="pta-anterior-detalhes">
                        <summary>O que foi feito em ${esc(mesAno(t.mes_anterior.mes, t.mes_anterior.ano).toLowerCase())}</summary>
                        <div class="pta-painel pta-anterior">${mesAnteriorHTML(t.mes_anterior)}</div>
                    </details>` : `<p class="pta-anterior-detalhes">${mesAnteriorHTML(t.mes_anterior)}</p>`}
                    ${doTopico.map(r => cartaoAvaliacao(r)).join('')}
                    ${recentesDoTopico.map(r => `
                        <div class="pta-desfeito" role="status">
                            <span>${icone('check-circle', 14)} Aprovado: <strong>${esc(r.usuario_nome || '')}</strong> · ${r.percentual_avanco}%</span>
                            <button type="button" class="link-btn" data-acao="desfazer" data-relato="${r.id}">Desfazer</button>
                        </div>`).join('')}
                </div>`;
        });
        return html;
    }

    function cartaoAvaliacao(r) {
        const selecionado = G.selecionados.has(r.id);
        return `
            <article class="entry pta-avaliacao${selecionado ? ' is-selected' : ''}" tabindex="0" data-relato="${r.id}">
                <div class="entry-head">
                    <span class="cluster">
                        <input type="checkbox" data-acao-change="selecionar" data-relato="${r.id}" ${selecionado ? 'checked' : ''} aria-label="Selecionar relato de ${esc(r.usuario_nome || '')}">
                        ${window.UI.avatar(r.usuario_nome || '', { strong: true })}
                    </span>
                    <span class="cluster"><span class="mono">Avanço <strong>${r.percentual_avanco}%</strong></span>${abaixoDoEsperado(r.percentual_avanco, r.esperado) ? `<span class="badge badge-warning" title="Esperado para o mês: ${r.esperado}%">abaixo do esperado</span>` : ''}</span>
                </div>
                <div class="entry-body">${descricaoHTML(r.descricao_atividades, (r.descricao_atividades || '').length > 420)}</div>
                ${(r.descricao_atividades || '').length > 420 ? '<button type="button" class="link-btn muted" data-acao="expandir">Ler tudo</button>' : ''}
                ${notasHTML(r.notas)}
                <div class="entry-foot">
                    <span class="meta">enviado ${esc(dataHora(r.enviado_em))}</span>
                    <span class="cluster">
                        <button type="button" class="link-btn muted" data-acao="historico" data-relato="${r.id}" data-titulo="${esc(r.usuario_nome || '')}">Histórico</button>
                        <button type="button" class="link-btn danger" data-acao="devolver" data-relato="${r.id}">Devolver</button>
                        <button type="button" class="btn btn-primary btn-sm" data-acao="aprovar" data-relato="${r.id}">Aprovar</button>
                    </span>
                </div>
            </article>`;
    }

    function renderMatriz(d) {
        const topicos = topicosVisiveis(d);
        if (!d.pessoas.length || !topicos.length) return window.UI.emptyState({ title: 'Sem pessoas ou tópicos para este mês' });
        const porCelula = new Map(d.relatos.map(r => [`${r.usuario_id}:${r.topico_id}`, r]));
        const rascunhos = new Set(d.rascunhos.map(r => `${r.usuario_id}:${r.topico_id}`));
        const linhas = d.pessoas.map(p => {
            let devidos = 0;
            let feitos = 0;
            const celulas = topicos.map(t => {
                const k = `${p.id}:${t.id}`;
                const r = porCelula.get(k);
                const participa = !t.membros.length || t.membros.includes(p.id);
                if (participa && t.no_periodo) { devidos++; if (r) feitos++; }
                if (r) return `<td class="pta-cel-td"><span class="pta-cel is-${r.status}" title="${esc(`${t.titulo}: ${STATUS[r.status].rotulo} · ${r.percentual_avanco}%`)}">${r.percentual_avanco}</span></td>`;
                if (rascunhos.has(k)) return `<td class="pta-cel-td"><span class="pta-cel is-rascunho" title="${esc(`${t.titulo}: rascunho não enviado`)}">…</span></td>`;
                if (!participa) return `<td class="pta-cel-td"><span class="pta-cel is-fora" title="Não participa deste tópico">·</span></td>`;
                return `<td class="pta-cel-td"><span class="pta-cel" title="${esc(`${t.titulo}: sem relato`)}">—</span></td>`;
            }).join('');
            const nenhum = !d.relatos.some(r => r.usuario_id === p.id);
            return `<tr>
                <td>${window.UI.avatar(p.nome, { strong: true })}</td>${celulas}
                <td class="end">${p.esperado && nenhum ? `<button type="button" class="link-btn" data-acao="cobrar" data-usuario="${p.id}">Cobrar</button>` : `<span class="text-muted text-small tabular">${feitos}/${devidos}</span>`}</td>
            </tr>`;
        }).join('');
        return `
            <div class="table-container pta-matriz-wrap">
                <table class="data-table pta-matriz">
                    <thead><tr><th>Pessoa</th>${topicos.map(t => `<th class="pta-col-topico" title="${esc(t.titulo)}">${esc(t.titulo)}</th>`).join('')}<th class="end">Relatos</th></tr></thead>
                    <tbody>${linhas}</tbody>
                </table>
            </div>
            <div class="pta-legenda" aria-hidden="true">
                <span><span class="pta-cel is-consolidado">70</span> aprovado</span>
                <span><span class="pta-cel is-aguardando_aprovacao">70</span> aguardando</span>
                <span><span class="pta-cel is-devolvido">70</span> devolvido</span>
                <span><span class="pta-cel is-rascunho">…</span> rascunho</span>
                <span><span class="pta-cel">—</span> sem relato</span>
                <span><span class="pta-cel is-fora">·</span> não participa</span>
            </div>`;
    }

    function renderAprovados(d, aprovados) {
        if (!aprovados.length) return window.UI.emptyState({ title: 'Nenhum relato aprovado neste mês', description: 'O texto consolidado é gerado a partir dos relatos aprovados.' });
        const sinteses = new Map(d.sinteses.map(s => [s.topico_id, s]));
        return d.topicos.filter(t => aprovados.some(r => r.topico_id === t.id)).map(t => {
            const doTopico = aprovados.filter(r => r.topico_id === t.id);
            const s = sinteses.get(t.id);
            return `
                <div class="pta-grupo pta-sintese" data-topico="${t.id}">
                    <div class="pta-grupo-head"><h4>${esc(t.titulo)}</h4><span class="meta">avanço aprovado ${Math.max(...doTopico.map(r => r.percentual_avanco))}%</span></div>
                    <ul class="pta-aprovados-lista">${doTopico.map(r => `<li><span>${esc(r.usuario_nome || '')}</span><span class="tabular">${r.percentual_avanco}%</span></li>`).join('')}</ul>
                    ${s ? `
                        <label class="sr-only" for="pta-sintese-${t.id}">Texto consolidado de ${esc(t.titulo)}</label>
                        <textarea id="pta-sintese-${t.id}" class="form-control">${esc(s.texto)}</textarea>
                        <div class="pta-sintese-acoes">
                            <label class="check-inline"><input type="checkbox" id="pta-sintese-final-${t.id}" ${s.final ? 'checked' : ''}> Versão final (vai para a planilha exportada)</label>
                            <span class="text-muted text-small">gerado por IA · revise · salvo ${esc(dataHora(s.atualizado_em))}</span>
                            <span class="cluster push-end">
                                <button type="button" class="link-btn muted" data-acao="copiar-sintese" data-topico="${t.id}">Copiar</button>
                                <button type="button" class="link-btn" data-acao="gerar-sintese" data-topico="${t.id}">Gerar novamente</button>
                                <button type="button" class="btn btn-secondary btn-sm" data-acao="salvar-sintese" data-topico="${t.id}">Salvar</button>
                            </span>
                        </div>` : `
                        <button type="button" class="btn btn-secondary btn-sm" data-acao="gerar-sintese" data-topico="${t.id}">${icone('sparkles', 14)} Gerar texto consolidado</button>`}
                </div>`;
        }).join('');
    }

    async function aprovar(id) {
        try {
            await req(`/pta/chefia/avaliar/${id}`, { method: 'PUT', json: { aprovado: true } });
            G.recentes.set(id, Date.now());
            G.selecionados.delete(id);
            await recarregarFilaMantendoFoco(id);
        } catch (err) { erroToast(err); carregarAvaliacao(); }
    }

    async function recarregarFilaMantendoFoco(idAnterior) {
        const cartoes = Array.from(document.querySelectorAll('.pta-avaliacao'));
        const pos = cartoes.findIndex(c => Number(c.dataset.relato) === idAnterior);
        await carregarAvaliacao();
        const novos = Array.from(document.querySelectorAll('.pta-avaliacao'));
        (novos[Math.min(Math.max(pos, 0), novos.length - 1)] || null)?.focus({ preventScroll: false });
    }

    async function aprovarSelecionados(btn) {
        const ids = [...G.selecionados];
        if (!ids.length) return;
        await comBotao(btn, 'Aprovando', async () => {
            try {
                const r = await req('/pta/chefia/aprovar-lote', { method: 'POST', json: { ids } });
                r.aprovados.forEach(id => G.recentes.set(id, Date.now()));
                G.selecionados.clear();
                window.UI.showToast(`${r.aprovados.length} relato(s) aprovado(s).${r.ignorados.length ? ` ${r.ignorados.length} já tinham sido avaliados.` : ''}`, 'success');
                await carregarAvaliacao();
            } catch (err) { erroToast(err); }
        });
    }

    function abrirDevolucao(id) {
        const r = G.dados.relatos.find(x => x.id === id);
        const modal = abrirModal({
            id: 'pta-devolucao', eyebrow: 'devolver para ajuste', titulo: r ? `Relato de ${r.usuario_nome}` : 'Devolver relato', tamanho: 'modal-sm',
            corpo: `
                <p class="dialog-text mb-md">A observação vai por e-mail para o autor e aparece no topo da folha dele.</p>
                <div class="pta-motivos">${MOTIVOS_RAPIDOS.map((m, i) => `<button type="button" class="check-chip" data-motivo="${i}">${esc(m)}</button>`).join('')}</div>
                <label for="pta-motivo-texto">O que precisa ser ajustado</label>
                <textarea id="pta-motivo-texto" class="form-control" rows="4" maxlength="4000" placeholder="Ex.: detalhe a curva de temperatura do experimento 2"></textarea>`,
            rodape: `<button type="button" class="btn btn-secondary" data-role="cancel">Cancelar</button><button type="button" class="btn btn-danger" id="pta-confirmar-devolucao">Devolver</button>`,
        });
        const campo = modal.querySelector('#pta-motivo-texto');
        modal.querySelectorAll('[data-motivo]').forEach(b => b.addEventListener('click', () => {
            const texto = MOTIVOS_RAPIDOS[Number(b.dataset.motivo)];
            campo.value = campo.value.includes(texto) ? campo.value : (campo.value.trim() ? `${campo.value.trim()} ${texto}` : texto);
            campo.focus();
        }));
        setTimeout(() => campo.focus(), 50);
        modal.querySelector('#pta-confirmar-devolucao').addEventListener('click', (e) => {
            const motivo = campo.value.trim();
            if (!motivo) { window.UI.showToast('Escreva o que precisa ser ajustado.', 'error'); campo.focus(); return; }
            comBotao(e.currentTarget, 'Devolvendo', async () => {
                try {
                    await req(`/pta/chefia/avaliar/${id}`, { method: 'PUT', json: { aprovado: false, motivo } });
                    modal.remove();
                    window.UI.showToast('Relato devolvido. O autor foi avisado.', 'success');
                    await recarregarFilaMantendoFoco(id);
                } catch (err) { erroToast(err); }
            });
        });
    }

    async function cobrar(usuarioId, btn) {
        const faltam = pessoasSemRelato(G.dados);
        const alvo = usuarioId ? faltam.filter(p => p.id === usuarioId) : faltam;
        if (!alvo.length) return;
        const ok = await window.UI.confirm(`Enviar lembrete por e-mail para: ${alvo.map(p => p.nome).join(', ')}. Cada pessoa recebe no máximo um lembrete por dia.`, { title: 'Cobrar relato do mês?', confirmText: 'Enviar lembrete' });
        if (!ok) return;
        await comBotao(btn, 'Enviando', async () => {
            try {
                const r = await req('/pta/chefia/cobrar', { method: 'POST', json: { mes: G.mes, ano: G.ano, usuario_ids: alvo.map(p => p.id) } });
                const partes = [];
                if (r.enviados.length) partes.push(`Lembrete enviado para ${r.enviados.length} pessoa(s).`);
                if (r.ja_cobrados_hoje.length) partes.push(`Já cobrados hoje: ${r.ja_cobrados_hoje.join(', ')}.`);
                window.UI.showToast(partes.join(' ') || 'Ninguém para cobrar (sem e-mail verificado).', r.enviados.length ? 'success' : 'warning');
            } catch (err) { erroToast(err); }
        });
    }

    async function gerarSintese(tid, btn, silencioso = false) {
        return comBotao(btn, 'Gerando', async () => {
            try {
                await req(`/pta/chefia/sintetizar?topico_id=${tid}&mes=${G.mes}&ano=${G.ano}`, { method: 'POST' });
                if (!silencioso) { window.UI.showToast('Texto consolidado gerado. Revise antes de marcar como final.', 'success'); await carregarAvaliacao(); }
                return true;
            } catch (err) { erroToast(err); return false; }
        });
    }

    async function gerarTodas(btn) {
        const comSintese = new Set(G.dados.sinteses.map(s => s.topico_id));
        const faltam = [...new Set(G.dados.relatos.filter(r => r.status === 'consolidado').map(r => r.topico_id))].filter(t => !comSintese.has(t));
        if (!faltam.length) { window.UI.showToast('Todos os tópicos aprovados já têm texto.', 'info'); return; }
        await comBotao(btn, `Gerando ${faltam.length}`, async () => {
            let ok = 0;
            for (const tid of faltam) { if (await gerarSintese(tid, null, true)) ok++; }
            window.UI.showToast(`${ok} de ${faltam.length} texto(s) gerado(s).`, ok === faltam.length ? 'success' : 'warning');
            await carregarAvaliacao();
        });
    }

    async function salvarSintese(tid, btn) {
        const texto = document.getElementById(`pta-sintese-${tid}`)?.value || '';
        const final = !!document.getElementById(`pta-sintese-final-${tid}`)?.checked;
        await comBotao(btn, 'Salvando', async () => {
            try {
                await req('/pta/chefia/sinteses', { method: 'PUT', json: { topico_id: tid, mes: G.mes, ano: G.ano, texto, final } });
                const area = document.getElementById(`pta-sintese-${tid}`);
                const form = area?.closest('form');
                if (form) delete form.dataset.sujo;
                window.UI.showToast(final ? 'Texto salvo como versão final.' : 'Texto salvo.', 'success');
            } catch (err) { erroToast(err); }
        });
    }

    // Atalhos de teclado da fila (só quando a fila está na tela e o foco não está num campo).
    if (!window.__ptaAtalhos) {
        window.__ptaAtalhos = true;
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
            if (!document.getElementById('pta-fila') || document.querySelector('.modal-overlay[style*="flex"]')) return;
            if (e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
            const tecla = e.key.toLowerCase();
            if (!['j', 'k', 'a', 'd', 'x'].includes(tecla)) return;
            const cartoes = Array.from(document.querySelectorAll('.pta-avaliacao'));
            if (!cartoes.length) return;
            const atual = e.target.closest('.pta-avaliacao');
            const i = cartoes.indexOf(atual);
            e.preventDefault();
            if (tecla === 'j') (cartoes[i + 1] || cartoes[i < 0 ? 0 : i])?.focus();
            else if (tecla === 'k') (cartoes[i - 1] || cartoes[0])?.focus();
            else if (!atual) cartoes[0].focus();
            else if (tecla === 'a') aprovar(Number(atual.dataset.relato));
            else if (tecla === 'd') abrirDevolucao(Number(atual.dataset.relato));
            else if (tecla === 'x') alternarSelecao(Number(atual.dataset.relato));
        });
    }

    function alternarSelecao(id, marcar) {
        const deve = marcar === undefined ? !G.selecionados.has(id) : marcar;
        if (deve) G.selecionados.add(id); else G.selecionados.delete(id);
        const fila = G.dados.relatos.filter(r => r.status === 'aguardando_aprovacao');
        const foco = document.activeElement?.closest('.pta-avaliacao')?.dataset.relato;
        document.getElementById('pta-fila').innerHTML = renderFila(G.dados, fila);
        if (foco) document.querySelector(`.pta-avaliacao[data-relato="${foco}"]`)?.focus();
    }

    // ---------- VISÃO DO ANO ----------
    async function carregarAno() {
        const alvo = document.getElementById('pta-gestao-conteudo');
        try {
            const [resumo, painel] = await Promise.all([req(`/pta/chefia/resumo-ano?ano=${G.anoVisao}`), req('/pta/topicos/painel')]);
            G.resumo = resumo; G.painel = painel;
            if (!alvo?.isConnected) return;
            const h = hoje();
            const cartoes = resumo.map(m => {
                const futuro = chave(G.anoVisao, m.mes) > chave(h.ano, h.mes);
                const atual = G.anoVisao === h.ano && m.mes === h.mes;
                return `
                    <button type="button" class="pta-ano-mes${atual ? ' is-atual' : ''}${futuro ? ' is-futuro' : ''}" ${futuro ? 'disabled' : `data-acao="abrir-mes" data-mes="${m.mes}"`} aria-label="${esc(mesAno(m.mes, G.anoVisao))}">
                        <span class="pta-ano-nome">${esc(nomeMes(m.mes))}</span>
                        ${futuro ? '<span class="pta-ano-linha"><span>—</span></span>' : `
                            <span class="pta-ano-linha"><span>Aprovados</span><span>${m.aprovados}</span></span>
                            <span class="pta-ano-linha${m.aguardando ? ' is-pendente' : ''}"><span>Aguardando</span><span>${m.aguardando}</span></span>
                            ${m.devolvidos ? `<span class="pta-ano-linha is-alerta"><span>Devolvidos</span><span>${m.devolvidos}</span></span>` : ''}
                            <span class="pta-ano-linha${m.faltam ? ' is-alerta' : ''}"><span>Relataram</span><span>${m.relataram}/${m.esperados}</span></span>`}
                    </button>`;
            }).join('');
            const topicosAno = painel.filter(t => t.ano === G.anoVisao);
            alvo.innerHTML = `
                <div class="pta-toolbar">
                    <div class="year-nav">
                        <button type="button" class="icon-btn" data-acao="ano-visao" data-delta="-1" aria-label="Ano anterior">${icone('chevron-left', 16)}</button>
                        <span class="mono">${G.anoVisao}</span>
                        <button type="button" class="icon-btn" data-acao="ano-visao" data-delta="1" aria-label="Próximo ano">${icone('chevron-right', 16)}</button>
                    </div>
                    <span class="text-muted text-small">Clique em um mês para avaliar</span>
                </div>
                <div class="pta-ano-grid">${cartoes}</div>
                <section class="pta-secao">
                    <div class="section-head"><h3>Avanço dos tópicos em ${G.anoVisao}</h3><p class="meta">previsto: avanço linear até o fim do prazo</p></div>
                    ${topicosAno.length ? tabelaAvancoTopicos(topicosAno, false) : window.UI.emptyState({ title: `Nenhum tópico cadastrado para ${G.anoVisao}` })}
                </section>`;
        } catch (err) {
            if (alvo) alvo.innerHTML = window.UI.errorState(esc(err.message));
        }
    }

    const SITUACAO = {
        concluido: { rotulo: 'Concluído', classe: 'badge-success' },
        em_dia: { rotulo: 'Em dia', classe: 'badge-info' },
        abaixo: { rotulo: 'Abaixo do previsto', classe: 'badge-warning' },
        atrasado: { rotulo: 'Prazo vencido', classe: 'badge-danger' },
        sem_prazo: { rotulo: 'Sem prazo', classe: '' },
    };

    function tabelaAvancoTopicos(lista, comAcoes) {
        return `
            <div class="table-container"><table class="data-table">
                <thead><tr>
                    <th>Tópico</th>${comAcoes ? '<th>Membros</th>' : ''}<th class="num">Avanço</th><th class="num col-hide-xs">Previsto hoje</th><th>Situação</th>${comAcoes ? '<th class="end"><span class="sr-only">Ações</span></th>' : ''}
                </tr></thead>
                <tbody>${lista.map(t => `
                    <tr data-topico-linha="${t.id}">
                        <td><strong>${esc(t.titulo)}</strong><span class="pta-topico-sub">${esc(prazoTopico(t))} · ${t.qtd_relatos} relato${t.qtd_relatos === 1 ? '' : 's'}</span></td>
                        ${comAcoes ? `<td>${t.membros.length ? window.UI.avatarStack(t.membros, 3) : '<span class="text-muted text-small">Toda a equipe</span>'}</td>` : ''}
                        <td class="num"><strong>${t.avanco}%</strong></td>
                        <td class="num col-hide-xs">${t.esperado === null ? '—' : `${t.esperado}%`}</td>
                        <td><span class="badge ${SITUACAO[t.situacao]?.classe || ''}">${SITUACAO[t.situacao]?.rotulo || ''}</span></td>
                        ${comAcoes ? `<td class="end"><span class="row-actions">
                            <button type="button" class="link-btn" data-acao="membros" data-topico="${t.id}">Membros</button>
                            <button type="button" class="link-btn" data-acao="editar-topico" data-topico="${t.id}">Editar</button>
                            ${ehAdmin() ? `<button type="button" class="link-btn danger" data-acao="excluir-topico" data-topico="${t.id}">Excluir</button>` : ''}
                        </span></td>` : ''}
                    </tr>`).join('')}
                </tbody>
            </table></div>`;
    }

    // ---------- TÓPICOS ----------
    async function carregarTopicos() {
        const alvo = document.getElementById('pta-gestao-conteudo');
        try {
            G.painel = await req('/pta/topicos/painel');
            if (!alvo?.isConnected) return;
            const anos = [...new Set(G.painel.map(t => t.ano))].sort((a, b) => b - a);
            const anoFiltro = G.topicosAno && anos.includes(G.topicosAno) ? G.topicosAno : (anos.includes(hoje().ano) ? hoje().ano : 'todos');
            G.topicosAno = anoFiltro;
            alvo.innerHTML = `
                <div class="pta-toolbar">
                    <span class="result-count" id="pta-topicos-contador"></span>
                    <div class="cluster">
                        <input type="search" class="form-control" id="pta-topicos-busca" placeholder="Buscar tópico" aria-label="Buscar tópico">
                        <select class="form-control" id="pta-topicos-ano" aria-label="Filtrar por ano">
                            <option value="todos">Todos os anos</option>
                            ${anos.map(a => `<option value="${a}" ${a === anoFiltro ? 'selected' : ''}>${a}</option>`).join('')}
                        </select>
                        <button type="button" class="btn btn-primary btn-sm" data-acao="novo-topico">${icone('plus', 14)} Novo tópico</button>
                    </div>
                </div>
                <div id="pta-topicos-tabela"></div>
                <p class="help mt-sm">Tópico sem membros aparece na folha de toda a equipe. Ao definir membros, só eles relatam e são cobrados nesse tópico.</p>`;
            const filtrar = () => {
                const termo = document.getElementById('pta-topicos-busca').value.trim().toLowerCase();
                const ano = document.getElementById('pta-topicos-ano').value;
                G.topicosAno = ano === 'todos' ? 'todos' : Number(ano);
                const lista = G.painel.filter(t => (ano === 'todos' || t.ano === Number(ano)) && (!termo || t.titulo.toLowerCase().includes(termo)));
                document.getElementById('pta-topicos-contador').textContent = `${lista.length} ${lista.length === 1 ? 'tópico encontrado' : 'tópicos encontrados'}`;
                document.getElementById('pta-topicos-tabela').innerHTML = lista.length ? tabelaAvancoTopicos(lista, true)
                    : window.UI.emptyState({ title: 'Nenhum tópico encontrado', actionLabel: 'Cadastrar tópico', actionOnclick: "document.querySelector('[data-acao=novo-topico]').click()" });
            };
            document.getElementById('pta-topicos-busca').addEventListener('input', filtrar);
            document.getElementById('pta-topicos-ano').addEventListener('change', filtrar);
            filtrar();
        } catch (err) {
            if (alvo) alvo.innerHTML = window.UI.errorState(esc(err.message));
        }
    }

    function modalTopico(t) {
        const ano = t ? t.ano : hoje().ano;
        const opcoesMes = (sel) => MESES.map((m, i) => `<option value="${i + 1}" ${i + 1 === sel ? 'selected' : ''}>${String(i + 1).padStart(2, '0')} · ${capital(m)}</option>`).join('');
        const modal = abrirModal({
            id: 'pta-modal-topico', eyebrow: t ? 'editar tópico' : 'novo tópico', titulo: t ? t.titulo : 'Novo tópico de pesquisa',
            corpo: `
                <form id="pta-form-topico" novalidate>
                    <div class="input-group"><label for="pta-topico-titulo">Título</label><input type="text" id="pta-topico-titulo" class="form-control" required maxlength="300" value="${esc(t?.titulo || '')}"></div>
                    <div class="field-grid">
                        <div class="input-group"><label for="pta-topico-ano">Ano</label><input type="number" id="pta-topico-ano" class="form-control mono" required min="2000" max="2100" value="${ano}"></div>
                        <div class="input-group"><label for="pta-topico-ini">Mês de início</label><select id="pta-topico-ini" class="form-control">${opcoesMes(t?.mes_inicio || 1)}</select></div>
                        <div class="input-group"><label for="pta-topico-fim">Previsão de término</label><select id="pta-topico-fim" class="form-control">${opcoesMes(t?.mes_fim || 12)}</select></div>
                    </div>
                    <p class="help" id="pta-topico-previa"></p>
                </form>`,
            rodape: `<button type="button" class="btn btn-secondary" data-role="cancel">Cancelar</button><button type="button" class="btn btn-primary" id="pta-salvar-topico">${t ? 'Salvar' : 'Cadastrar tópico'}</button>`,
        });
        const previa = () => {
            const ini = Number(modal.querySelector('#pta-topico-ini').value);
            const fim = Number(modal.querySelector('#pta-topico-fim').value);
            const n = fim - ini + 1;
            modal.querySelector('#pta-topico-previa').textContent = n < 1 ? 'O término não pode ser antes do início.' : `${n} ${n === 1 ? 'mês' : 'meses'}. O avanço previsto cresce de forma linear até 100% no mês de término.`;
        };
        modal.querySelectorAll('select').forEach(s => s.addEventListener('change', previa));
        previa();
        modal.querySelector('#pta-salvar-topico').addEventListener('click', (e) => {
            const payload = {
                titulo: modal.querySelector('#pta-topico-titulo').value.trim(),
                ano: Number(modal.querySelector('#pta-topico-ano').value),
                mes_inicio: Number(modal.querySelector('#pta-topico-ini').value),
                mes_fim: Number(modal.querySelector('#pta-topico-fim').value),
            };
            if (!payload.titulo) { window.UI.showToast('Informe o título do tópico.', 'error'); return; }
            if (payload.mes_fim < payload.mes_inicio) { window.UI.showToast('O término não pode ser antes do início.', 'error'); return; }
            comBotao(e.currentTarget, 'Salvando', async () => {
                try {
                    await req(t ? `/pta/topicos/${t.id}` : '/pta/topicos', { method: t ? 'PUT' : 'POST', json: payload });
                    const form = modal.querySelector('form'); if (form) delete form.dataset.sujo;
                    modal.remove();
                    window.UI.showToast(t ? 'Tópico atualizado.' : 'Tópico cadastrado.', 'success');
                    carregarTopicos();
                } catch (err) { erroToast(err); }
            });
        });
    }

    async function modalMembros(t) {
        try {
            G.equipe = G.equipe || await req('/usuarios/equipe');
        } catch (err) { erroToast(err); return; }
        const atuais = new Set(t.membros.map(m => m.id));
        const modal = abrirModal({
            id: 'pta-modal-membros', eyebrow: 'membros do tópico', titulo: t.titulo,
            corpo: `
                <p class="dialog-text mb-md">Só os membros veem este tópico na folha do mês e são cobrados por ele. Sem membros, o tópico fica aberto a toda a equipe.</p>
                <input type="search" class="form-control mb-sm" id="pta-membros-busca" placeholder="Filtrar pessoas" aria-label="Filtrar pessoas">
                <div class="check-chips" id="pta-membros-lista">${G.equipe.map(u => `
                    <label class="check-chip" data-nome="${esc((u.nome || '').toLowerCase())}"><input type="checkbox" name="pta-membro" value="${u.id}" ${atuais.has(u.id) ? 'checked' : ''}> ${esc(u.nome)}</label>`).join('')}
                </div>`,
            rodape: `<button type="button" class="link-btn muted" id="pta-membros-limpar">Abrir a toda a equipe</button><span class="grow"></span><button type="button" class="btn btn-secondary" data-role="cancel">Cancelar</button><button type="button" class="btn btn-primary" id="pta-salvar-membros">Salvar membros</button>`,
        });
        modal.querySelector('#pta-membros-busca').addEventListener('input', (e) => {
            const termo = e.target.value.trim().toLowerCase();
            modal.querySelectorAll('#pta-membros-lista .check-chip').forEach(c => { c.style.display = !termo || c.dataset.nome.includes(termo) ? '' : 'none'; });
        });
        modal.querySelector('#pta-membros-limpar').addEventListener('click', () => modal.querySelectorAll('input[name="pta-membro"]').forEach(i => { i.checked = false; }));
        modal.querySelector('#pta-salvar-membros').addEventListener('click', (e) => {
            const ids = Array.from(modal.querySelectorAll('input[name="pta-membro"]:checked')).map(i => Number(i.value));
            comBotao(e.currentTarget, 'Salvando', async () => {
                try {
                    await req(`/pta/topicos/${t.id}/membros`, { method: 'PUT', json: { usuario_ids: ids } });
                    modal.remove();
                    window.UI.showToast(ids.length ? `${ids.length} membro(s) definido(s).` : 'Tópico aberto a toda a equipe.', 'success');
                    carregarTopicos();
                } catch (err) { erroToast(err); }
            });
        });
    }

    async function excluirTopico(t) {
        const ok = await window.UI.confirm(`“${t.titulo}” e todos os ${t.qtd_relatos} relato(s) ligados a ele serão apagados. Isso não pode ser desfeito.`, { title: 'Excluir tópico?', danger: true, confirmText: 'Excluir' });
        if (!ok) return;
        const token = await window.api.confirmStepUp({ title: 'Confirme para excluir', message: `Você está excluindo o tópico “${t.titulo}” e o histórico dele.` });
        if (!token) return;
        try {
            await req(`/pta/admin/topicos/${t.id}`, { method: 'DELETE', headers: { 'X-Step-Up-Token': token } });
            window.UI.showToast('Tópico excluído.', 'success');
            carregarTopicos();
        } catch (err) { erroToast(err); }
    }

    // ---------- IMPORTAR E EXPORTAR ----------
    function renderDados() {
        const alvo = document.getElementById('pta-gestao-conteudo');
        const ano = hoje().ano;
        alvo.innerHTML = `
            <div class="columns">
                <section class="pta-painel">
                    <div class="section-head"><h3>Exportar planilha do ano</h3></div>
                    <p class="text-muted text-small mb-md">Um mês por linha e, para cada tópico, o texto do mês e a coluna %. Usa o texto consolidado salvo; quando não houver, junta os relatos aprovados. É o mesmo formato aceito pela importação.</p>
                    <div class="input-group"><label for="pta-export-ano">Ano</label><input type="number" id="pta-export-ano" class="form-control mono" value="${ano}" min="2000" max="2100"></div>
                    <button type="button" class="btn btn-primary" data-acao="exportar">${icone('download', 14)} Baixar planilha (.xlsx)</button>
                </section>
                ${ehAdmin() ? `
                <section class="pta-painel">
                    <div class="section-head"><h3>Importar histórico</h3></div>
                    <p class="text-muted text-small mb-md">Os tópicos ficam na linha logo acima dos meses, cada um seguido da coluna “%”. Você vê um resumo antes de gravar.</p>
                    <div class="input-group"><label for="pta-import-ano">Ano de referência</label><input type="number" id="pta-import-ano" class="form-control mono" value="${ano}" min="2000" max="2100"></div>
                    <div class="input-group"><label for="pta-import-arquivo">Planilha (.xlsx)</label><input type="file" id="pta-import-arquivo" accept=".xlsx,.xls"></div>
                    <button type="button" class="btn btn-secondary" data-acao="previa-import">${icone('upload', 14)} Pré-visualizar</button>
                    <div id="pta-previa" class="pta-previa mt-md"></div>
                </section>` : ''}
            </div>
            ${ehAdmin() ? `
            <section class="pta-painel pta-perigo pta-secao">
                <div class="section-head"><h3>Zona de risco</h3></div>
                <p class="text-muted text-small mb-md">Apaga todos os relatos e textos consolidados de todos os anos. Os tópicos são mantidos. Use só para recomeçar uma base de testes.</p>
                <button type="button" class="btn btn-danger-outline btn-sm" data-acao="limpar-tudo">${icone('trash-2', 14)} Apagar todos os relatos</button>
            </section>` : ''}`;
    }

    async function exportar(btn) {
        const ano = Number(document.getElementById('pta-export-ano').value);
        await comBotao(btn, 'Gerando planilha', async () => {
            try {
                const res = await window.api.fetchProtected(`/pta/export?ano=${ano}`);
                if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || 'Não foi possível gerar a planilha.'); }
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `PTA_${ano}.xlsx`;
                document.body.appendChild(a); a.click(); a.remove();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            } catch (err) { erroToast(err); }
        });
    }

    function formImportacao(simular) {
        const arquivo = G.previa?.arquivo || document.getElementById('pta-import-arquivo').files[0];
        const fd = new FormData();
        fd.append('file', arquivo);
        fd.append('ano', G.previa?.ano || document.getElementById('pta-import-ano').value);
        fd.append('simular', simular ? 'true' : 'false');
        return fd;
    }

    async function previaImportacao(btn) {
        const arquivo = document.getElementById('pta-import-arquivo').files[0];
        if (!arquivo) { window.UI.showToast('Escolha a planilha.', 'error'); return; }
        G.previa = null;
        const ano = document.getElementById('pta-import-ano').value;
        const caixa = document.getElementById('pta-previa');
        await comBotao(btn, 'Lendo planilha', async () => {
            try {
                const r = await req('/pta/import-history', { method: 'POST', body: formImportacao(true) });
                G.previa = { arquivo, ano };
                caixa.innerHTML = `
                    <div class="note accent">
                        <dl>
                            <dt>Registros</dt><dd>${r.registros}</dd>
                            <dt>Meses</dt><dd>${r.meses.map(m => MESES_CURTOS[m - 1]).join(', ')}</dd>
                            <dt>Tópicos</dt><dd>${r.topicos.length}${r.topicos_novos.length ? ` · ${r.topicos_novos.length} novo(s): ${esc(r.topicos_novos.join(', '))}` : ' · todos já existem'}</dd>
                        </dl>
                        <p class="text-small mb-sm">Os registros entram como aprovados, em nome de quem importa. Meses já importados antes são substituídos.</p>
                        <span class="cluster"><button type="button" class="btn btn-primary btn-sm" data-acao="confirmar-import">Importar ${r.registros} registros</button><button type="button" class="link-btn muted" data-acao="cancelar-import">Cancelar</button></span>
                    </div>`;
            } catch (err) { caixa.innerHTML = ''; erroToast(err); }
        });
    }

    async function confirmarImportacao(btn) {
        if (!G.previa) return;
        await comBotao(btn, 'Importando', async () => {
            try {
                const r = await req('/pta/import-history', { method: 'POST', body: formImportacao(false) });
                window.UI.showToast(r.mensagem || 'Importação concluída.', 'success');
                G.previa = null;
                renderDados();
            } catch (err) { erroToast(err); }
        });
    }

    function limparTudo() {
        const modal = abrirModal({
            id: 'pta-modal-limpar', eyebrow: 'zona de risco', titulo: 'Apagar todos os relatos?', tamanho: 'modal-sm',
            corpo: `<p class="dialog-text mb-md">Todos os relatos, notas e textos consolidados serão apagados de forma permanente. Digite <strong class="mono">APAGAR</strong> para confirmar.</p>
                    <input type="text" class="form-control mono" id="pta-limpar-confirmacao" autocomplete="off" aria-label="Digite APAGAR para confirmar">`,
            rodape: `<button type="button" class="btn btn-secondary" data-role="cancel">Cancelar</button><button type="button" class="btn btn-danger" id="pta-limpar-ok" disabled>Apagar tudo</button>`,
        });
        const campo = modal.querySelector('#pta-limpar-confirmacao');
        const ok = modal.querySelector('#pta-limpar-ok');
        campo.addEventListener('input', () => { ok.disabled = campo.value.trim() !== 'APAGAR'; });
        setTimeout(() => campo.focus(), 50);
        ok.addEventListener('click', async () => {
            modal.remove();
            const token = await window.api.confirmStepUp({ title: 'Confirme para apagar', message: 'Você está apagando todo o histórico do planejamento mensal.' });
            if (!token) return;
            try {
                const r = await req('/pta/admin/limpar-tudo/relatorios', { method: 'DELETE', headers: { 'X-Step-Up-Token': token } });
                window.UI.showToast(r.mensagem || 'Relatos apagados.', 'success');
            } catch (err) { erroToast(err); }
        });
    }

    // ---------- EVENTOS DA COORDENAÇÃO ----------
    function aoClicarGestao(e) {
        const alvo = e.target.closest('[data-acao]');
        if (!alvo) return;
        const acao = alvo.dataset.acao;
        const rid = Number(alvo.dataset.relato);
        const tid = Number(alvo.dataset.topico);
        const topicoPainel = () => (G.painel || []).find(t => t.id === tid);
        switch (acao) {
            case 'aba': G.aba = alvo.dataset.aba; G.previa = null; renderAba(); break;
            case 'ir-folha': renderPTAPesquisador(); break;
            case 'mes-gestao': { const n = somarMes(G.mes, G.ano, Number(alvo.dataset.delta)); G.mes = n.mes; G.ano = n.ano; G.recentes.clear(); G.selecionados.clear(); renderAba(); break; }
            case 'ano-visao': G.anoVisao += Number(alvo.dataset.delta); carregarAno(); break;
            case 'abrir-mes': G.mes = Number(alvo.dataset.mes); G.ano = G.anoVisao; G.aba = 'avaliar'; G.recentes.clear(); renderAba(); break;
            case 'aprovar': comBotao(alvo, '', () => aprovar(rid)); break;
            case 'aprovar-selecionados': aprovarSelecionados(alvo); break;
            case 'devolver': abrirDevolucao(rid); break;
            case 'desfazer':
                comBotao(alvo, '', async () => {
                    try { await req(`/pta/chefia/desfazer/${rid}`, { method: 'POST' }); G.recentes.delete(rid); await carregarAvaliacao(); }
                    catch (err) { erroToast(err); }
                });
                break;
            case 'expandir': {
                const desc = alvo.closest('.pta-avaliacao')?.querySelector('.pta-desc');
                if (desc) { desc.classList.toggle('is-recolhida'); alvo.textContent = desc.classList.contains('is-recolhida') ? 'Ler tudo' : 'Recolher'; }
                break;
            }
            case 'historico': abrirHistorico(rid, alvo.dataset.titulo || 'Relato'); break;
            case 'cobrar': cobrar(alvo.dataset.usuario ? Number(alvo.dataset.usuario) : null, alvo); break;
            case 'gerar-sintese': gerarSintese(tid, alvo); break;
            case 'gerar-todas': gerarTodas(alvo); break;
            case 'salvar-sintese': salvarSintese(tid, alvo); break;
            case 'copiar-sintese': {
                const texto = document.getElementById(`pta-sintese-${tid}`)?.value || '';
                navigator.clipboard?.writeText(texto).then(() => window.UI.showToast('Texto copiado.', 'success'), () => window.UI.showToast('Não foi possível copiar.', 'error'));
                break;
            }
            case 'novo-topico': modalTopico(null); break;
            case 'editar-topico': if (topicoPainel()) modalTopico(topicoPainel()); break;
            case 'membros': if (topicoPainel()) modalMembros(topicoPainel()); break;
            case 'excluir-topico': if (topicoPainel()) excluirTopico(topicoPainel()); break;
            case 'exportar': exportar(alvo); break;
            case 'previa-import': previaImportacao(alvo); break;
            case 'confirmar-import': confirmarImportacao(alvo); break;
            case 'cancelar-import': G.previa = null; document.getElementById('pta-previa').innerHTML = ''; break;
            case 'limpar-tudo': limparTudo(); break;
            default: break;
        }
    }

    function aoMudarGestao(e) {
        const el = e.target;
        const tipo = el.dataset.acaoChange;
        if (tipo === 'selecionar') alternarSelecao(Number(el.dataset.relato), el.checked);
        else if (tipo === 'selecionar-todos') {
            const fila = G.dados.relatos.filter(r => r.status === 'aguardando_aprovacao');
            G.selecionados = el.checked ? new Set(fila.map(r => r.id)) : new Set();
            document.getElementById('pta-fila').innerHTML = renderFila(G.dados, fila);
        }
    }

    window.renderPTAPesquisador = renderPTAPesquisador;
    window.renderPTACoordenador = renderPTACoordenador;
})();
