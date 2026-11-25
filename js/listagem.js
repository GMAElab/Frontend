// ==========================================
// LISTAGEM COM BUSCA, FILTROS E PAGINAÇÃO
// ==========================================
(function () {
    const TAMANHO_PADRAO = 20;
    const ATRASO_DA_BUSCA_MS = 300;

    // ==========================================
    // MONTAGEM DA ESTRUTURA
    // ==========================================
    // modo 'cartoes': grid de cards (renderLinha devolve um <article class="item-card">);
    // padrão: tabela (renderLinha devolve um <tr>).
    const emCartoes = (opcoes) => opcoes.modo === 'cartoes';
    // Placeholder de busca sempre termina com reticências tipográficas
    const reticencias = (texto) => String(texto).replace(/(\.\.\.|…)?$/, '…');

    function montarEstrutura(alvo, opcoes) {
        const filtros = (opcoes.filtros || []).map(f => `
            <select class="form-control" data-filtro="${f.param}" aria-label="${f.rotulo}">
                <option value="">${f.rotulo}</option>
            </select>`).join('');

        const corpo = emCartoes(opcoes)
            ? `<div class="card-grid" data-corpo role="list" aria-busy="false"></div>`
            : `<div class="table-container">
                <table class="data-table">
                    <thead><tr>${opcoes.cabecalho}</tr></thead>
                    <tbody data-corpo aria-busy="false"></tbody>
                </table>
            </div>`;

        alvo.innerHTML = `
            <div class="toolbar list-toolbar">
                <p class="result-count" data-resultado aria-live="polite"></p>
                <div class="toolbar-controls">
                    <div class="search-box">
                        ${window.Icon ? window.Icon('search', { size: 15 }) : ''}
                        <input type="search" class="form-control" data-busca name="q" autocomplete="off" placeholder="${reticencias(opcoes.placeholder || 'Buscar')}" aria-label="${opcoes.placeholder || 'Buscar'}">
                        <kbd title="Pressione / para focar na busca">/</kbd>
                    </div>
                    ${filtros}
                </div>
            </div>
            ${corpo}
            <div class="pagination">
                <span data-contador></span>
                <div class="cluster">
                    <button type="button" class="link-btn" data-anterior style="visibility: hidden;">${window.Icon ? window.Icon('chevron-left', { size: 14 }) : ''} Anterior</button>
                    <button type="button" class="link-btn" data-proxima style="visibility: hidden;">Próxima ${window.Icon ? window.Icon('chevron-right', { size: 14 }) : ''}</button>
                </div>
            </div>`;
    }

    // ==========================================
    // OPÇÕES DOS FILTROS
    // ==========================================
    async function preencherFiltros(alvo, filtros) {
        for (const filtro of filtros || []) {
            const select = alvo.querySelector(`[data-filtro="${filtro.param}"]`);
            if (!select) continue;
            try {
                const itens = typeof filtro.opcoes === 'function' ? await filtro.opcoes() : (filtro.opcoes || []);
                select.insertAdjacentHTML('beforeend', itens.map(o =>
                    `<option value="${window.escapeHTML(o.valor)}">${window.escapeHTML(o.rotulo)}</option>`
                ).join(''));
            } catch (e) {
                select.disabled = true;
            }
        }
    }

    // ==========================================
    // CRIAR LISTAGEM
    // ==========================================
    function criar(opcoes) {
        const alvo = typeof opcoes.alvo === 'string' ? document.getElementById(opcoes.alvo) : opcoes.alvo;
        if (!alvo) return null;

        const tamanho = opcoes.tamanho || TAMANHO_PADRAO;
        const estado = { pagina: 0, total: 0, requisicao: 0 };

        montarEstrutura(alvo, opcoes);
        const busca = alvo.querySelector('[data-busca]');
        const corpo = alvo.querySelector('[data-corpo]');
        const contador = alvo.querySelector('[data-contador]');
        const anterior = alvo.querySelector('[data-anterior]');
        const proxima = alvo.querySelector('[data-proxima]');
        const resultado = alvo.querySelector('[data-resultado]');
        const colunas = alvo.querySelectorAll('thead th').length;
        const cartoes = emCartoes(opcoes);
        const [singular, plural] = opcoes.rotulos || ['item', 'itens'];
        const linhaUnica = (html) => cartoes
            ? `<div class="card-grid-state" role="listitem">${html}</div>`
            : `<tr><td colspan="${colunas}">${html}</td></tr>`;

        // Esqueleto: mesma forma do conteúdo que vai chegar (cards ou linhas)
        function esqueleto() {
            if (cartoes) {
                const card = `
                    <article class="item-card is-skeleton" aria-hidden="true">
                        <div class="item-card-head">
                            <span class="item-avatar"></span>
                            <div class="item-card-title"><span class="skeleton" style="width:70%;height:12px"></span><span class="skeleton" style="width:40%;height:10px"></span></div>
                        </div>
                        <div class="item-card-facts"></div>
                        <div class="item-card-actions"><span class="skeleton"></span><span class="skeleton"></span></div>
                    </article>`;
                return card.repeat(3);
            }
            const celulas = Array.from({ length: colunas }, (_, i) =>
                `<td><span class="skeleton" style="width:${i === 0 ? 62 : 38}%"></span></td>`).join('');
            return `<tr class="is-skeleton" aria-hidden="true">${celulas}</tr>`.repeat(4);
        }

        function montarUrl() {
            const params = new URLSearchParams({ skip: estado.pagina * tamanho, limit: tamanho });
            if (busca.value.trim()) params.set('q', busca.value.trim());
            alvo.querySelectorAll('[data-filtro]').forEach(select => {
                if (select.value) params.set(select.dataset.filtro, select.value);
            });
            return `${opcoes.endpoint}?${params.toString()}`;
        }

        function atualizarRodape(quantidade) {
            const inicio = estado.total === 0 ? 0 : estado.pagina * tamanho + 1;
            const fim = estado.pagina * tamanho + quantidade;
            contador.textContent = estado.total === 0 ? '' : `${inicio}–${fim} de ${estado.total}`;
            if (resultado) {
                resultado.textContent = `${estado.total} ${estado.total === 1 ? `${singular} encontrado` : `${plural} encontrados`}`;
            }
            anterior.style.visibility = estado.pagina > 0 ? 'visible' : 'hidden';
            proxima.style.visibility = fim < estado.total ? 'visible' : 'hidden';
        }

        async function carregar() {
            const requisicao = ++estado.requisicao;
            corpo.innerHTML = esqueleto();
            corpo.setAttribute('aria-busy', 'true');
            try {
                const res = await window.api.fetchProtected(montarUrl());
                if (!res.ok) throw new Error('Falha ao carregar');
                const itens = await res.json();
                if (requisicao !== estado.requisicao) return;

                const totalInformado = parseInt(res.headers.get('X-Total-Count'), 10);
                estado.total = Number.isNaN(totalInformado) ? estado.pagina * tamanho + itens.length : totalInformado;

                if (itens.length === 0 && estado.pagina > 0) {
                    estado.pagina -= 1;
                    return carregar();
                }

                const filtrando = busca.value.trim() || Array.from(alvo.querySelectorAll('[data-filtro]')).some(s => s.value);
                if (itens.length === 0) {
                    corpo.innerHTML = linhaUnica(window.UI.emptyState(filtrando
                        ? { title: 'Nada encontrado', description: 'Tente outras palavras ou limpe os filtros.' }
                        : (opcoes.vazio || {})));
                } else {
                    corpo.innerHTML = itens.map(opcoes.renderLinha).join('');
                }
                if (opcoes.aoCarregar) opcoes.aoCarregar(itens);
                atualizarRodape(itens.length);
                corpo.setAttribute('aria-busy', 'false');
            } catch (erro) {
                if (requisicao !== estado.requisicao) return;
                corpo.innerHTML = linhaUnica(window.UI.errorState(opcoes.erro || 'Não foi possível carregar a lista.'));
                atualizarRodape(0);
                if (resultado) resultado.textContent = '';
                corpo.setAttribute('aria-busy', 'false');
            }
        }

        let temporizador = null;
        busca.addEventListener('input', () => {
            clearTimeout(temporizador);
            temporizador = setTimeout(() => { estado.pagina = 0; carregar(); }, ATRASO_DA_BUSCA_MS);
        });
        alvo.querySelectorAll('[data-filtro]').forEach(select => {
            select.addEventListener('change', () => { estado.pagina = 0; carregar(); });
        });
        anterior.addEventListener('click', () => { estado.pagina = Math.max(0, estado.pagina - 1); carregar(); });
        proxima.addEventListener('click', () => { estado.pagina += 1; carregar(); });

        preencherFiltros(alvo, opcoes.filtros);
        carregar();

        return { recarregar: carregar };
    }

    window.Listagem = { criar };
})();
