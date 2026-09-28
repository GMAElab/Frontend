(function () {
// ==========================================
// ROTEADOR
// ==========================================
document.addEventListener('viewChanged', (e) => {
    if (e.detail.view === 'tarefas') routerTarefas();
});

const escT = (s) => window.escapeHTML(s);

const STATUS_LABEL = {
    pendente: 'Pendente',
    em_andamento: 'Em Andamento',
    em_revisao: 'Em Revisão',
    concluida: 'Concluída',
    cancelada: 'Cancelada'
};
const STATUS_BADGE = {
    pendente: 'badge-warning',
    em_andamento: 'badge-warning',
    concluida: 'badge-success',
    cancelada: 'badge-danger'
};
const PRIORIDADE_LABEL = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };
const PRIORIDADE_BADGE = { baixa: 'badge', media: 'badge-warning', alta: 'badge-danger' };
const DESFECHO_LABEL = {
    atingido: 'Atingido',
    parcial: 'Parcialmente atingido',
    nao_atingido: 'Não atingido',
    inconclusivo: 'Inconclusivo'
};
const DESFECHO_BADGE = {
    atingido: 'badge-success',
    parcial: 'badge-warning',
    nao_atingido: 'badge-danger',
    inconclusivo: 'badge'
};

const ESTILO_BADGE_REVISAO = 'background:rgba(37,84,235,0.1); color:var(--primary); border-color:var(--primary);';

// Só ADMIN, TÉCNICO e COORDENADOR criam/editam/concluem tarefas e veem a equipe
// inteira — espelha security.check_roles no backend.
function isGestor(user) {
    return ['admin', 'tecnico', 'coordenador'].includes(user.role);
}

function usuarioAtual() {
    const userString = localStorage.getItem('user_data');
    return userString ? JSON.parse(userString) : null;
}

// ==========================================
// FORMATAÇÃO
// ==========================================
// Datas gravadas pelo servidor vêm em UTC; o prazo é horário de parede
// (digitado pelo gestor) e por isso não passa por essa conversão.
function parseUTC(valor) {
    if (!valor) return null;
    return new Date(/[zZ]$|[+-]\d\d:?\d\d$/.test(valor) ? valor : valor + 'Z');
}

function fmtDataHora(valorUtc) {
    const d = parseUTC(valorUtc);
    return d ? d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
}

function fmtData(valorUtc) {
    const d = parseUTC(valorUtc);
    return d ? d.toLocaleDateString('pt-BR') : '—';
}

function fmtPrazo(prazo) {
    return prazo ? new Date(prazo).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Sem prazo';
}

function fmtDuracao(segundos) {
    if (segundos === null || segundos === undefined) return '—';
    const s = Math.abs(Math.round(segundos));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return h > 0 ? `${d} d ${h} h` : `${d} d`;
    if (h > 0) return m > 0 ? `${h} h ${m} min` : `${h} h`;
    if (m > 0) return `${m} min`;
    return '< 1 min';
}

// segundos > 0 = depois do prazo (atraso); < 0 = antes (antecipou).
function fmtContraPrazo(segundos) {
    if (segundos === null || segundos === undefined) return 'Sem prazo';
    if (segundos > 60) return `Atrasou ${fmtDuracao(segundos)}`;
    if (segundos < -60) return `Antecipou ${fmtDuracao(segundos)}`;
    return 'No prazo';
}

function normalizarTexto(s) {
    return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function badgeStatus(t) {
    if (t.atrasada) return '<span class="badge badge-danger">Atrasada</span>';
    if (t.status === 'em_revisao') return `<span class="badge" style="${ESTILO_BADGE_REVISAO}">Em Revisão</span>`;
    return `<span class="badge ${STATUS_BADGE[t.status] || 'badge'}">${STATUS_LABEL[t.status] || escT(t.status)}</span>`;
}

function badgePrioridade(t) {
    return `<span class="badge ${PRIORIDADE_BADGE[t.prioridade] || 'badge'}">${PRIORIDADE_LABEL[t.prioridade] || escT(t.prioridade)}</span>`;
}

function badgeDesfecho(t) {
    if (!t.desfecho) return '';
    return `<span class="badge ${DESFECHO_BADGE[t.desfecho] || 'badge'}">${DESFECHO_LABEL[t.desfecho] || escT(t.desfecho)}</span>`;
}

function chipsTags(tags, clicavel) {
    if (!tags || tags.length === 0) return '';
    return tags.map(tag => `<span class="badge" style="cursor:${clicavel ? 'pointer' : 'default'};"${clicavel ? ` onclick="event.stopPropagation(); window.filtrarAcervoPorTag('${escT(tag).replace(/'/g, '&#39;')}')"` : ''}>${escT(tag)}</span>`).join(' ');
}

function buscarTarefaEmCache(id) {
    const todas = [].concat(window.tarefasEquipeCache || [], window.minhasTarefasCache || [], window.acervoCache || []);
    return todas.find(t => t.id === id);
}

function fecharModais(...ids) {
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
}

// ==========================================
// CASCA DA TELA (abas) — IGUAL PARA GESTOR E COLABORADOR
// ==========================================
function routerTarefas() {
    const user = usuarioAtual();
    if (!user) return;
    const gestor = isGestor(user);

    document.getElementById('dynamic-content').innerHTML = `
        <div class="view-header fade-in" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
            <div>
                <h3 style="margin:0; font-size:1.5rem;">${gestor ? 'Tarefas da Equipe' : 'Minhas Tarefas'}</h3>
                <p class="text-muted" style="margin-top:5px;">${gestor ? 'Atribua tarefas, revise entregas e consulte o que já foi concluído.' : 'Reporte seu progresso e consulte o que a equipe já concluiu.'}</p>
            </div>
            <div id="tarefas-acoes-topo"></div>
        </div>
        <div class="fade-in" style="display:flex; gap:6px; border-bottom:1px solid var(--border-color); margin-bottom:20px;">
            <button type="button" id="tab-tarefas-abertas" onclick="window.mostrarAbaTarefas('abertas')" style="padding:10px 16px; cursor:pointer; border:none; background:none; font-size:14px; margin-bottom:-1px;">Em andamento</button>
            <button type="button" id="tab-tarefas-acervo" onclick="window.mostrarAbaTarefas('acervo')" style="padding:10px 16px; cursor:pointer; border:none; background:none; font-size:14px; margin-bottom:-1px;">Tarefas concluídas</button>
        </div>
        <div id="tarefas-conteudo" class="fade-in"></div>
    `;
    window.mostrarAbaTarefas('abertas');
}

window.mostrarAbaTarefas = function (aba) {
    const user = usuarioAtual();
    if (!user) return;
    const gestor = isGestor(user);
    window.tarefasAba = aba;

    ['abertas', 'acervo'].forEach(nome => {
        const btn = document.getElementById(`tab-tarefas-${nome}`);
        if (!btn) return;
        const ativa = nome === aba;
        btn.style.borderBottom = ativa ? '3px solid var(--primary)' : '3px solid transparent';
        btn.style.fontWeight = ativa ? '700' : '400';
        btn.style.color = ativa ? 'var(--text-main)' : 'var(--text-muted)';
    });

    const acoes = document.getElementById('tarefas-acoes-topo');
    if (acoes) {
        acoes.innerHTML = (gestor && aba === 'abertas')
            ? `<button type="button" class="btn btn-primary" onclick="window.abrirModalTarefa()">${window.Icon('plus', { size: 16 })} Nova Tarefa</button>`
            : '';
    }

    if (aba === 'acervo') renderAcervo();
    else if (gestor) renderTabelaGestor();
    else renderListaColaborador();
};

function recarregarTarefas() {
    const user = usuarioAtual();
    if (!user || !document.getElementById('tarefas-conteudo')) return;
    if (window.tarefasAba === 'acervo') carregarAcervo();
    else if (isGestor(user)) carregarTarefasEquipe();
    else carregarMinhasTarefas();
}

// ==========================================
// GESTOR — TABELA DE TAREFAS EM ABERTO
// ==========================================
function renderTabelaGestor() {
    document.getElementById('tarefas-conteudo').innerHTML = `
        <div class="card table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Tarefa</th>
                        <th>Atribuída a</th>
                        <th>Prioridade</th>
                        <th>Prazo</th>
                        <th>Progresso</th>
                        <th>Status</th>
                        <th style="text-align:right;">Ações</th>
                    </tr>
                </thead>
                <tbody id="tarefasEquipeBody">
                    <tr><td colspan="7" style="text-align:center; padding:30px;"><span class="spinner"></span></td></tr>
                </tbody>
            </table>
        </div>
    `;
    carregarTarefasEquipe();
}

async function carregarTarefasEquipe() {
    const tbody = document.getElementById('tarefasEquipeBody');
    if (!tbody) return;
    try {
        const res = await window.api.fetchProtected('/tarefas/equipe');
        if (!res.ok) throw new Error();
        const tarefas = await res.json();
        window.tarefasEquipeCache = tarefas;

        if (tarefas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7">${window.UI.emptyState({ icon: 'clipboard', title: 'Nenhuma tarefa em andamento', description: 'Clique em "Nova Tarefa" para atribuir uma. As concluídas ficam na aba Acervo.' })}</td></tr>`;
            return;
        }
        tbody.innerHTML = tarefas.map(renderLinhaTarefaGestor).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7">${window.UI.errorState('Erro ao carregar tarefas.')}</td></tr>`;
    }
}

function renderLinhaTarefaGestor(t) {
    const nomes = t.atribuidos.map(a => escT(a.nome)).join(', ') || '—';
    const vinculo = t.processo_nome ? `<div class="text-muted" style="font-size:12px; margin-top:2px;">Processo: ${escT(t.processo_nome)}</div>` : '';
    const destaque = t.status === 'em_revisao' ? ' style="cursor:pointer; background:rgba(37,84,235,0.05);"' : ' style="cursor:pointer;"';

    return `
        <tr${destaque} onclick="window.abrirDetalhesTarefa(${t.id})">
            <td><strong>${escT(t.titulo)}</strong>${vinculo}</td>
            <td>${nomes}</td>
            <td>${badgePrioridade(t)}</td>
            <td>${fmtPrazo(t.prazo)}</td>
            <td>${t.percentual_conclusao}%</td>
            <td>${badgeStatus(t)}</td>
            <td style="text-align:right; white-space:nowrap;" onclick="event.stopPropagation()">
                <button class="btn btn-primary btn-sm" onclick="window.abrirModalConcluir(${t.id})">Concluir</button>
                <button class="btn btn-outline-primary btn-sm" onclick="window.abrirModalTarefa(${t.id})">Editar</button>
                <button class="btn btn-outline-danger btn-sm" onclick="window.excluirTarefa(${t.id})">Excluir</button>
            </td>
        </tr>
    `;
}

// ==========================================
// COLABORADOR — MINHAS TAREFAS EM ABERTO
// ==========================================
function renderListaColaborador() {
    document.getElementById('tarefas-conteudo').innerHTML = `
        <div id="minhasTarefasLista" style="display:flex; flex-direction:column; gap:14px;">
            <span class="spinner"></span>
        </div>
    `;
    carregarMinhasTarefas();
}

async function carregarMinhasTarefas() {
    const container = document.getElementById('minhasTarefasLista');
    if (!container) return;
    try {
        const res = await window.api.fetchProtected('/tarefas/minhas');
        if (!res.ok) throw new Error();
        const tarefas = await res.json();
        window.minhasTarefasCache = tarefas;

        if (tarefas.length === 0) {
            container.innerHTML = window.UI.emptyState({ icon: 'clipboard', title: 'Nenhuma tarefa em andamento', description: 'Quando um gestor atribuir uma tarefa a você, ela aparece aqui. As já concluídas ficam na aba Acervo.' });
            return;
        }
        container.innerHTML = tarefas.map(renderCardTarefaColaborador).join('');
    } catch (err) {
        container.innerHTML = window.UI.errorState('Erro ao carregar suas tarefas.');
    }
}

function renderCardTarefaColaborador(t) {
    const vinculo = t.processo_nome ? ` · Processo: ${escT(t.processo_nome)}` : '';
    return `
        <div class="card" style="cursor:pointer; border-left:3px solid var(--primary);" onclick="window.abrirDetalhesTarefa(${t.id})">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap;">
                <div>
                    <strong style="font-size:15px;">${escT(t.titulo)}</strong>
                    <p class="text-muted" style="font-size:12.5px; margin:4px 0 0 0;">Prazo: ${fmtPrazo(t.prazo)} · Criada por ${escT(t.criado_por_nome)}${vinculo}</p>
                </div>
                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    ${badgePrioridade(t)}
                    ${badgeStatus(t)}
                </div>
            </div>
            <div style="margin-top:12px; background:var(--bg-subtle); border-radius:var(--radius-full); height:8px; overflow:hidden;">
                <div style="width:${t.percentual_conclusao}%; background:var(--primary); height:100%;"></div>
            </div>
            <p class="text-muted" style="font-size:12px; margin:6px 0 0 0; text-align:right;">${t.percentual_conclusao}% concluído</p>
        </div>
    `;
}

// ==========================================
// TAREFAS CONCLUÍDAS 
// ==========================================
function renderAcervo() {
    document.getElementById('tarefas-conteudo').innerHTML = `
        <p class="text-muted" style="font-size:13px; margin:0 0 14px 0;">Registro do que já foi feito no laboratório: resultados, lições aprendidas e o que não funcionou. Consulte antes de começar algo novo.</p>
        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:16px;">
            <input type="search" id="acervo-busca" class="form-control" placeholder="Buscar por título, resultado, lições, tag, pessoa ou processo..." style="flex:1 1 280px;" oninput="window.filtrarAcervo()">
            <select id="acervo-desfecho" class="form-control" style="flex:0 0 190px;" onchange="window.filtrarAcervo()">
                <option value="">Todos os desfechos</option>
                ${Object.entries(DESFECHO_LABEL).map(([valor, rotulo]) => `<option value="${valor}">${rotulo}</option>`).join('')}
            </select>
            <label style="display:flex; align-items:center; gap:6px; font-size:13px; margin:0; white-space:nowrap;">
                <input type="checkbox" id="acervo-minhas" onchange="window.filtrarAcervo()"> Somente as minhas
            </label>
        </div>
        <div id="acervo-contador" class="text-muted" style="font-size:12.5px; margin-bottom:10px;"></div>
        <div id="acervo-lista" style="display:flex; flex-direction:column; gap:12px;"><span class="spinner"></span></div>
    `;
    carregarAcervo();
}

async function carregarAcervo() {
    const lista = document.getElementById('acervo-lista');
    if (!lista) return;
    try {
        const res = await window.api.fetchProtected('/tarefas/acervo');
        if (!res.ok) throw new Error();
        window.acervoCache = await res.json();
        window.filtrarAcervo();
    } catch (err) {
        lista.innerHTML = window.UI.errorState('Erro ao carregar o acervo.');
    }
}

window.filtrarAcervo = function () {
    const lista = document.getElementById('acervo-lista');
    if (!lista) return;
    const user = usuarioAtual();
    const termo = normalizarTexto(document.getElementById('acervo-busca').value.trim());
    const desfecho = document.getElementById('acervo-desfecho').value;
    const soMinhas = document.getElementById('acervo-minhas').checked;

    const resultado = (window.acervoCache || []).filter(t => {
        if (desfecho && t.desfecho !== desfecho) return false;
        if (soMinhas && !t.atribuidos.some(a => user && a.id === user.id)) return false;
        if (!termo) return true;
        const palheiro = normalizarTexto([
            t.titulo, t.descricao, t.resultado, t.licoes, t.processo_nome, t.topico_titulo,
            (t.tags || []).join(' '), t.atribuidos.map(a => a.nome).join(' ')
        ].join(' '));
        return termo.split(/\s+/).every(palavra => palheiro.includes(palavra));
    });

    const total = (window.acervoCache || []).length;
    document.getElementById('acervo-contador').textContent = `${resultado.length} de ${total} registro(s)`;

    if (resultado.length === 0) {
        lista.innerHTML = total === 0
            ? window.UI.emptyState({ icon: 'inbox', title: 'As tarefas ainda estão vazias', description: 'As tarefas concluídas pelos gestores aparecem aqui.' })
            : window.UI.emptyState({ icon: 'search', title: 'Nada encontrado', description: 'Tente outras palavras ou limpe os filtros.' });
        return;
    }
    lista.innerHTML = resultado.map(renderCardAcervo).join('');
};

window.filtrarAcervoPorTag = function (tag) {
    const campo = document.getElementById('acervo-busca');
    if (!campo) return;
    campo.value = tag;
    window.filtrarAcervo();
    campo.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

function renderCardAcervo(t) {
    let atrasoBadge = '';
    if (t.atraso_segundos !== null && t.atraso_segundos !== undefined) {
        atrasoBadge = t.atraso_segundos > 60
            ? `<span class="badge badge-danger">Atrasou ${fmtDuracao(t.atraso_segundos)}</span>`
            : '<span class="badge badge-success">No prazo</span>';
    }
    const resumoTxt = t.resultado
        ? escT(t.resultado.length > 220 ? t.resultado.slice(0, 220) + '…' : t.resultado)
        : '<em class="text-faint">Concluída antes do registro de resultado existir.</em>';
    const vinculos = [
        t.processo_nome ? `Processo: ${escT(t.processo_nome)}` : '',
        t.topico_titulo ? `Tópico PTA: ${escT(t.topico_titulo)}` : ''
    ].filter(Boolean).join(' · ');

    return `
        <div class="card" style="cursor:pointer; border-left:3px solid var(--primary);" onclick="window.abrirResumoTarefa(${t.id})">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap;">
                <strong style="font-size:15px;">${escT(t.titulo)}</strong>
                <div style="display:flex; gap:6px; flex-wrap:wrap;">${badgeDesfecho(t)}${atrasoBadge}</div>
            </div>
            ${vinculos ? `<p class="text-muted" style="font-size:12px; margin:4px 0 0 0;">${vinculos}</p>` : ''}
            <p style="font-size:13.5px; margin:10px 0; line-height:1.55; white-space:pre-wrap;">${resumoTxt}</p>
            ${t.tags && t.tags.length ? `<div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px;">${chipsTags(t.tags, true)}</div>` : ''}
            <p class="text-muted" style="font-size:12px; margin:0;">
                Concluída em ${fmtData(t.concluida_em)} · Tempo total: ${fmtDuracao(t.tempo_total_segundos)} · ${t.atribuidos.map(a => escT(a.nome)).join(', ') || '—'}
            </p>
        </div>
    `;
}

// ==========================================
// VÍNCULO OPCIONAL COM PROCESSO / TÓPICO
// ==========================================
async function carregarOpcoesVinculo(idSelectProcesso, idSelectTopico, processoAtual, topicoAtual) {
    const selProc = document.getElementById(idSelectProcesso);
    const selTop = document.getElementById(idSelectTopico);
    if (!selProc || !selTop) return;

    const [rp, rt] = await Promise.all([
        window.api.fetchProtected('/processes/?limit=500').catch(() => null),
        window.api.fetchProtected('/pta/topicos').catch(() => null)
    ]);

    if (rp && rp.ok) {
        const procs = (await rp.json()).sort((a, b) => (a.nome_processo || '').localeCompare(b.nome_processo || '', 'pt-BR'));
        selProc.innerHTML = '<option value="">Nenhum</option>' + procs.map(p =>
            `<option value="${p.id}" ${p.id === processoAtual ? 'selected' : ''}>${escT(p.nome_processo)}</option>`).join('');
        selProc.dataset.carregado = '1';
    } else {
        selProc.innerHTML = '<option value="">Indisponível</option>';
    }

    if (rt && rt.ok) {
        const tops = await rt.json();
        selTop.innerHTML = '<option value="">Nenhum</option>' + tops.map(t =>
            `<option value="${t.id}" ${t.id === topicoAtual ? 'selected' : ''}>${escT(t.titulo)} (${t.ano})</option>`).join('');
        selTop.dataset.carregado = '1';
    } else {
        selTop.innerHTML = '<option value="">Indisponível</option>';
    }
}

function lerVinculos(idSelectProcesso, idSelectTopico) {
    const dados = {};
    const selProc = document.getElementById(idSelectProcesso);
    const selTop = document.getElementById(idSelectTopico);
    if (selProc && selProc.dataset.carregado === '1') dados.processo_id = selProc.value ? parseInt(selProc.value, 10) : null;
    if (selTop && selTop.dataset.carregado === '1') dados.topico_id = selTop.value ? parseInt(selTop.value, 10) : null;
    return dados;
}

function htmlSelectsVinculo(prefixo) {
    return `
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:14px; margin-bottom:14px;">
            <div class="input-group" style="margin-bottom:0;">
                <label>Processo (opcional)</label>
                <select id="${prefixo}-processo" class="form-control"><option value="">Carregando...</option></select>
            </div>
            <div class="input-group" style="margin-bottom:0;">
                <label>Tópico do PTA (opcional)</label>
                <select id="${prefixo}-topico" class="form-control"><option value="">Carregando...</option></select>
            </div>
        </div>`;
}

// ==========================================
// CRIAR / EDITAR TAREFA (SÓ GESTOR)
// ==========================================
window.abrirModalTarefa = async function (id = null) {
    const editando = !!id;
    const tarefa = editando ? (window.tarefasEquipeCache || []).find(t => t.id === id) : null;

    fecharModais('modalTarefa');

    document.body.insertAdjacentHTML('beforeend', `
    <div id="modalTarefa" class="modal-overlay" style="display:flex; position:fixed; top:0; left:0; width:100%; height:100%; z-index:999999; justify-content:center; align-items:center; padding:20px;">
        <div class="modal-content" style="width:100%; max-width:600px; max-height:90vh; overflow-y:auto; border-radius:4px; border-top:3px solid var(--primary);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
                <h3 style="margin:0;">${editando ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
                <button type="button" onclick="document.getElementById('modalTarefa').remove()" style="background:none; border:none; font-size:26px; cursor:pointer; color:var(--text-faint);">&times;</button>
            </div>
            <form id="formTarefa">
                <div class="input-group" style="margin-bottom:14px;">
                    <label>Título</label>
                    <input type="text" id="tarefa-titulo" class="form-control" required value="${tarefa ? escT(tarefa.titulo) : ''}">
                </div>
                <div class="input-group" style="margin-bottom:14px;">
                    <label>Descrição</label>
                    <textarea id="tarefa-descricao" class="form-control" rows="3">${tarefa ? escT(tarefa.descricao || '') : ''}</textarea>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px;">
                    <div class="input-group" style="margin-bottom:0;">
                        <label>Prazo</label>
                        <input type="datetime-local" id="tarefa-prazo" class="form-control" value="${tarefa && tarefa.prazo ? tarefa.prazo.substring(0, 16) : ''}">
                    </div>
                    <div class="input-group" style="margin-bottom:0;">
                        <label>Prioridade</label>
                        <select id="tarefa-prioridade" class="form-control">
                            <option value="baixa">Baixa</option>
                            <option value="media" selected>Média</option>
                            <option value="alta">Alta</option>
                        </select>
                    </div>
                </div>
                ${htmlSelectsVinculo('tarefa')}
                <div class="input-group" style="margin-bottom:18px;">
                    <label>Atribuir a</label>
                    <div id="tarefa-equipe-container" style="display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;">
                        <span class="spinner" style="width:15px; height:15px;"></span> <span style="font-size:13px;">Carregando equipe...</span>
                    </div>
                </div>
                <button type="submit" class="btn btn-primary btn-block">${editando ? 'Salvar Alterações' : 'Criar Tarefa'}</button>
            </form>
        </div>
    </div>`);

    if (tarefa) document.getElementById('tarefa-prioridade').value = tarefa.prioridade;
    carregarOpcoesVinculo('tarefa-processo', 'tarefa-topico', tarefa ? tarefa.processo_id : null, tarefa ? tarefa.topico_id : null);

    const atribuidosAtuais = tarefa ? tarefa.atribuidos.map(a => a.id) : [];
    const containerEquipe = document.getElementById('tarefa-equipe-container');
    try {
        const res = await window.api.fetchProtected('/usuarios/equipe');
        const equipe = res.ok ? await res.json() : [];
        if (equipe.length === 0) {
            containerEquipe.innerHTML = '<span class="text-muted" style="font-size:13px;">Nenhum usuário disponível.</span>';
        } else {
            containerEquipe.innerHTML = equipe.map(u => `
                <label style="background:var(--bg-subtle); color:var(--text-main); padding:6px 12px; border-radius:var(--radius-full); cursor:pointer; font-size:13px; display:flex; align-items:center; gap:5px; border:1px solid var(--border-color); user-select:none;">
                    <input type="checkbox" name="tarefa_atribuido_cb" value="${u.id}" ${atribuidosAtuais.includes(u.id) ? 'checked' : ''} style="cursor:pointer;">
                    ${escT(u.nome)}
                </label>
            `).join('');
        }
    } catch (err) {
        containerEquipe.innerHTML = '<span style="color:var(--danger); font-size:12px;">Falha ao carregar lista de equipe.</span>';
    }

    document.getElementById('formTarefa').addEventListener('submit', (e) => window.salvarTarefa(e, id));
};

window.salvarTarefa = async function (e, id) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const textoOriginal = btn.innerText;
    btn.disabled = true;
    btn.innerText = 'Salvando...';

    const atribuidos = Array.from(document.querySelectorAll('input[name="tarefa_atribuido_cb"]:checked')).map(cb => parseInt(cb.value, 10));
    if (atribuidos.length === 0) {
        window.UI.showToast('Selecione ao menos um responsável.', 'warning');
        btn.disabled = false;
        btn.innerText = textoOriginal;
        return;
    }

    const payload = {
        titulo: document.getElementById('tarefa-titulo').value,
        descricao: document.getElementById('tarefa-descricao').value || null,
        prazo: document.getElementById('tarefa-prazo').value || null,
        prioridade: document.getElementById('tarefa-prioridade').value,
        atribuidos: atribuidos,
        ...lerVinculos('tarefa-processo', 'tarefa-topico')
    };

    try {
        const res = await window.api.fetchProtected(id ? `/tarefas/${id}` : '/tarefas', {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(await mensagemDeErro(res, 'Erro ao salvar tarefa.'));

        fecharModais('modalTarefa');
        window.UI.showToast(id ? 'Tarefa atualizada!' : 'Tarefa criada!', 'success');
        recarregarTarefas();
    } catch (err) {
        window.UI.showToast(err.message || 'Falha ao salvar tarefa.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = textoOriginal;
    }
};

window.excluirTarefa = async function (id) {
    const ok = await window.UI.confirm('Tem certeza que deseja excluir esta tarefa? Essa ação não pode ser desfeita.', { danger: true, confirmText: 'Excluir' });
    if (!ok) return;

    try {
        const res = await window.api.fetchProtected(`/tarefas/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(await mensagemDeErro(res, 'Falha ao excluir tarefa.'));
        window.UI.showToast('Tarefa excluída.', 'success');
        recarregarTarefas();
    } catch (err) {
        window.UI.showToast(err.message, 'error');
    }
};

// O backend responde 422 com uma lista de erros de validação; extrai algo legível.
async function mensagemDeErro(res, padrao) {
    const data = await res.json().catch(() => ({}));
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.detail) && data.detail[0] && data.detail[0].msg) {
        return data.detail[0].msg.replace(/^Value error, /, '');
    }
    return padrao;
}

// ==========================================
// DETALHES DA TAREFA EM ABERTO (progresso, revisão e comentários)
// ==========================================
function htmlFormComentario() {
    return `
        <form id="formComentarioTarefa">
            <div style="display:flex; gap:8px;">
                <input type="text" id="detalhe-comentario-texto" class="form-control" placeholder="Escreva um comentário..." required style="flex:1;">
                <button type="submit" class="btn btn-primary btn-sm">Enviar</button>
            </div>
            <div style="margin-top:8px; display:flex; align-items:center; gap:8px;">
                <label for="detalhe-comentario-midia" class="btn btn-outline-primary btn-sm" style="cursor:pointer; margin:0;">${window.Icon('upload', { size: 14 })} Anexar foto/vídeo</label>
                <input type="file" id="detalhe-comentario-midia" accept="image/*,video/*" style="display:none;" onchange="window.previewMidiaComentario(event)">
                <span id="detalhe-comentario-midia-nome" class="text-muted" style="font-size:12px;"></span>
            </div>
        </form>`;
}

window.abrirDetalhesTarefa = function (id) {
    const user = usuarioAtual();
    if (!user) return;

    const tarefa = buscarTarefaEmCache(id);
    if (!tarefa) return;
    if (tarefa.status === 'concluida') { window.abrirResumoTarefa(id); return; }

    fecharModais('modalDetalhesTarefa');

    const gestor = isGestor(user);
    const souAtribuido = tarefa.atribuidos.some(a => a.id === user.id);
    const nomes = tarefa.atribuidos.map(a => escT(a.nome)).join(', ') || '—';
    const emRevisao = tarefa.status === 'em_revisao';

    const vinculos = [
        tarefa.processo_nome ? `Processo: <strong>${escT(tarefa.processo_nome)}</strong>` : '',
        tarefa.topico_titulo ? `Tópico PTA: <strong>${escT(tarefa.topico_titulo)}</strong>` : ''
    ].filter(Boolean).join(' · ');

    let avisoRevisao = '';
    if (emRevisao) {
        avisoRevisao = `<div style="background:rgba(37,84,235,0.08); border-left:3px solid var(--primary); padding:10px 14px; border-radius:var(--radius-md); font-size:13px; margin-bottom:14px;">
            ${gestor ? 'Esta tarefa foi enviada para revisão. Confira a entrega e conclua ou devolva com ajustes.' : 'Enviada para revisão. Aguardando o gestor. Se precisar mexer em algo, mude o status abaixo.'}
        </div>`;
    }

    const acoesGestor = gestor ? `
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px;">
            <button type="button" class="btn btn-primary btn-sm" onclick="window.abrirModalConcluir(${tarefa.id})">Concluir tarefa</button>
            ${emRevisao ? `<button type="button" class="btn btn-outline-primary btn-sm" onclick="window.abrirModalDevolver(${tarefa.id})">Devolver para ajustes</button>` : ''}
        </div>` : '';

    const progressoHtml = souAtribuido ? `
        <div style="background:var(--bg-subtle); padding:16px; border-radius:var(--radius-md); margin-top:6px;">
            <h4 style="margin:0 0 12px 0; font-size:14px;">Atualizar meu progresso</h4>
            <div class="input-group" style="margin-bottom:10px;">
                <label style="display:flex; justify-content:space-between;"><span>Conclusão</span><span id="detalhe-avanco-valor">${tarefa.percentual_conclusao}%</span></label>
                <input type="range" id="detalhe-avanco" min="0" max="100" value="${tarefa.percentual_conclusao}" style="width:100%;" oninput="document.getElementById('detalhe-avanco-valor').innerText = this.value + '%'">
            </div>
            <div class="input-group" style="margin-bottom:10px;">
                <label>Status</label>
                <select id="detalhe-status" class="form-control" onchange="window.aoMudarStatusProgresso()">
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="em_revisao">Enviar para revisão (terminei)</option>
                </select>
            </div>
            <button type="button" id="detalhe-btn-progresso" class="btn btn-primary btn-sm" onclick="window.salvarProgressoTarefa(${tarefa.id})">Salvar Progresso</button>
        </div>` : '';

    document.body.insertAdjacentHTML('beforeend', `
    <div id="modalDetalhesTarefa" class="modal-overlay" style="display:flex; position:fixed; top:0; left:0; width:100%; height:100%; z-index:999999; justify-content:center; align-items:center; padding:20px;">
        <div class="modal-content" style="width:100%; max-width:640px; max-height:90vh; overflow-y:auto; border-radius:4px; border-top:3px solid var(--primary);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; gap:10px;">
                <h3 style="margin:0;">${escT(tarefa.titulo)}</h3>
                <button type="button" onclick="document.getElementById('modalDetalhesTarefa').remove()" style="background:none; border:none; font-size:26px; cursor:pointer; color:var(--text-faint);">&times;</button>
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px;">${badgePrioridade(tarefa)}${badgeStatus(tarefa)}</div>
            <p class="text-muted" style="font-size:13px; margin-bottom:${vinculos ? '6px' : '14px'};">Atribuída a: <strong>${nomes}</strong> · Prazo: <strong>${fmtPrazo(tarefa.prazo)}</strong></p>
            ${vinculos ? `<p class="text-muted" style="font-size:13px; margin-bottom:14px;">${vinculos}</p>` : ''}
            <div style="background:var(--bg-subtle); padding:14px; border-radius:var(--radius-md); font-size:13.5px; white-space:pre-wrap; margin-bottom:14px;">${tarefa.descricao ? escT(tarefa.descricao) : 'Sem descrição.'}</div>

            ${avisoRevisao}
            ${acoesGestor}
            ${progressoHtml}

            <div style="margin-top:20px; border-top:1px solid var(--border-light); padding-top:16px;">
                <h4 style="margin:0 0 10px 0; font-size:14px;">Comentários</h4>
                <div id="detalhe-comentarios-lista" style="display:flex; flex-direction:column; gap:10px; max-height:220px; overflow-y:auto; margin-bottom:14px;">
                    <span class="spinner"></span>
                </div>
                ${(gestor || souAtribuido) ? htmlFormComentario() : ''}
            </div>
        </div>
    </div>`);

    if (souAtribuido) {
        document.getElementById('detalhe-status').value = tarefa.status === 'em_revisao' ? 'em_revisao' : tarefa.status;
        window.aoMudarStatusProgresso();
    }
    const form = document.getElementById('formComentarioTarefa');
    if (form) form.addEventListener('submit', (e) => window.enviarComentarioTarefa(e, tarefa.id));
    carregarComentariosTarefa(tarefa.id);
};

window.aoMudarStatusProgresso = function () {
    const select = document.getElementById('detalhe-status');
    const slider = document.getElementById('detalhe-avanco');
    const btn = document.getElementById('detalhe-btn-progresso');
    if (!select || !slider) return;

    const revisao = select.value === 'em_revisao';
    if (revisao) {
        slider.value = 100;
        document.getElementById('detalhe-avanco-valor').innerText = '100%';
    }
    slider.disabled = revisao;
    if (btn) btn.innerText = revisao ? 'Enviar para revisão' : 'Salvar Progresso';
};

window.salvarProgressoTarefa = async function (id) {
    const percentual = parseInt(document.getElementById('detalhe-avanco').value, 10);
    const status = document.getElementById('detalhe-status').value;

    if (status === 'em_revisao') {
        const ok = await window.UI.confirm('Enviar esta tarefa para revisão? O gestor será avisado por e-mail.', { title: 'Enviar para revisão', confirmText: 'Enviar' });
        if (!ok) return;
    }

    try {
        const res = await window.api.fetchProtected(`/tarefas/${id}/progresso`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, percentual_conclusao: percentual })
        });
        if (!res.ok) throw new Error(await mensagemDeErro(res, 'Falha ao atualizar progresso.'));

        window.UI.showToast(status === 'em_revisao' ? 'Tarefa enviada para revisão!' : 'Progresso atualizado!', 'success');
        fecharModais('modalDetalhesTarefa');
        recarregarTarefas();
    } catch (err) {
        window.UI.showToast(err.message, 'error');
    }
};

