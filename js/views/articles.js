// ==========================================
// 1. CONSTRUÇÃO DA TELA COM FILTROS E PAGINAÇÃO
// ==========================================
document.addEventListener('viewChanged', (e) => {
    if (e.detail.view === 'articles') {
        const container = document.getElementById('dynamic-content');
        
        container.innerHTML = `
            <div class="admin-container fade-in">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; flex-wrap: wrap; gap: 15px;">
                    <div>
                        <h2 style="margin-bottom: 5px;">Artigos</h2>
                        <p class="text-muted" style="margin: 0;">Pesquise e gerencie artigos científicos.</p>
                    </div>
                    <div class="tabs">
                        <button onclick="prepararBusca()" id="btn-tab-busca" class="tab-btn active">${window.Icon('search', { size: 15 })} Buscar Artigos</button>
                        <button onclick="carregarArtigosSalvos()" id="btn-tab-salvos" class="tab-btn">Meus Salvos</button>
                    </div>
                </div>

                <div id="search-area" style="background: var(--bg-subtle); padding: 15px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 25px;">
                    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <input type="text" id="search-input" class="form-control" placeholder="Digite o tema, autores ou DOI..." style="flex: 1; font-size: 15px;" onkeypress="if(event.key === 'Enter') pesquisarArtigos(1)">
                        <button onclick="pesquisarArtigos(1)" class="btn btn-primary">Pesquisar</button>
                    </div>
                    <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
                        <span style="font-size: 13px; font-weight: 600; color: var(--text-muted);">Filtros:</span>
                        <select id="filter-ano" class="form-control" style="width: auto; padding: 8px; font-size: 13px;" onchange="pesquisarArtigos(1)">
                            <option value="">Qualquer data</option>
                            <option value="2025">Desde 2025</option>
                            <option value="2023">Desde 2023</option>
                            <option value="2020">Desde 2020</option>
                            <option value="2015">Desde 2015</option>
                        </select>
                        <select id="filter-sort" class="form-control" style="width: auto; padding: 8px; font-size: 13px;" onchange="pesquisarArtigos(1)">
                            <option value="">Relevância</option>
                            <option value="recentes">Mais recentes</option>
                        </select>
                    </div>
                </div>

                <div id="saved-filters-area" style="display: none; margin-bottom: 25px;">
                    <input type="text" id="filter-saved-input" class="form-control" placeholder="Filtrar salvos por nome do artigo ou autor..." oninput="filtrarSalvosLocalmente()">
                </div>

                <div id="articles-results" style="display: grid; gap: 15px;">
                    <div style="text-align: center; padding: 40px; color: var(--text-muted); border: 1px dashed var(--border-strong); border-radius: var(--radius-md);">
                        Inicie uma pesquisa ou visualize seus artigos salvos.
                    </div>
                </div>

                <div id="pagination-area" style="display: none; justify-content: center; align-items: center; gap: 20px; margin-top: 30px; padding-top: 20px; border-top: 1px solid var(--border-color);">
                    <button id="btn-prev-page" class="btn btn-secondary" onclick="mudarPagina(-1)">${window.Icon('chevron-left', { size: 15 })} Página Anterior</button>
                    <span id="page-indicator" style="font-weight: 600; font-size: 15px;">Página 1</span>
                    <button id="btn-next-page" class="btn btn-secondary" onclick="mudarPagina(1)">Próxima Página ${window.Icon('chevron-right', { size: 15 })}</button>
                </div>
            </div>
        `;
    }
});

// ==========================================
// 2. FUNÇÕES DE NAVEGAÇÃO E EXIBIÇÃO
// ==========================================
window.currentPage = 1;

window.prepararBusca = function() {
    document.getElementById('search-area').style.display = 'block';
    document.getElementById('saved-filters-area').style.display = 'none';
    document.getElementById('pagination-area').style.display = 'none';
    document.getElementById('btn-tab-busca').classList.add('active');
    document.getElementById('btn-tab-salvos').classList.remove('active');
    document.getElementById('articles-results').innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted); border: 1px dashed var(--border-strong); border-radius: var(--radius-md);">Inicie uma pesquisa...</div>';
};

