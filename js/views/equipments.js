// ==========================================
// 1. CONSTRUÇÃO DA TELA DE EQUIPAMENTOS
// ==========================================
document.addEventListener('viewChanged', (e) => {
    if (e.detail.view === 'equipments') {
        renderEquipments();
    }
});

function renderEquipments() {
    const main = document.getElementById('dynamic-content');
    if (!main) return;

    main.innerHTML = `
        <header class="page-head fade-in">
            <div>
                <p class="eyebrow">laboratório</p>
                <h1>Equipamentos</h1>
                <p class="lede">Cada equipamento com seu vídeo de treinamento, seus POPs e os processos em que é usado.</p>
            </div>
            <div class="page-actions">
                <button id="btn-novo-equip" class="btn btn-primary">Novo equipamento</button>
            </div>
        </header>
        <div id="eq-container" class="fade-in"></div>
    `;

    const btnNovo = document.getElementById('btn-novo-equip');
    if (btnNovo) {
        btnNovo.addEventListener('click', () => window.openAddEquipmentModal());
    }

    loadEquipmentsTable();
}

// ==========================================
// 2. LISTA COM BUSCA E PAGINAÇÃO
// ==========================================
function loadEquipmentsTable() {
    window.listagemAtual = window.Listagem.criar({
        alvo: 'eq-container',
        endpoint: '/equipments/',
        placeholder: 'Buscar por nome ou descrição',
        cabecalho: '<th>Equipamento</th><th>Status</th><th class="end">Ações</th>',
        vazio: { title: 'Nenhum equipamento registrado', description: 'Cadastre o primeiro equipamento do laboratório.' },
        erro: 'Não foi possível carregar os equipamentos.',
        renderLinha: (eq) => `
            <tr>
                <td><strong>${window.escapeHTML(eq.nome)}</strong></td>
                <td><span class="badge badge-success">${window.escapeHTML(eq.status || 'ativo')}</span></td>
                <td>
                    <div class="row-actions">
                        <button class="link-btn" onclick="window.viewDossier(${eq.id})">Abrir</button>
                        <button class="link-btn muted" onclick="openDeepView('equipments', ${eq.id}, 'Equipamento')">Editar</button>
                    </div>
                </td>
            </tr>`
    });
}

// ==========================================
// 3. MODAL DE NOVO EQUIPAMENTO
// ==========================================
window.openAddEquipmentModal = function() {
    const modal = document.getElementById('modal-eq');
    if (modal) {
        modal.style.setProperty('display', 'flex', 'important');
        document.body.style.overflow = 'hidden';
    }
};

window.closeEquipModal = function() {
    const modal = document.getElementById('modal-eq');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
};

window.handleSaveEquipment = async function(e) {
    e.preventDefault();
    if (window.UI) UI.setButtonLoading('btn-save-eq', true);
    const payload = {
        nome: document.getElementById('eq-name').value,
        description: document.getElementById('eq-desc').value,
        video_url: document.getElementById('eq-video').value,
        manual_url: document.getElementById('eq-manual').value,
        status: "ativo"
    };

    try {
        const res = await api.fetchProtected('equipments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            UI.showToast('Equipamento registrado.', 'success');
            window.closeEquipModal();
            e.target.reset();
            if (window.listagemAtual) window.listagemAtual.recarregar();
        } else {
            const errData = await res.json().catch(() => ({}));
            let msg = 'Erro ao processar registro.';
            if (Array.isArray(errData.detail)) {
                msg = (errData.detail[0].msg || msg).replace(/^Value error,\s*/, '');
            } else if (errData.detail) {
                msg = errData.detail;
            }
            throw new Error(msg);
        }
    } catch (err) {
        UI.showToast(err.message || 'Erro ao processar registro', 'error');
    } finally {
        if (window.UI) UI.setButtonLoading('btn-save-eq', false);
    }
};

// ==========================================
// 4. VÍNCULOS DO EQUIPAMENTO
// ==========================================
function renderVinculosEquipamento(vinculos, manualUrl) {
    const esc = window.escapeHTML;

    const pops = vinculos.pops.map(p => `
        <li><button type="button" class="link-btn" data-codigo="${esc(p.codigo)}" onclick="window.closeDossierModal(); window.abrirPopPorCodigo(this.dataset.codigo)">${esc(p.codigo)} · ${esc(p.titulo)}</button></li>`).join('');

    const linkExterno = manualUrl
        ? `<li><a href="${esc(manualUrl)}" target="_blank" rel="noopener">Abrir link externo do POP</a></li>`
        : '';

    const processos = vinculos.processos.map(p => `
        <li><button type="button" class="link-btn" onclick="window.closeDossierModal(); viewProcessDetails(${p.id})">${esc(p.nome_processo)}</button>
        <span class="meta"> · ${esc((p.status || 'rascunho').replace('_', ' '))}</span></li>`).join('');

    return `
        <div>
            <dt>pops</dt>
            <dd class="plain">${pops || linkExterno
                ? `<ul class="link-list">${pops}${linkExterno}</ul>`
                : '<span class="text-faint">Nenhum POP vinculado. Vincule pelo formulário do POP.</span>'}</dd>
        </div>
        <div>
            <dt>processos</dt>
            <dd class="plain">${processos
                ? `<ul class="link-list">${processos}</ul>`
                : '<span class="text-faint">Nenhum processo usa este equipamento.</span>'}</dd>
        </div>`;
}

// ==========================================
// 5. DETALHES DO EQUIPAMENTO
// ==========================================
window.viewDossier = async function(id) {
    try {
        const [res, resVinculos] = await Promise.all([
            api.fetchProtected(`equipments/${id}`),
            api.fetchProtected(`equipments/${id}/vinculos`)
        ]);

        if (!res.ok) throw new Error('Equipamento não encontrado');

        const eq = await res.json();
        const vinculos = resVinculos.ok ? await resVinculos.json() : { pops: [], processos: [] };

        const videoEmbed = window.escapeHTML(eq.video_url);

        const dossierTitle = document.getElementById('dossier-title');
        const dossierBody = document.getElementById('dossier-body');
        const modalDossier = document.getElementById('modal-dossier');

        if (dossierTitle) dossierTitle.textContent = eq.nome;

        if (dossierBody) {
            dossierBody.innerHTML = `
                ${videoEmbed ? `<iframe class="video-frame" src="${videoEmbed}" frameborder="0" allowfullscreen title="Vídeo de treinamento"></iframe>` : ''}
                <dl class="dl">
                    <div>
                        <dt>descrição</dt>
                        <dd>${eq.description ? window.escapeHTML(eq.description) : '<span class="text-faint">Sem descrição registrada.</span>'}</dd>
                    </div>
                    <div>
                        <dt>treinamento</dt>
                        <dd class="plain">${videoEmbed ? 'Vídeo acima.' : '<span class="text-faint">Nenhum vídeo cadastrado.</span>'}</dd>
                    </div>
                    ${renderVinculosEquipamento(vinculos, eq.manual_url)}
                </dl>
            `;
        }

        if (modalDossier) {
            modalDossier.style.setProperty('display', 'flex', 'important');
            document.body.style.overflow = 'hidden';
        }

    } catch (err) {
        console.error("Erro no processo:", err);
        if (window.UI) UI.showToast('Erro ao carregar detalhes do equipamento', 'error');
    }
};

window.closeDossierModal = function() {
    const modal = document.getElementById('modal-dossier');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
};