// ==========================================
// COMENTÁRIOS (COM FOTO/VÍDEO OPCIONAL)
// ==========================================
function renderAnexoComentario(url) {
    if (!url) return '';
    const extensao = (url.split('.').pop() || '').split('?')[0].toLowerCase();
    const ehVideo = ['mp4', 'mov', 'webm'].includes(extensao);
    const safeUrl = escT(url);

    if (ehVideo) {
        return `<video controls style="max-width:100%; max-height:220px; border-radius:var(--radius-sm); margin-top:6px; display:block;"><source src="${safeUrl}"></video>`;
    }
    return `<img src="${safeUrl}" style="max-width:100%; max-height:220px; border-radius:var(--radius-sm); margin-top:6px; cursor:pointer; object-fit:contain;" onclick="window.open('${safeUrl}', '_blank')" title="Clique para ampliar">`;
}

async function carregarComentariosTarefa(id) {
    const container = document.getElementById('detalhe-comentarios-lista');
    if (!container) return;
    try {
        const res = await window.api.fetchProtected(`/tarefas/${id}/comentarios`);
        if (!res.ok) throw new Error();
        const comentarios = await res.json();

        if (comentarios.length === 0) {
            container.innerHTML = '<p class="text-faint" style="font-size:12.5px; text-align:center;">Nenhum comentário ainda.</p>';
            return;
        }
        container.innerHTML = comentarios.map(c => `
            <div style="border-left:2px solid var(--border-color); padding-left:10px;">
                <strong style="font-size:12.5px;">${escT(c.autor_nome)}</strong>
                <span class="text-faint" style="font-size:11.5px;"> · ${fmtDataHora(c.criado_em)}</span>
                <p style="margin:2px 0 0 0; font-size:13px; color:var(--text-main); white-space:pre-wrap;">${escT(c.texto)}</p>
                ${renderAnexoComentario(c.anexo_url)}
            </div>
        `).join('');
        container.scrollTop = container.scrollHeight;
    } catch (err) {
        container.innerHTML = '<p class="text-danger" style="font-size:12.5px;">Erro ao carregar comentários.</p>';
    }
}