window.renderizarCards = function(artigos, modo) {
    const resultsContainer = document.getElementById('articles-results');
    
    if (artigos.length === 0) {
        resultsContainer.innerHTML = '<div style="text-align:center; padding: 30px; color:var(--text-muted);">Nenhum artigo encontrado.</div>';
        return;
    }

    resultsContainer.innerHTML = artigos.map((art, index) => {
        let botaoAcaoHTML = "";
        if (modo === 'busca') {
            botaoAcaoHTML = `<button onclick="salvarArtigo(${index})" class="btn btn-outline-primary btn-sm">${window.Icon('star', { size: 14 })} Salvar Artigo</button>`;
        } else {
            botaoAcaoHTML = `<button onclick="removerArtigo(${art.id})" class="btn btn-outline-danger btn-sm">${window.Icon('x-circle', { size: 14 })} Remover dos Salvos</button>`;
        }

        const linkUrl = art.url_pdf || art.url_artigo || '#';
        const linkTexto = art.url_pdf ? `${window.Icon('download', { size: 14 })} Baixar PDF` : 'Ir para a Editora';
        const botaoLinkHTML = linkUrl !== '#' ? `<a href="${linkUrl}" target="_blank" class="btn btn-primary btn-sm">${linkTexto}</a>` : '';

        return `
        <div class="article-card">
            <h3 style="margin:0 0 8px 0; font-size: 17px;">${window.escapeHTML(art.titulo)}</h3>
            <p style="font-size:13px; color:var(--text-muted); font-weight: 500;">Autores: ${window.escapeHTML(art.autores || 'Desconhecido')} | Publicação: ${window.escapeHTML(art.ano || 'N/A')}</p>
            <p style="font-size:14px; margin:12px 0; color: var(--text-main); line-height: 1.5; border-left: 3px solid var(--primary); padding-left: 10px;">
                ${art.resumo ? window.escapeHTML(art.resumo).substring(0, 300) + '...' : '<i style="color:var(--text-muted);">Sem resumo disponível na base de dados.</i>'}
            </p>
            <div style="display:flex; gap:10px; margin-top:15px; flex-wrap: wrap;">
                ${botaoAcaoHTML}
                ${botaoLinkHTML}
            </div>
        </div>`;
    }).join('');
};

window.renderizarPaginacao = function(qtdResultadosRecebidos) {
    const pagArea = document.getElementById('pagination-area');
    const btnPrev = document.getElementById('btn-prev-page');
    const btnNext = document.getElementById('btn-next-page');
    
    pagArea.style.display = 'flex';
    document.getElementById('page-indicator').innerText = `Página ${window.currentPage}`;
    btnPrev.style.display = window.currentPage > 1 ? 'inline-block' : 'none';
    btnNext.style.display = qtdResultadosRecebidos === 20 ? 'inline-block' : 'none';
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

    document.getElementById('articles-results').innerHTML = '<div style="text-align:center; padding: 30px;"><span class="spinner"></span> <p style="color:var(--text-muted);">Buscando base científica...</p></div>';
    document.getElementById('pagination-area').style.display = 'none';

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
        document.getElementById('articles-results').innerHTML = '<div style="text-align:center; padding: 30px; color:var(--danger);">Erro ao conectar com a base de dados.</div>';
    }
};

window.carregarArtigosSalvos = async function() {
    document.getElementById('search-area').style.display = 'none';
    document.getElementById('pagination-area').style.display = 'none'; 
    document.getElementById('saved-filters-area').style.display = 'block';
    document.getElementById('filter-saved-input').value = '';
    
    document.getElementById('btn-tab-salvos').classList.add('active');
    document.getElementById('btn-tab-busca').classList.remove('active');

    document.getElementById('articles-results').innerHTML = '<div style="text-align:center; padding: 30px;"><span class="spinner"></span> <p style="color:var(--text-muted);">Carregando sua biblioteca...</p></div>';

    try {
        const res = await window.api.fetchProtected('/articles/saved');
        if (!res.ok) throw new Error("Falha ao carregar salvos");
        const salvos = await res.json();
        
        window.artigosSalvosCache = salvos;
        renderizarCards(salvos, 'salvos');
    } catch (error) {
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
        window.UI.showToast("Artigo adicionado à sua biblioteca!", "success");
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