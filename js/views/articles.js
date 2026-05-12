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
                        <h2 style="margin-bottom: 5px; color: #111;">Artigos</h2>
                        <p style="color: #666; margin: 0;">Pesquise e gerencie artigos científicos.</p>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="prepararBusca()" id="btn-tab-busca" class="btn" style="background: #111; color: white; border: none; padding: 10px 20px; border-radius: 4px; font-weight: bold; cursor: pointer;">🔍 Buscar Artigos</button>
                        <button onclick="carregarArtigosSalvos()" id="btn-tab-salvos" class="btn" style="background: white; color: #007BFF; border: 2px solid #007BFF; padding: 10px 20px; border-radius: 4px; font-weight: bold; cursor: pointer;">Meus Salvos</button>
                    </div>
                </div>

                <div id="search-area" style="background: #F8FAFC; padding: 15px; border-radius: 6px; border: 1px solid #E2E8F0; margin-bottom: 25px;">
                    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <input type="text" id="search-input" placeholder="Digite o tema, autores ou DOI..." style="flex: 1; padding: 12px; font-size: 16px; border-radius: 4px; border: 1px solid #111; outline: none;" onkeypress="if(event.key === 'Enter') pesquisarArtigos(1)">
                        <button onclick="pesquisarArtigos(1)" class="btn" style="padding: 12px 25px; font-weight: bold; border-radius: 4px; cursor: pointer; border: none; background: #007BFF; color: white;">Pesquisar</button>
                    </div>
                    <div style="display: flex; gap: 15px; align-items: center;">
                        <span style="font-size: 13px; font-weight: bold; color: #111;">Filtros:</span>
                        <select id="filter-ano" style="padding: 8px; border-radius: 4px; border: 1px solid #ccc; font-size: 13px;" onchange="pesquisarArtigos(1)">
                            <option value="">Qualquer data</option>
                            <option value="2025">Desde 2025</option>
                            <option value="2023">Desde 2023</option>
                            <option value="2020">Desde 2020</option>
                            <option value="2015">Desde 2015</option>
                        </select>
                        <select id="filter-sort" style="padding: 8px; border-radius: 4px; border: 1px solid #ccc; font-size: 13px;" onchange="pesquisarArtigos(1)">
                            <option value="">Relevância</option>
                            <option value="recentes">Mais recentes</option>
                        </select>
                    </div>
                </div>

                <div id="saved-filters-area" style="display: none; margin-bottom: 25px;">
                    <input type="text" id="filter-saved-input" placeholder="Filtrar salvos por nome do artigo ou autor..." oninput="filtrarSalvosLocalmente()" style="width: 100%; padding: 12px; font-size: 14px; border-radius: 4px; border: 1px solid #ccc; outline: none;">
                </div>

                <div id="articles-results" style="display: grid; gap: 15px;">
                    <div style="text-align: center; padding: 40px; color: #666; border: 1px dashed #111; border-radius: 4px;">
                        Inicie uma pesquisa ou visualize seus artigos salvos.
                    </div>
                </div>

                <div id="pagination-area" style="display: none; justify-content: center; align-items: center; gap: 20px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                    <button id="btn-prev-page" class="btn" onclick="mudarPagina(-1)" style="background: white; color: #111; border: 1px solid #111; padding: 8px 15px; font-weight: bold; cursor: pointer; border-radius: 4px;">⬅ Página Anterior</button>
                    <span id="page-indicator" style="font-weight: bold; font-size: 16px; color: #111;">Página 1</span>
                    <button id="btn-next-page" class="btn" onclick="mudarPagina(1)" style="background: #111; color: white; border: none; padding: 8px 15px; font-weight: bold; cursor: pointer; border-radius: 4px;">Próxima Página ➡</button>
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
    document.getElementById('btn-tab-busca').style.cssText = "background: #111; color: white; border: none; padding: 10px 20px; border-radius: 4px; font-weight: bold; cursor: pointer;";
    document.getElementById('btn-tab-salvos').style.cssText = "background: white; color: #007BFF; border: 2px solid #007BFF; padding: 10px 20px; border-radius: 4px; font-weight: bold; cursor: pointer;";
    document.getElementById('articles-results').innerHTML = '<div style="text-align: center; padding: 40px; color: #666; border: 1px dashed #111; border-radius: 4px;">Inicie uma pesquisa...</div>';
};

