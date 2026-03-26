document.addEventListener('viewChanged', (e) => {
    if (e.detail.view === 'equipments') renderEquipments();
});

async function renderEquipments() {
    const main = document.getElementById('dynamic-content');
    main.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem;">
            <div>
                <h2 style="color:var(--primary);">EQUIPAMENTOS</h2>
                <p class="text-muted text-small">Equipamentos para uso do laboratório</p>
            </div>
            <button class="btn btn-primary" onclick="openAddEquipmentModal()">+ Novo Equipamento</button>
        </div>
        <div id="eq-container" class="card">
            <div class="text-center p-lg">Loading Equipamentos...</div>
        </div>
    `;
    loadEquipmentsTable();
}

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
                    <tr><th>Asset Name</th><th>Status</th><th style="text-align:right">Actions</th></tr>
                </thead>
                <tbody>
                    ${data.map(eq => `
                        <tr>
                            <td><strong>${eq.nome}</strong></td>
                            <td><span class="badge">${eq.status}</span></td>
                            <td style="text-align:right">
                                <button class="btn btn-small" onclick="viewDossier(${eq.id})">Ver Detalhes</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        container.innerHTML = `<p class="text-danger">Erro ao conectar com o servidor.</p>`;
    }
}

function openAddEquipmentModal() {
    const modalHTML = `
        <div id="modal-eq" class="modal-overlay active">
            <div class="modal" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>Novo equipamento registrado</h3>
                    <button class="btn-close" onclick="closeModal('modal-eq')">&times;</button>
                </div>
                <form id="form-new-eq">
                    <div class="input-group"><label>Nome *</label><input type="text" id="new-name" required></div>
                    <div class="input-group"><label>Descrição</label><textarea id="new-desc" rows="3"></textarea></div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                        <div class="input-group"><label>Vídeo (YouTube URL)</label><input type="url" id="new-video"></div>
                        <div class="input-group"><label>Link do Manual</label><input type="url" id="new-manual"></div>
                    </div>
                    <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:1rem;">
                        <button type="button" class="btn" onclick="closeModal('modal-eq')">Cancel</button>
                        <button type="submit" id="btn-save" class="btn btn-primary">Salvar Equipamento</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('form-new-eq').addEventListener('submit', handleSaveEquipment);
}

async function handleSaveEquipment(e) {
    e.preventDefault();
    UI.setButtonLoading('btn-save', true);

    const payload = {
        nome: document.getElementById('new-name').value,
        description: document.getElementById('new-desc').value,
        video_url: document.getElementById('new-video').value,
        manual_url: document.getElementById('new-manual').value,
        status: "active"
    };

    const res = await api.fetchProtected('equipments', {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        UI.showToast('Adicionado!', 'success');
        closeModal('modal-eq');
        loadEquipmentsTable();
    }
    UI.setButtonLoading('btn-save', false);
}

async function viewDossier(id) {
    const res = await api.fetchProtected(`equipments/${id}`);
    const eq = await res.json();
    const videoEmbed = eq.video_url ? eq.video_url.replace("watch?v=", "embed/") : null;

    const modalHTML = `
        <div id="modal-dossier" class="modal-overlay active">
            <div class="modal" style="max-width: 850px;">
                <div class="modal-header">
                    <h3>${eq.nome}</h3>
                    <button class="btn-close" onclick="closeModal('modal-dossier')">&times;</button>
                </div>
                <div class="modal-body" style="display:grid; grid-template-columns: 1.5fr 1fr; gap:25px;">
                    <div>
                        <h4>Training Video</h4>
                        ${videoEmbed ? `<iframe width="100%" height="300" src="${videoEmbed}" frameborder="0" allowfullscreen></iframe>` : '<p>No video.</p>'}
                    </div>
                    <div>
                        <h4>Resources</h4>
                        <p class="text-small">${eq.description || 'Sem detalhes.'}</p>
                        ${eq.manual_url ? `<a href="${eq.manual_url}" target="_blank" class="btn btn-small">Download Manual</a>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

window.closeModal = (id) => {
    const m = document.getElementById(id);
    if(m) { m.classList.remove('active'); setTimeout(() => m.remove(), 300); }
};