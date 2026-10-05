// ==========================================
// 1. CONSTRUÇÃO DA TELA COM FILTROS E PAGINAÇÃO
// ==========================================
const ARTIGOS_VAZIO_BUSCA = '<div class="empty-state"><h4>Comece por uma busca</h4><p>Pesquise por tema, autores ou DOI. Os artigos que você salvar ficam em “Salvos”.</p></div>';

document.addEventListener('viewChanged', (e) => {
    if (e.detail.view === 'articles') {
        const container = document.getElementById('dynamic-content');

        container.innerHTML = `
            <header class="page-head fade-in">
                <div>
                    <p class="eyebrow">literatura científica</p>
                    <h1>Artigos</h1>
                </div>
                <div class="tabs">
                    <button onclick="prepararBusca()" id="btn-tab-busca" class="tab-btn active">Buscar</button>
                    <button onclick="carregarArtigosSalvos()" id="btn-tab-salvos" class="tab-btn">Salvos</button>
                </div>
            </header>

            <div id="search-area" class="fade-in">
                <div class="inline-form mb-sm">
                    <input type="search" id="search-input" class="form-control" placeholder="Tema, autores ou DOI" onkeypress="if(event.key === 'Enter') pesquisarArtigos(1)">
                    <button onclick="pesquisarArtigos(1)" class="btn btn-primary">Pesquisar</button>
                </div>
                <div class="toolbar">
                    <select id="filter-ano" class="form-control" onchange="pesquisarArtigos(1)" aria-label="Período">
                        <option value="">Qualquer data</option>
                        <option value="2025">Desde 2025</option>
                        <option value="2023">Desde 2023</option>
                        <option value="2020">Desde 2020</option>
                        <option value="2015">Desde 2015</option>
                    </select>
                    <select id="filter-sort" class="form-control" onchange="pesquisarArtigos(1)" aria-label="Ordenação">
                        <option value="">Por relevância</option>
                        <option value="recentes">Mais recentes</option>
                    </select>
                </div>
            </div>

            <div id="saved-filters-area" class="toolbar hidden">
                <input type="search" id="filter-saved-input" class="form-control grow" placeholder="Filtrar por título ou autor" oninput="filtrarSalvosLocalmente()">
            </div>

            <div id="articles-results" class="entries fade-in">${ARTIGOS_VAZIO_BUSCA}</div>

            <div id="pagination-area" class="pagination hidden">
                <button id="btn-prev-page" class="link-btn" onclick="mudarPagina(-1)">${window.Icon('arrow-left', { size: 14 })} Anterior</button>
                <span id="page-indicator" class="mono">página 1</span>
                <button id="btn-next-page" class="link-btn" onclick="mudarPagina(1)">Próxima ${window.Icon('arrow-right', { size: 14 })}</button>
            </div>
        `;
    }
});

// ==========================================
// 2. FUNÇÕES DE NAVEGAÇÃO E EXIBIÇÃO
// ==========================================
window.currentPage = 1;

window.prepararBusca = function() {
    document.getElementById('search-area').classList.remove('hidden');
    document.getElementById('saved-filters-area').classList.add('hidden');
    document.getElementById('pagination-area').classList.add('hidden');
    document.getElementById('btn-tab-busca').classList.add('active');
    document.getElementById('btn-tab-salvos').classList.remove('active');
    document.getElementById('articles-results').innerHTML = ARTIGOS_VAZIO_BUSCA;
};

window.renderizarCards = function(artigos, modo) {
    const resultsContainer = document.getElementById('articles-results');

    if (artigos.length === 0) {
        resultsContainer.innerHTML = window.UI.emptyState({
            title: 'Nenhum artigo encontrado',
            description: modo === 'busca' ? 'Tente outros termos ou amplie o período.' : 'Nada salvo corresponde a esse filtro.'
        });
        return;
    }

    resultsContainer.innerHTML = artigos.map((art, index) => {
        let botaoAcaoHTML = "";
        if (modo === 'busca') {
            botaoAcaoHTML = `<button onclick="salvarArtigo(${index})" class="link-btn">Salvar</button>`;
        } else {
            botaoAcaoHTML = `<button onclick="removerArtigo(${art.id})" class="link-btn danger">Remover dos salvos</button>`;
        }

        const linkUrl = art.url_pdf || art.url_artigo || '#';
        const linkTexto = art.url_pdf ? 'Baixar PDF' : 'Abrir na editora';
        const botaoLinkHTML = linkUrl !== '#' ? `<a href="${window.escapeHTML(linkUrl)}" target="_blank" rel="noopener" class="link-btn">${linkTexto}</a>` : '';

        return `
        <article class="entry">
            <h3 class="entry-title">${window.escapeHTML(art.titulo)}</h3>
            <p class="meta">${window.escapeHTML(art.autores || 'Autoria desconhecida')} · ${window.escapeHTML(art.ano || 's.d.')}</p>
            <p class="entry-body">
                ${art.resumo ? window.escapeHTML(art.resumo).substring(0, 300) + '...' : '<span class="text-faint">Sem resumo disponível.</span>'}
            </p>
            <div class="entry-foot">
                ${botaoLinkHTML}
                ${botaoAcaoHTML}
            </div>
        </article>`;
    }).join('');
};

