// ==========================================
// GESTÃO DE EQUIPAMENTOS (equipments.js)
// ==========================================

// Escuta a troca de tela para renderizar a tabela
document.addEventListener('viewChanged', (e) => {
    if (e.detail.view === 'equipments') renderEquipments();
});

/**
 * Renderiza a estrutura da tela de Equipamentos
 */
async function renderEquipments() {
    const main = document.getElementById('dynamic-content');
    if (!main) return;

    main.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem;">
            <div>
                <h2 style="color:var(--primary);">EQUIPAMENTOS</h2>
                <p class="text-muted text-small">Gestão e manutenção de ativos do laboratório.</p>
            </div>
            <button id="btn-novo-equip" class="btn btn-primary">+ Novo Equipamento</button>
        </div>
        <div id="eq-container" class="card">
            <div class="text-center p-lg">Carregando equipamentos...</div>
        </div>
    `;

    // Vincula o clique ao modal fixo do HTML
    document.getElementById('btn-novo-equip').addEventListener('click', () => window.openAddEquipmentModal());
    loadEquipmentsTable();
}

/**
 * Abre o modal de adição (Usa o modal fixo do dashboard.html)
 */
window.openAddEquipmentModal = function() {
    const modal = document.getElementById('modal-eq');
    if (modal) {
        modal.style.setProperty('display', 'flex', 'important');
        document.body.style.overflow = 'hidden';
    }
};

/**
 * Fecha o modal de adição
 */
window.closeEquipModal = function() {
    const modal = document.getElementById('modal-eq');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
};

/**
 * Carrega os dados da API para a tabela
 */
async function loadEquipmentsTable() {
    const container = document.getElementById('eq-container');
    try {
        const res = await api.fetchProtected('equipments');
        const data = await res.json();

        if (data.length === 0) {
            container.innerHTML = `<p class="text-center text-muted">Nenhum equipamento registrado.</p>`;
            return;
        }

        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Equipamento</th>
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
        container.innerHTML = `<p class="text-danger">Erro ao carregar dados do servidor.</p>`;
    }
}

/**
 * Salva o novo equipamento usando os IDs corretos do HTML
 */
window.handleSaveEquipment = async function(e) {
    e.preventDefault();
    UI.setButtonLoading('btn-save-eq', true);

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
            UI.showToast('Equipamento salvo com sucesso!', 'success');
            window.closeEquipModal();
            loadEquipmentsTable();
        } else {
            throw new Error();
        }
    } catch (err) {
        UI.showToast('Erro ao salvar equipamento', 'error');
    } finally {
        UI.setButtonLoading('btn-save-eq', false);
    }
};

/**
 * Abre o modal de detalhes (Dossier) preenchendo o HTML fixo
 */
window.viewDossier = async function(id) {
    try {
        const res = await api.fetchProtected(`equipments/${id}`);
        const eq = await res.json();
        
        const videoEmbed = eq.video_url ? eq.video_url.replace("watch?v=", "embed/") : null;

        document.getElementById('dossier-title').textContent = eq.nome;
        document.getElementById('dossier-body').innerHTML = `
            <div>
                <h4 style="margin-bottom:10px;">Vídeo de Treinamento</h4>
                ${videoEmbed ? `<iframe width="100%" height="300" src="${videoEmbed}" frameborder="0" allowfullscreen style="border-radius:8px;"></iframe>` : '<p class="text-muted">Nenhum vídeo disponível.</p>'}
            </div>
            <div>
                <h4 style="margin-bottom:10px;">Informações Adicionais</h4>
                <p class="text-small" style="margin-bottom:20px;">${eq.description || 'Sem descrição detalhada.'}</p>
                ${eq.manual_url ? `<a href="${eq.manual_url}" target="_blank" class="btn btn-primary" style="width:100%;">Acessar Manual Técnico</a>` : '<p class="text-muted">Manual não anexado.</p>'}
            </div>
        `;

        const modal = document.getElementById('modal-dossier');
        if (modal) modal.style.display = 'flex';
    } catch (err) {
        UI.showToast('Erro ao carregar detalhes', 'error');
    }
};

/**
 * Fecha o modal de detalhes
 */
window.closeDossierModal = function() {
    const modal = document.getElementById('modal-dossier');
    if (modal) modal.style.display = 'none';
};