window.renderizarCards = function(artigos, modo) {
    const resultsContainer = document.getElementById('articles-results');
    
    if (artigos.length === 0) {
        resultsContainer.innerHTML = '<div style="text-align:center; padding: 30px; color:#111;">Nenhum artigo encontrado.</div>';
        return;
    }

    resultsContainer.innerHTML = artigos.map((art, index) => {
        let botaoAcaoHTML = "";
        if (modo === 'busca') {
            botaoAcaoHTML = `<button onclick="salvarArtigo(${index})" class="btn" style="background: white; color: #111; border: 2px solid #111; padding: 8px 15px; border-radius: 4px; font-weight: bold; cursor: pointer;">⭐ Salvar Artigo</button>`;
        } else {
            botaoAcaoHTML = `<button onclick="removerArtigo(${art.id})" class="btn" style="background: white; color: #d9534f; border: 2px solid #d9534f; padding: 8px 15px; border-radius: 4px; font-weight: bold; cursor: pointer;">✖ Remover dos Salvos</button>`;
        }

        const linkUrl = art.url_pdf || art.url_artigo || '#';
        const linkTexto = art.url_pdf ? '📥 Baixar PDF' : '🔗 Ir para a Editora';
        const botaoLinkHTML = linkUrl !== '#' ? `<a href="${linkUrl}" target="_blank" class="btn" style="background: #007BFF; color: white; border: none; padding: 8px 15px; border-radius: 4px; text-decoration: none; font-weight: bold;">${linkTexto}</a>` : '';

        return `
        <div class="article-card" style="background:white; padding:20px; border-radius:4px; border:1px solid #111; box-shadow: 2px 2px 0px rgba(0,0,0,0.1);">
            <h3 style="margin:0 0 8px 0; color: #111; font-size: 18px;">${window.escapeHTML(art.titulo)}</h3>
            <p style="font-size:13px; color:#666; font-weight: 500;">Autores: ${window.escapeHTML(art.autores || 'Desconhecido')} | Publicação: ${window.escapeHTML(art.ano || 'N/A')}</p>
            <p style="font-size:14px; margin:12px 0; color: #111; line-height: 1.5; border-left: 3px solid #007BFF; padding-left: 10px;">
                ${art.resumo ? window.escapeHTML(art.resumo).substring(0, 300) + '...' : '<i style="color:#666;">Sem resumo disponível na base de dados.</i>'}
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

    document.getElementById('articles-results').innerHTML = '<div style="text-align:center; padding: 30px;"><span class="spinner"></span> <p style="color:#111;">Buscando base científica...</p></div>';
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
        document.getElementById('articles-results').innerHTML = '<div style="text-align:center; padding: 30px; color:red;">Erro ao conectar com a base de dados.</div>';
    }
};

window.carregarArtigosSalvos = async function() {
    document.getElementById('search-area').style.display = 'none';
    document.getElementById('pagination-area').style.display = 'none'; 
    document.getElementById('saved-filters-area').style.display = 'block';
    document.getElementById('filter-saved-input').value = '';
    
    document.getElementById('btn-tab-salvos').style.cssText = "background: #111; color: white; border: none; padding: 10px 20px; border-radius: 4px; font-weight: bold; cursor: pointer;";
    document.getElementById('btn-tab-busca').style.cssText = "background: white; color: #007BFF; border: 2px solid #007BFF; padding: 10px 20px; border-radius: 4px; font-weight: bold; cursor: pointer;";
    
    document.getElementById('articles-results').innerHTML = '<div style="text-align:center; padding: 30px;"><span class="spinner"></span> <p style="color:#111;">Carregando sua biblioteca...</p></div>';

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
    if(!confirm("Deseja realmente remover este artigo da sua biblioteca?")) return;

    try {
        const res = await window.api.fetchProtected(`/articles/saved/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error("Falha ao remover");
        
        window.UI.showToast("Artigo removido.", "success");
        carregarArtigosSalvos();
    } catch (error) {
        window.UI.showToast("Erro ao remover o artigo.", "error");
    }
};