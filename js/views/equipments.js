// ==========================================
// GESTÃO DOS EQUIPAMENTOS
// ==========================================

document.addEventListener('viewChanged', (e) => {
    if (e.detail.view === 'equipments') {
        renderEquipments();
    }
});

async function renderEquipments() {
    const main = document.getElementById('dynamic-content');
    if (!main) return;

    main.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem;">
            <div>
                <h2 style="color:var(--primary); text-transform: uppercase;">Equipamentos</h2>
                <p class="text-muted text-small">Gestão dos equipamentos do laboratório.</p>
            </div>
            <button id="btn-novo-equip" class="btn btn-primary">+ Novo Equipamento</button>
        </div>
        <div id="eq-container" class="card">
            <div class="text-center p-lg">Carregando inventário...</div>
        </div>
    `;

    const btnNovo = document.getElementById('btn-novo-equip');
    if (btnNovo) {
        btnNovo.addEventListener('click', () => window.openAddEquipmentModal());
    }

    loadEquipmentsTable();
}


async function loadEquipmentsTable() {
    const container = document.getElementById('eq-container');
    try {
        const res = await api.fetchProtected('equipments');
        const data = await res.json();

        if (data.length === 0) {
            container.innerHTML = `<p class="text-center text-muted" style="padding:20px;">Nenhum equipamento registrado no sistema.</p>`;
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Nome do Equipamento</th>
                        <th>Status</th>
                        <th style="text-align:right">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(eq => `
                        <tr>
                            <td><strong>${eq.nome}</strong></td>
                            <td><span class="badge">${eq.status || 'ativo'}</span></td>
                            <td style="text-align:right">
                                <button class="btn btn-small" onclick="window.viewDossier(${eq.id})">Ver Detalhes</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        console.error("Erro ao carregar equipamentos:", err);
        container.innerHTML = `<p class="text-danger text-center">Falha ao conectar com o servidor de ativos.</p>`;
    }
}

/**
 * Gerenciamento do Modal (Abertura/Fecho)
 */
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
    
    // UI Feedback de carregamento
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
            UI.showToast('Equipamento registrado com sucesso!', 'success');
            window.closeEquipModal();
            loadEquipmentsTable();
        } else {
            throw new Error();
        }
    } catch (err) {
        UI.showToast('Erro ao processar registro', 'error');
    } finally {
        if (window.UI) UI.setButtonLoading('btn-save-eq', false);
    }
};

window.viewDossier = async function(id) {
    try {
        const res = await api.fetchProtected(`equipments/${id}`); 
        
        if (!res.ok) throw new Error('Equipamento não encontrado');
        
        const eq = await res.json();
        
        const videoEmbed = eq.video_url ? eq.video_url.replace("watch?v=", "embed/") : null;

        const dossierTitle = document.getElementById('dossier-title');
        const dossierBody = document.getElementById('dossier-body');
        const modalDossier = document.getElementById('modal-dossier');

        if (dossierTitle) dossierTitle.textContent = eq.nome;
        
        if (dossierBody) {
            dossierBody.innerHTML = `
                <div style="padding-right: 15px; border-right: 1px solid #eee;">
                    <h4 style="margin-bottom:15px; color:var(--primary);">Vídeo de Treinamento</h4>
                    ${videoEmbed ? 
                        `<iframe width="100%" height="250" src="${videoEmbed}" frameborder="0" allowfullscreen style="border-radius:8px;"></iframe>` : 
                        '<div style="background:#f8fafc; height:200px; display:flex; align-items:center; justify-content:center; border-radius:8px; border:1px dashed #cbd5e1; color:#64748b;">Nenhum vídeo disponível</div>'}
                </div>
                <div>
                    <h4 style="margin-bottom:15px; color:var(--primary);">Descrição</h4>
                    <div style="background:#f1f5f9; padding:15px; border-radius:8px; margin-bottom:20px;">
                        <p style="font-size:0.9rem; line-height:1.5;">${eq.description || 'Nenhuma descrição técnica informada para este ativo.'}</p>
                    </div>
                    ${eq.manual_url ? 
                        `<a href="${eq.manual_url}" target="_blank" class="btn btn-primary" style="width:100%; text-align:center; text-decoration:none; display:inline-block;">Acessar Manual em PDF</a>` : 
                        '<p class="text-muted text-center" style="font-size:0.85rem;">Manual não disponível no momento.</p>'}
                </div>
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

/**
 * Fecha o modal de detalhes
 */
window.closeDossierModal = function() {
    const modal = document.getElementById('modal-dossier');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
};