window.renderizarPaginacao = function(qtdResultadosRecebidos) {
    const pagArea = document.getElementById('pagination-area');
    const btnPrev = document.getElementById('btn-prev-page');
    const btnNext = document.getElementById('btn-next-page');

    pagArea.classList.remove('hidden');
    document.getElementById('page-indicator').innerText = `página ${window.currentPage}`;
    btnPrev.style.visibility = window.currentPage > 1 ? 'visible' : 'hidden';
    btnNext.style.visibility = qtdResultadosRecebidos === 20 ? 'visible' : 'hidden';
};

window.mudarPagina = function(direcao) {
    const novaPagina = window.currentPage + direcao;
    if (novaPagina > 0) {
        pesquisarArtigos(novaPagina);
        document.getElementById('dynamic-content').scrollTo({ top: 0, behavior: 'smooth' });
    }
};

// ==========================================
// 3. COMUNICAÇÃO COM A API E FILTROS LOCAIS
// ==========================================
window.pesquisarArtigos = async function(paginaSolicitada = 1) {
    const query = document.getElementById('search-input').value;
    if (!query) return;

    window.currentPage = paginaSolicitada;

    const ano = document.getElementById('filter-ano').value;
    const sort = document.getElementById('filter-sort').value;

    document.getElementById('articles-results').innerHTML = window.UI.loading('Consultando as bases');
    document.getElementById('pagination-area').classList.add('hidden');

    try {
        let url = `/articles/search?query=${encodeURIComponent(query)}&page=${window.currentPage}`;
        if (ano) url += `&year=${ano}`;
        if (sort) url += `&sort=${sort}`;

        const res = await window.api.fetchProtected(url);
        if (!res.ok) throw new Error("Erro na requisição");

        const artigos = await res.json();
        window.artigosBuscaCache = artigos;
        renderizarCards(artigos, 'busca');
        renderizarPaginacao(artigos.length);

    } catch (err) {
        document.getElementById('articles-results').innerHTML = window.UI.errorState('A busca não pôde ser concluída.');
    }
};

window.carregarArtigosSalvos = async function() {
    document.getElementById('search-area').classList.add('hidden');
    document.getElementById('pagination-area').classList.add('hidden');
    document.getElementById('saved-filters-area').classList.remove('hidden');
    document.getElementById('filter-saved-input').value = '';

    document.getElementById('btn-tab-salvos').classList.add('active');
    document.getElementById('btn-tab-busca').classList.remove('active');

    document.getElementById('articles-results').innerHTML = window.UI.loading('Carregando seus artigos');

    try {
        const res = await window.api.fetchProtected('/articles/saved');
        if (!res.ok) throw new Error("Falha ao carregar salvos");
        const salvos = await res.json();

        window.artigosSalvosCache = salvos;
        renderizarCards(salvos, 'salvos');
    } catch (error) {
        document.getElementById('articles-results').innerHTML = window.UI.errorState('Não foi possível carregar os artigos salvos.');
        window.UI.showToast("Erro ao carregar artigos salvos.", "error");
    }
};

window.filtrarSalvosLocalmente = function() {
    const termo = document.getElementById('filter-saved-input').value.toLowerCase();
    if (!window.artigosSalvosCache) return;

    const filtrados = window.artigosSalvosCache.filter(art => {
        const titulo = (art.titulo || "").toLowerCase();
        const autores = (art.autores || "").toLowerCase();
        return titulo.includes(termo) || autores.includes(termo);
    });

    renderizarCards(filtrados, 'salvos');
};

window.salvarArtigo = async function(index) {
    const artigo = window.artigosBuscaCache[index];
    if (!artigo) return;

    try {
        const res = await window.api.fetchProtected('/articles/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(artigo)
        });

        if (!res.ok) throw new Error("Falha ao salvar");
        window.UI.showToast("Artigo salvo.", "success");
    } catch (error) {
        window.UI.showToast("Erro ao salvar o artigo.", "error");
    }
};

window.removerArtigo = async function(id) {
    const ok = await window.UI.confirm(
        "O artigo será removido da sua biblioteca pessoal.",
        { title: 'Remover artigo?', danger: true }
    );
    if (!ok) return;

    try {
        const res = await window.api.fetchProtected(`/articles/saved/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error("Falha ao remover");

        window.UI.showToast("Artigo removido.", "success");
        carregarArtigosSalvos();
    } catch (error) {
        window.UI.showToast("Erro ao remover o artigo.", "error");
    }
};
