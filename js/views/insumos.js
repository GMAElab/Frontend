// ==========================================
// INSUMOS DO LABORATÓRIO
// Reagentes, EPIs, vidrarias e utilidades: saldo por lote, validade e reposição.
// O saldo só muda por movimentação (entrada, uso ou reporte), então cada
// número da tabela tem data e responsável no histórico.
//
// Normas: NR-26 / ABNT NBR 14725:2023 (classificação GHS e FDS) e NR-06 (CA de EPI).
// O usuário comum faz o cadastro mínimo; os gestores completam os campos técnicos
// e marcam o item como revisado (o backend confere a permissão de novo).
// ==========================================
(function () {
    'use strict';

    const CATEGORIAS_PADRAO = ['Reagentes', 'EPIs', 'Vidrarias', 'Utilidades'];
    const UNIDADES_PADRAO = ['mL', 'L', 'g', 'kg', 'un', 'cx', 'par', 'mg', 'µL'];
    const TIPOS_PROTECAO = ['Proteção das mãos', 'Proteção dos olhos e face', 'Proteção respiratória', 'Proteção do corpo', 'Proteção auditiva', 'Proteção dos pés', 'Proteção da cabeça'];
    const CAMPOS_TECNICOS = ['cas', 'mistura', 'codigo_fabricante', 'ghs_perigoso', 'ghs_pictogramas', 'ghs_palavra', 'ghs_frases_h', 'ghs_frases_p',
        'fds_revisao', 'fds_data', 'fds_nbr14725', 'fds_portugues', 'validade_apos_aberto_dias',
        'epi_ca', 'epi_ca_validade', 'epi_tipo_protecao', 'epi_tamanho', 'vid_volume', 'vid_classe', 'vid_material', 'vid_volumetrica'];
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

    const E = { itens: [], resumo: null, busca: '', categoria: '', alerta: '', ref: null, locais: [] };
    const podeRevisar = () => !!(E.ref && E.ref.pode_revisar);
    const categorias = () => (E.ref && E.ref.categorias) || CATEGORIAS_PADRAO;
    const unidades = () => (E.ref && E.ref.unidades) || UNIDADES_PADRAO;

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
    // GHS (mesmas regras de services/ghs.py, só para sugerir)
    // ==========================================
    const fraseH = (codigo) => (E.ref?.frases_h || []).find(f => f.codigo === codigo);
    const nomePictograma = (codigo) => (E.ref?.pictogramas || []).find(p => p.codigo === codigo)?.nome || codigo;

    function sugerirGhs(frases) {
        const validas = frases.filter(fraseH);
        const pictos = new Set(validas.map(c => fraseH(c).pictograma).filter(Boolean));
        const motivos07 = validas.filter(c => fraseH(c).pictograma === 'GHS07');
        if (pictos.has('GHS06')) pictos.delete('GHS07');
        else if (pictos.has('GHS05') && motivos07.length && motivos07.every(c => c === 'H315' || c === 'H319')) pictos.delete('GHS07');
        const ws = new Set(validas.map(c => fraseH(c).palavra));
        return { pictogramas: [...pictos].sort(), palavra: ws.has('Perigo') ? 'Perigo' : ws.has('Atenção') ? 'Atenção' : null };
    }

    /** Losango GHS compacto (código + nome no title): sinalização visual da NR-26 na tabela e no formulário. */
    const losango = (codigo) => `<span class="ins-ghs" title="${esc(`${codigo} · ${nomePictograma(codigo)}`)}" aria-label="${esc(`${codigo}, ${nomePictograma(codigo)}`)}"><span>${esc(codigo.slice(3))}</span></span>`;

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
            // 409 com avisos: armazenagem ou uso fora do recomendado. Não bloqueia; pede justificativa.
            if (dados.detail && Array.isArray(dados.detail.avisos)) {
                const err = new Error(dados.detail.mensagem || 'Confira os avisos antes de continuar.');
                err.avisos = dados.detail.avisos;
                throw err;
            }
            const det = Array.isArray(dados.detail)
                ? dados.detail.map(d => String(d.msg || '').replace(/^Value error, /, '')).join(' ')
                : dados.detail;
            throw new Error(det || 'Não foi possível concluir a ação.');
        }
        return dados;
    }

    /** Mostra os avisos e pede a justificativa. Devolve o texto, ou null se a pessoa desistir. */
    function pedirJustificativa(avisos) {
        return new Promise((resolver) => {
            const modal = abrirModal({
                id: 'ins-modal-avisos', tamanho: 'modal-sm',
                eyebrow: 'aviso de segurança', titulo: avisos.length === 1 ? 'Confira antes de continuar' : `${avisos.length} avisos antes de continuar`,
                corpo: `
                    <form id="ins-form-avisos" novalidate>
                        <ul class="ins-avisos">${avisos.map(a => `<li>${icone('alert-triangle', 14)}<span>${esc(a.mensagem)}</span></li>`).join('')}</ul>
                        <div class="input-group">
                            <label for="ins-av-just">Por que seguir assim?</label>
                            <textarea id="ins-av-just" class="form-control" rows="3" maxlength="1000" required aria-describedby="ins-av-just-ajuda ins-av-just-erro"
                                placeholder="Ex.: armário de inflamáveis lotado; transferência programada para amanhã…"></textarea>
                            <p class="help" id="ins-av-just-ajuda">Fica registrado no histórico do item, com o seu nome, e a coordenação recebe um e-mail.</p>
                            <p class="field-error hidden" id="ins-av-just-erro" role="alert"></p>
                        </div>
                    </form>`,
                rodape: `<button type="button" class="btn btn-secondary" data-role="cancel">Voltar e corrigir</button>
                         <button type="submit" form="ins-form-avisos" class="btn btn-primary">Seguir com justificativa</button>`,
            });
            const texto = modal.querySelector('#ins-av-just');
            let respondeu = false;
            const fecharOriginal = modal.fechar;
            modal.fechar = () => { fecharOriginal(); if (!respondeu) resolver(null); };
            modal.querySelectorAll('[data-role="cancel"]').forEach(b => b.addEventListener('click', () => { if (!respondeu) resolver(null); }));
            modal.addEventListener('click', (ev) => { if (ev.target === modal && !respondeu) resolver(null); });
            modal.querySelector('#ins-form-avisos').addEventListener('submit', (ev) => {
                ev.preventDefault();
                if (!texto.value.trim()) { erroNoCampo(texto, 'Escreva a justificativa.'); texto.focus(); return; }
                respondeu = true;
                delete modal.querySelector('form').dataset.sujo;
                fecharOriginal();
                resolver(texto.value.trim());
            });
            setTimeout(() => texto.focus(), 30);
        });
    }

    /** Envia; se o backend devolver avisos, pergunta a justificativa e envia de novo com ela. */
    async function comJustificativa(enviar) {
        try {
            return await enviar(null);
        } catch (err) {
            if (!err.avisos) throw err;
            const justificativa = await pedirJustificativa(err.avisos);
            if (justificativa === null) { err.cancelado = true; throw err; }
            return enviar(justificativa);
        }
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

    /** Abre a FDS ou o certificado por um link assinado de poucos minutos (o bucket é privado). */
    async function abrirArquivo(anexoId, btn) {
        // A aba abre já no clique: depois do await, o navegador bloquearia o pop-up.
        const aba = window.open('', '_blank');
        try {
            const r = await req(`/insumos/anexos/${anexoId}/link`);
            if (aba) { aba.opener = null; aba.location.href = r.url; } else window.location.href = r.url;
        } catch (err) {
            if (aba) aba.close();
            window.UI.showToast(err.message, 'error');
            btn?.focus();
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
                ${i.lotes_com_saldo > 1 ? `<span class="ins-sub">${i.lotes_com_saldo} lotes</span>` : ''}
            </div>`;
    }

    function validadeHTML(i) {
        if (!i.validade) return '<span class="text-faint">—</span>';
        const dias = i.dias_para_vencer;
        if (i.vencido) return `<span class="ins-validade is-vencido">${dataBR(i.validade)}<small>vencido há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'dia' : 'dias'}</small></span>`;
        if (i.vencendo) return `<span class="ins-validade is-vencendo">${dataBR(i.validade)}<small>${dias === 0 ? 'vence hoje' : `vence em ${dias} ${dias === 1 ? 'dia' : 'dias'}`}</small></span>`;
        return `<span class="ins-validade">${dataBR(i.validade)}</span>`;
    }

    /** Selos de conformidade sob o nome: revisão, FDS e CA. */
    function selosHTML(i) {
        const selos = [];
        if (i.pendente_revisao) selos.push('<span class="badge badge-warning">Revisão pendente</span>');
        if (i.fds_pendente) selos.push('<span class="badge badge-danger">FDS pendente</span>');
        if (i.ca_situacao === 'vencido') selos.push('<span class="badge badge-danger">CA vencido</span>');
        else if (i.ca_situacao === 'vencendo') selos.push('<span class="badge badge-warning">CA vencendo</span>');
        const pf = i.pf || {};
        if (pf.status === 'controlado') selos.push(`<span class="badge badge-info">PF · Lista ${esc(pf.lista)}</span>`);
        else if (pf.status === 'possivel') selos.push(`<span class="badge badge-danger" title="Reconhecido pelo nome: ${esc(pf.nome || '')}">Possível controlado PF · ${esc(pf.lista)}</span>`);
        if (i.anvisa_controlado) selos.push(`<span class="badge badge-info">Anvisa${i.anvisa_lista ? ` · ${esc(i.anvisa_lista)}` : ''}</span>`);
        if (i.exercito_controlado) selos.push('<span class="badge badge-info">Exército</span>');
        if (i.nr20 === 'inflamavel' || i.nr20 === 'gas_inflamavel') selos.push(`<span class="badge">NR-20 · ${i.nr20 === 'inflamavel' ? 'inflamável' : 'gás inflamável'}</span>`);
        else if (i.nr20 === 'combustivel') selos.push('<span class="badge">NR-20 · combustível</span>');
        if (i.peroxido_alerta) selos.push('<span class="badge badge-warning">Testar peróxidos</span>');
        const pictos = (i.ghs_pictogramas || []).map(losango).join('');
        if (!selos.length && !pictos) return '';
        return `<span class="ins-selos">${pictos ? `<span class="ins-ghs-lista">${pictos}</span>` : ''}${selos.join('')}</span>`;
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
                        <p class="lede">Reagentes, EPIs e vidrarias com lote, validade, FDS e alertas de reposição.</p>
                    </div>
                    <div class="page-actions">
                        <button type="button" class="btn btn-secondary hidden" data-acao="relatorios" id="ins-btn-relatorios">${icone('file-text')} Relatórios</button>
                        <button type="button" class="btn btn-secondary hidden" data-acao="locais" id="ins-btn-locais">${icone('folder')} Locais</button>
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
                            ${categorias().map(c => `<option value="${esc(c)}" ${E.categoria === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
                        </select>
                        <select class="form-control" id="ins-alerta" name="alerta" aria-label="Alerta">
                            <option value="">Todos os alertas</option>
                            <option value="baixo" ${E.alerta === 'baixo' ? 'selected' : ''}>Abaixo do mínimo</option>
                            <option value="validade" ${E.alerta === 'validade' ? 'selected' : ''}>Vencendo ou vencidos</option>
                            <option value="pendente" ${E.alerta === 'pendente' ? 'selected' : ''}>Pendentes de revisão</option>
                            <option value="fds" ${E.alerta === 'fds' ? 'selected' : ''}>FDS pendente</option>
                            <option value="ca" ${E.alerta === 'ca' ? 'selected' : ''}>CA vencido ou vencendo</option>
                            <option value="controlados" ${E.alerta === 'controlados' ? 'selected' : ''}>Controlados (PF, Anvisa, Exército)</option>
                            <option value="nr20" ${E.alerta === 'nr20' ? 'selected' : ''}>Inflamáveis e combustíveis (NR-20)</option>
                            <option value="peroxido" ${E.alerta === 'peroxido' ? 'selected' : ''}>Teste de peróxido vencido</option>
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

    /** Limpa os filtros, rola até a linha do insumo e a destaca por alguns segundos. */
    function destacarNaLista(id) {
        if (!document.querySelector(`#ins-corpo tr[data-insumo="${id}"]`)) {
            E.busca = ''; E.categoria = ''; E.alerta = '';
            ['ins-busca', 'ins-categoria', 'ins-alerta'].forEach(c => { const el = document.getElementById(c); if (el) el.value = ''; });
            renderTabela();
        }
        const linha = document.querySelector(`#ins-corpo tr[data-insumo="${id}"]`);
        if (!linha) return;
        const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        linha.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'center' });
        linha.classList.add('is-destaque');
        setTimeout(() => linha.classList.remove('is-destaque'), 2400);
        linha.querySelector('[data-acao="ENTRADA"]')?.focus({ preventScroll: true });
    }

    function linhasEsqueleto() {
        return Array.from({ length: 5 }, () => `<tr class="is-skeleton">${'<td><span class="skeleton"></span></td>'.repeat(6)}</tr>`).join('');
    }

    async function carregar() {
        try {
            const [dados, ref, locais] = await Promise.all([
                req('/insumos'),
                E.ref ? Promise.resolve(E.ref) : req('/insumos/referencias'),
                req('/insumos/locais').catch(() => E.locais),
            ]);
            E.itens = dados.itens || [];
            E.resumo = dados.resumo;
            E.ref = ref;
            E.locais = locais || [];
            document.getElementById('ins-btn-locais')?.classList.toggle('hidden', !podeRevisar());
            document.getElementById('ins-btn-relatorios')?.classList.toggle('hidden', !podeRevisar());
            const indicadores = document.getElementById('ins-indicadores');
            if (indicadores) indicadores.innerHTML = indicadoresHTML(E.resumo);
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
        const tomRevisao = r && r.pendentes_revisao ? ' tone-warning' : '';
        const fds = r && r.fds_pendentes ? ` (${r.fds_pendentes} sem FDS)` : '';
        return `
            <div class="figure"><span class="v">${v(r?.total)}</span><span class="k">Total de itens</span></div>
            <div class="figure${tomBaixo}"><span class="v">${v(r?.abaixo_minimo)}</span><span class="k">Abaixo do mínimo</span></div>
            <div class="figure${tomValidade}"><span class="v">${v(r?.vencendo_30d)}</span><span class="k">Vencendo em 30 dias${vencidos}</span></div>
            <div class="figure${tomRevisao}"><span class="v">${v(r?.pendentes_revisao)}</span><span class="k">Aguardando revisão${fds}</span></div>
            <div class="figure${r && r.controlados ? ' tone-warning' : ''}"><span class="v">${v(r?.controlados)}</span><span class="k">Controlados ou a confirmar</span></div>
            <div class="figure"><span class="v">${v(r?.movimentacoes_mes)}</span><span class="k">Movimentações no mês</span></div>`;
    }

    function filtrados() {
        const termo = E.busca.trim().toLowerCase();
        return E.itens.filter(i => {
            if (termo && !(i.nome || '').toLowerCase().includes(termo) && !(i.cas || '').includes(termo)) return false;
            if (E.categoria && i.categoria !== E.categoria) return false;
            if (E.alerta === 'baixo' && !i.abaixo_minimo) return false;
            if (E.alerta === 'validade' && !(i.vencendo || i.vencido)) return false;
            if (E.alerta === 'pendente' && !i.pendente_revisao) return false;
            if (E.alerta === 'fds' && !i.fds_pendente) return false;
            if (E.alerta === 'ca' && !i.ca_situacao) return false;
            if (E.alerta === 'controlados' && !(i.controlado || i.pf?.status === 'possivel')) return false;
            if (E.alerta === 'nr20' && !['inflamavel', 'combustivel', 'gas_inflamavel'].includes(i.nr20)) return false;
            if (E.alerta === 'peroxido' && !i.peroxido_alerta) return false;
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
                    ${i.cas || i.fabricante ? `<span class="ins-sub">${esc([i.cas ? `CAS ${i.cas}` : '', i.fabricante].filter(Boolean).join(' · '))}</span>` : ''}
                    ${i.localizacao ? `<span class="ins-sub ins-local-curto">${esc(i.localizacao)}</span>` : ''}
                    ${i.vencido || i.vencendo ? `<span class="ins-sub ins-validade-curta ${i.vencido ? 'text-danger' : 'text-warning'}">${i.vencido ? 'Vencido' : 'Vence'} em ${dataBR(i.validade)}</span>` : ''}
                    ${selosHTML(i)}
                </td>
                <td class="col-hide-sm">${esc(i.categoria)}</td>
                <td class="col-hide-md">${i.localizacao ? esc(i.localizacao) : '<span class="text-faint">—</span>'}</td>
                <td>${saldoHTML(i)}</td>
                <td class="col-hide-xs">${validadeHTML(i)}</td>
                <td class="end">
                    <span class="ins-acoes" role="group" aria-label="Ações para ${esc(i.nome)}">
                        <span class="ins-acoes-linha">
                            <button type="button" class="link-btn" data-acao="ENTRADA" data-id="${i.id}">+ Entrada</button>
                            <button type="button" class="link-btn is-uso" data-acao="SAIDA" data-id="${i.id}" ${semSaldo ? 'disabled title="Sem saldo para registrar uso"' : i.exige_revisao_para_saida ? 'title="Possível produto controlado: a saída fica bloqueada até a revisão"' : ''}>− Uso</button>
                            <button type="button" class="link-btn is-reportar" data-acao="REPORTE" data-id="${i.id}">${icone('alert-triangle', 13)} Reportar</button>
                        </span>
                        <span class="ins-acoes-linha">
                            ${i.fds ? `<button type="button" class="link-btn muted" data-acao="fds" data-id="${i.id}" title="Ficha com Dados de Segurança">FDS</button>` : ''}
                            <button type="button" class="link-btn muted" data-acao="lotes" data-id="${i.id}">Lotes</button>
                            <button type="button" class="link-btn muted" data-acao="historico" data-id="${i.id}">Histórico</button>
                            <button type="button" class="link-btn muted" data-acao="editar" data-id="${i.id}">${podeRevisar() && i.pendente_revisao ? 'Revisar' : 'Editar'}</button>
                        </span>
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
            case 'lotes': if (item) abrirLotes(item, alvo); break;
            case 'fds': if (item?.fds) abrirArquivo(item.fds.id, alvo); break;
            case 'editar': if (item) abrirFormulario(item, alvo); break;
            case 'novo': abrirFormulario(null, alvo); break;
            case 'locais': abrirLocais(alvo); break;
            case 'relatorios': abrirRelatorios(alvo); break;
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

    const datalistLocais = (id) => `<datalist id="${id}">${E.locais.map(l => `<option value="${esc(l.nome)}"></option>`).join('')}</datalist>`;

    function rotuloLote(l, unidade) {
        const partes = [l.lote ? `Lote ${l.lote}` : 'Lote sem número', `${num(l.quantidade)} ${unidade}`];
        if (l.validade_efetiva) partes.push(`vence ${dataBR(l.validade_efetiva)}`);
        if (l.local_nome) partes.push(l.local_nome);
        return partes.join(' · ');
    }

    /** Entrada (+) e uso (−): o mais curto possível, com o foco já na quantidade. Cada entrada é um lote. */
    function abrirMovimento(tipo, item, origem) {
        const entrada = tipo === 'ENTRADA';
        const min = item.estoque_minimo || 0;
        const un = esc(item.unidade);
        const modal = abrirModal({
            id: 'ins-modal-mov', origem, tamanho: entrada ? 'modal-md' : 'modal-sm',
            eyebrow: item.localizacao ? `${item.nome} · ${item.localizacao}` : item.nome,
            titulo: entrada ? 'Registrar entrada' : 'Registrar uso',
            corpo: `
                <form id="ins-form-mov" novalidate>
                    <dl class="ins-mov-resumo">
                        <div><dt>Saldo atual</dt><dd>${num(item.quantidade_atual)} ${un}</dd></div>
                        <div><dt>Mínimo</dt><dd>${min > 0 ? `${num(min)} ${un}` : '—'}</dd></div>
                        <div><dt>Saldo após</dt><dd id="ins-mov-apos">${num(item.quantidade_atual)} ${un}</dd></div>
                    </dl>
                    <div class="input-group">
                        <label for="ins-mov-qtd">${entrada ? 'Quantidade recebida' : 'Quantidade usada'}</label>
                        <div class="ins-qtd">
                            <input type="number" id="ins-mov-qtd" name="quantidade" class="form-control" inputmode="decimal" min="0" step="any" required autocomplete="off" aria-describedby="ins-mov-qtd-erro ins-mov-aviso">
                            <span class="ins-unidade" aria-hidden="true" translate="no">${un}</span>
                        </div>
                        ${entrada ? '' : '<div class="ins-atalhos-qtd"><button type="button" class="check-chip" data-tudo></button></div>'}
                        <p class="field-error hidden" id="ins-mov-qtd-erro" role="alert"></p>
                        <p class="ins-aviso" id="ins-mov-aviso" aria-live="polite"></p>
                    </div>
                    <div class="input-group hidden" id="ins-mov-lote-grupo">
                        <label for="ins-mov-lote">${entrada ? 'Somar a um lote que já está no estoque?' : 'De qual lote'}</label>
                        <select id="ins-mov-lote" name="lote_id" class="form-control"></select>
                    </div>
                    ${entrada ? `
                    <div class="field-grid ins-mov-novo-lote" id="ins-mov-novo">
                        <div class="input-group">
                            <label for="ins-mov-numlote">Lote <span class="text-muted">(opcional)</span></label>
                            <input type="text" id="ins-mov-numlote" name="lote" class="form-control" maxlength="100" autocomplete="off" placeholder="Como está no rótulo">
                        </div>
                        <div class="input-group">
                            <label for="ins-mov-validade">Validade <span class="text-muted">(opcional)</span></label>
                            <input type="date" id="ins-mov-validade" name="validade" class="form-control">
                        </div>
                        <div class="input-group span-2">
                            <label for="ins-mov-local">Onde vai ficar</label>
                            <input type="text" id="ins-mov-local" name="localizacao" class="form-control" maxlength="200" list="ins-mov-locais" autocomplete="off" placeholder="Ex.: Armário de inflamáveis 1…">
                            ${datalistLocais('ins-mov-locais')}
                        </div>
                    </div>
                    <details class="ins-mais">
                        <summary>Fornecedor, nota fiscal e observação</summary>
                        <div class="field-grid">
                            <div class="input-group">
                                <label for="ins-mov-fornecedor">Fornecedor</label>
                                <input type="text" id="ins-mov-fornecedor" name="fornecedor" class="form-control" maxlength="200" autocomplete="off">
                            </div>
                            <div class="input-group">
                                <label for="ins-mov-nf">Nota fiscal</label>
                                <input type="text" id="ins-mov-nf" name="nota_fiscal" class="form-control" maxlength="100" autocomplete="off">
                            </div>
                            <div class="input-group">
                                <label for="ins-mov-receb">Recebido em</label>
                                <input type="date" id="ins-mov-receb" name="data_recebimento" class="form-control">
                            </div>
                            <div class="input-group">
                                <label for="ins-mov-obs">Observação</label>
                                <input type="text" id="ins-mov-obs" name="observacao" class="form-control" maxlength="2000" autocomplete="off">
                            </div>
                        </div>
                    </details>` : `
                    <label class="check-inline mb-sm"><input type="checkbox" id="ins-mov-descarte"> É descarte como resíduo</label>
                    <div class="input-group hidden" id="ins-mov-destino-grupo">
                        <label for="ins-mov-destino">Destino do resíduo</label>
                        <input type="text" id="ins-mov-destino" name="destino_residuo" class="form-control" maxlength="300" autocomplete="off"
                            placeholder="Ex.: coleta de solventes do programa de resíduos…" aria-describedby="ins-mov-destino-erro">
                        <p class="field-error hidden" id="ins-mov-destino-erro" role="alert"></p>
                    </div>
                    <div class="input-group">
                        <label for="ins-mov-obs" id="ins-mov-obs-rotulo">${item.controlado ? 'Para que foi usado <span class="text-muted">(obrigatório: produto controlado)</span>' : 'Onde foi usado <span class="text-muted">(opcional)</span>'}</label>
                        <input type="text" id="ins-mov-obs" name="observacao" class="form-control" maxlength="2000" autocomplete="off" placeholder="Processo, experimento ou ensaio…" aria-describedby="ins-mov-obs-erro">
                        <p class="field-error hidden" id="ins-mov-obs-erro" role="alert"></p>
                    </div>`}
                </form>`,
            rodape: `<button type="button" class="btn btn-secondary" data-role="cancel">Cancelar</button>
                     <button type="submit" form="ins-form-mov" class="btn btn-primary" id="ins-mov-ok">${entrada ? 'Registrar entrada' : 'Registrar uso'}</button>`,
        });

        // Possível produto controlado ainda não revisado: a saída fica travada até um gestor revisar.
        if (!entrada && item.exige_revisao_para_saida) {
            const form = modal.querySelector('#ins-form-mov');
            form.insertAdjacentHTML('afterbegin', `<div class="ins-status-revisao is-bloqueio" role="alert"><strong>Saída bloqueada.</strong>
                ${esc(item.nome)} pode ser um produto controlado${item.pf?.lista ? ` (Polícia Federal, Lista ${esc(item.pf.lista)})` : ''} e ainda não foi revisado.
                Peça a um gestor para revisar o cadastro.</div>`);
            form.querySelectorAll('input, select, button').forEach(c => { c.disabled = true; });
            modal.querySelector('#ins-mov-ok').disabled = true;
        }
        const descarte = modal.querySelector('#ins-mov-descarte');
        descarte?.addEventListener('change', () => {
            modal.querySelector('#ins-mov-destino-grupo').classList.toggle('hidden', !descarte.checked);
            modal.querySelector('#ins-mov-ok').textContent = descarte.checked ? 'Registrar descarte' : 'Registrar uso';
            modal.querySelector(`#${modal.querySelector('[role="dialog"]').getAttribute('aria-labelledby')}`).textContent = descarte.checked ? 'Registrar descarte' : 'Registrar uso';
            if (descarte.checked) modal.querySelector('#ins-mov-destino').focus();
        });

        const qtd = modal.querySelector('#ins-mov-qtd');
        const apos = modal.querySelector('#ins-mov-apos');
        const aviso = modal.querySelector('#ins-mov-aviso');
        const ok = modal.querySelector('#ins-mov-ok');
        const grupoLote = modal.querySelector('#ins-mov-lote-grupo');
        const selLote = modal.querySelector('#ins-mov-lote');
        const tudo = modal.querySelector('[data-tudo]');
        const campoLocal = modal.querySelector('#ins-mov-local');
        let lotes = [];

        // Quanto dá para tirar: o lote escolhido ou o saldo todo (a saída automática percorre os lotes).
        const disponivel = () => {
            const l = lotes.find(x => String(x.id) === selLote.value);
            return entrada ? Infinity : (l ? l.quantidade : item.quantidade_atual);
        };
        const atualizarTudo = () => { if (tudo) tudo.textContent = `Usar todo o saldo${selLote.value ? ' do lote' : ''} (${num(disponivel())} ${item.unidade})`; };
        atualizarTudo();

        const validar = () => {
            const v = Number(qtd.value);
            const preenchido = qtd.value !== '' && Number.isFinite(v);
            const depois = preenchido ? (entrada ? item.quantidade_atual + v : item.quantidade_atual - v) : item.quantidade_atual;
            apos.textContent = `${num(Math.max(0, depois))} ${item.unidade}`;
            apos.classList.toggle('is-alerta', !entrada && preenchido && min > 0 && depois <= min);
            let erro = '';
            if (preenchido && v <= 0) erro = 'Informe uma quantidade maior que zero.';
            else if (!entrada && preenchido && v > disponivel()) erro = `Maior que o saldo disponível (${num(disponivel())} ${item.unidade}).`;
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
        tudo?.addEventListener('click', () => { qtd.value = String(disponivel()); validar(); qtd.focus(); });
        selLote.addEventListener('change', () => {
            modal.querySelector('#ins-mov-novo')?.classList.toggle('hidden', !!selLote.value);
            atualizarTudo();
            validar();
        });
        setTimeout(() => qtd.focus(), 30);

        // Lotes: na saída, escolher de qual tirar (o padrão é o que vence primeiro); na entrada, somar a um existente.
        req(`/insumos/${item.id}/lotes`).then((todos) => {
            if (!modal.isConnected) return;
            lotes = todos.filter(l => l.quantidade > 0);
            if (entrada && campoLocal && !campoLocal.value) campoLocal.value = (lotes[lotes.length - 1] || todos[0])?.local_nome || '';
            if (!lotes.length || (!entrada && lotes.length < 2)) return;
            selLote.innerHTML = (entrada
                ? '<option value="">Não, é um lote novo</option>'
                : '<option value="">Automático: o que vence primeiro</option>')
                + lotes.map(l => `<option value="${l.id}">${esc(rotuloLote(l, item.unidade))}</option>`).join('');
            grupoLote.classList.remove('hidden');
            atualizarTudo();
        }).catch(() => { /* sem a lista, a saída segue pelo que vence primeiro */ });

        modal.querySelector('#ins-form-mov').addEventListener('submit', (ev) => {
            ev.preventDefault();
            if (!validar()) { if (qtd.value === '') erroNoCampo(qtd, 'Informe a quantidade.'); qtd.focus(); return; }
            const quantidade = Number(qtd.value);
            const valor = (id) => modal.querySelector(`#${id}`)?.value.trim() || null;
            const ehDescarte = !!descarte?.checked;
            const tipoFinal = ehDescarte ? 'DESCARTE' : tipo;
            if (ehDescarte && !valor('ins-mov-destino')) {
                const d = modal.querySelector('#ins-mov-destino'); erroNoCampo(d, 'Informe o destino do resíduo.'); d.focus(); return;
            }
            if (!entrada && item.controlado && !valor('ins-mov-obs')) {
                const o = modal.querySelector('#ins-mov-obs'); erroNoCampo(o, 'Produto controlado: informe para que foi usado.'); o.focus(); return;
            }
            const corpo = { tipo: tipoFinal, quantidade, observacao: valor('ins-mov-obs'), lote_id: selLote.value ? Number(selLote.value) : null };
            if (ehDescarte) corpo.destino_residuo = valor('ins-mov-destino');
            if (entrada && !selLote.value) {
                Object.assign(corpo, {
                    lote: valor('ins-mov-numlote'), validade: valor('ins-mov-validade'), localizacao: valor('ins-mov-local'),
                    fornecedor: valor('ins-mov-fornecedor'), nota_fiscal: valor('ins-mov-nf'), data_recebimento: valor('ins-mov-receb'),
                });
            }
            comBotao(ok, 'Registrando', async () => {
                try {
                    const r = await comJustificativa((justificativa) => req(`/insumos/${item.id}/movimentar`, { method: 'POST', json: { ...corpo, justificativa } }));
                    delete modal.querySelector('form').dataset.sujo;
                    modal.fechar();
                    const novo = r.insumo;
                    const lote = r.movimentacao?.lote ? ` (lote ${r.movimentacao.lote})` : '';
                    const base = entrada
                        ? `Entrada registrada: +${num(quantidade)} ${novo.unidade} de ${novo.nome}${lote}. Saldo: ${num(novo.quantidade_atual)} ${novo.unidade}.`
                        : `${ehDescarte ? 'Descarte' : 'Uso'} registrado: −${num(quantidade)} ${novo.unidade} de ${novo.nome}. Saldo: ${num(novo.quantidade_atual)} ${novo.unidade}.`;
                    const extra = [r.gestores_avisados ? 'A coordenação foi avisada do estoque baixo.' : '', r.avisos_registrados ? 'A justificativa foi registrada e a coordenação avisada.' : ''].filter(Boolean).join(' ');
                    window.UI.showToast(extra ? `${base} ${extra}` : base, extra ? 'warning' : 'success');
                    await carregar();
                    focarAcao(tipo, item.id);
                } catch (err) {
                    if (err.cancelado) return;
                    erroNoCampo(qtd, err.message);
                    qtd.focus();
                }
            });
        });
    }

    /** Reportar: avisa os gestores na hora. Pode corrigir o saldo com a contagem física (por lote). */
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
                    <div class="hidden" id="ins-rep-saldo-grupo">
                        <div class="input-group mt-sm hidden" id="ins-rep-lote-grupo">
                            <label for="ins-rep-lote">Lote contado</label>
                            <select id="ins-rep-lote" name="lote_id" class="form-control" aria-describedby="ins-rep-lote-erro"></select>
                            <p class="field-error hidden" id="ins-rep-lote-erro" role="alert"></p>
                        </div>
                        <div class="input-group mt-sm">
                            <label for="ins-rep-saldo">Quantidade encontrada no local</label>
                            <div class="ins-qtd">
                                <input type="number" id="ins-rep-saldo" name="novo_saldo" class="form-control" inputmode="decimal" min="0" step="any" aria-describedby="ins-rep-saldo-erro">
                                <span class="ins-unidade" aria-hidden="true" translate="no">${esc(item.unidade)}</span>
                            </div>
                            <p class="help" id="ins-rep-saldo-ajuda">No sistema: ${num(item.quantidade_atual)} ${esc(item.unidade)}.</p>
                            <p class="field-error hidden" id="ins-rep-saldo-erro" role="alert"></p>
                        </div>
                    </div>
                </form>`,
            rodape: `<button type="button" class="btn btn-secondary" data-role="cancel">Cancelar</button>
                     <button type="submit" form="ins-form-reporte" class="btn btn-primary" id="ins-rep-ok">Enviar reporte</button>`,
        });
        const obs = modal.querySelector('#ins-rep-obs');
        const ajustar = modal.querySelector('#ins-rep-ajustar');
        const grupoSaldo = modal.querySelector('#ins-rep-saldo-grupo');
        const saldo = modal.querySelector('#ins-rep-saldo');
        const selLote = modal.querySelector('#ins-rep-lote');
        const ajudaSaldo = modal.querySelector('#ins-rep-saldo-ajuda');
        let lotes = [];
        const precisaLote = () => lotes.length > 1;
        const alternarSaldo = (ligado) => { ajustar.checked = ligado; grupoSaldo.classList.toggle('hidden', !ligado); };

        // Com mais de um lote com saldo, a contagem física corrige um lote específico.
        if (item.lotes_com_saldo > 1) {
            req(`/insumos/${item.id}/lotes`).then((todos) => {
                lotes = todos.filter(l => l.quantidade > 0);
                if (!modal.isConnected || !precisaLote()) return;
                selLote.innerHTML = '<option value="">Escolha o lote</option>' + lotes.map(l => `<option value="${l.id}">${esc(rotuloLote(l, item.unidade))}</option>`).join('');
                modal.querySelector('#ins-rep-lote-grupo').classList.remove('hidden');
            }).catch(() => {});
        }
        selLote.addEventListener('change', () => {
            const l = lotes.find(x => String(x.id) === selLote.value);
            ajudaSaldo.textContent = l ? `No sistema, este lote tem ${num(l.quantidade)} ${item.unidade}.` : `No sistema: ${num(item.quantidade_atual)} ${item.unidade}.`;
            erroNoCampo(selLote, '');
        });

        ajustar.addEventListener('change', () => { alternarSaldo(ajustar.checked); if (ajustar.checked) (precisaLote() ? selLote : saldo).focus(); });
        modal.querySelectorAll('[data-motivo]').forEach(b => b.addEventListener('click', () => {
            const m = MOTIVOS_REPORTE.find(x => x.id === b.dataset.motivo);
            const ativo = b.getAttribute('aria-pressed') !== 'true';
            b.setAttribute('aria-pressed', String(ativo));
            if (ativo && !obs.value.includes(m.texto)) obs.value = obs.value.trim() ? `${obs.value.trim()} ${m.texto}` : m.texto;
            if (ativo && m.saldo !== undefined) { alternarSaldo(true); saldo.value = String(m.saldo); }
            if (ativo && m.contar) { alternarSaldo(true); (precisaLote() ? selLote : saldo).focus(); return; }
            erroNoCampo(obs, '');
            obs.focus();
        }));
        setTimeout(() => obs.focus(), 30);

        modal.querySelector('#ins-form-reporte').addEventListener('submit', (ev) => {
            ev.preventDefault();
            const texto = obs.value.trim();
            if (!texto) { erroNoCampo(obs, 'Descreva o problema encontrado.'); obs.focus(); return; }
            let novoSaldo = null;
            let loteId = null;
            if (ajustar.checked) {
                if (precisaLote() && !selLote.value) { erroNoCampo(selLote, 'Escolha qual lote foi contado.'); selLote.focus(); return; }
                if (saldo.value === '' || Number(saldo.value) < 0 || !Number.isFinite(Number(saldo.value))) {
                    erroNoCampo(saldo, 'Informe a quantidade encontrada (zero ou mais).'); saldo.focus(); return;
                }
                novoSaldo = Number(saldo.value);
                loteId = selLote.value ? Number(selLote.value) : null;
            }
            comBotao(modal.querySelector('#ins-rep-ok'), 'Enviando', async () => {
                try {
                    const r = await req(`/insumos/${item.id}/movimentar`, { method: 'POST', json: { tipo: 'REPORTE', quantidade: 0, observacao: texto, novo_saldo: novoSaldo, lote_id: loteId } });
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
            const [movs, avisos] = await Promise.all([
                req(`/insumos/movimentacoes?insumo_id=${item.id}&limite=300`),
                req(`/insumos/${item.id}/avisos`).catch(() => []),
            ]);
            corpo.setAttribute('aria-busy', 'false');
            if (!movs.length && !avisos.length) { corpo.innerHTML = window.UI.emptyState({ title: 'Nenhuma movimentação registrada' }); return; }
            const rotulo = { ENTRADA: 'Entrada', SAIDA: 'Uso', DESCARTE: 'Descarte', REPORTE: 'Reporte' };
            const classe = { ENTRADA: 'is-entrada', SAIDA: 'is-saida', DESCARTE: 'is-saida', REPORTE: 'is-reporte' };
            const blocoAvisos = avisos.length ? `
                <details class="ins-mais ins-avisos-hist" ${avisos.length <= 3 ? 'open' : ''}>
                    <summary>Avisos ignorados com justificativa (${avisos.length})</summary>
                    <ul class="ins-avisos">${avisos.map(a => `<li>${icone('alert-triangle', 14)}<span>${esc(a.mensagem)}
                        <small>“${esc(a.justificativa)}” · ${esc([a.usuario_nome, dataHora(a.criado_em)].filter(Boolean).join(' · '))}</small></span></li>`).join('')}</ul>
                </details>` : '';
            corpo.innerHTML = blocoAvisos + `<ol class="timeline">${movs.map(m => {
                const qtd = m.tipo === 'ENTRADA' ? `+${num(m.quantidade)} ${m.unidade}`
                    : (m.tipo === 'SAIDA' || m.tipo === 'DESCARTE') ? `−${num(m.quantidade)} ${m.unidade}`
                    : (m.quantidade ? `divergência de ${num(m.quantidade)} ${m.unidade}` : '');
                return `
                    <li class="tl-item ${classe[m.tipo] || ''}">
                        <span class="tl-title">${rotulo[m.tipo] || esc(m.tipo)} ${qtd ? `<span class="ins-mov-qtd ${classe[m.tipo]}">${esc(qtd)}</span>` : ''}
                            ${m.lote ? `<span class="text-muted text-small">lote ${esc(m.lote)}</span>` : ''}
                            ${m.saldo_apos !== null ? `<span class="text-muted text-small">saldo ${num(m.saldo_apos)} ${esc(m.unidade)}</span>` : ''}</span>
                        <p>${esc([m.usuario_nome, dataHora(m.criado_em)].filter(Boolean).join(' · '))}</p>
                        ${m.destino_residuo ? `<p>Destino do resíduo: ${esc(m.destino_residuo)}</p>` : ''}
                        ${m.observacao ? `<p class="tl-quote">${esc(m.observacao)}</p>` : ''}
                    </li>`;
            }).join('')}</ol>`;
        } catch (err) {
            corpo.setAttribute('aria-busy', 'false');
            corpo.innerHTML = window.UI.errorState(esc(err.message));
        }
    }

    // ==========================================
    // LOTES
    // ==========================================
    async function abrirLotes(item, origem) {
        const modal = abrirModal({
            id: 'ins-modal-lotes', origem, tamanho: 'modal-lg',
            eyebrow: 'lotes em estoque', titulo: item.nome,
            corpo: `<div id="ins-lotes-corpo" aria-busy="true">${window.UI.loading('Carregando lotes…')}</div>`,
        });
        const corpo = modal.querySelector('#ins-lotes-corpo');
        try {
            const lotes = await req(`/insumos/${item.id}/lotes`);
            corpo.setAttribute('aria-busy', 'false');
            if (!lotes.length) {
                corpo.innerHTML = window.UI.emptyState({ title: 'Nenhum lote registrado', description: 'Cada entrada no estoque cria um lote, com número, validade e local.' });
                return;
            }
            const comSaldo = lotes.filter(l => l.quantidade > 0);
            const esgotados = lotes.filter(l => l.quantidade <= 0);
            const validadeLote = (l) => {
                if (!l.validade_efetiva) return '<span class="text-faint">—</span>';
                const cls = l.situacao_validade === 'vencido' ? 'is-vencido' : l.situacao_validade === 'vencendo' ? 'is-vencendo' : '';
                const aberto = l.validade && l.validade_efetiva !== l.validade ? '<small>após aberto</small>' : '';
                return `<span class="ins-validade ${cls}">${dataBR(l.validade_efetiva)}${aberto}</span>`;
            };
            const linha = (l) => `
                <tr>
                    <td><span class="ins-nome">${l.lote ? esc(l.lote) : '<span class="text-faint">sem número</span>'}</span>
                        ${l.certificados.length ? `<span class="ins-sub">${l.certificados.length === 1 ? 'Certificado anexado' : `${l.certificados.length} certificados`}</span>` : ''}
                        ${l.peroxido_vencido ? '<span class="ins-sub text-warning">Testar peróxidos antes de usar</span>' : ''}</td>
                    <td>${l.local_nome ? esc(l.local_nome) : '<span class="text-faint">—</span>'}</td>
                    <td class="num tabular">${num(l.quantidade)} <span translate="no">${esc(item.unidade)}</span></td>
                    <td>${validadeLote(l)}</td>
                    <td class="col-hide-sm tabular">${l.data_abertura ? dataBR(l.data_abertura) : '<span class="text-faint">fechado</span>'}</td>
                    <td class="col-hide-sm tabular">${l.data_recebimento ? dataBR(l.data_recebimento) : '—'}</td>
                    <td class="end"><span class="ins-acoes-linha ins-acoes-local">
                        ${item.categoria === 'Reagentes' && l.quantidade > 0 ? `<button type="button" class="link-btn" data-rotulo="${l.id}">Rótulo</button>` : ''}
                        <button type="button" class="link-btn" data-lote="${l.id}">Editar</button></span></td>
                </tr>`;
            const tabela = (lista) => `
                <div class="table-container">
                    <table class="data-table ins-lotes-tabela">
                        <thead><tr>
                            <th scope="col">Lote</th><th scope="col">Local</th><th scope="col" class="num">Quantidade</th>
                            <th scope="col">Validade</th><th scope="col" class="col-hide-sm">Aberto em</th>
                            <th scope="col" class="col-hide-sm">Recebido em</th><th scope="col" class="end"><span class="sr-only">Ações</span></th>
                        </tr></thead>
                        <tbody>${lista.map(linha).join('')}</tbody>
                    </table>
                </div>`;
            corpo.innerHTML = `
                ${comSaldo.length ? `<p class="help mb-sm">Na ordem em que devem sair: o que vence primeiro fica no topo.</p>${tabela(comSaldo)}`
                    : '<p class="dialog-text">Nenhum lote com saldo.</p>'}
                ${esgotados.length ? `<details class="ins-mais mt-md"><summary>Lotes esgotados (${esgotados.length})</summary>${tabela(esgotados)}</details>` : ''}`;
            corpo.addEventListener('click', (ev) => {
                const rot = ev.target.closest('[data-rotulo]');
                if (rot) { imprimirRotulo(item, lotes.find(l => l.id === Number(rot.dataset.rotulo))); return; }
                const btn = ev.target.closest('[data-lote]');
                if (!btn) return;
                const lote = lotes.find(l => l.id === Number(btn.dataset.lote));
                if (lote) { modal.fechar(); abrirEditarLote(lote, item, origem); }
            });
        } catch (err) {
            corpo.setAttribute('aria-busy', 'false');
            corpo.innerHTML = window.UI.errorState(esc(err.message));
        }
    }

    function abrirEditarLote(lote, item, origem) {
        const modal = abrirModal({
            id: 'ins-modal-lote', origem, tamanho: 'modal-md',
            eyebrow: `${item.nome} · ${num(lote.quantidade)} ${item.unidade}`,
            titulo: lote.lote ? `Lote ${lote.lote}` : 'Lote sem número',
            corpo: `
                <form id="ins-form-lote" class="ins-form" novalidate>
                    <div class="field-grid">
                        <div class="input-group">
                            <label for="ins-l-lote">Número do lote</label>
                            <input type="text" id="ins-l-lote" class="form-control" maxlength="100" autocomplete="off" value="${esc(lote.lote || '')}">
                        </div>
                        <div class="input-group">
                            <label for="ins-l-local">Local</label>
                            <input type="text" id="ins-l-local" class="form-control" maxlength="200" list="ins-l-locais" autocomplete="off" value="${esc(lote.local_nome || '')}">
                            ${datalistLocais('ins-l-locais')}
                        </div>
                        <div class="input-group">
                            <label for="ins-l-validade">Validade do fabricante</label>
                            <input type="date" id="ins-l-validade" class="form-control" value="${esc(lote.validade || '')}">
                        </div>
                        <div class="input-group">
                            <label for="ins-l-abertura">Aberto em</label>
                            <input type="date" id="ins-l-abertura" class="form-control" value="${esc(lote.data_abertura || '')}" aria-describedby="ins-l-abertura-ajuda">
                            <p class="help" id="ins-l-abertura-ajuda">Gravada sozinha no primeiro uso.${item.validade_apos_aberto_dias ? ` Depois de aberto, vale ${item.validade_apos_aberto_dias} dias.` : ''}</p>
                        </div>
                        <div class="input-group">
                            <label for="ins-l-receb">Recebido em</label>
                            <input type="date" id="ins-l-receb" class="form-control" value="${esc(lote.data_recebimento || '')}">
                        </div>
                        <div class="input-group">
                            <label for="ins-l-fornecedor">Fornecedor</label>
                            <input type="text" id="ins-l-fornecedor" class="form-control" maxlength="200" autocomplete="off" value="${esc(lote.fornecedor || '')}">
                        </div>
                        <div class="input-group">
                            <label for="ins-l-nf">Nota fiscal</label>
                            <input type="text" id="ins-l-nf" class="form-control" maxlength="100" autocomplete="off" value="${esc(lote.nota_fiscal || '')}">
                        </div>
                        ${item.formador_peroxido ? `
                        <div class="input-group">
                            <label for="ins-l-peroxido">Último teste de peróxidos</label>
                            <input type="date" id="ins-l-peroxido" class="form-control" value="${esc(lote.ultimo_teste_peroxido || '')}" aria-describedby="ins-l-peroxido-ajuda">
                            <p class="help ${lote.peroxido_vencido ? 'text-warning' : ''}" id="ins-l-peroxido-ajuda">${lote.peroxido_vencido
                                ? 'Teste vencido: teste o frasco antes de usar e registre a data.'
                                : `Testar a cada ${item.intervalo_teste_peroxido_dias || 90} dias depois de aberto.`}</p>
                        </div>` : ''}
                    </div>
                    <div class="ins-secao-arquivos">
                        <span class="label">Certificado de análise</span>
                        <ul class="ins-arquivos">${lote.certificados.map(a => `
                            <li><button type="button" class="link-btn" data-arquivo="${a.id}">${icone('file-text', 13)} ${esc(a.nome_arquivo)}</button>
                                <span class="text-muted text-small">${esc([a.enviado_por_nome, dataHora(a.criado_em)].filter(Boolean).join(' · '))}</span></li>`).join('')
                            || '<li class="text-muted text-small">Nenhum certificado anexado.</li>'}</ul>
                        <label class="btn btn-secondary btn-sm ins-enviar-arquivo">${icone('upload', 13)} Anexar PDF
                            <input type="file" accept="application/pdf,.pdf" class="sr-only" id="ins-l-cert"></label>
                    </div>
                    <p class="help mt-sm">A quantidade só muda por entrada, uso ou reporte.</p>
                </form>`,
            rodape: `<button type="button" class="btn btn-secondary" data-role="cancel">Cancelar</button>
                     <button type="submit" form="ins-form-lote" class="btn btn-primary" id="ins-l-ok">Salvar lote</button>`,
        });
        const v = (id) => modal.querySelector(`#ins-l-${id}`).value.trim() || null;
        modal.querySelectorAll('[data-arquivo]').forEach(b => b.addEventListener('click', () => abrirArquivo(Number(b.dataset.arquivo), b)));
        modal.querySelector('#ins-l-cert').addEventListener('change', async (ev) => {
            const f = ev.target.files && ev.target.files[0];
            if (!f) return;
            try {
                await enviarPdf(item.id, 'certificado', f, lote.id);
                window.UI.showToast('Certificado anexado.', 'success');
                modal.fechar();
                abrirLotes(item, origem);
            } catch (err) { window.UI.showToast(err.message, 'error'); }
        });
        modal.querySelector('#ins-form-lote').addEventListener('submit', (ev) => {
            ev.preventDefault();
            comBotao(modal.querySelector('#ins-l-ok'), 'Salvando', async () => {
                try {
                    const dados = {
                        lote: v('lote'), localizacao: v('local'), validade: v('validade'), data_abertura: v('abertura'),
                        data_recebimento: v('receb'), fornecedor: v('fornecedor'), nota_fiscal: v('nf'),
                    };
                    if (modal.querySelector('#ins-l-peroxido')) dados.ultimo_teste_peroxido = v('peroxido');
                    await comJustificativa((justificativa) => req(`/insumos/lotes/${lote.id}`, { method: 'PUT', json: { ...dados, justificativa } }));
                    delete modal.querySelector('form').dataset.sujo;
                    modal.fechar();
                    window.UI.showToast('Lote atualizado.', 'success');
                    await carregar();
                    abrirLotes(E.itens.find(x => x.id === item.id) || item, origem);
                } catch (err) { if (!err.cancelado) window.UI.showToast(err.message, 'error'); }
            });
        });
        setTimeout(() => modal.querySelector('#ins-l-lote').focus(), 30);
    }

    /**
     * Rótulo de frasco fracionado (NR-26 / NBR 14725): identificação, pictogramas, palavra de advertência,
     * frases H e P, lote, data e responsável. Abre numa janela própria, pronta para imprimir.
     * É um documento de impressão (como a prévia do POP): o losango vermelho segue o padrão do GHS.
     */
    async function imprimirRotulo(item, lote) {
        if (item.pendente_revisao) {
            const ok = await window.UI.confirm('A classificação GHS deste item ainda não foi revisada por um gestor. O rótulo pode sair incompleto.',
                { title: 'Imprimir mesmo assim?', confirmText: 'Imprimir' });
            if (!ok) return;
        }
        let usuario = {};
        try { usuario = JSON.parse(localStorage.getItem('user_data') || '{}'); } catch (e) { usuario = {}; }
        const frasesH = (item.ghs_frases_h || []).map(c => `<li><b>${esc(c)}</b> ${esc(fraseH(c)?.texto || '')}</li>`).join('');
        const pictos = (item.ghs_pictogramas || []).map(c => `
            <div class="p"><div class="d"><span>${esc(nomePictograma(c))}</span></div><small>${esc(c)}</small></div>`).join('');
        const hoje = FORMATO_DIA.format(new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`));
        const linha = (rotulo, valor) => (valor ? `<div><dt>${esc(rotulo)}</dt><dd>${esc(valor)}</dd></div>` : '');
        const janela = window.open('', '_blank', 'width=720,height=640');
        if (!janela) { window.UI.showToast('O navegador bloqueou a janela do rótulo. Permita pop-ups para este site.', 'error'); return; }
        janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Rótulo · ${esc(item.nome)}</title>
            <style>
                @page { margin: 8mm; }
                body { font-family: Arial, sans-serif; color: #000; margin: 0; padding: 12px; }
                .r { width: 100mm; border: 2px solid #000; padding: 4mm; box-sizing: border-box; }
                h1 { font-size: 15pt; margin: 0 0 1mm; } .sub { font-size: 8.5pt; margin: 0 0 2mm; }
                .pal { font-size: 13pt; font-weight: 700; text-transform: uppercase; margin: 2mm 0; }
                .ps { display: flex; flex-wrap: wrap; gap: 2mm; margin: 2mm 0; }
                .p { width: 21mm; text-align: center; } .p small { font-size: 6.5pt; }
                .d { width: 12mm; height: 12mm; margin: 3.5mm auto; border: 1.2mm solid #e30613; transform: rotate(45deg); display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
                .d span { transform: rotate(-45deg); font-size: 5pt; font-weight: 700; line-height: 1.05; text-align: center; width: 13mm; }
                ul { margin: 1mm 0; padding-left: 4mm; font-size: 8pt; } li { margin: .5mm 0; }
                .pp { font-size: 7.5pt; margin: 1mm 0; }
                dl { display: grid; grid-template-columns: 1fr 1fr; gap: 1mm 3mm; margin: 2mm 0 0; font-size: 7.5pt; border-top: 1px solid #000; padding-top: 2mm; }
                dt { font-weight: 700; } dd { margin: 0; }
                .fds { font-size: 7.5pt; margin-top: 2mm; font-weight: 700; }
                .acoes { margin-top: 12px; } @media print { .acoes { display: none; } }
            </style></head><body>
            <div class="r">
                <h1>${esc(item.nome)}</h1>
                <p class="sub">${esc([item.cas ? `CAS ${item.cas}` : '', item.concentracao_pct != null ? `${num(item.concentracao_pct)}%` : '', item.fabricante].filter(Boolean).join(' · '))}</p>
                ${item.ghs_palavra ? `<p class="pal">${esc(item.ghs_palavra)}</p>` : ''}
                ${pictos ? `<div class="ps">${pictos}</div>` : ''}
                ${frasesH ? `<ul>${frasesH}</ul>` : (item.ghs_perigoso === false ? '<p class="pp">Produto não classificado como perigoso pelo GHS.</p>' : '')}
                ${item.ghs_frases_p ? `<p class="pp"><b>Precaução:</b> ${esc(item.ghs_frases_p.split(',').join(', '))}</p>` : ''}
                <dl>
                    ${linha('Lote de origem', lote?.lote || '')}
                    ${linha('Validade', lote?.validade_efetiva ? dataBR(lote.validade_efetiva) : '')}
                    ${linha('Fracionado em', hoje)}
                    ${linha('Responsável', usuario.nome || '')}
                    ${linha('Laboratório', 'LEQM')}
                </dl>
                <p class="fds">Antes de usar, consulte a FDS (Ficha com Dados de Segurança).</p>
            </div>
            <div class="acoes"><button onclick="window.print()">Imprimir</button></div>
            </body></html>`);
        janela.document.close();
        janela.focus();
    }

    /** Envia um PDF (FDS ou certificado) para o bucket privado, passando pelo backend. */
    async function enviarPdf(insumoId, tipo, arquivo, loteId) {
        if (!/\.pdf$/i.test(arquivo.name)) throw new Error('Envie o arquivo em PDF.');
        if (arquivo.size > 15 * 1024 * 1024) throw new Error('O PDF passa de 15 MB.');
        const fd = new FormData();
        fd.append('tipo', tipo);
        if (loteId) fd.append('lote_id', String(loteId));
        fd.append('file', arquivo);
        return req(`/insumos/${insumoId}/anexos`, { method: 'POST', body: fd });
    }

    // ==========================================
    // LOCAIS (só gestores: tipo e capacidade de inflamáveis)
    // ==========================================
    function abrirLocais(origem) {
        const tipos = (E.ref && E.ref.tipos_local) || [];
        const opcoesTipo = (atual) => `<option value="">Tipo não definido</option>${tipos.map(t => `<option ${t === atual ? 'selected' : ''}>${esc(t)}</option>`).join('')}`;
        const modal = abrirModal({
            id: 'ins-modal-locais', origem, tamanho: 'modal-lg',
            eyebrow: 'armazenamento', titulo: 'Locais dos insumos',
            corpo: `
                <p class="help mb-md">Qualquer pessoa cria um local ao digitar um nome novo numa entrada. Aqui a coordenação define o tipo de cada um
                    e a capacidade dos armários de inflamáveis (NR-20 / NBR 17505).</p>
                <form id="ins-form-local-novo" class="ins-local-novo" novalidate>
                    <div class="input-group">
                        <label for="ins-loc-nome">Novo local</label>
                        <input type="text" id="ins-loc-nome" class="form-control" maxlength="200" autocomplete="off" placeholder="Ex.: Armário de inflamáveis 2" aria-describedby="ins-loc-nome-erro">
                        <p class="field-error hidden" id="ins-loc-nome-erro" role="alert"></p>
                    </div>
                    <div class="input-group">
                        <label for="ins-loc-tipo">Tipo</label>
                        <select id="ins-loc-tipo" class="form-control">${opcoesTipo('')}</select>
                    </div>
                    <button type="submit" class="btn btn-secondary" id="ins-loc-add">${icone('plus', 13)} Adicionar</button>
                </form>
                <div id="ins-locais-lista" aria-live="polite"></div>`,
        });
        const lista = modal.querySelector('#ins-locais-lista');

        const render = () => {
            if (!E.locais.length) { lista.innerHTML = window.UI.emptyState({ title: 'Nenhum local cadastrado' }); return; }
            lista.innerHTML = `
                <div class="table-container">
                    <table class="data-table ins-locais-tabela">
                        <thead><tr><th scope="col">Local</th><th scope="col">Tipo</th><th scope="col">Inflamáveis (L)</th>
                            <th scope="col" class="num">Itens</th><th scope="col" class="end"><span class="sr-only">Ações</span></th></tr></thead>
                        <tbody>${E.locais.map(l => `
                            <tr data-local="${l.id}">
                                <td><input type="text" class="form-control" data-campo="nome" maxlength="200" value="${esc(l.nome)}" aria-label="Nome do local"></td>
                                <td><select class="form-control" data-campo="tipo" aria-label="Tipo de ${esc(l.nome)}">${opcoesTipo(l.tipo)}</select></td>
                                <td><input type="number" class="form-control" data-campo="capacidade" min="0" step="any" inputmode="decimal"
                                    value="${l.capacidade_inflamaveis_l ?? ''}" placeholder="—" aria-label="Capacidade de inflamáveis em litros"
                                    ${l.tipo === 'Armário de inflamáveis' ? '' : 'disabled'}>
                                    ${l.volume_inflamaveis_l ? `<span class="ins-sub ${l.acima_capacidade ? 'text-danger' : ''}">${num(l.volume_inflamaveis_l)} L guardados${l.acima_capacidade ? ' · acima da capacidade' : ''}</span>` : ''}</td>
                                <td class="num tabular">${l.itens}</td>
                                <td class="end"><span class="ins-acoes-linha ins-acoes-local">
                                    <button type="button" class="link-btn" data-local-acao="salvar">Salvar</button>
                                    <button type="button" class="link-btn is-reportar" data-local-acao="remover" ${l.itens ? 'disabled title="Há lotes com saldo neste local"' : ''}>Remover</button>
                                </span></td>
                            </tr>`).join('')}</tbody>
                    </table>
                </div>`;
        };
        const recarregar = async () => { E.locais = await req('/insumos/locais'); render(); };
        render();

        lista.addEventListener('change', (ev) => {
            if (ev.target.dataset.campo !== 'tipo') return;
            const cap = ev.target.closest('tr').querySelector('[data-campo="capacidade"]');
            cap.disabled = ev.target.value !== 'Armário de inflamáveis';
        });
        lista.addEventListener('click', async (ev) => {
            const btn = ev.target.closest('[data-local-acao]');
            if (!btn || btn.disabled) return;
            const tr = btn.closest('tr');
            const id = Number(tr.dataset.local);
            const local = E.locais.find(l => l.id === id);
            if (btn.dataset.localAcao === 'remover') {
                const ok = await window.UI.confirm(`${local.nome} sai da lista de locais.`, { title: 'Remover local?', danger: true, confirmText: 'Remover' });
                if (!ok) return;
                comBotao(btn, 'Removendo', async () => {
                    try { await req(`/insumos/locais/${id}`, { method: 'DELETE' }); await recarregar(); window.UI.showToast('Local removido.', 'success'); }
                    catch (err) { window.UI.showToast(err.message, 'error'); }
                });
                return;
            }
            const campo = (c) => tr.querySelector(`[data-campo="${c}"]`);
            const tipo = campo('tipo').value || null;
            const cap = campo('capacidade').value;
            comBotao(btn, 'Salvando', async () => {
                try {
                    await req(`/insumos/locais/${id}`, { method: 'PUT', json: {
                        nome: campo('nome').value.trim() || local.nome, tipo,
                        capacidade_inflamaveis_l: tipo === 'Armário de inflamáveis' && cap !== '' ? Number(cap) : null,
                    } });
                    await recarregar();
                    window.UI.showToast('Local atualizado.', 'success');
                    carregar();
                } catch (err) { window.UI.showToast(err.message, 'error'); }
            });
        });
        modal.querySelector('#ins-form-local-novo').addEventListener('submit', (ev) => {
            ev.preventDefault();
            const nome = modal.querySelector('#ins-loc-nome');
            if (!nome.value.trim()) { erroNoCampo(nome, 'Informe o nome do local.'); nome.focus(); return; }
            erroNoCampo(nome, '');
            comBotao(modal.querySelector('#ins-loc-add'), 'Adicionando', async () => {
                try {
                    await req('/insumos/locais', { method: 'POST', json: { nome: nome.value.trim(), tipo: modal.querySelector('#ins-loc-tipo').value || null } });
                    nome.value = '';
                    await recarregar();
                    nome.focus();
                } catch (err) { erroNoCampo(nome, err.message); nome.focus(); }
            });
        });
        setTimeout(() => modal.querySelector('#ins-loc-nome').focus(), 30);
    }

    // ==========================================
    // RELATÓRIOS DE CONFORMIDADE E SINÔNIMOS DA LISTA DA PF (só gestores)
    // ==========================================
    function abrirRelatorios(origem) {
        const agora = new Date();
        const mesPadrao = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
        const produtos = (E.ref && E.ref.pf && E.ref.pf.produtos) || [];
        const modal = abrirModal({
            id: 'ins-modal-relatorios', origem, tamanho: 'modal-lg',
            eyebrow: 'conformidade', titulo: 'Relatórios',
            corpo: `
                <ul class="ins-relatorios">
                    <li>
                        <div><strong>Inventário de agentes químicos</strong><p class="help">Para o PGR (NR-01 / NR-09): classificação GHS, frases H, quantidades, locais e FDS.</p></div>
                        <button type="button" class="btn btn-secondary btn-sm" data-relatorio="pgr">${icone('download', 13)} Baixar</button>
                    </li>
                    <li>
                        <div><strong>Inflamáveis por local</strong><p class="help">NR-20 / NBR 17505: volume guardado em cada local e capacidade dos armários.</p></div>
                        <button type="button" class="btn btn-secondary btn-sm" data-relatorio="nr20">${icone('download', 13)} Baixar</button>
                    </li>
                    <li>
                        <div><strong>Produtos controlados no mês</strong><p class="help">Entradas, usos, descartes e saldos dos controlados pela PF, Anvisa e Exército. Base para os mapas do SIPROQUIM.</p></div>
                        <span class="ins-relatorio-mes">
                            <label class="sr-only" for="ins-rel-mes">Mês</label>
                            <input type="month" id="ins-rel-mes" class="form-control" value="${mesPadrao}" max="${mesPadrao}">
                            <button type="button" class="btn btn-secondary btn-sm" data-relatorio="controlados">${icone('download', 13)} Baixar</button>
                        </span>
                    </li>
                </ul>
                <section class="ins-sinonimos" aria-labelledby="ins-sin-titulo">
                    <h4 id="ins-sin-titulo">Sinônimos da lista da Polícia Federal</h4>
                    <p class="help mb-sm">O sistema reconhece os produtos da ${esc((E.ref && E.ref.pf && E.ref.pf.portaria) || 'Portaria MJSP 204/2022')} pelo nome oficial.
                        Quando o laboratório usa outro nome (ex.: “Diclorometano” para Cloreto de metileno), cadastre aqui; os itens já cadastrados são reconhecidos na hora.</p>
                    <form id="ins-form-sin" class="ins-local-novo" novalidate>
                        <div class="input-group">
                            <label for="ins-sin-nome">Nome usado no laboratório</label>
                            <input type="text" id="ins-sin-nome" class="form-control" maxlength="200" autocomplete="off" aria-describedby="ins-sin-nome-erro">
                            <p class="field-error hidden" id="ins-sin-nome-erro" role="alert"></p>
                        </div>
                        <div class="input-group">
                            <label for="ins-sin-codigo">Produto da lista</label>
                            <select id="ins-sin-codigo" class="form-control">
                                ${[...new Set(produtos.map(p => p.lista))].map(l => `<optgroup label="Lista ${esc(l)}">${produtos.filter(p => p.lista === l).map(p => `<option value="${p.codigo}">${esc(p.codigo)} · ${esc(p.nome.length > 60 ? `${p.nome.slice(0, 60)}…` : p.nome)}</option>`).join('')}</optgroup>`).join('')}
                            </select>
                        </div>
                        <button type="submit" class="btn btn-secondary" id="ins-sin-add">${icone('plus', 13)} Adicionar</button>
                    </form>
                    <div id="ins-sin-lista" aria-live="polite">${window.UI.loading('Carregando sinônimos…')}</div>
                </section>`,
        });

        modal.querySelectorAll('[data-relatorio]').forEach(btn => btn.addEventListener('click', () => {
            const tipo = btn.dataset.relatorio;
            let caminho = `/insumos/relatorios/${tipo}`;
            let nome = { pgr: 'inventario_quimicos_pgr.xlsx', nr20: 'inflamaveis_nr20.xlsx' }[tipo];
            if (tipo === 'controlados') {
                const [ano, mes] = (modal.querySelector('#ins-rel-mes').value || mesPadrao).split('-');
                caminho += `?ano=${Number(ano)}&mes=${Number(mes)}`;
                nome = `controlados_${ano}-${mes}.xlsx`;
            }
            comBotao(btn, 'Gerando', async () => {
                try { await baixarArquivo(caminho, nome, 'Não foi possível gerar o relatório.'); window.UI.showToast('Relatório baixado.', 'success'); }
                catch (err) { window.UI.showToast(err.message, 'error'); }
            });
        }));

        const lista = modal.querySelector('#ins-sin-lista');
        const render = (sinonimos) => {
            lista.innerHTML = sinonimos.length ? `
                <div class="table-container"><table class="data-table">
                    <thead><tr><th scope="col">Nome no laboratório</th><th scope="col">Produto da lista</th><th scope="col">Lista</th><th scope="col" class="end"><span class="sr-only">Ações</span></th></tr></thead>
                    <tbody>${sinonimos.map(s => `<tr><td>${esc(s.nome)}</td><td>${esc(s.codigo)} · ${esc(s.produto || '')}</td><td>${esc(s.lista || '')}</td>
                        <td class="end"><span class="ins-acoes-linha ins-acoes-local"><button type="button" class="link-btn is-reportar" data-sin="${s.id}">Remover</button></span></td></tr>`).join('')}</tbody>
                </table></div>` : '<p class="help">Nenhum sinônimo cadastrado.</p>';
        };
        const recarregar = async () => { render(await req('/insumos/pf/sinonimos')); };
        recarregar().catch(err => { lista.innerHTML = window.UI.errorState(esc(err.message)); });

        lista.addEventListener('click', (ev) => {
            const btn = ev.target.closest('[data-sin]');
            if (!btn) return;
            comBotao(btn, 'Removendo', async () => {
                try { await req(`/insumos/pf/sinonimos/${btn.dataset.sin}`, { method: 'DELETE' }); await recarregar(); carregar(); }
                catch (err) { window.UI.showToast(err.message, 'error'); }
            });
        });
        modal.querySelector('#ins-form-sin').addEventListener('submit', (ev) => {
            ev.preventDefault();
            const nome = modal.querySelector('#ins-sin-nome');
            if (nome.value.trim().length < 2) { erroNoCampo(nome, 'Informe o nome usado no laboratório.'); nome.focus(); return; }
            erroNoCampo(nome, '');
            comBotao(modal.querySelector('#ins-sin-add'), 'Adicionando', async () => {
                try {
                    const r = await req('/insumos/pf/sinonimos', { method: 'POST', json: { nome: nome.value.trim(), codigo: modal.querySelector('#ins-sin-codigo').value } });
                    nome.value = '';
                    await recarregar();
                    window.UI.showToast(r.insumos_reconhecidos ? `Sinônimo cadastrado. ${r.insumos_reconhecidos} ${r.insumos_reconhecidos === 1 ? 'item foi reconhecido' : 'itens foram reconhecidos'}.` : 'Sinônimo cadastrado.', 'success');
                    carregar();
                    nome.focus();
                } catch (err) { erroNoCampo(nome, err.message); nome.focus(); }
            });
        });
    }

    // ==========================================
    // FORMULÁRIO DO INSUMO
    // Cadastro mínimo para todos; seções técnicas (GHS, FDS, CA, vidraria) e revisão só para gestores.
    // ==========================================
    /** Checkbox de segurança: na tela é uma checkbox, mas guarda três estados (não verificado, sim, não). */
    function checkSeguranca(id, rotulo, valor) {
        const estado = valor === null || valor === undefined ? 'null' : String(!!valor);
        return `<label class="check-inline ins-tri" for="${id}">
                    <input type="checkbox" id="${id}" data-tri="${estado}" ${valor ? 'checked' : ''} aria-describedby="${id}-estado">
                    <span>${esc(rotulo)}</span>
                    <span class="ins-tri-estado" id="${id}-estado" data-tri-estado></span>
                </label>`;
    }
    function ligarTriEstados(raiz) {
        raiz.querySelectorAll('[data-tri]').forEach((c) => {
            const marcador = raiz.querySelector(`#${c.id}-estado`);
            const pintar = () => {
                c.indeterminate = c.dataset.tri === 'null';
                marcador.textContent = c.dataset.tri === 'null' ? 'Não verificado' : (c.checked ? 'Sim' : 'Não');
                marcador.classList.toggle('is-pendente', c.dataset.tri === 'null');
            };
            c.addEventListener('change', () => { c.dataset.tri = String(c.checked); pintar(); });
            pintar();
        });
    }
    const valorTri = (c) => (c.dataset.tri === 'null' ? null : c.checked);

    function secaoGhs(i, travado) {
        const pictos = new Set(i.ghs_pictogramas || []);
        const palavra = i.ghs_palavra || '';
        return `
            <fieldset class="ins-secao" data-so="Reagentes" data-tecnico ${travado}>
                <legend>Classificação GHS <span class="text-muted">· NR-26</span></legend>
                <div class="field-grid">
                    <div class="input-group span-2">${checkSeguranca('ins-f-perigoso', 'Produto perigoso pelo GHS', i.ghs_perigoso)}</div>
                </div>
                <div class="ins-ghs-detalhe" id="ins-f-ghs-detalhe">
                    <div class="input-group">
                        <label for="ins-f-frase-h">Frases H (perigo)</label>
                        <input type="text" id="ins-f-frase-h" class="form-control" list="ins-frases-h" autocomplete="off" placeholder="Digite o código ou parte do texto e tecle Enter" aria-describedby="ins-f-frase-h-ajuda">
                        <datalist id="ins-frases-h">${(E.ref?.frases_h || []).map(f => `<option value="${esc(`${f.codigo} · ${f.texto}`)}"></option>`).join('')}</datalist>
                        <p class="help" id="ins-f-frase-h-ajuda">Copie da seção 2 da FDS.</p>
                        <ul class="ins-frases" id="ins-f-frases" aria-live="polite"></ul>
                        <button type="button" class="link-btn" id="ins-f-sugerir">${icone('sparkles', 13)} Sugerir pictogramas e palavra de advertência</button>
                    </div>
                    <div class="input-group">
                        <span class="label" id="ins-f-pictos-rotulo">Pictogramas</span>
                        <div class="check-chips ins-pictos" role="group" aria-labelledby="ins-f-pictos-rotulo">
                            ${(E.ref?.pictogramas || []).map(p => `<label class="check-chip"><input type="checkbox" name="ghs_pictogramas" value="${p.codigo}" ${pictos.has(p.codigo) ? 'checked' : ''}>${losango(p.codigo)} ${esc(p.nome)}</label>`).join('')}
                        </div>
                    </div>
                    <div class="field-grid">
                        <div class="input-group">
                            <span class="label" id="ins-f-palavra-rotulo">Palavra de advertência</span>
                            <div class="check-chips" role="radiogroup" aria-labelledby="ins-f-palavra-rotulo">
                                ${['Perigo', 'Atenção', ''].map(p => `<label class="check-chip"><input type="radio" name="ghs_palavra" value="${p}" ${palavra === p ? 'checked' : ''}> ${p || 'Nenhuma'}</label>`).join('')}
                            </div>
                        </div>
                        <div class="input-group">
                            <label for="ins-f-frases-p">Frases P (precaução)</label>
                            <textarea id="ins-f-frases-p" class="form-control" rows="2" maxlength="1000" placeholder="P210, P305+P351+P338…">${esc(i.ghs_frases_p || '')}</textarea>
                        </div>
                    </div>
                </div>
            </fieldset>`;
    }

    const ROTULO_NR20 = { inflamavel: 'Inflamável', combustivel: 'Combustível', gas_inflamavel: 'Gás inflamável', fora: 'Fora da NR-20' };

    /** Mesma regra do backend: PF <= 60 °C inflamável; 60–93 °C combustível (inflamável se usado aquecido); > 93 °C fora. */
    function nr20Pelo(pf, aquecido, frases) {
        if (pf !== null && pf !== '' && Number.isFinite(Number(pf))) {
            const v = Number(pf);
            if (v <= 60) return 'inflamavel';
            if (v <= 93) return aquecido ? 'inflamavel' : 'combustivel';
            return 'fora';
        }
        if (frases.some(f => ['H224', 'H225', 'H226'].includes(f))) return 'inflamavel';
        if (frases.includes('H227')) return aquecido ? 'inflamavel' : 'combustivel';
        if (frases.some(f => ['H220', 'H221'].includes(f))) return 'gas_inflamavel';
        return null;
    }

    function secaoArmazenagem(i, travado) {
        const grupos = new Set(i.grupos_compatibilidade || []);
        const automaticos = (i.grupos_efetivos || []).filter(g => !grupos.has(g));
        const temperaturas = (E.ref && E.ref.temperaturas) || [];
        return `
            <fieldset class="ins-secao" data-so="Reagentes" data-tecnico ${travado}>
                <legend>Inflamáveis <span class="text-muted">· NR-20 / NBR 17505</span></legend>
                <div class="field-grid">
                    <div class="input-group">
                        <label for="ins-f-fulgor">Ponto de fulgor (°C)</label>
                        <input type="number" id="ins-f-fulgor" class="form-control" step="any" inputmode="decimal" value="${i.ponto_fulgor_c ?? ''}" placeholder="—" aria-describedby="ins-f-nr20">
                        <p class="help" id="ins-f-nr20" aria-live="polite"></p>
                    </div>
                    <div class="input-group ins-checks">
                        <label class="check-inline"><input type="checkbox" id="ins-f-aquecido" ${i.usado_aquecido ? 'checked' : ''}> Usado ou guardado aquecido (até o ponto de fulgor)</label>
                    </div>
                </div>
            </fieldset>
            <fieldset class="ins-secao" data-so="Reagentes" data-tecnico ${travado}>
                <legend>Armazenagem e compatibilidade</legend>
                <div class="input-group">
                    <span class="label" id="ins-f-grupos-rotulo">Grupos de compatibilidade</span>
                    <div class="check-chips" role="group" aria-labelledby="ins-f-grupos-rotulo">
                        ${((E.ref && E.ref.grupos_compatibilidade) || []).map(g => `<label class="check-chip"><input type="checkbox" name="grupos_compatibilidade" value="${esc(g)}" ${grupos.has(g) ? 'checked' : ''}> ${esc(g)}</label>`).join('')}
                    </div>
                    <p class="help">Usados para avisar quando produtos incompatíveis ficam no mesmo local (ex.: inflamável com oxidante, ácido com base).
                        ${automaticos.length ? `Já detectados pelas frases H, NR-20 ou peróxido: <strong>${esc(automaticos.join(', '))}</strong>.` : ''}</p>
                </div>
                <div class="field-grid">
                    <div class="input-group">
                        <label for="ins-f-temperatura">Temperatura de armazenagem</label>
                        <select id="ins-f-temperatura" class="form-control"><option value="">Não informada</option>${temperaturas.map(t => `<option ${t === i.temperatura_armazenagem ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
                    </div>
                    <div class="input-group ins-checks">
                        <label class="check-inline"><input type="checkbox" id="ins-f-luz" ${i.proteger_luz ? 'checked' : ''}> Proteger da luz</label>
                        <label class="check-inline"><input type="checkbox" id="ins-f-umidade" ${i.proteger_umidade ? 'checked' : ''}> Proteger da umidade</label>
                        <label class="check-inline"><input type="checkbox" id="ins-f-inerte" ${i.atmosfera_inerte ? 'checked' : ''}> Atmosfera inerte</label>
                    </div>
                    <div class="input-group">${checkSeguranca('ins-f-peroxido', 'Formador de peróxidos', i.formador_peroxido)}
                        <p class="help">Éteres, THF, dioxano… O frasco aberto precisa de teste periódico.</p></div>
                    <div class="input-group">
                        <label for="ins-f-peroxido-dias">Testar a cada (dias)</label>
                        <input type="number" id="ins-f-peroxido-dias" class="form-control" min="1" max="3650" step="1" inputmode="numeric" value="${i.intervalo_teste_peroxido_dias ?? ''}" placeholder="90">
                    </div>
                </div>
            </fieldset>`;
    }

    function secaoControlados(i, travado) {
        const pf = i.pf || {};
        const produtos = (E.ref && E.ref.pf && E.ref.pf.produtos) || [];
        const listas = [...new Set(produtos.map(p => p.lista))];
        const situacao = { controlado: 'acima do limite de concentração da lista', possivel: 'concentração não informada', abaixo_limite: 'abaixo do limite de concentração (não controlado)', informativo: 'Lista VII: só vale para exportação' };
        const sugestao = pf.sugestao_codigo ? produtos.find(p => p.codigo === pf.sugestao_codigo) : null;
        const anvisa = (E.ref && E.ref.listas_anvisa) || [];
        return `
            <fieldset class="ins-secao" data-so="Reagentes" data-tecnico ${travado}>
                <legend>Produtos controlados</legend>
                <p class="help mb-sm">${sugestao
                    ? `Pelo nome, o sistema reconheceu <strong>${esc(sugestao.nome)}</strong> (Polícia Federal, Lista ${esc(sugestao.lista)}, código ${esc(sugestao.codigo)}): ${esc(situacao[pf.sugestao_situacao] || '')}. Confirme abaixo.`
                    : 'O nome não corresponde a nenhum produto da lista da Polícia Federal. Se for um nome diferente do oficial, cadastre um sinônimo em Relatórios.'}</p>
                <div class="field-grid">
                    <div class="input-group">${checkSeguranca('ins-f-pf', 'Controlado pela Polícia Federal', i.pf_controlado)}</div>
                    <div class="input-group">
                        <label for="ins-f-pf-codigo">Produto na lista da PF</label>
                        <select id="ins-f-pf-codigo" class="form-control">
                            <option value="">${sugestao ? `Usar o reconhecido (${esc(sugestao.codigo)})` : 'Não se aplica'}</option>
                            ${listas.map(l => `<optgroup label="Lista ${esc(l)}">${produtos.filter(p => p.lista === l).map(p => `<option value="${p.codigo}" ${p.codigo === i.pf_codigo ? 'selected' : ''}>${esc(p.codigo)} · ${esc(p.nome.length > 70 ? `${p.nome.slice(0, 70)}…` : p.nome)}</option>`).join('')}</optgroup>`).join('')}
                        </select>
                    </div>
                    <div class="input-group span-2">
                        <label class="check-inline"><input type="checkbox" id="ins-f-pf-isento" ${i.pf_isento ? 'checked' : ''}> Isento do controle (Seção III do Capítulo V da Portaria 204/2022)</label>
                        <textarea id="ins-f-pf-isencao" class="form-control mt-xs ${i.pf_isento ? '' : 'hidden'}" rows="2" maxlength="1000" placeholder="Qual isenção se aplica e por quê" aria-label="Justificativa da isenção">${esc(i.pf_isencao_justificativa || '')}</textarea>
                    </div>
                    <div class="input-group">${checkSeguranca('ins-f-anvisa', 'Controlado pela Anvisa (Portaria 344/98)', i.anvisa_controlado)}</div>
                    <div class="input-group">
                        <label for="ins-f-anvisa-lista">Lista da Anvisa</label>
                        <select id="ins-f-anvisa-lista" class="form-control"><option value="">Não se aplica</option>${anvisa.map(l => `<option ${l === i.anvisa_lista ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
                    </div>
                    <div class="input-group">${checkSeguranca('ins-f-exercito', 'Controlado pelo Exército (Decreto 10.030/2019)', i.exercito_controlado)}</div>
                </div>
            </fieldset>`;
    }

    function abrirFormulario(item, origem) {
        const novo = !item;
        const gestor = podeRevisar();
        const i = item || { categoria: 'Reagentes', unidade: 'un', estoque_minimo: 0 };
        const umLote = !novo && i.lotes_com_saldo === 1;
        const opcoes = (lista, atual, vazio) => `${vazio !== undefined ? `<option value="">${esc(vazio)}</option>` : ''}${lista.map(v => `<option ${v === atual ? 'selected' : ''}>${esc(v)}</option>`).join('')}`;
        const estados = (E.ref && E.ref.estados_fisicos) || ['Sólido', 'Líquido', 'Gás'];
        // Usuário comum: no cadastro, as seções técnicas nem aparecem; na edição aparecem só para leitura.
        const mostrarTecnico = gestor || !novo;
        const travado = gestor ? '' : 'disabled';

        const modal = abrirModal({
            id: 'ins-modal-form', origem, tamanho: 'modal-lg',
            eyebrow: novo ? 'novo insumo' : (gestor && i.pendente_revisao ? 'revisar insumo' : 'editar insumo'),
            titulo: novo ? 'Cadastrar insumo' : i.nome,
            corpo: `
                <form id="ins-form" class="ins-form" novalidate>
                    ${!novo ? `<div class="ins-status-revisao ${i.pendente_revisao ? 'is-pendente' : 'is-ok'}">
                        ${i.pendente_revisao
                            ? `<strong>Revisão pendente.</strong> ${gestor ? 'Complete os dados técnicos abaixo e marque como revisado.' : 'A coordenação foi avisada e vai completar os dados técnicos.'}`
                            : `<strong>Revisado</strong>${i.revisado_por_nome ? ` por ${esc(i.revisado_por_nome)}` : ''}${i.revisado_em ? ` em ${dataHora(i.revisado_em)}` : ''}.${gestor ? '' : ' Mudar nome, categoria, estado físico, concentração ou fabricante reabre a revisão.'}`}
                    </div>` : (gestor ? '' : '<p class="help mb-md">Preencha o básico. A classificação GHS, a FDS e o CA ficam com a coordenação, que recebe um aviso por e-mail.</p>')}

                    <fieldset class="ins-secao">
                        <legend>Identificação</legend>
                        <div class="field-grid">
                            <div class="input-group span-2">
                                <label for="ins-f-nome">Nome</label>
                                <input type="text" id="ins-f-nome" name="nome" class="form-control" required maxlength="300" autocomplete="off" value="${esc(i.nome || '')}" placeholder="Ex.: Etanol absoluto P.A.…" aria-describedby="ins-f-nome-erro">
                                <p class="field-error hidden" id="ins-f-nome-erro" role="alert"></p>
                                <div class="ins-dup hidden" id="ins-f-dup" aria-live="polite"></div>
                            </div>
                            <div class="input-group">
                                <label for="ins-f-categoria">Categoria</label>
                                <select id="ins-f-categoria" name="categoria" class="form-control">${opcoes(categorias(), i.categoria)}</select>
                            </div>
                            <div class="input-group">
                                <label for="ins-f-unidade">Unidade</label>
                                <select id="ins-f-unidade" name="unidade" class="form-control">${opcoes(unidades(), i.unidade)}</select>
                            </div>
                            <div class="input-group" data-so="Reagentes">
                                <label for="ins-f-estado">Estado físico</label>
                                <select id="ins-f-estado" name="estado_fisico" class="form-control">${opcoes(estados, i.estado_fisico, 'Não informado')}</select>
                            </div>
                            <div class="input-group" data-so="Reagentes">
                                <label for="ins-f-concentracao">Concentração / pureza (%) <span class="text-muted">(opcional)</span></label>
                                <input type="number" id="ins-f-concentracao" name="concentracao_pct" class="form-control" inputmode="decimal" min="0" max="100" step="any" value="${i.concentracao_pct ?? ''}" aria-describedby="ins-f-concentracao-erro">
                                <p class="field-error hidden" id="ins-f-concentracao-erro" role="alert"></p>
                            </div>
                            <div class="input-group" data-so="Reagentes">
                                <label for="ins-f-grau">Grau <span class="text-muted">(opcional)</span></label>
                                <input type="text" id="ins-f-grau" name="grau" class="form-control" maxlength="50" list="ins-graus" autocomplete="off" value="${esc(i.grau || '')}">
                                <datalist id="ins-graus"><option value="P.A."></option><option value="ACS"></option><option value="HPLC"></option><option value="UV/HPLC"></option><option value="Técnico"></option><option value="Farmacêutico"></option></datalist>
                            </div>
                            <div class="input-group">
                                <label for="ins-f-fabricante">Fabricante / marca <span class="text-muted">(opcional)</span></label>
                                <input type="text" id="ins-f-fabricante" name="fabricante" class="form-control" maxlength="200" autocomplete="off" value="${esc(i.fabricante || '')}">
                            </div>
                            <div class="input-group">
                                <label for="ins-f-codigo">Código interno <span class="text-muted">(opcional)</span></label>
                                <input type="text" id="ins-f-codigo" name="codigo_interno" class="form-control" maxlength="50" autocomplete="off" value="${esc(i.codigo_interno || '')}">
                            </div>
                            <div class="input-group">
                                <label for="ins-f-minimo">Estoque mínimo</label>
                                <input type="number" id="ins-f-minimo" name="estoque_minimo" class="form-control" inputmode="decimal" min="0" step="any" value="${i.estoque_minimo ?? 0}" aria-describedby="ins-f-minimo-ajuda">
                                <p class="help" id="ins-f-minimo-ajuda">Ao chegar nele, a coordenação recebe um aviso. Use 0 para não avisar.</p>
                            </div>
                        </div>
                    </fieldset>

                    <fieldset class="ins-secao">
                        <legend>${novo ? 'Primeiro lote' : 'Estoque'}</legend>
                        <div class="field-grid">
                            ${novo ? `
                            <div class="input-group">
                                <label for="ins-f-saldo">Saldo inicial</label>
                                <input type="number" id="ins-f-saldo" name="quantidade_inicial" class="form-control" inputmode="decimal" min="0" step="any" value="0">
                                <p class="help">Entra no histórico como a primeira entrada.</p>
                            </div>
                            <div class="input-group">
                                <label for="ins-f-lote">Lote <span class="text-muted">(opcional)</span></label>
                                <input type="text" id="ins-f-lote" name="lote" class="form-control" maxlength="100" autocomplete="off">
                            </div>` : `
                            <div class="input-group">
                                <span class="label">Saldo atual</span>
                                <p class="mt-xs"><strong class="tabular">${num(i.quantidade_atual)} ${esc(i.unidade)}</strong>${i.lotes_com_saldo > 1 ? ` em ${i.lotes_com_saldo} lotes` : ''}</p>
                                <p class="help">Muda só por entrada, uso ou reporte.</p>
                            </div>`}
                            ${novo || umLote ? `
                            <div class="input-group">
                                <label for="ins-f-local">Localização</label>
                                <input type="text" id="ins-f-local" name="localizacao" class="form-control" maxlength="200" list="ins-f-locais" autocomplete="off" value="${esc(i.localizacao || '')}" placeholder="Ex.: Armário 2, prateleira de cima…">
                                ${datalistLocais('ins-f-locais')}
                            </div>
                            <div class="input-group">
                                <label for="ins-f-validade">Validade <span class="text-muted">(opcional)</span></label>
                                <input type="date" id="ins-f-validade" name="validade" class="form-control" value="${esc(umLote ? (i.validade || '') : '')}">
                            </div>` : `
                            <div class="input-group">
                                <span class="label">Local e validade</span>
                                <p class="help mt-xs">${i.lotes_com_saldo > 1 ? 'Cada lote tem os seus.' : 'Entram com a próxima entrada.'}
                                    <button type="button" class="link-btn" id="ins-f-ver-lotes">Ver lotes</button></p>
                            </div>`}
                        </div>
                    </fieldset>

                    <fieldset class="ins-secao" data-so="Reagentes">
                        <legend>FDS <span class="text-muted">· Ficha com Dados de Segurança (NBR 14725:2023)</span></legend>
                        ${novo ? '<p class="help">Depois de cadastrar, abra o item de novo para anexar a FDS em PDF.</p>' : `
                        <div class="ins-secao-arquivos">
                            <div id="ins-f-fds-atual">${i.fds
                                ? `<button type="button" class="link-btn" data-arquivo="${i.fds.id}">${icone('file-text', 13)} ${esc(i.fds.nome_arquivo)}</button>
                                   <span class="text-muted text-small">${esc([i.fds.enviado_por_nome, dataHora(i.fds.criado_em)].filter(Boolean).join(' · '))}</span>`
                                : '<span class="text-muted text-small">Nenhuma FDS anexada.</span>'}</div>
                            <label class="btn btn-secondary btn-sm ins-enviar-arquivo">${icone('upload', 13)} ${i.fds ? 'Enviar FDS mais nova' : 'Anexar FDS (PDF)'}
                                <input type="file" accept="application/pdf,.pdf" class="sr-only" id="ins-f-fds-arquivo"></label>
                        </div>`}
                        ${mostrarTecnico ? `
                        <fieldset class="ins-subsecao" data-tecnico ${travado}>
                            <div class="field-grid">
                                <div class="input-group">
                                    <label for="ins-f-fds-revisao">Revisão da FDS</label>
                                    <input type="text" id="ins-f-fds-revisao" class="form-control" maxlength="50" autocomplete="off" value="${esc(i.fds_revisao || '')}">
                                </div>
                                <div class="input-group">
                                    <label for="ins-f-fds-data">Data da FDS</label>
                                    <input type="date" id="ins-f-fds-data" class="form-control" value="${esc(i.fds_data || '')}">
                                </div>
                                <div class="input-group span-2 ins-checks">
                                    ${checkSeguranca('ins-f-nbr', 'FDS conforme a NBR 14725:2023', i.fds_nbr14725)}
                                    <label class="check-inline"><input type="checkbox" id="ins-f-fds-pt" ${i.fds_portugues ? 'checked' : ''}> FDS em português</label>
                                </div>
                            </div>
                        </fieldset>` : ''}
                    </fieldset>

                    ${mostrarTecnico ? `
                    <fieldset class="ins-secao" data-so="Reagentes" data-tecnico ${travado}>
                        <legend>Identificação química</legend>
                        <div class="field-grid">
                            <div class="input-group">
                                <label for="ins-f-cas">Número CAS</label>
                                <input type="text" id="ins-f-cas" class="form-control" maxlength="12" autocomplete="off" inputmode="numeric" value="${esc(i.cas || '')}" placeholder="64-17-5" aria-describedby="ins-f-cas-erro">
                                <p class="field-error hidden" id="ins-f-cas-erro" role="alert"></p>
                                <label class="check-inline mt-xs"><input type="checkbox" id="ins-f-mistura" ${i.mistura ? 'checked' : ''}> É uma mistura (sem CAS único)</label>
                            </div>
                            <div class="input-group">
                                <label for="ins-f-cod-fab">Código do fabricante (catálogo)</label>
                                <input type="text" id="ins-f-cod-fab" class="form-control" maxlength="100" autocomplete="off" value="${esc(i.codigo_fabricante || '')}">
                            </div>
                            <div class="input-group">
                                <label for="ins-f-aberto">Validade depois de aberto (dias)</label>
                                <input type="number" id="ins-f-aberto" class="form-control" min="1" max="3650" step="1" inputmode="numeric" value="${i.validade_apos_aberto_dias ?? ''}" placeholder="—">
                            </div>
                        </div>
                    </fieldset>
                    ${secaoGhs(i, travado)}
                    ${secaoArmazenagem(i, travado)}
                    ${secaoControlados(i, travado)}
                    <fieldset class="ins-secao" data-so="EPIs" data-tecnico ${travado}>
                        <legend>Certificado de Aprovação <span class="text-muted">· NR-06</span></legend>
                        <div class="field-grid">
                            <div class="input-group">
                                <label for="ins-f-ca">Número do CA</label>
                                <input type="text" id="ins-f-ca" class="form-control" maxlength="20" inputmode="numeric" autocomplete="off" value="${esc(i.epi_ca || '')}">
                            </div>
                            <div class="input-group">
                                <label for="ins-f-ca-validade">Validade do CA</label>
                                <input type="date" id="ins-f-ca-validade" class="form-control" value="${esc(i.epi_ca_validade || '')}">
                            </div>
                            <div class="input-group">
                                <label for="ins-f-protecao">Tipo de proteção</label>
                                <select id="ins-f-protecao" class="form-control">${opcoes(TIPOS_PROTECAO, i.epi_tipo_protecao, 'Não informado')}</select>
                            </div>
                            <div class="input-group">
                                <label for="ins-f-tamanho">Tamanho</label>
                                <input type="text" id="ins-f-tamanho" class="form-control" maxlength="20" autocomplete="off" value="${esc(i.epi_tamanho || '')}" placeholder="P, M, G, 42…">
                            </div>
                        </div>
                    </fieldset>
                    <fieldset class="ins-secao" data-so="Vidrarias" data-tecnico ${travado}>
                        <legend>Vidraria</legend>
                        <div class="field-grid">
                            <div class="input-group">
                                <label for="ins-f-vid-volume">Volume nominal</label>
                                <input type="text" id="ins-f-vid-volume" class="form-control" maxlength="50" autocomplete="off" value="${esc(i.vid_volume || '')}" placeholder="250 mL">
                            </div>
                            <div class="input-group">
                                <label for="ins-f-vid-classe">Classe</label>
                                <select id="ins-f-vid-classe" class="form-control">${opcoes(['A', 'B'], i.vid_classe, 'Não se aplica')}</select>
                            </div>
                            <div class="input-group">
                                <label for="ins-f-vid-material">Material</label>
                                <input type="text" id="ins-f-vid-material" class="form-control" maxlength="100" list="ins-materiais" autocomplete="off" value="${esc(i.vid_material || '')}">
                                <datalist id="ins-materiais"><option value="Borossilicato"></option><option value="Vidro soda-cal"></option><option value="Quartzo"></option><option value="Polipropileno"></option></datalist>
                            </div>
                            <div class="input-group ins-checks">
                                <label class="check-inline"><input type="checkbox" id="ins-f-vid-volumetrica" ${i.vid_volumetrica ? 'checked' : ''}> Vidraria volumétrica</label>
                            </div>
                        </div>
                    </fieldset>` : ''}

                    ${gestor ? `
                    <fieldset class="ins-secao ins-secao-revisao">
                        <legend>Revisão técnica</legend>
                        <label class="check-inline"><input type="checkbox" id="ins-f-revisado" ${!novo && !i.pendente_revisao ? 'checked' : ''}> Marcar como revisado</label>
                        <p class="help">Confirma que os dados técnicos conferem com a FDS do fornecedor. O sistema não deixa marcar com dados obrigatórios faltando.</p>
                        ${!novo && i.faltas_para_revisar?.length ? `<p class="help text-warning">Na última gravação faltava: ${esc(i.faltas_para_revisar.join('; '))}.</p>` : ''}
                    </fieldset>` : ''}

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
        const form = modal.querySelector('#ins-form');
        setTimeout(() => campo('nome').focus(), 30);
        ligarTriEstados(modal);

        // Seções que dependem da categoria
        const aplicarCategoria = () => {
            const cat = campo('categoria').value;
            form.querySelectorAll('[data-so]').forEach(el => el.classList.toggle('hidden', el.dataset.so !== cat));
        };
        campo('categoria').addEventListener('change', aplicarCategoria);
        aplicarCategoria();

        // GHS: frases H em chips, detalhe só quando o produto é perigoso, sugestão a partir das frases
        let frases = [...(i.ghs_frases_h || [])];
        const listaFrases = campo('frases');
        const desenharFrases = () => {
            if (!listaFrases) return;
            listaFrases.innerHTML = frases.map(c => `
                <li><span class="ins-frase-cod">${esc(c)}</span> <span>${esc(fraseH(c)?.texto || '')}</span>
                    ${gestor ? `<button type="button" class="link-btn muted" data-tirar-frase="${esc(c)}" aria-label="Tirar ${esc(c)}">${icone('x', 12)}</button>` : ''}</li>`).join('');
        };
        desenharFrases();
        const entradaFrase = campo('frase-h');
        const adicionarFrase = () => {
            const m = /H\d{3}/i.exec(entradaFrase.value || '');
            if (!m) return;
            const codigo = m[0].toUpperCase();
            if (!fraseH(codigo)) { window.UI.showToast(`${codigo} não é uma frase H conhecida.`, 'error'); return; }
            if (!frases.includes(codigo)) { frases.push(codigo); frases.sort(); desenharFrases(); }
            entradaFrase.value = '';
        };
        entradaFrase?.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); adicionarFrase(); } });
        entradaFrase?.addEventListener('change', adicionarFrase);
        listaFrases?.addEventListener('click', (ev) => {
            const b = ev.target.closest('[data-tirar-frase]');
            if (b) { frases = frases.filter(c => c !== b.dataset.tirarFrase); desenharFrases(); }
        });
        campo('sugerir')?.addEventListener('click', () => {
            if (!frases.length) { window.UI.showToast('Adicione as frases H da FDS primeiro.', 'warning'); entradaFrase.focus(); return; }
            const s = sugerirGhs(frases);
            form.querySelectorAll('input[name="ghs_pictogramas"]').forEach(c => { c.checked = s.pictogramas.includes(c.value); });
            form.querySelectorAll('input[name="ghs_palavra"]').forEach(r => { r.checked = r.value === (s.palavra || ''); });
            window.UI.showToast('Sugestão aplicada. Confira com a seção 2 da FDS.', 'success');
        });
        // NR-20: enquadramento na hora, pelo ponto de fulgor (ou pelas frases H, se ele faltar)
        const nr20 = campo('nr20');
        const pintarNr20 = () => {
            if (!nr20) return;
            const r = nr20Pelo(campo('fulgor').value, campo('aquecido').checked, frases);
            nr20.textContent = r ? `Enquadramento: ${ROTULO_NR20[r]}${campo('fulgor').value === '' ? ' (pelas frases H)' : ''}.` : 'Inflamável: até 60 °C. Combustível: acima de 60 °C e até 93 °C.';
            nr20.classList.toggle('text-warning', r === 'inflamavel' || r === 'gas_inflamavel');
        };
        campo('fulgor')?.addEventListener('input', pintarNr20);
        campo('aquecido')?.addEventListener('change', pintarNr20);
        listaFrases?.addEventListener('click', () => setTimeout(pintarNr20));
        entradaFrase?.addEventListener('change', () => setTimeout(pintarNr20));
        pintarNr20();
        campo('pf-isento')?.addEventListener('change', (ev) => {
            campo('pf-isencao').classList.toggle('hidden', !ev.target.checked);
            if (ev.target.checked) campo('pf-isencao').focus();
        });

        const perigoso = campo('perigoso');
        const detalheGhs = campo('ghs-detalhe');
        const aplicarPerigo = () => { if (detalheGhs && perigoso) detalheGhs.classList.toggle('hidden', !(perigoso.dataset.tri === 'true')); };
        perigoso?.addEventListener('change', aplicarPerigo);
        aplicarPerigo();
        if (!gestor) { campo('sugerir')?.classList.add('hidden'); entradaFrase?.closest('.input-group')?.querySelector('.help')?.classList.add('hidden'); }

        // CAS: confere o formato e o dígito verificador já na digitação
        const cas = campo('cas');
        const casValido = (v) => {
            const m = /^(\d{2,7})-(\d{2})-(\d)$/.exec(v);
            if (!m) return false;
            const d = (m[1] + m[2]).split('').reverse();
            return d.reduce((s, x, k) => s + (k + 1) * Number(x), 0) % 10 === Number(m[3]);
        };
        cas?.addEventListener('blur', () => { const v = cas.value.trim(); erroNoCampo(cas, v && !casValido(v) ? 'CAS inválido. Use o formato 64-17-5 e confira os dígitos.' : ''); });

        // FDS: envio imediato (não depende de salvar o formulário)
        form.querySelectorAll('[data-arquivo]').forEach(b => b.addEventListener('click', () => abrirArquivo(Number(b.dataset.arquivo), b)));
        campo('fds-arquivo')?.addEventListener('change', async (ev) => {
            const f = ev.target.files && ev.target.files[0];
            if (!f) return;
            const rotulo = ev.target.closest('label');
            rotulo.classList.add('is-busy');
            try {
                const r = await enviarPdf(i.id, 'fds', f);
                campo('fds-atual').innerHTML = `<button type="button" class="link-btn" data-arquivo="${r.anexo.id}">${icone('file-text', 13)} ${esc(r.anexo.nome_arquivo)}</button>
                    <span class="text-muted text-small">enviada agora</span>`;
                campo('fds-atual').querySelector('[data-arquivo]').addEventListener('click', (e2) => abrirArquivo(r.anexo.id, e2.currentTarget));
                window.UI.showToast(r.voltou_pendente ? 'FDS anexada. A revisão foi reaberta e a coordenação avisada.' : 'FDS anexada.', r.voltou_pendente ? 'warning' : 'success');
                carregar();
            } catch (err) {
                window.UI.showToast(err.message, 'error');
            } finally {
                rotulo.classList.remove('is-busy');
                ev.target.value = '';
            }
        });
        campo('ver-lotes')?.addEventListener('click', () => { modal.fechar(); abrirLotes(i, origem); });

        // Verificação rápida no inventário enquanto digita o nome
        const caixaDup = modal.querySelector('#ins-f-dup');
        const nomeOriginal = chaveNome(i.nome);
        let duplicadoExato = null;
        const checarDuplicidade = () => {
            const nome = campo('nome').value;
            const mudou = chaveNome(nome) !== nomeOriginal;
            const { exato, parecidos } = mudou ? procurarDuplicados(nome, i.id) : { exato: null, parecidos: [] };
            duplicadoExato = exato;
            const descrever = (x) => `<span class="ins-dup-desc"><strong>${esc(x.nome)}</strong>${x.localizacao ? ` · ${esc(x.localizacao)}` : ''} · ${num(x.quantidade_atual)} ${esc(x.unidade)}</span>`;
            // Atalhos para agir no item que já existe sem sair do formulário e procurar na tabela.
            // Só no cadastro: na edição, sair daqui descartaria as alterações em andamento.
            const atalhos = (x) => (novo ? `
                <span class="ins-dup-acoes" role="group" aria-label="Ações para ${esc(x.nome)}">
                    <button type="button" class="link-btn" data-dup-acao="ENTRADA" data-dup-id="${x.id}">+ Entrada</button>
                    <button type="button" class="link-btn" data-dup-acao="SAIDA" data-dup-id="${x.id}" ${(x.quantidade_atual || 0) <= 0 ? 'disabled title="Sem saldo para registrar uso"' : ''}>− Uso</button>
                    <button type="button" class="link-btn muted" data-dup-acao="historico" data-dup-id="${x.id}">Histórico</button>
                    <button type="button" class="link-btn muted" data-dup-acao="ver" data-dup-id="${x.id}">Ver na lista</button>
                </span>` : '');
            if (exato) {
                caixaDup.className = 'ins-dup is-exato';
                caixaDup.innerHTML = `
                    <p>Este insumo já está no estoque. Para somar quantidade, registre uma entrada nele em vez de cadastrar de novo.</p>
                    <ul><li>${descrever(exato)}${atalhos(exato)}</li></ul>`;
            } else if (parecidos.length) {
                caixaDup.className = 'ins-dup';
                caixaDup.innerHTML = `<p>Itens parecidos no estoque. Confira se não é o mesmo:</p>
                    <ul>${parecidos.map(x => `<li>${descrever(x)}${atalhos(x)}</li>`).join('')}</ul>`;
            } else {
                caixaDup.className = 'ins-dup hidden';
                caixaDup.innerHTML = '';
            }
            campo('nome').setAttribute('aria-invalid', exato ? 'true' : 'false');
        };
        let esperaDup;
        campo('nome').addEventListener('input', () => { clearTimeout(esperaDup); esperaDup = setTimeout(checarDuplicidade, 150); });
        caixaDup.addEventListener('click', (ev) => {
            const btn = ev.target.closest('[data-dup-acao]');
            if (!btn || btn.disabled) return;
            const existente = E.itens.find(x => x.id === Number(btn.dataset.dupId));
            if (!existente) return;
            modal.fechar();
            switch (btn.dataset.dupAcao) {
                case 'ENTRADA': case 'SAIDA': abrirMovimento(btn.dataset.dupAcao, existente, origem); break;
                case 'historico': abrirHistorico(existente, origem); break;
                case 'ver': destacarNaLista(existente.id); break;
                default: break;
            }
        });

        const texto = (id) => (campo(id) ? campo(id).value.trim() || null : null);
        const numero = (id) => (campo(id) && campo(id).value !== '' ? Number(campo(id).value) : null);

        function camposTecnicos() {
            return {
                cas: texto('cas'),
                mistura: campo('mistura')?.checked || false,
                codigo_fabricante: texto('cod-fab'),
                validade_apos_aberto_dias: numero('aberto'),
                ghs_perigoso: perigoso ? valorTri(perigoso) : null,
                ghs_frases_h: frases,
                ghs_pictogramas: [...form.querySelectorAll('input[name="ghs_pictogramas"]:checked')].map(c => c.value),
                ghs_palavra: form.querySelector('input[name="ghs_palavra"]:checked')?.value || null,
                ghs_frases_p: texto('frases-p'),
                fds_revisao: texto('fds-revisao'),
                fds_data: texto('fds-data'),
                fds_nbr14725: campo('nbr') ? valorTri(campo('nbr')) : null,
                fds_portugues: campo('fds-pt')?.checked || false,
                epi_ca: texto('ca'),
                epi_ca_validade: texto('ca-validade'),
                epi_tipo_protecao: texto('protecao'),
                epi_tamanho: texto('tamanho'),
                vid_volume: texto('vid-volume'),
                vid_classe: texto('vid-classe'),
                vid_material: texto('vid-material'),
                vid_volumetrica: campo('vid-volumetrica')?.checked || false,
                ponto_fulgor_c: numero('fulgor'),
                usado_aquecido: campo('aquecido')?.checked || false,
                grupos_compatibilidade: [...form.querySelectorAll('input[name="grupos_compatibilidade"]:checked')].map(c => c.value),
                temperatura_armazenagem: texto('temperatura'),
                proteger_luz: campo('luz')?.checked || false,
                proteger_umidade: campo('umidade')?.checked || false,
                atmosfera_inerte: campo('inerte')?.checked || false,
                formador_peroxido: campo('peroxido') ? valorTri(campo('peroxido')) : null,
                intervalo_teste_peroxido_dias: numero('peroxido-dias'),
                pf_controlado: campo('pf') ? valorTri(campo('pf')) : null,
                pf_codigo: texto('pf-codigo'),
                pf_isento: campo('pf-isento')?.checked || false,
                pf_isencao_justificativa: campo('pf-isento')?.checked ? texto('pf-isencao') : null,
                anvisa_controlado: campo('anvisa') ? valorTri(campo('anvisa')) : null,
                anvisa_lista: texto('anvisa-lista'),
                exercito_controlado: campo('exercito') ? valorTri(campo('exercito')) : null,
            };
        }

        form.addEventListener('submit', (ev) => {
            ev.preventDefault();
            const nome = campo('nome').value.trim();
            let invalido = null;
            erroNoCampo(campo('nome'), nome ? '' : 'Informe o nome do insumo.');
            if (!nome) invalido = invalido || campo('nome');
            checarDuplicidade();
            if (duplicadoExato) invalido = invalido || campo('nome');
            const conc = numero('concentracao');
            erroNoCampo(campo('concentracao'), conc !== null && (conc < 0 || conc > 100) ? 'Use um valor de 0 a 100.' : '');
            if (conc !== null && (conc < 0 || conc > 100)) invalido = invalido || campo('concentracao');
            if (cas && cas.value.trim() && !casValido(cas.value.trim())) { erroNoCampo(cas, 'CAS inválido. Use o formato 64-17-5 e confira os dígitos.'); invalido = invalido || cas; }
            if (invalido) { invalido.focus(); return; }

            const categoria = campo('categoria').value;
            const reagente = categoria === 'Reagentes';
            const payload = {
                nome,
                categoria,
                unidade: campo('unidade').value,
                estoque_minimo: Math.max(0, Number(campo('minimo').value) || 0),
                fabricante: texto('fabricante'),
                codigo_interno: texto('codigo'),
                estado_fisico: reagente ? texto('estado') : null,
                concentracao_pct: reagente ? conc : null,
                grau: reagente ? texto('grau') : null,
            };
            if (campo('local')) payload.localizacao = texto('local');
            if (campo('validade')) payload.validade = texto('validade');
            if (novo) {
                payload.quantidade_atual = Math.max(0, Number(campo('saldo').value) || 0);
                payload.lote = texto('lote');
            }
            if (gestor) {
                Object.assign(payload, camposTecnicos());
                payload.revisado = !!campo('revisado')?.checked;
            }

            comBotao(modal.querySelector('#ins-f-ok'), 'Salvando', async () => {
                try {
                    const r = await comJustificativa((justificativa) =>
                        req(novo ? '/insumos' : `/insumos/${i.id}`, { method: novo ? 'POST' : 'PUT', json: { ...payload, justificativa } }));
                    delete form.dataset.sujo;
                    modal.fechar();
                    let msg = novo ? `${nome} cadastrado.` : 'Alterações salvas.';
                    if (r.status_revisao === 'revisado' && (novo || i.pendente_revisao)) msg += ' Marcado como revisado.';
                    else if (!gestor && novo) msg += ' A coordenação foi avisada para completar a revisão técnica.';
                    else if (!gestor && !i.pendente_revisao && r.pendente_revisao) msg += ' A revisão foi reaberta e a coordenação avisada.';
                    window.UI.showToast(msg, 'success');
                    await carregar();
                    if (!novo) focarAcao('editar', i.id);
                } catch (err) {
                    if (!err.cancelado) window.UI.showToast(err.message, 'error');
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
                    delete form.dataset.sujo;
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
                        <strong>Nome</strong> (obrigatória), Categoria, Localização, Unidade, Saldo atual, Estoque mínimo, Validade,
                        Lote, Fabricante, Estado físico e Concentração (%).</p>
                    <p class="help mb-md">Antes de gravar, você confere a prévia. Itens que já estão no estoque ou que se repetem na planilha não são importados.
                        A classificação GHS, a FDS e o CA não entram pela planilha: os itens ficam pendentes de revisão para a coordenação completar.</p>
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
                            const detalhe = l.mensagem || (d ? [d.categoria, d.localizacao, `${num(d.quantidade_atual)} ${d.unidade}`, d.lote ? `lote ${d.lote}` : '', d.validade ? `validade ${dataBR(d.validade)}` : ''].filter(Boolean).join(' · ') : '');
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
