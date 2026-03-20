document.addEventListener('viewChanged', (e) => {
    if (e.detail.view === 'equipments') renderEquipments();
});

async function renderEquipments() {
    const main = document.getElementById('dynamic-content');
    main.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem;">
            <div>
                <h2 style="color:var(--primary);">Laboratory Inventory</h2>
                <p class="text-muted text-small">Knowledge Management & Asset Tracking</p>
            </div>
            <button class="btn btn-primary" onclick="openAddEquipmentModal()">+ Register Equipment</button>
        </div>
        <div id="eq-container" class="card">
            <div class="text-center p-lg">Loading assets...</div>
        </div>
    `;
    loadEquipmentsTable();
}

async function loadEquipmentsTable() {
    const container = document.getElementById('eq-container');
    try {
        const res = await api.fetchProtected('/equipments/');
        const data = await res.json();

        if (data.length === 0) {
            container.innerHTML = `<p class="text-center text-muted">No equipment registered.</p>`;
            return;
        }

        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Asset Name</th>
                        <th>Status</th>
                        <th style="text-align:right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(eq => `
                        <tr>
                            <td><strong>${eq.nome}</strong></td>
                            <td><span class="badge">${eq.status}</span></td>
                            <td style="text-align:right">
                                <button class="btn btn-small" onclick="viewDossier(${eq.id})" style="background:#e2e8f0; color:var(--text-main);">View Dossier</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        container.innerHTML = `<p class="text-danger">Error loading equipment list.</p>`;
    }
}

// --- MODAL DE CADASTRO EXPANDIDO ---
function openAddEquipmentModal() {
    const modalHTML = `
        <div id="modal-eq" class="modal-overlay active">
            <div class="modal" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>New Asset Registration</h3>
                    <button class="btn-close" onclick="closeModal('modal-eq')">&times;</button>
                </div>
                <form id="form-new-eq">
                    <div class="input-group">
                        <label>Equipment Name *</label>
                        <input type="text" id="new-name" required placeholder="Ex: Scanning Electron Microscope">
                    </div>
                    <div class="input-group">
                        <label>General Description</label>
                        <textarea id="new-desc" rows="3" style="width:100%; border:1px solid var(--border); border-radius:8px; padding:10px; font-family:inherit;"></textarea>
                    </div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                        <div class="input-group">
                            <label>Training Video (YouTube URL)</label>
                            <input type="url" id="new-video" placeholder="https://youtube.com/watch?v=...">
                        </div>
                        <div class="input-group">
                            <label>Manual Link (PDF)</label>
                            <input type="url" id="new-manual" placeholder="https://drive.google.com/...">
                        </div>
                    </div>
                    <div id="modal-msg" class="feedback-msg"></div>
                    <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:1rem;">
                        <button type="button" class="btn" onclick="closeModal('modal-eq')">Cancel</button>
                        <button type="submit" id="btn-save" class="btn btn-primary">Save Asset</button>
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

    const res = await api.fetchProtected('/equipments/', {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        UI.showToast('Asset registered successfully', 'success');
        closeModal('modal-eq');
        loadEquipmentsTable();
    } else {
        UI.showFormFeedback('modal-msg', 'Error saving equipment', true);
    }
    UI.setButtonLoading('btn-save', false);
}

// --- VISUALIZAÇÃO 360º (DOSSIÊ) ---
async function viewDossier(id) {
    const res = await api.fetchProtected(`/equipments/${id}`);
    const eq = await res.json();

    const videoEmbed = eq.video_url ? eq.video_url.replace("watch?v=", "embed/") : null;

    const modalHTML = `
        <div id="modal-dossier" class="modal-overlay active">
            <div class="modal" style="max-width: 900px; width:95%;">
                <div class="modal-header">
                    <div>
                        <h3 style="color:var(--primary)">${eq.nome}</h3>
                        <span class="badge">Asset ID: #${eq.id}</span>
                    </div>
                    <button class="btn-close" onclick="closeModal('modal-dossier')">&times;</button>
                </div>
                <div class="modal-body" style="display:grid; grid-template-columns: 1.5fr 1fr; gap:30px; padding-top:20px;">
                    <section>
                        <h4 class="mb-md">Instrumental Training</h4>
                        ${videoEmbed ? 
                            `<iframe width="100%" height="315" src="${videoEmbed}" frameborder="0" allowfullscreen style="border-radius:12px; background:#000;"></iframe>` 
                            : `<div style="background:#f1f5f9; height:200px; border-radius:12px; display:flex; align-items:center; justify-content:center; color:var(--text-muted);">No training video attached.</div>`}
                        
                        <h4 style="margin-top:2rem; margin-bottom:0.5rem;">Technical Description</h4>
                        <p class="text-muted">${eq.description || 'No technical details provided for this asset.'}</p>
                    </section>
                    
                    <section style="border-left:1px solid var(--border); padding-left:30px;">
                        <h4 class="mb-md">Resources & SOPs</h4>
                        <div style="display:flex; flex-direction:column; gap:12px;">
                            ${eq.manual_url ? `<a href="${eq.manual_url}" target="_blank" class="btn" style="background:#eff6ff; color:var(--primary); justify-content:flex-start;">📄 Download Technical Manual</a>` : ''}
                            <button class="btn" style="background:#f0fdf4; color:#166534; justify-content:flex-start;" onclick="UI.showToast('Redirecting to SOPs...', 'info')">📋 Linked SOPs (POPs)</button>
                        </div>
                        
                        <div class="card" style="margin-top:2rem; background:#f8fafc; border-style:dashed;">
                            <h5 style="margin-bottom:8px;">Operational Status</h5>
                            <p class="text-small">Last maintenance: Not recorded</p>
                            <p class="text-small">Responsible: Laboratory Manager</p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

window.closeModal = (id) => {
    const m = document.getElementById(id);
    if(m) {
        m.classList.remove('active');
        setTimeout(() => m.remove(), 300);
    }
};