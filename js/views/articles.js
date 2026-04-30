// ==========================================
// 1. CONSTRUÇÃO DA TELA DE BUSCA
// ==========================================
document.addEventListener('viewChanged', (e) => {
    if (e.detail.view === 'articles') {
        const container = document.getElementById('dynamic-content');
        
        container.innerHTML = `
            <div class="admin-container fade-in">
                <div style="margin-bottom: 20px;">
                    <h2 style="margin-bottom: 5px;">Artigos</h2>
                    <p class="text-muted">Pesquise literatura científica global e salve no seu repositório pessoal.</p>
                </div>

                <div style="display: flex; gap: 10px; margin-bottom: 25px;">
                    <input type="text" id="search-input" class="form-control" placeholder="Digite o tema, autores ou palavras-chave (Ex: 2D materials battery)..." style="flex: 1; padding: 12px; font-size: 16px; border-radius: 6px; border: 1px solid #ccc;" onkeypress="if(event.key === 'Enter') pesquisarArtigos()">
                    <button onclick="pesquisarArtigos()" class="btn btn-primary" style="padding: 12px 25px; font-weight: bold; border-radius: 6px; cursor: pointer; border: none; background: #0056b3; color: white;">🔍 Pesquisar</button>
                </div>

                <div id="articles-results" style="display: grid; gap: 15px;">
                    <div style="text-align: center; padding: 40px; color: #999; border: 2px dashed #ddd; border-radius: 8px;">
                        A busca é conectada ao Semantic Scholar. Digite algo acima para começar.
                    </div>
                </div>
            </div>
        `;
    }
});

// ==========================================
// 2. FUNÇÃO DE PESQUISA
// ==========================================
window.pesquisarArtigos = async function() {
    const query = document.getElementById('search-input').value;
    if (!query) return;

    const resultsContainer = document.getElementById('articles-results');
    resultsContainer.innerHTML = '<div style="text-align:center; padding: 30px;"><span class="spinner"></span> <p>Buscando em milhares de revistas...</p></div>';

    try {
        const res = await window.api.fetchProtected(`/articles/search?query=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error("Erro na requisição");

        const artigos = await res.json();
        window.artigosBuscaCache = artigos; 

        if (artigos.length === 0) {
            resultsContainer.innerHTML = '<div style="text-align:center; padding: 30px; color:#666;">Nenhum artigo encontrado para esta pesquisa.</div>';
            return;
        }

        resultsContainer.innerHTML = artigos.map((art, index) => `
            <div class="article-card" style="background:white; padding:20px; border-radius:8px; border:1px solid #E2E8F0; box-shadow: 0 2px 4px rgba(0,0,0,0.03);">
                <h3 style="margin:0 0 8px 0; color: #0F172A; font-size: 18px;">${art.titulo}</h3>
                <p style="font-size:13px; color:#64748B; font-weight: 500;">👥 ${art.autores || 'Autores desconhecidos'} | 📅 ${art.ano || 'N/A'}</p>
                <p style="font-size:14px; margin:12px 0; color: #334155; line-height: 1.5;">${art.resumo ? art.resumo.substring(0, 300) + '...' : '<i style="color:#94A3B8;">Sem resumo disponível na base de dados.</i>'}</p>

                <div style="display:flex; gap:10px; margin-top:15px; flex-wrap: wrap;">
                    
                    <button onclick="salvarArtigo(${index})" class="btn" style="background: #FFFBEB; color: #D97706; border: 1px solid #FDE68A; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer;">⭐ Salvar no Meu Repositório</button>

                    <a href="${art.url_pdf || art.url_artigo}" target="_blank" class="btn" style="background: ${art.url_pdf ? '#ECFDF5' : '#F8FAFC'}; color: ${art.url_pdf ? '#059669' : '#475569'}; border: 1px solid ${art.url_pdf ? '#A7F3D0' : '#CBD5E1'}; padding: 8px 15px; border-radius: 6px; text-decoration: none; font-weight: bold;">
                        ${art.url_pdf ? '📥 Baixar PDF Aberto' : '🔗 Ir para a Editora'}
                    </a>
                </div>
            </div>
        `).join('');

    } catch (err) {
        resultsContainer.innerHTML = '<div style="text-align:center; padding: 30px; color:red;">Erro ao conectar com a base de dados científica.</div>';
        window.UI.showToast("Erro na busca científica", "error");
    }
};

// ==========================================
// 3. ENVIAR PARA O BANCO DE DADOS (SUPABASE)
// ==========================================
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

        window.UI.showToast("⭐ Artigo salvo com sucesso!", "success");
    } catch (error) {
        window.UI.showToast("Erro ao salvar o artigo no banco.", "error");
    }
};