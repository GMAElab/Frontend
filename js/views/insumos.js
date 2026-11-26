// ==========================================
// INSUMOS DO LABORATÓRIO
// Reagentes, EPIs, vidrarias e utilidades: saldo, validade e reposição.
// O saldo só muda por movimentação (entrada, uso ou reporte), então cada
// número da tabela tem data e responsável no histórico.
// ==========================================
(function () {
    'use strict';

    const CATEGORIAS = ['Reagentes', 'EPIs', 'Vidrarias', 'Utilidades'];
    const UNIDADES = ['mL', 'L', 'g', 'kg', 'un', 'cx', 'par'];
    const MOTIVOS_REPORTE = [
        { id: 'acabou', rotulo: 'Acabou o estoque', texto: 'O insumo acabou.', saldo: 0 },
        { id: 'danificado', rotulo: 'Embalagem danificada', texto: 'Frasco ou embalagem danificada.' },
        { id: 'vencido', rotulo: 'Produto vencido', texto: 'Produto encontrado vencido.' },
        { id: 'divergencia', rotulo: 'Saldo não confere', texto: 'O saldo do sistema não confere com o que está no local.', contar: true },
    ];

    const esc = (v) => window.escapeHTML(v);
    const icone = (nome, size = 14) => (window.Icon ? window.Icon(nome, { size }) : '');
    const FORMATO_NUM = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });
    const num = (n) => FORMATO_NUM.format(Number(n || 0));
    const FORMATO_DIA = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
    const FORMATO_DATA_HORA = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const dataBR = (iso) => (iso ? FORMATO_DIA.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`)) : '');

    function dataHora(iso) {
        if (!iso) return '';
        const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
        return Number.isNaN(d.getTime()) ? '' : FORMATO_DATA_HORA.format(d);
    }

    const E = { itens: [], resumo: null, busca: '', categoria: '', alerta: '' };

    /** Mesma chave do backend: sem acento, sem caixa e sem pontuação. */
    const chaveNome = (nome) => String(nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '');
    const palavras = (nome) => String(nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase().split(/[^a-z0-9]+/).filter(p => p.length >= 3);

    /** Exato: mesmo nome normalizado. Parecidos: um contém o outro ou dividem as palavras principais. */
    function procurarDuplicados(nome, ignorarId) {
        const chave = chaveNome(nome);
        if (chave.length < 3) return { exato: null, parecidos: [] };
        const outros = E.itens.filter(i => i.id !== ignorarId);
        const exato = outros.find(i => chaveNome(i.nome) === chave) || null;
        const minhas = palavras(nome);
        const parecidos = outros.filter(i => i !== exato && (() => {
            const k = chaveNome(i.nome);
            if (k.includes(chave) || chave.includes(k)) return true;
            const delas = palavras(i.nome);
            const comuns = minhas.filter(p => delas.includes(p)).length;
            return minhas.length > 0 && comuns >= Math.min(2, minhas.length) && comuns >= Math.ceil(Math.min(minhas.length, delas.length) / 2);
        })()).slice(0, 3);
        return { exato, parecidos };
    }

    // ==========================================
    // API
    // ==========================================
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
            const det = Array.isArray(dados.detail)
                ? dados.detail.map(d => String(d.msg || '').replace(/^Value error, /, '')).join(' ')
                : dados.detail;
            throw new Error(det || 'Não foi possível concluir a ação.');
        }
        return dados;
    }

    /** Trava o botão durante a requisição: evita o duplo clique registrar duas saídas. */
    async function comBotao(btn, rotulo, fn) {
        if (!btn || btn.disabled) return;
        const original = btn.innerHTML;
        btn.disabled = true;
        btn.setAttribute('aria-busy', 'true');
        btn.innerHTML = `<span class="spinner" aria-hidden="true"></span> ${rotulo}…`;
        try { return await fn(); } finally {
            if (btn.isConnected) { btn.disabled = false; btn.removeAttribute('aria-busy'); btn.innerHTML = original; }
        }
    }

    // ==========================================
    // REGRAS DE EXIBIÇÃO
    // ==========================================
    /** OK, Repor (no mínimo ou abaixo) ou Crítico (zerado ou com metade do mínimo). */
    function nivel(i) {
        const saldo = i.quantidade_atual || 0;
        const min = i.estoque_minimo || 0;
        if (saldo <= 0) return 'critico';
        if (min > 0 && saldo <= min / 2) return 'critico';
        if (min > 0 && saldo <= min) return 'repor';
        return 'ok';
    }
    const NIVEL = {
        ok: { rotulo: 'OK', classe: 'badge-success' },
        repor: { rotulo: 'Repor', classe: 'badge-warning' },
        critico: { rotulo: 'Crítico', classe: 'badge-danger' },
    };

    function saldoHTML(i) {
        const n = nivel(i);
        const min = i.estoque_minimo || 0;
        const escala = Math.max(min * 2, i.quantidade_atual || 0, 1);
        const pct = Math.min(100, ((i.quantidade_atual || 0) / escala) * 100);
        const marca = min > 0 ? `<span class="ins-regua-min" style="left:${((min / escala) * 100).toFixed(1)}%"></span>` : '';
        const descricao = min > 0
            ? `${num(i.quantidade_atual)} de ${num(min)} ${i.unidade} de mínimo`
            : `${num(i.quantidade_atual)} ${i.unidade}, sem mínimo definido`;
        return `
            <div class="ins-saldo">
                <div class="ins-saldo-linha">
                    <span class="ins-saldo-num"><strong>${num(i.quantidade_atual)}</strong> / ${min > 0 ? num(min) : '—'} <span translate="no">${esc(i.unidade)}</span></span>
                    <span class="badge ${NIVEL[n].classe}">${NIVEL[n].rotulo}</span>
                </div>
                <span class="ins-regua is-${n}" role="img" aria-label="${esc(descricao)}"><span class="ins-regua-fill" style="width:${pct.toFixed(1)}%"></span>${marca}</span>
            </div>`;
    }

    function validadeHTML(i) {
        if (!i.validade) return '<span class="text-faint">—</span>';
        const dias = i.dias_para_vencer;
        if (i.vencido) return `<span class="ins-validade is-vencido">${dataBR(i.validade)}<small>vencido há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'dia' : 'dias'}</small></span>`;
        if (i.vencendo) return `<span class="ins-validade is-vencendo">${dataBR(i.validade)}<small>${dias === 0 ? 'vence hoje' : `vence em ${dias} ${dias === 1 ? 'dia' : 'dias'}`}</small></span>`;
        return `<span class="ins-validade">${dataBR(i.validade)}</span>`;
    }

    // ==========================================
    // TELA
    // ==========================================
    document.addEventListener('viewChanged', (e) => {
        if (e.detail.view === 'insumos') renderInsumos();
    });

    function renderInsumos() {
        const main = document.getElementById('dynamic-content');
        if (!main) return;
        main.innerHTML = `
            <div id="ins-raiz">
                <header class="page-head fade-in">
                    <div>
                        <p class="eyebrow">laboratório</p>
                        <h1>Insumos</h1>
                        <p class="lede">Controle de reagentes, EPIs, vidrarias e alertas de reposição.</p>
                    </div>
                    <div class="page-actions">
                        <button type="button" class="btn btn-secondary" data-acao="importar">${icone('upload')} Importar planilha</button>
                        <button type="button" class="btn btn-secondary" data-acao="exportar">${icone('download')} Exportar Excel</button>
                        <button type="button" class="btn btn-primary" id="btn-novo-insumo" data-acao="novo">${icone('plus')} Novo insumo</button>
                    </div>
                </header>
                <div class="figures ins-figures fade-in" id="ins-indicadores" aria-live="polite">${indicadoresHTML(null)}</div>
                <div class="toolbar list-toolbar ins-toolbar">
                    <p class="result-count" id="ins-contador" aria-live="polite"></p>
                    <div class="toolbar-controls">
                        <div class="search-box">
                            ${icone('search', 15)}
                            <input type="search" class="form-control" id="ins-busca" name="busca" data-busca autocomplete="off" placeholder="Buscar insumo…" aria-label="Buscar insumo pelo nome" value="${esc(E.busca)}">
                            <kbd title="Pressione / para focar na busca">/</kbd>
                        </div>
                        <select class="form-control" id="ins-categoria" name="categoria" aria-label="Categoria">
                            <option value="">Todas as categorias</option>
                            ${CATEGORIAS.map(c => `<option value="${c}" ${E.categoria === c ? 'selected' : ''}>${c}</option>`).join('')}
                        </select>
                        <select class="form-control" id="ins-alerta" name="alerta" aria-label="Alerta">
                            <option value="">Todos os alertas</option>
                            <option value="baixo" ${E.alerta === 'baixo' ? 'selected' : ''}>Abaixo do mínimo</option>
                            <option value="validade" ${E.alerta === 'validade' ? 'selected' : ''}>Vencendo ou vencidos</option>
                        </select>
                    </div>
                </div>
                <div class="table-container fade-in">
                    <table class="data-table ins-table">
                        <thead><tr>
                            <th scope="col">Insumo</th>
                            <th scope="col" class="col-hide-sm">Categoria</th>
                            <th scope="col" class="col-hide-md">Localização</th>
                            <th scope="col">Saldo / mínimo</th>
                            <th scope="col" class="col-hide-xs">Validade</th>
                            <th scope="col" class="end">Ações</th>
                        </tr></thead>
                        <tbody id="ins-corpo" aria-busy="true">${linhasEsqueleto()}</tbody>
                    </table>
                </div>
            </div>`;

        const raiz = document.getElementById('ins-raiz');
        raiz.addEventListener('click', aoClicar);
        document.getElementById('ins-busca').addEventListener('input', (e) => { E.busca = e.target.value; renderTabela(); });
        document.getElementById('ins-categoria').addEventListener('change', (e) => { E.categoria = e.target.value; renderTabela(); });
        document.getElementById('ins-alerta').addEventListener('change', (e) => { E.alerta = e.target.value; renderTabela(); });
        carregar();
    }

    /** A tabela é redesenhada depois de cada ação: devolve o foco ao mesmo botão da linha nova. */
    function focarAcao(acao, id) {
        const btn = document.querySelector(`#ins-corpo [data-acao="${acao}"][data-id="${id}"]`);
        if (btn && !btn.disabled) btn.focus();
        else document.querySelector(`#ins-corpo tr[data-insumo="${id}"] [data-acao="historico"]`)?.focus();
    }

    function linhasEsqueleto() {
        return Array.from({ length: 5 }, () => `<tr class="is-skeleton">${'<td><span class="skeleton"></span></td>'.repeat(6)}</tr>`).join('');
    }

    async function carregar() {
        try {
            const dados = await req('/insumos');
            E.itens = dados.itens || [];
            E.resumo = dados.resumo;
            document.getElementById('ins-indicadores').innerHTML = indicadoresHTML(E.resumo);
            renderTabela();
        } catch (err) {
            const corpo = document.getElementById('ins-corpo');
            if (corpo) {
                corpo.setAttribute('aria-busy', 'false');
                corpo.innerHTML = `<tr><td colspan="6">${window.UI.errorState(esc(err.message))}</td></tr>`;
            }
        }
    }

    function indicadoresHTML(r) {
        const v = (n) => (r ? num(n) : '—');
        const criticos = E.itens.filter(i => nivel(i) === 'critico' && (i.estoque_minimo || 0) > 0).length;
        const tomBaixo = r && r.abaixo_minimo ? (criticos ? ' tone-danger' : ' tone-warning') : '';
        const tomValidade = r && r.vencidos ? ' tone-danger' : r && r.vencendo_30d ? ' tone-warning' : '';
        const vencidos = r && r.vencidos ? ` (${r.vencidos} já ${r.vencidos === 1 ? 'vencido' : 'vencidos'})` : '';
        return `
            <div class="figure"><span class="v">${v(r?.total)}</span><span class="k">Total de itens</span></div>
            <div class="figure${tomBaixo}"><span class="v">${v(r?.abaixo_minimo)}</span><span class="k">Abaixo do mínimo</span></div>
            <div class="figure${tomValidade}"><span class="v">${v(r?.vencendo_30d)}</span><span class="k">Vencendo em 30 dias${vencidos}</span></div>
            <div class="figure"><span class="v">${v(r?.movimentacoes_mes)}</span><span class="k">Movimentações no mês</span></div>`;
    }

    function filtrados() {
        const termo = E.busca.trim().toLowerCase();
        return E.itens.filter(i => {
            if (termo && !(i.nome || '').toLowerCase().includes(termo)) return false;
            if (E.categoria && i.categoria !== E.categoria) return false;
            if (E.alerta === 'baixo' && !i.abaixo_minimo) return false;
            if (E.alerta === 'validade' && !(i.vencendo || i.vencido)) return false;
            return true;
        });
    }

    function renderTabela() {
        const corpo = document.getElementById('ins-corpo');
        if (!corpo) return;
        corpo.setAttribute('aria-busy', 'false');
        const lista = filtrados();
        const contador = document.getElementById('ins-contador');
        const algumFiltro = E.busca.trim() || E.categoria || E.alerta;

        if (!E.itens.length) {
            contador.textContent = '';
            corpo.innerHTML = `<tr><td colspan="6">${window.UI.emptyState({
                title: 'Nenhum insumo cadastrado',
                description: 'Cadastre os reagentes, EPIs e vidrarias do laboratório para acompanhar saldo, validade e reposição.',
                actionLabel: 'Cadastrar o primeiro insumo',
                actionOnclick: "document.getElementById('btn-novo-insumo')?.click()",
            })}</td></tr>`;
            return;
        }
        contador.textContent = `${lista.length} ${lista.length === 1 ? 'insumo encontrado' : 'insumos encontrados'}`;
        if (!lista.length) {
            corpo.innerHTML = `<tr><td colspan="6">${window.UI.emptyState({
                title: 'Nenhum insumo com esses filtros',
                description: algumFiltro ? 'Mude a busca ou os filtros para ver outros itens.' : '',
                actionLabel: 'Limpar filtros',
                actionOnclick: 'window.insumosLimparFiltros()',
            })}</td></tr>`;
            return;
        }

        // Primeiro o que pede ação: crítico, repor, vencido/vencendo; depois o resto em ordem alfabética.
        const peso = (i) => (nivel(i) === 'critico' ? 0 : nivel(i) === 'repor' ? 1 : i.vencido ? 2 : i.vencendo ? 3 : 4);
        lista.sort((a, b) => peso(a) - peso(b) || a.nome.localeCompare(b.nome, 'pt-BR'));
        corpo.innerHTML = lista.map(linhaHTML).join('');
    }

    function linhaHTML(i) {
        const semSaldo = (i.quantidade_atual || 0) <= 0;
        return `
            <tr class="${nivel(i) === 'critico' ? 'is-critico' : ''}" data-insumo="${i.id}">
                <td>
                    <span class="ins-nome">${esc(i.nome)}</span>
                    ${i.localizacao ? `<span class="ins-sub ins-local-curto">${esc(i.localizacao)}</span>` : ''}
                    ${i.vencido || i.vencendo ? `<span class="ins-sub ins-validade-curta ${i.vencido ? 'text-danger' : 'text-warning'}">${i.vencido ? 'Vencido' : 'Vence'} em ${dataBR(i.validade)}</span>` : ''}
                </td>
                <td class="col-hide-sm">${esc(i.categoria)}</td>
                <td class="col-hide-md">${i.localizacao ? esc(i.localizacao) : '<span class="text-faint">—</span>'}</td>
                <td>${saldoHTML(i)}</td>
                <td class="col-hide-xs">${validadeHTML(i)}</td>
                <td class="end">
                    <span class="ins-acoes" role="group" aria-label="Ações para ${esc(i.nome)}">
                        <button type="button" class="link-btn" data-acao="ENTRADA" data-id="${i.id}">+ Entrada</button>
                        <button type="button" class="link-btn is-uso" data-acao="SAIDA" data-id="${i.id}" ${semSaldo ? 'disabled title="Sem saldo para registrar uso"' : ''}>− Uso</button>
                        <button type="button" class="link-btn is-reportar" data-acao="REPORTE" data-id="${i.id}">${icone('alert-triangle', 13)} Reportar</button>
                        <span class="ins-sep" aria-hidden="true"></span>
                        <button type="button" class="link-btn muted" data-acao="historico" data-id="${i.id}">Histórico</button>
                        <button type="button" class="link-btn muted" data-acao="editar" data-id="${i.id}">Editar</button>
                    </span>
                </td>
            </tr>`;
    }

    function aoClicar(e) {
        const alvo = e.target.closest('[data-acao]');
        if (!alvo || alvo.disabled) return;
        const item = E.itens.find(i => i.id === Number(alvo.dataset.id));
        switch (alvo.dataset.acao) {
            case 'ENTRADA': case 'SAIDA': if (item) abrirMovimento(alvo.dataset.acao, item, alvo); break;
            case 'REPORTE': if (item) abrirReporte(item, alvo); break;
            case 'historico': if (item) abrirHistorico(item, alvo); break;
            case 'editar': if (item) abrirFormulario(item, alvo); break;
            case 'novo': abrirFormulario(null, alvo); break;
            case 'exportar': exportar(alvo); break;
            case 'importar': abrirImportacao(alvo); break;
            default: break;
        }
    }

    // ==========================================
    // MODAIS
    // ==========================================
    function abrirModal({ id, eyebrow, titulo, corpo, rodape, tamanho = 'modal-sm', origem }) {
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
        const fechar = () => {
            modal.remove();
            if (origem && origem.isConnected) origem.focus();
        };
        modal.fechar = fechar;
        modal.querySelectorAll('[data-role="cancel"]').forEach(b => b.addEventListener('click', fechar));
        modal.addEventListener('click', (ev) => { if (ev.target === modal) fechar(); });
        return modal;
    }

    function erroNoCampo(campo, mensagem) {
        const ajuda = document.getElementById(`${campo.id}-erro`);
        campo.setAttribute('aria-invalid', mensagem ? 'true' : 'false');
        if (ajuda) { ajuda.textContent = mensagem || ''; ajuda.classList.toggle('hidden', !mensagem); }
    }

    /** Entrada (+) e uso (−): o mais curto possível, com o foco já na quantidade. */
    function abrirMovimento(tipo, item, origem) {
        const entrada = tipo === 'ENTRADA';
        const min = item.estoque_minimo || 0;
        const modal = abrirModal({
            id: 'ins-modal-mov', origem,
            eyebrow: item.localizacao ? `${item.nome} · ${item.localizacao}` : item.nome,
            titulo: entrada ? 'Registrar entrada' : 'Registrar uso',
            corpo: `
                <form id="ins-form-mov" novalidate>
                    <dl class="ins-mov-resumo">
                        <div><dt>Saldo atual</dt><dd>${num(item.quantidade_atual)} ${esc(item.unidade)}</dd></div>
                        <div><dt>Mínimo</dt><dd>${min > 0 ? `${num(min)} ${esc(item.unidade)}` : '—'}</dd></div>
                        <div><dt>Saldo após</dt><dd id="ins-mov-apos">${num(item.quantidade_atual)} ${esc(item.unidade)}</dd></div>
                    </dl>
                    <div class="input-group">
                        <label for="ins-mov-qtd">${entrada ? 'Quantidade recebida' : 'Quantidade usada'}</label>
                        <div class="ins-qtd">
                            <input type="number" id="ins-mov-qtd" name="quantidade" class="form-control" inputmode="decimal" min="0" step="any" required autocomplete="off" aria-describedby="ins-mov-qtd-erro ins-mov-aviso">
                            <span class="ins-unidade" aria-hidden="true" translate="no">${esc(item.unidade)}</span>
                        </div>
                        ${entrada ? '' : `<div class="ins-atalhos-qtd"><button type="button" class="check-chip" data-tudo>Usar todo o saldo (${num(item.quantidade_atual)} ${esc(item.unidade)})</button></div>`}
                        <p class="field-error hidden" id="ins-mov-qtd-erro" role="alert"></p>
                        <p class="ins-aviso" id="ins-mov-aviso" aria-live="polite"></p>
                    </div>
                    <div class="input-group">
                        <label for="ins-mov-obs">${entrada ? 'Origem' : 'Onde foi usado'} <span class="text-muted">(opcional)</span></label>
                        <input type="text" id="ins-mov-obs" name="observacao" class="form-control" maxlength="2000" autocomplete="off" placeholder="${entrada ? 'Fornecedor, nota fiscal ou lote…' : 'Processo, experimento ou ensaio…'}">
                    </div>
                </form>`,
            rodape: `<button type="button" class="btn btn-secondary" data-role="cancel">Cancelar</button>
                     <button type="submit" form="ins-form-mov" class="btn btn-primary" id="ins-mov-ok">${entrada ? 'Registrar entrada' : 'Registrar uso'}</button>`,
        });

        const qtd = modal.querySelector('#ins-mov-qtd');
        const apos = modal.querySelector('#ins-mov-apos');
        const aviso = modal.querySelector('#ins-mov-aviso');
        const ok = modal.querySelector('#ins-mov-ok');

        const validar = () => {
            const v = Number(qtd.value);
            const preenchido = qtd.value !== '' && Number.isFinite(v);
            const depois = preenchido ? (entrada ? item.quantidade_atual + v : item.quantidade_atual - v) : item.quantidade_atual;
            apos.textContent = `${num(Math.max(0, depois))} ${item.unidade}`;
            apos.classList.toggle('is-alerta', !entrada && preenchido && min > 0 && depois <= min);
            let erro = '';
            if (preenchido && v <= 0) erro = 'Informe uma quantidade maior que zero.';
            else if (!entrada && preenchido && v > item.quantidade_atual) erro = `Maior que o saldo disponível (${num(item.quantidade_atual)} ${item.unidade}).`;
            erroNoCampo(qtd, erro);
            aviso.className = 'ins-aviso';
            aviso.textContent = '';
            if (!erro && preenchido && !entrada && min > 0 && depois <= min) {
                aviso.className = 'ins-aviso text-warning';
                aviso.textContent = item.alerta_minimo_enviado
                    ? 'O estoque já está abaixo do mínimo e a coordenação já foi avisada.'
                    : 'O estoque vai ficar abaixo do mínimo. A coordenação será avisada por e-mail.';
            } else if (!erro && preenchido && entrada && min > 0 && item.quantidade_atual <= min && depois <= min) {
                aviso.className = 'ins-aviso text-warning';
                aviso.textContent = 'Mesmo com esta entrada, o estoque continua no mínimo ou abaixo.';
            }
            return !erro && preenchido;
        };
        qtd.addEventListener('input', validar);
        modal.querySelector('[data-tudo]')?.addEventListener('click', () => { qtd.value = String(item.quantidade_atual); validar(); qtd.focus(); });
        setTimeout(() => qtd.focus(), 30);

        modal.querySelector('#ins-form-mov').addEventListener('submit', (ev) => {
            ev.preventDefault();
            if (!validar()) { if (qtd.value === '') erroNoCampo(qtd, 'Informe a quantidade.'); qtd.focus(); return; }
            const quantidade = Number(qtd.value);
            comBotao(ok, 'Registrando', async () => {
                try {
                    const r = await req(`/insumos/${item.id}/movimentar`, { method: 'POST', json: { tipo, quantidade, observacao: modal.querySelector('#ins-mov-obs').value.trim() || null } });
                    delete modal.querySelector('form').dataset.sujo;
                    modal.fechar();
                    const novo = r.insumo;
                    const base = entrada
                        ? `Entrada registrada: +${num(quantidade)} ${novo.unidade} de ${novo.nome}. Saldo: ${num(novo.quantidade_atual)} ${novo.unidade}.`
                        : `Uso registrado: −${num(quantidade)} ${novo.unidade} de ${novo.nome}. Saldo: ${num(novo.quantidade_atual)} ${novo.unidade}.`;
                    window.UI.showToast(r.gestores_avisados ? `${base} A coordenação foi avisada do estoque baixo.` : base, r.gestores_avisados ? 'warning' : 'success');
                    await carregar();
                    focarAcao(tipo, item.id);
                } catch (err) {
                    erroNoCampo(qtd, err.message);
                    qtd.focus();
                }
            });
        });
    }

    /** Reportar: avisa os gestores na hora. Pode corrigir o saldo com a contagem física. */
    function abrirReporte(item, origem) {
        const modal = abrirModal({
            id: 'ins-modal-reporte', origem,
            eyebrow: item.localizacao ? `${item.nome} · ${item.localizacao}` : item.nome,
            titulo: 'Reportar problema',
            corpo: `
                <form id="ins-form-reporte" novalidate>
                    <p class="dialog-text mb-md">A coordenação recebe um e-mail agora, com o seu nome e a descrição.</p>
                    <div class="ins-motivos" role="group" aria-label="Motivo">
                        ${MOTIVOS_REPORTE.map(m => `<button type="button" class="check-chip" data-motivo="${m.id}" aria-pressed="false">${esc(m.rotulo)}</button>`).join('')}
                    </div>
                    <div class="input-group">
                        <label for="ins-rep-obs">O que aconteceu</label>
                        <textarea id="ins-rep-obs" name="descricao" class="form-control" rows="3" maxlength="2000" required aria-describedby="ins-rep-obs-erro" placeholder="Ex.: frasco com o lacre rompido na prateleira de cima…"></textarea>
                        <p class="field-error hidden" id="ins-rep-obs-erro" role="alert"></p>
                    </div>
                    <label class="check-inline"><input type="checkbox" id="ins-rep-ajustar" name="ajustar_saldo"> Corrigir o saldo com a contagem física</label>
                    <div class="input-group mt-sm hidden" id="ins-rep-saldo-grupo">
                        <label for="ins-rep-saldo">Quantidade encontrada no local</label>
                        <div class="ins-qtd">
                            <input type="number" id="ins-rep-saldo" name="novo_saldo" class="form-control" inputmode="decimal" min="0" step="any" aria-describedby="ins-rep-saldo-erro">
                            <span class="ins-unidade" aria-hidden="true" translate="no">${esc(item.unidade)}</span>
                        </div>
                        <p class="help">No sistema: ${num(item.quantidade_atual)} ${esc(item.unidade)}.</p>
                        <p class="field-error hidden" id="ins-rep-saldo-erro" role="alert"></p>
                    </div>
                </form>`,
            rodape: `<button type="button" class="btn btn-secondary" data-role="cancel">Cancelar</button>
                     <button type="submit" form="ins-form-reporte" class="btn btn-primary" id="ins-rep-ok">Enviar reporte</button>`,
        });
        const obs = modal.querySelector('#ins-rep-obs');
        const ajustar = modal.querySelector('#ins-rep-ajustar');
        const grupoSaldo = modal.querySelector('#ins-rep-saldo-grupo');
        const saldo = modal.querySelector('#ins-rep-saldo');
        const alternarSaldo = (ligado) => { ajustar.checked = ligado; grupoSaldo.classList.toggle('hidden', !ligado); };

        ajustar.addEventListener('change', () => { alternarSaldo(ajustar.checked); if (ajustar.checked) saldo.focus(); });
        modal.querySelectorAll('[data-motivo]').forEach(b => b.addEventListener('click', () => {
            const m = MOTIVOS_REPORTE.find(x => x.id === b.dataset.motivo);
            const ativo = b.getAttribute('aria-pressed') !== 'true';
            b.setAttribute('aria-pressed', String(ativo));
            if (ativo && !obs.value.includes(m.texto)) obs.value = obs.value.trim() ? `${obs.value.trim()} ${m.texto}` : m.texto;
            if (ativo && m.saldo !== undefined) { alternarSaldo(true); saldo.value = String(m.saldo); }
            if (ativo && m.contar) { alternarSaldo(true); saldo.focus(); return; }
            erroNoCampo(obs, '');
            obs.focus();
        }));
        setTimeout(() => obs.focus(), 30);

        modal.querySelector('#ins-form-reporte').addEventListener('submit', (ev) => {
            ev.preventDefault();
            const texto = obs.value.trim();
            if (!texto) { erroNoCampo(obs, 'Descreva o problema encontrado.'); obs.focus(); return; }
            let novoSaldo = null;
            if (ajustar.checked) {
                if (saldo.value === '' || Number(saldo.value) < 0 || !Number.isFinite(Number(saldo.value))) {
                    erroNoCampo(saldo, 'Informe a quantidade encontrada (zero ou mais).'); saldo.focus(); return;
                }
                novoSaldo = Number(saldo.value);
            }
            comBotao(modal.querySelector('#ins-rep-ok'), 'Enviando', async () => {
                try {
                    const r = await req(`/insumos/${item.id}/movimentar`, { method: 'POST', json: { tipo: 'REPORTE', quantidade: 0, observacao: texto, novo_saldo: novoSaldo } });
                    delete modal.querySelector('form').dataset.sujo;
                    modal.fechar();
                    const ajuste = novoSaldo !== null ? ` Saldo corrigido para ${num(r.insumo.quantidade_atual)} ${r.insumo.unidade}.` : '';
                    window.UI.showToast(`Reporte enviado. A coordenação foi avisada.${ajuste}`, 'success');
                    await carregar();
                    focarAcao('REPORTE', item.id);
                } catch (err) { window.UI.showToast(err.message, 'error'); }
            });
        });
    }

    async function abrirHistorico(item, origem) {
        const modal = abrirModal({
            id: 'ins-modal-historico', origem, tamanho: 'modal-md',
            eyebrow: 'histórico de movimentações', titulo: item.nome,
            corpo: `<div id="ins-historico-corpo" class="ins-historico" aria-busy="true">${window.UI.loading('Carregando histórico…')}</div>`,
        });
        const corpo = modal.querySelector('#ins-historico-corpo');
        try {
            const movs = await req(`/insumos/movimentacoes?insumo_id=${item.id}&limite=300`);
            corpo.setAttribute('aria-busy', 'false');
            if (!movs.length) { corpo.innerHTML = window.UI.emptyState({ title: 'Nenhuma movimentação registrada' }); return; }
            const rotulo = { ENTRADA: 'Entrada', SAIDA: 'Uso', REPORTE: 'Reporte' };
            const classe = { ENTRADA: 'is-entrada', SAIDA: 'is-saida', REPORTE: 'is-reporte' };
            corpo.innerHTML = `<ol class="timeline">${movs.map(m => {
                const qtd = m.tipo === 'ENTRADA' ? `+${num(m.quantidade)} ${m.unidade}`
                    : m.tipo === 'SAIDA' ? `−${num(m.quantidade)} ${m.unidade}`
                    : (m.quantidade ? `divergência de ${num(m.quantidade)} ${m.unidade}` : '');
                return `
                    <li class="tl-item ${classe[m.tipo] || ''}">
                        <span class="tl-title">${rotulo[m.tipo] || esc(m.tipo)} ${qtd ? `<span class="ins-mov-qtd ${classe[m.tipo]}">${esc(qtd)}</span>` : ''}
                            ${m.saldo_apos !== null ? `<span class="text-muted text-small">saldo ${num(m.saldo_apos)} ${esc(m.unidade)}</span>` : ''}</span>
                        <p>${esc([m.usuario_nome, dataHora(m.criado_em)].filter(Boolean).join(' · '))}</p>
                        ${m.observacao ? `<p class="tl-quote">${esc(m.observacao)}</p>` : ''}
                    </li>`;
            }).join('')}</ol>`;
        } catch (err) {
            corpo.setAttribute('aria-busy', 'false');
            corpo.innerHTML = window.UI.errorState(esc(err.message));
        }
    }

    function abrirFormulario(item, origem) {
        const novo = !item;
        const i = item || { categoria: 'Reagentes', unidade: 'un', estoque_minimo: 0 };
        const locais = [...new Set(E.itens.map(x => x.localizacao).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
        const modal = abrirModal({
            id: 'ins-modal-form', origem, tamanho: 'modal-md',
            eyebrow: novo ? 'novo insumo' : 'editar insumo',
            titulo: novo ? 'Cadastrar insumo' : i.nome,
            corpo: `
                <form id="ins-form" class="ins-form" novalidate>
                    <div class="field-grid">
                        <div class="input-group span-2">
                            <label for="ins-f-nome">Nome</label>
                            <input type="text" id="ins-f-nome" name="nome" class="form-control" required maxlength="300" autocomplete="off" value="${esc(i.nome || '')}" placeholder="Ex.: Etanol absoluto P.A.…" aria-describedby="ins-f-nome-erro">
                            <p class="field-error hidden" id="ins-f-nome-erro" role="alert"></p>
                            <div class="ins-dup hidden" id="ins-f-dup" aria-live="polite"></div>
                        </div>
                        <div class="input-group">
                            <label for="ins-f-categoria">Categoria</label>
                            <select id="ins-f-categoria" name="categoria" class="form-control">${CATEGORIAS.map(c => `<option ${c === i.categoria ? 'selected' : ''}>${c}</option>`).join('')}</select>
                        </div>
                        <div class="input-group">
                            <label for="ins-f-local">Localização</label>
                            <input type="text" id="ins-f-local" name="localizacao" class="form-control" maxlength="200" list="ins-locais" autocomplete="off" value="${esc(i.localizacao || '')}" placeholder="Ex.: Armário 2, prateleira de cima…">
                            <datalist id="ins-locais">${locais.map(l => `<option value="${esc(l)}"></option>`).join('')}</datalist>
                        </div>
                        <div class="input-group">
                            <label for="ins-f-unidade">Unidade</label>
                            <select id="ins-f-unidade" name="unidade" class="form-control">${UNIDADES.map(u => `<option ${u === i.unidade ? 'selected' : ''}>${u}</option>`).join('')}</select>
                        </div>
                        <div class="input-group">
                            <label for="ins-f-minimo">Estoque mínimo</label>
                            <input type="number" id="ins-f-minimo" name="estoque_minimo" class="form-control" inputmode="decimal" min="0" step="any" value="${i.estoque_minimo ?? 0}" aria-describedby="ins-f-minimo-ajuda">
                            <p class="help" id="ins-f-minimo-ajuda">Ao chegar nele, a coordenação recebe um aviso. Use 0 para não avisar.</p>
                        </div>
                        ${novo ? `
                        <div class="input-group">
                            <label for="ins-f-saldo">Saldo inicial</label>
                            <input type="number" id="ins-f-saldo" name="quantidade_inicial" class="form-control" inputmode="decimal" min="0" step="any" value="0">
                            <p class="help">Entra no histórico como a primeira entrada.</p>
                        </div>` : `
                        <div class="input-group">
                            <span class="label">Saldo atual</span>
                            <p class="mt-xs"><strong class="tabular">${num(i.quantidade_atual)} ${esc(i.unidade)}</strong></p>
                            <p class="help">Muda só por entrada, uso ou reporte.</p>
                        </div>`}
                        <div class="input-group">
                            <label for="ins-f-validade">Validade <span class="text-muted">(opcional)</span></label>
                            <input type="date" id="ins-f-validade" name="validade" class="form-control" value="${esc(i.validade || '')}">
                        </div>
                    </div>
                    ${!novo ? `
                    <div class="ins-zona-remover">
                        <span>Remover tira o item da lista. O histórico de movimentações é mantido.</span>
                        <button type="button" class="btn btn-danger-outline btn-sm" id="ins-f-remover">Remover do estoque</button>
                    </div>` : ''}
                </form>`,
            rodape: `<button type="button" class="btn btn-secondary" data-role="cancel">Cancelar</button>
                     <button type="submit" form="ins-form" class="btn btn-primary" id="ins-f-ok">${novo ? 'Cadastrar insumo' : 'Salvar alterações'}</button>`,
        });

        const campo = (id) => modal.querySelector(`#ins-f-${id}`);
        setTimeout(() => campo('nome').focus(), 30);

        // Verificação rápida no inventário enquanto digita o nome
        const caixaDup = modal.querySelector('#ins-f-dup');
        const nomeOriginal = chaveNome(i.nome);
        let duplicadoExato = null;
        const checarDuplicidade = () => {
            const nome = campo('nome').value;
            const mudou = chaveNome(nome) !== nomeOriginal;
            const { exato, parecidos } = mudou ? procurarDuplicados(nome, i.id) : { exato: null, parecidos: [] };
            duplicadoExato = exato;
            const descrever = (x) => `<strong>${esc(x.nome)}</strong>${x.localizacao ? ` · ${esc(x.localizacao)}` : ''} · ${num(x.quantidade_atual)} ${esc(x.unidade)}`;
            if (exato) {
                caixaDup.className = 'ins-dup is-exato';
                caixaDup.innerHTML = `
                    <p>Este insumo já está no estoque: ${descrever(exato)}.</p>
                    <p>Para somar quantidade, registre uma entrada nele em vez de cadastrar de novo.</p>
                    ${novo ? `<button type="button" class="link-btn" data-dup-entrada="${exato.id}">+ Registrar entrada em ${esc(exato.nome)}</button>` : ''}`;
            } else if (parecidos.length) {
                caixaDup.className = 'ins-dup';
                caixaDup.innerHTML = `<p>Itens parecidos no estoque. Confira se não é o mesmo:</p>
                    <ul>${parecidos.map(x => `<li>${descrever(x)}</li>`).join('')}</ul>`;
            } else {
                caixaDup.className = 'ins-dup hidden';
                caixaDup.innerHTML = '';
            }
            campo('nome').setAttribute('aria-invalid', exato ? 'true' : 'false');
        };
        let esperaDup;
        campo('nome').addEventListener('input', () => { clearTimeout(esperaDup); esperaDup = setTimeout(checarDuplicidade, 150); });
        caixaDup.addEventListener('click', (ev) => {
            const btn = ev.target.closest('[data-dup-entrada]');
            if (!btn) return;
            const existente = E.itens.find(x => x.id === Number(btn.dataset.dupEntrada));
            modal.fechar();
            if (existente) abrirMovimento('ENTRADA', existente, origem);
        });

        modal.querySelector('#ins-form').addEventListener('submit', (ev) => {
            ev.preventDefault();
            const nome = campo('nome').value.trim();
            let invalido = null;
            erroNoCampo(campo('nome'), nome ? '' : 'Informe o nome do insumo.');
            if (!nome) invalido = invalido || campo('nome');
            checarDuplicidade();
            if (duplicadoExato) invalido = invalido || campo('nome');
            if (invalido) { invalido.focus(); return; }

            const payload = {
                nome,
                categoria: campo('categoria').value,
                localizacao: campo('local').value.trim() || null,
                unidade: campo('unidade').value,
                estoque_minimo: Math.max(0, Number(campo('minimo').value) || 0),
                validade: campo('validade').value || null,
            };
            if (novo) payload.quantidade_atual = Math.max(0, Number(campo('saldo').value) || 0);

            comBotao(modal.querySelector('#ins-f-ok'), 'Salvando', async () => {
                try {
                    await req(novo ? '/insumos' : `/insumos/${i.id}`, { method: novo ? 'POST' : 'PUT', json: payload });
                    delete modal.querySelector('form').dataset.sujo;
                    modal.fechar();
                    window.UI.showToast(novo ? `${nome} cadastrado.` : 'Alterações salvas.', 'success');
                    await carregar();
                    if (!novo) focarAcao('editar', i.id);
                } catch (err) {
                    window.UI.showToast(err.message, 'error');
                }
            });
        });

        modal.querySelector('#ins-f-remover')?.addEventListener('click', async (ev) => {
            const btn = ev.currentTarget;
            const ok = await window.UI.confirm(`${i.nome} sai da lista de insumos. O histórico de movimentações continua guardado.`, { title: 'Remover do estoque?', danger: true, confirmText: 'Remover' });
            if (!ok) return;
            comBotao(btn, 'Removendo', async () => {
                try {
                    const r = await req(`/insumos/${i.id}`, { method: 'DELETE' });
                    delete modal.querySelector('form').dataset.sujo;
                    modal.fechar();
                    window.UI.showToast(r.mensagem || 'Insumo removido.', 'success');
                    await carregar();
                } catch (err) { window.UI.showToast(err.message, 'error'); }
            });
        });
    }

    // ==========================================
    // IMPORTAÇÃO DE PLANILHA (.xlsx ou .csv)
    // Envia o arquivo, mostra a prévia linha a linha e só grava o que for novo.
    // ==========================================
    const SITUACAO_IMPORT = {
        novo: { rotulo: 'Novo', classe: 'badge-success' },
        duplicado: { rotulo: 'Já no estoque', classe: 'badge-warning' },
        repetido: { rotulo: 'Repetido', classe: 'badge-warning' },
        erro: { rotulo: 'Erro', classe: 'badge-danger' },
    };

    async function baixarArquivo(caminho, nomeArquivo, mensagemErro) {
        const res = await window.api.fetchProtected(caminho);
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || mensagemErro); }
        const url = URL.createObjectURL(await res.blob());
        const a = document.createElement('a');
        a.href = url;
        a.download = nomeArquivo;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function abrirImportacao(origem) {
        let previa = null;
        const modal = abrirModal({
            id: 'ins-modal-import', origem, tamanho: 'modal-lg',
            eyebrow: 'importar insumos', titulo: 'Importar planilha',
            corpo: `
                <div id="ins-imp-envio">
                    <p class="dialog-text">Envie uma planilha com um insumo por linha. A primeira linha deve ter os nomes das colunas:
                        <strong>Nome</strong> (obrigatória), Categoria, Localização, Unidade, Saldo atual, Estoque mínimo e Validade.</p>
                    <p class="help mb-md">Antes de gravar, você confere a prévia. Itens que já estão no estoque ou que se repetem na planilha não são importados.</p>
                    <div class="input-group">
                        <label for="ins-imp-arquivo">Arquivo .xlsx ou .csv</label>
                        <input type="file" id="ins-imp-arquivo" name="arquivo" accept=".xlsx,.csv" aria-describedby="ins-imp-arquivo-erro">
                        <p class="field-error hidden" id="ins-imp-arquivo-erro" role="alert"></p>
                    </div>
                    <button type="button" class="link-btn" id="ins-imp-modelo">${icone('download', 13)} Baixar planilha modelo</button>
                </div>
                <div id="ins-imp-previa" class="hidden" aria-live="polite"></div>`,
            rodape: `<button type="button" class="btn btn-secondary" data-role="cancel">Cancelar</button>
                     <button type="button" class="btn btn-secondary hidden" id="ins-imp-outro">Escolher outro arquivo</button>
                     <button type="button" class="btn btn-primary" id="ins-imp-ok" disabled>Importar</button>`,
        });

        const arquivo = modal.querySelector('#ins-imp-arquivo');
        const envio = modal.querySelector('#ins-imp-envio');
        const caixaPrevia = modal.querySelector('#ins-imp-previa');
        const ok = modal.querySelector('#ins-imp-ok');
        const outro = modal.querySelector('#ins-imp-outro');

        const voltarAoEnvio = () => {
            previa = null;
            arquivo.value = '';
            envio.classList.remove('hidden');
            caixaPrevia.classList.add('hidden');
            caixaPrevia.innerHTML = '';
            outro.classList.add('hidden');
            ok.disabled = true;
            ok.textContent = 'Importar';
            arquivo.focus();
        };

        modal.querySelector('#ins-imp-modelo').addEventListener('click', (ev) => comBotao(ev.currentTarget, 'Gerando', async () => {
            try { await baixarArquivo('/insumos/importar/modelo', 'modelo_importacao_insumos.xlsx', 'Não foi possível baixar o modelo.'); }
            catch (err) { window.UI.showToast(err.message, 'error'); }
        }));

        arquivo.addEventListener('change', async () => {
            const f = arquivo.files && arquivo.files[0];
            erroNoCampo(arquivo, '');
            if (!f) return;
            if (!/\.(xlsx|csv)$/i.test(f.name)) { erroNoCampo(arquivo, 'Use um arquivo .xlsx ou .csv. Arquivos .xls antigos precisam ser salvos de novo como .xlsx.'); return; }
            if (f.size > 10 * 1024 * 1024) { erroNoCampo(arquivo, 'O arquivo passa de 10 MB.'); return; }

            caixaPrevia.classList.remove('hidden');
            caixaPrevia.setAttribute('aria-busy', 'true');
            caixaPrevia.innerHTML = window.UI.loading('Lendo a planilha…');
            arquivo.disabled = true;
            try {
                const fd = new FormData();
                fd.append('file', f);
                previa = await req('/insumos/importar/previa', { method: 'POST', body: fd });
                envio.classList.add('hidden');
                outro.classList.remove('hidden');
                renderPrevia(f.name);
            } catch (err) {
                caixaPrevia.classList.add('hidden');
                caixaPrevia.innerHTML = '';
                erroNoCampo(arquivo, err.message);
                arquivo.value = '';
            } finally {
                arquivo.disabled = false;
                caixaPrevia.setAttribute('aria-busy', 'false');
            }
        });

        function renderPrevia(nomeArquivo) {
            const r = previa.resumo;
            const problemas = r.duplicado + r.repetido + r.erro;
            // Linhas com aviso primeiro; dentro de cada grupo, a ordem da planilha
            const linhas = [...previa.linhas].sort((a, b) =>
                (a.status === 'novo') - (b.status === 'novo') || a.linha - b.linha);
            caixaPrevia.innerHTML = `
                <p class="ins-imp-arquivo">${icone('file-text', 14)} <span>${esc(nomeArquivo)}</span></p>
                <dl class="ins-mov-resumo ins-imp-resumo">
                    <div><dt>Novos</dt><dd>${r.novo}</dd></div>
                    <div><dt>Já no estoque</dt><dd>${r.duplicado}</dd></div>
                    <div><dt>Repetidos</dt><dd>${r.repetido}</dd></div>
                    <div><dt>Com erro</dt><dd class="${r.erro ? 'is-alerta' : ''}">${r.erro}</dd></div>
                </dl>
                ${problemas ? `<p class="help mb-sm">${problemas === 1 ? 'A linha com aviso aparece primeiro e não será importada.' : `As ${problemas} linhas com aviso aparecem primeiro e não serão importadas.`} Para incluir as com erro, corrija a planilha e envie de novo.</p>` : ''}
                <div class="table-container ins-imp-tabela">
                    <table class="data-table">
                        <thead><tr>
                            <th scope="col" class="num">Linha</th>
                            <th scope="col">Insumo</th>
                            <th scope="col">Situação</th>
                            <th scope="col" class="col-hide-sm">Detalhe</th>
                        </tr></thead>
                        <tbody>${linhas.map(l => {
                            const d = l.dados;
                            const detalhe = l.mensagem || (d ? [d.categoria, d.localizacao, `${num(d.quantidade_atual)} ${d.unidade}`, d.validade ? `validade ${dataBR(d.validade)}` : ''].filter(Boolean).join(' · ') : '');
                            return `<tr>
                                <td class="num tabular">${l.linha}</td>
                                <td><span class="ins-nome">${l.nome ? esc(l.nome) : '<span class="text-faint">sem nome</span>'}</span>
                                    <span class="ins-sub ins-imp-detalhe-curto">${esc(detalhe)}</span></td>
                                <td><span class="badge ${SITUACAO_IMPORT[l.status].classe}">${SITUACAO_IMPORT[l.status].rotulo}</span></td>
                                <td class="col-hide-sm ins-imp-detalhe">${esc(detalhe)}</td>
                            </tr>`;
                        }).join('')}</tbody>
                    </table>
                </div>`;
            ok.disabled = r.novo === 0;
            ok.textContent = r.novo === 0 ? 'Nada novo para importar' : `Importar ${r.novo} ${r.novo === 1 ? 'insumo' : 'insumos'}`;
        }

        outro.addEventListener('click', voltarAoEnvio);

        ok.addEventListener('click', () => {
            if (!previa) return;
            const itens = previa.linhas.filter(l => l.status === 'novo').map(l => l.dados);
            if (!itens.length) return;
            comBotao(ok, 'Importando', async () => {
                try {
                    const r = await req('/insumos/importar', { method: 'POST', json: { itens } });
                    modal.fechar();
                    const n = r.criados.length;
                    const pulados = r.ignorados.length;
                    let msg = `${n} ${n === 1 ? 'insumo importado' : 'insumos importados'}.`;
                    if (pulados) msg += ` ${pulados} ${pulados === 1 ? 'já tinha sido cadastrado' : 'já tinham sido cadastrados'} enquanto você conferia e ${pulados === 1 ? 'ficou' : 'ficaram'} de fora.`;
                    window.UI.showToast(msg, pulados ? 'warning' : 'success');
                    await carregar();
                } catch (err) { window.UI.showToast(err.message, 'error'); }
            });
        });

        setTimeout(() => arquivo.focus(), 30);
    }

    async function exportar(btn) {
        await comBotao(btn, 'Gerando planilha', async () => {
            try {
                const res = await window.api.fetchProtected('/insumos/exportar');
                if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || 'Não foi possível gerar a planilha.'); }
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `insumos_${new Date().toISOString().slice(0, 10)}.xlsx`;
                document.body.appendChild(a); a.click(); a.remove();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                window.UI.showToast('Planilha baixada.', 'success');
            } catch (err) { window.UI.showToast(err.message, 'error'); }
        });
    }

    window.insumosLimparFiltros = () => {
        E.busca = ''; E.categoria = ''; E.alerta = '';
        ['ins-busca', 'ins-categoria', 'ins-alerta'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        renderTabela();
        document.getElementById('ins-busca')?.focus();
    };

    // Atalhos da paleta (Ctrl+K).
    window.insumosAbrirNovo = () => document.getElementById('btn-novo-insumo')?.click();
    window.insumosFocarBusca = () => document.getElementById('ins-busca')?.focus();
})();
