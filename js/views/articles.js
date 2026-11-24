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
                    <input type="search" id="search-input" aria-label="Buscar artigos por tema, autores ou DOI" class="form-control" placeholder="Tema, autores ou DOI" onkeypress="if(event.key === 'Enter') pesquisarArtigos(1)">
                    <button onclick="pesquisarArtigos(1)" class="btn btn-primary">Pesquisar</button>
                </div>
                <div class="toolbar">
                    <select id="filter-source" class="form-control" onchange="pesquisarArtigos(1)" aria-label="Base científica">
                        <option value="all">Todas as bases (Scopus + OpenAlex)</option>
                        <option value="scopus">Apenas Scopus (Elsevier)</option>
                        <option value="openalex">Apenas OpenAlex</option>
                    </select>
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
                        <option value="citacoes">Mais citados</option>
                    </select>
                    <label class="meta" style="display:inline-flex; align-items:center; gap:6px; cursor:pointer; white-space:nowrap;">
                        <input type="checkbox" id="filter-oa" onchange="pesquisarArtigos(1)">
                        Acesso aberto
                    </label>
                </div>
            </div>

            <div id="saved-filters-area" class="toolbar hidden">
                <input type="search" id="filter-saved-input" aria-label="Filtrar artigos salvos" class="form-control grow" placeholder="Filtrar por título ou autor" oninput="filtrarSalvosLocalmente()">
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

        const fontes = Array.isArray(art.fontes) ? art.fontes : [];
        const badgesHTML = [
            ...fontes.map(f => `<span class="badge ${f === 'OpenAlex' ? 'badge-info' : ''}">${window.escapeHTML(f)}</span>`),
            art.open_access ? '<span class="badge badge-success">Acesso aberto</span>' : '',
        ].filter(Boolean).join(' ');

        const metaPartes = [
            window.escapeHTML(art.autores || 'Autoria desconhecida'),
            window.escapeHTML(art.ano || 's.d.'),
            art.revista ? window.escapeHTML(art.revista) : '',
            typeof art.citacoes === 'number' && art.citacoes > 0 ? `${art.citacoes} citações` : '',
        ].filter(Boolean).join(' · ');

        const botoesLink = [];
        if (art.url_pdf) {
            botoesLink.push(`<a href="${window.escapeHTML(art.url_pdf)}" target="_blank" rel="noopener" class="link-btn">${window.Icon ? window.Icon('download', { size: 13 }) : ''} Baixar PDF</a>`);
        }
        if (art.url_artigo && art.url_artigo !== art.url_pdf) {
            botoesLink.push(`<a href="${window.escapeHTML(art.url_artigo)}" target="_blank" rel="noopener" class="link-btn">${window.Icon ? window.Icon('external-link', { size: 13 }) : ''} Abrir na editora</a>`);
        }

        const resumoTexto = art.resumo
            ? (art.resumo.length > 340 ? window.escapeHTML(art.resumo.substring(0, 340)) + '...' : window.escapeHTML(art.resumo))
            : '<span class="text-faint">Sem resumo disponível.</span>';

        return `
        <article class="entry">
            ${badgesHTML ? `<div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:6px;">${badgesHTML}</div>` : ''}
            <h3 class="entry-title">${window.escapeHTML(art.titulo)}</h3>
            <p class="meta">${metaPartes}</p>
            <p class="entry-body">${resumoTexto}</p>
            <div class="entry-foot">
                ${botoesLink.join('')}
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
    btnNext.style.visibility = qtdResultadosRecebidos >= 10 ? 'visible' : 'hidden';
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
    const query = document.getElementById('search-input').value.trim();
    if (!query) return;

    window.currentPage = paginaSolicitada;

    const source = document.getElementById('filter-source')?.value || 'all';
    const ano = document.getElementById('filter-ano')?.value || '';
    const sort = document.getElementById('filter-sort')?.value || '';
    const onlyOa = !!document.getElementById('filter-oa')?.checked;

    document.getElementById('articles-results').innerHTML = window.UI.loading('Consultando Scopus e OpenAlex');
    document.getElementById('pagination-area').classList.add('hidden');

    try {
        let url = `/articles/search?query=${encodeURIComponent(query)}&page=${window.currentPage}&source=${encodeURIComponent(source)}`;
        if (ano) url += `&year=${encodeURIComponent(ano)}`;
        if (sort) url += `&sort=${encodeURIComponent(sort)}`;
        if (onlyOa) url += '&only_oa=true';

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

    const anoNum = Number(artigo.ano);
    const payload = {
        doi: artigo.doi || null,
        titulo: artigo.titulo,
        autores: artigo.autores || null,
        ano: Number.isFinite(anoNum) && anoNum > 0 ? anoNum : null,
        resumo: artigo.resumo || null,
        url_artigo: artigo.url_artigo || null,
        url_pdf: artigo.url_pdf || null,
    };

    try {
        const res = await window.api.fetchProtected('/articles/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
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