window.previewMidiaComentario = function (event) {
    const file = event.target.files[0];
    const label = document.getElementById('detalhe-comentario-midia-nome');
    if (!file) { if (label) label.textContent = ''; return; }

    const ehVideo = file.type.startsWith('video/');
    // Imagens até 25MB são aceitas aqui porque JPG/PNG são comprimidos no
    // navegador antes do upload (window.comprimirImagem)
    const limite = ehVideo ? 30 * 1024 * 1024 : 25 * 1024 * 1024;

    if (file.size > limite) {
        window.UI.showToast(`Arquivo muito grande. Limite de ${ehVideo ? '30MB para vídeo' : '25MB para imagem'}.`, 'warning');
        event.target.value = '';
        if (label) label.textContent = '';
        return;
    }
    if (label) label.textContent = file.name;
};

window.enviarComentarioTarefa = async function (e, id) {
    e.preventDefault();
    const input = document.getElementById('detalhe-comentario-texto');
    const midiaInput = document.getElementById('detalhe-comentario-midia');
    const texto = input.value.trim();
    if (!texto) return;

    const btn = e.target.querySelector('button[type="submit"]');
    const textoOriginalBtn = btn.innerText;
    btn.disabled = true;
    btn.innerText = 'Enviando...';

    try {
        let anexoUrl = null;
        if (midiaInput && midiaInput.files.length > 0) {
            const formData = new FormData();
            formData.append('file', await window.comprimirImagem(midiaInput.files[0]));
            const resUpload = await window.api.fetchProtected('/upload-midia', { method: 'POST', body: formData });
            if (!resUpload.ok) throw new Error(await mensagemDeErro(resUpload, 'Falha ao enviar o anexo.'));
            anexoUrl = (await resUpload.json()).url;
        }

        const res = await window.api.fetchProtected(`/tarefas/${id}/comentarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texto, anexo_url: anexoUrl })
        });
        if (!res.ok) throw new Error(await mensagemDeErro(res, 'Falha ao enviar comentário.'));

        if (document.getElementById('detalhe-comentarios-lista')) carregarComentariosTarefa(id);
        else if (document.getElementById('modalResumoTarefa')) window.abrirResumoTarefa(id);
    } catch (err) {
        window.UI.showToast(err.message || 'Falha ao enviar comentário.', 'error');
        btn.disabled = false;
        btn.innerText = textoOriginalBtn;
    }
};

// ==========================================
// CONCLUIR TAREFA 
// ==========================================
function criarInputDeTags(idContainer, iniciais) {
    const container = document.getElementById(idContainer);
    const tags = [...iniciais];

    container.innerHTML = `
        <div class="tag-chips" style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:6px;"></div>
        <input type="text" class="form-control" list="${idContainer}-sugestoes" maxlength="40" placeholder="Digite e pressione Enter (ex.: pla, extrusão)">
        <datalist id="${idContainer}-sugestoes"></datalist>`;
    const chips = container.querySelector('.tag-chips');
    const input = container.querySelector('input');
    const datalist = container.querySelector('datalist');

    const desenhar = () => {
        chips.innerHTML = tags.map((tag, i) => `
            <span class="badge" style="gap:6px;">${escT(tag)}
                <button type="button" data-i="${i}" style="background:none; border:none; cursor:pointer; padding:0; font-size:14px; line-height:1; color:inherit;" aria-label="Remover tag">&times;</button>
            </span>`).join('');
        chips.querySelectorAll('button').forEach(b => {
            b.onclick = () => { tags.splice(parseInt(b.dataset.i, 10), 1); desenhar(); };
        });
    };
    const adicionar = (valor) => {
        const v = valor.trim().toLowerCase().replace(/\s+/g, ' ');
        if (!v || tags.includes(v) || tags.length >= 10) return;
        tags.push(v);
        desenhar();
    };

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            adicionar(input.value.replace(/,/g, ''));
            input.value = '';
        }
    });
    input.addEventListener('blur', () => {
        if (input.value.trim()) { adicionar(input.value); input.value = ''; }
    });

    window.api.fetchProtected('/tarefas/tags')
        .then(r => r.ok ? r.json() : [])
        .then(lista => { datalist.innerHTML = lista.map(x => `<option value="${escT(x.tag)}"></option>`).join(''); })
        .catch(() => {});

    desenhar();
    return {
        obter: () => {
            if (input.value.trim()) { adicionar(input.value); input.value = ''; }
            return tags;
        }
    };
}

window.abrirModalConcluir = function (id) {
    const tarefa = buscarTarefaEmCache(id);
    if (!tarefa) return;
    fecharModais('modalConcluirTarefa');

    document.body.insertAdjacentHTML('beforeend', `
    <div id="modalConcluirTarefa" class="modal-overlay" style="display:flex; position:fixed; top:0; left:0; width:100%; height:100%; z-index:1000000; justify-content:center; align-items:center; padding:20px;">
        <div class="modal-content" style="width:100%; max-width:640px; max-height:92vh; overflow-y:auto; border-radius:4px; border-top:3px solid var(--success, var(--primary));">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <h3 style="margin:0;">Concluir tarefa</h3>
                <button type="button" onclick="document.getElementById('modalConcluirTarefa').remove()" style="background:none; border:none; font-size:26px; cursor:pointer; color:var(--text-faint);">&times;</button>
            </div>
            <p class="text-muted" style="font-size:13px; margin:0 0 16px 0;"><strong>${escT(tarefa.titulo)}</strong><br>Este registro fica na base de dados e ajuda quem chegar depois a não refazer o que já foi feito. Depois de concluída, a tarefa fica travada.</p>
            <form id="formConcluirTarefa">
                <div class="input-group" style="margin-bottom:14px;">
                    <label>Resultado *</label>
                    <textarea id="concluir-resultado" class="form-control" rows="4" required minlength="10" placeholder="O que foi obtido? Inclua dados, condições e valores relevantes."></textarea>
                </div>
                <div class="input-group" style="margin-bottom:14px;">
                    <label>Desfecho *</label>
                    <select id="concluir-desfecho" class="form-control" required>
                        <option value="" disabled selected>Selecione...</option>
                        ${Object.entries(DESFECHO_LABEL).map(([valor, rotulo]) => `<option value="${valor}">${rotulo}</option>`).join('')}
                    </select>
                </div>
                <div class="input-group" style="margin-bottom:14px;">
                    <label>Lições aprendidas / o que não funcionou</label>
                    <textarea id="concluir-licoes" class="form-control" rows="3" placeholder="Opcional. O que faria diferente? O que evitar?"></textarea>
                </div>
                <div class="input-group" style="margin-bottom:14px;">
                    <label>Palavras-chave (tags)</label>
                    <div id="concluir-tags"></div>
                    <span class="text-muted" style="font-size:12px;">Ajudam a encontrar este registro na busca. Reaproveite as já existentes.</span>
                </div>
                ${htmlSelectsVinculo('concluir')}
                <div style="display:flex; justify-content:flex-end; gap:10px;">
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('modalConcluirTarefa').remove()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Concluir tarefa</button>
                </div>
            </form>
        </div>
    </div>`);

    const tagInput = criarInputDeTags('concluir-tags', tarefa.tags || []);
    carregarOpcoesVinculo('concluir-processo', 'concluir-topico', tarefa.processo_id, tarefa.topico_id);

    document.getElementById('formConcluirTarefa').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerText = 'Concluindo...';

        const payload = {
            resultado: document.getElementById('concluir-resultado').value,
            desfecho: document.getElementById('concluir-desfecho').value,
            licoes: document.getElementById('concluir-licoes').value || null,
            tags: tagInput.obter(),
            ...lerVinculos('concluir-processo', 'concluir-topico')
        };

        try {
            const res = await window.api.fetchProtected(`/tarefas/${id}/concluir`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error(await mensagemDeErro(res, 'Falha ao concluir a tarefa.'));

            fecharModais('modalConcluirTarefa', 'modalDetalhesTarefa');
            window.UI.showToast('Tarefa concluída e registrada na base de dados!', 'success');
            recarregarTarefas();
            window.abrirResumoTarefa(id);
        } catch (err) {
            window.UI.showToast(err.message, 'error');
            btn.disabled = false;
            btn.innerText = 'Concluir tarefa';
        }
    });
};

window.abrirModalDevolver = function (id) {
    const tarefa = buscarTarefaEmCache(id);
    if (!tarefa) return;
    fecharModais('modalDevolverTarefa');

    document.body.insertAdjacentHTML('beforeend', `
    <div id="modalDevolverTarefa" class="modal-overlay" style="display:flex; position:fixed; top:0; left:0; width:100%; height:100%; z-index:1000000; justify-content:center; align-items:center; padding:20px;">
        <div class="modal-content" style="width:100%; max-width:520px; border-radius:4px; border-top:3px solid var(--warning, var(--primary));">
            <h3 style="margin:0 0 6px 0;">Devolver para ajustes</h3>
            <p class="text-muted" style="font-size:13px; margin:0 0 14px 0;">${escT(tarefa.titulo)}</p>
            <form id="formDevolverTarefa">
                <div class="input-group" style="margin-bottom:14px;">
                    <label>O que precisa ser ajustado? *</label>
                    <textarea id="devolver-motivo" class="form-control" rows="4" required minlength="3"></textarea>
                </div>
                <div style="display:flex; justify-content:flex-end; gap:10px;">
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('modalDevolverTarefa').remove()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Devolver</button>
                </div>
            </form>
        </div>
    </div>`);

    document.getElementById('formDevolverTarefa').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        try {
            const res = await window.api.fetchProtected(`/tarefas/${id}/devolver`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ motivo: document.getElementById('devolver-motivo').value })
            });
            if (!res.ok) throw new Error(await mensagemDeErro(res, 'Falha ao devolver a tarefa.'));

            fecharModais('modalDevolverTarefa', 'modalDetalhesTarefa');
            window.UI.showToast('Tarefa devolvida. O colaborador foi avisado.', 'success');
            recarregarTarefas();
        } catch (err) {
            window.UI.showToast(err.message, 'error');
            btn.disabled = false;
        }
    });
};

window.reabrirTarefa = async function (id) {
    const ok = await window.UI.confirm('Reabrir esta tarefa? Ela sai da base de dados e volta para "Em andamento" para permitir correções.', { title: 'Reabrir tarefa', confirmText: 'Reabrir' });
    if (!ok) return;
    try {
        const res = await window.api.fetchProtected(`/tarefas/${id}/reabrir`, { method: 'POST' });
        if (!res.ok) throw new Error(await mensagemDeErro(res, 'Falha ao reabrir a tarefa.'));
        fecharModais('modalResumoTarefa');
        window.UI.showToast('Tarefa reaberta.', 'success');
        recarregarTarefas();
    } catch (err) {
        window.UI.showToast(err.message, 'error');
    }
};

// ==========================================
// RESUMO DA TAREFA CONCLUÍDA
// ==========================================
function cartaoMetrica(rotulo, valor, cor) {
    return `<div style="background:var(--bg-subtle); border-radius:var(--radius-md); padding:12px;">
        <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-muted); font-weight:600;">${rotulo}</div>
        <div style="font-size:15.5px; font-weight:700; margin-top:4px;${cor ? ` color:${cor};` : ''}">${valor}</div>
    </div>`;
}

function corContraPrazo(segundos) {
    if (segundos === null || segundos === undefined) return '';
    return segundos > 60 ? 'var(--danger)' : 'var(--success)';
}

function fmtPrazoIso(iso) {
    return iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'sem prazo';
}

function descreverEvento(ev) {
    const nome = `<strong>${escT(ev.usuario_nome)}</strong>`;
    const d = ev.dados || {};
    switch (ev.tipo) {
        case 'criada': return `${nome} criou a tarefa`;
        case 'progresso': return `${nome} atualizou o progresso para ${d.percentual_para}% (${STATUS_LABEL[d.status_para] || escT(d.status_para)})`;
        case 'enviada_revisao': return `${nome} enviou a tarefa para revisão`;
        case 'devolvida': return `${nome} devolveu a tarefa para ajustes`;
        case 'concluida': return `${nome} concluiu a tarefa${d.desfecho ? ` (${DESFECHO_LABEL[d.desfecho] || escT(d.desfecho)})` : ''}`;
        case 'reaberta': return `${nome} reabriu a tarefa`;
        case 'prazo_alterado': return `${nome} alterou o prazo de ${fmtPrazoIso(d.de)} para ${fmtPrazoIso(d.para)}`;
        default: return `${nome}: ${escT(ev.tipo)}`;
    }
}

function corDoEvento(tipo) {
    return {
        concluida: 'var(--success)', enviada_revisao: 'var(--primary)', devolvida: 'var(--warning)',
        reaberta: 'var(--warning)', prazo_alterado: 'var(--warning)', comentario: 'var(--text-faint)'
    }[tipo] || 'var(--border-strong, var(--text-faint))';
}

window.abrirResumoTarefa = async function (id) {
    const user = usuarioAtual();
    if (!user) return;
    fecharModais('modalResumoTarefa');

    document.body.insertAdjacentHTML('beforeend', `
    <div id="modalResumoTarefa" class="modal-overlay" style="display:flex; position:fixed; top:0; left:0; width:100%; height:100%; z-index:999999; justify-content:center; align-items:flex-start; padding:20px; overflow-y:auto;">
        <div class="modal-content" style="width:100%; max-width:820px; border-radius:4px; border-top:3px solid var(--primary); margin:auto;">
            <div id="resumo-corpo"><span class="spinner"></span> Carregando resumo...</div>
        </div>
    </div>`);

    const corpo = document.getElementById('resumo-corpo');
    try {
        const res = await window.api.fetchProtected(`/tarefas/${id}/resumo`);
        if (!res.ok) throw new Error(await mensagemDeErro(res, 'Não foi possível carregar o resumo.'));
        const { tarefa: t, metricas: m, linha_do_tempo: linha } = await res.json();

        const gestor = isGestor(user);
        const envolvido = gestor || t.atribuidos.some(a => a.id === user.id);
        const conclusaoCor = corContraPrazo(m.conclusao_vs_prazo_segundos);
        const vinculos = [
            t.processo_nome ? `Processo: <strong>${escT(t.processo_nome)}</strong>` : '',
            t.topico_titulo ? `Tópico PTA: <strong>${escT(t.topico_titulo)}</strong>` : ''
        ].filter(Boolean).join(' · ');

        const metricasHtml = [
            cartaoMetrica('Tempo total', fmtDuracao(m.tempo_total_segundos)),
            cartaoMetrica('Conclusão × prazo', fmtContraPrazo(m.conclusao_vs_prazo_segundos), conclusaoCor),
            m.tempo_em_revisao_segundos !== null ? cartaoMetrica('Entrega × prazo', fmtContraPrazo(m.entrega_vs_prazo_segundos), corContraPrazo(m.entrega_vs_prazo_segundos)) : '',
            cartaoMetrica('Até o 1º progresso', fmtDuracao(m.tempo_ate_primeiro_progresso_segundos)),
            cartaoMetrica('Tempo em revisão', fmtDuracao(m.tempo_em_revisao_segundos)),
            cartaoMetrica('Devoluções', m.devolucoes),
            cartaoMetrica('Prazo alterado', `${m.prazo_alterado_vezes}×`),
            cartaoMetrica('Comentários / anexos', `${m.comentarios} / ${m.anexos}`)
        ].join('');

        const timelineHtml = linha.map(item => {
            const cor = corDoEvento(item.tipo);
            let conteudo;
            if (item.origem === 'comentario') {
                conteudo = `<strong>${escT(item.usuario_nome)}</strong> comentou
                    <p style="margin:4px 0 0 0; white-space:pre-wrap; background:var(--bg-subtle); padding:8px 10px; border-radius:var(--radius-md);">${escT(item.texto)}</p>
                    ${renderAnexoComentario(item.anexo_url)}`;
            } else {
                conteudo = descreverEvento(item);
            }
            return `<div style="display:flex; gap:12px; padding-bottom:14px;">
                <div style="flex:0 0 10px; display:flex; flex-direction:column; align-items:center;">
                    <span style="width:10px; height:10px; border-radius:50%; background:${cor}; margin-top:4px;"></span>
                    <span style="flex:1; width:2px; background:var(--border-color); margin-top:4px;"></span>
                </div>
                <div style="flex:1; font-size:13px; line-height:1.5;">
                    <div class="text-faint" style="font-size:11.5px;">${fmtDataHora(item.criado_em)}</div>
                    ${conteudo}
                </div>
            </div>`;
        }).join('');

        corpo.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:10px;">
                <div>
                    <div class="text-muted" style="font-size:11.5px; text-transform:uppercase; letter-spacing:0.05em; font-weight:600;">Resumo da tarefa</div>
                    <h3 style="margin:4px 0 0 0;">${escT(t.titulo)}</h3>
                </div>
                <button type="button" onclick="document.getElementById('modalResumoTarefa').remove()" style="background:none; border:none; font-size:26px; cursor:pointer; color:var(--text-faint); line-height:1;">&times;</button>
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px;">
                ${t.status === 'concluida' ? '<span class="badge badge-success">Concluída</span>' : badgeStatus(t)}
                ${badgeDesfecho(t)}${badgePrioridade(t)}
            </div>
            <p class="text-muted" style="font-size:13px; margin:0 0 4px 0;">
                Atribuída a <strong>${t.atribuidos.map(a => escT(a.nome)).join(', ') || '—'}</strong> · Criada por ${escT(t.criado_por_nome)} em ${fmtData(t.criado_em)}
                ${t.concluida_em ? ` · Concluída por ${escT(t.concluida_por_nome || '—')} em ${fmtDataHora(t.concluida_em)}` : ''}
            </p>
            ${vinculos ? `<p class="text-muted" style="font-size:13px; margin:0 0 4px 0;">${vinculos}</p>` : ''}

            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:10px; margin:18px 0;">${metricasHtml}</div>

            ${t.descricao ? `<h4 style="margin:0 0 6px 0; font-size:14px;">O que foi pedido</h4>
                <div style="background:var(--bg-subtle); padding:12px 14px; border-radius:var(--radius-md); font-size:13.5px; white-space:pre-wrap; margin-bottom:16px;">${escT(t.descricao)}</div>` : ''}

            <h4 style="margin:0 0 6px 0; font-size:14px;">Resultado</h4>
            <div style="background:var(--bg-subtle); padding:12px 14px; border-radius:var(--radius-md); font-size:13.5px; white-space:pre-wrap; margin-bottom:16px; border-left:3px solid var(--success, var(--primary));">${t.resultado ? escT(t.resultado) : '<em class="text-faint">Sem registro de resultado.</em>'}</div>

            ${t.licoes ? `<h4 style="margin:0 0 6px 0; font-size:14px;">Lições aprendidas / o que não funcionou</h4>
                <div style="background:var(--bg-subtle); padding:12px 14px; border-radius:var(--radius-md); font-size:13.5px; white-space:pre-wrap; margin-bottom:16px;">${escT(t.licoes)}</div>` : ''}

            ${t.tags && t.tags.length ? `<div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:16px;">${chipsTags(t.tags, false)}</div>` : ''}

            <p class="text-muted" style="font-size:12.5px; margin:0 0 18px 0;">Participaram: ${m.participantes.map(escT).join(', ') || '—'}</p>

            <h4 style="margin:0 0 12px 0; font-size:14px;">Linha do tempo</h4>
            <div>${timelineHtml || '<p class="text-faint" style="font-size:13px;">Sem histórico registrado.</p>'}</div>

            ${envolvido ? `<div style="border-top:1px solid var(--border-light); padding-top:14px; margin-top:6px;">
                <h4 style="margin:0 0 8px 0; font-size:14px;">Adendo</h4>
                <p class="text-muted" style="font-size:12.5px; margin:0 0 8px 0;">A tarefa está travada. Correções e informações novas entram como comentário.</p>
                ${htmlFormComentario()}
            </div>` : ''}

            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px; border-top:1px solid var(--border-color); padding-top:16px;">
                ${(user.role === 'admin' && t.status === 'concluida') ? `<button type="button" class="btn btn-outline-danger" onclick="window.reabrirTarefa(${t.id})">Reabrir tarefa</button>` : ''}
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('modalResumoTarefa').remove()">Fechar</button>
            </div>
        `;

        const form = document.getElementById('formComentarioTarefa');
        if (form) form.addEventListener('submit', (e) => window.enviarComentarioTarefa(e, t.id));
    } catch (err) {
        corpo.innerHTML = `${window.UI.errorState(err.message)}
            <div style="text-align:center;"><button type="button" class="btn btn-secondary" onclick="document.getElementById('modalResumoTarefa').remove()">Fechar</button></div>`;
    }
};
})();
