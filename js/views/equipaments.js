document.addEventListener('viewChanged', (event) => {
    if (event.detail.view === 'equipments') {
        renderEquipmentsView();
    }
});

async function renderEquipmentsView() {
    const mainContent = document.getElementById('dynamic-content');
    
    // 1. Renderiza o esqueleto
    mainContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-lg);">
            <div>
                <h3 style="margin-bottom: 4px;">Laboratory Equipments</h3>
                <p class="text-muted text-small">Manage all active R&D tools and machines.</p>
            </div>
            <button id="btn-add-equipment" class="btn btn-primary">
                + Add Equipment
            </button>
        </div>
        <section class="card">
            <div id="equipments-container" style="min-height: 200px;">
                <div class="text-center mt-md text-muted">
                    <span class="spinner" style="position:relative; display:inline-block; border-color:#ccc; border-top-color:var(--color-primary); margin-right: 8px;"></span> 
                    Loading equipments...
                </div>
            </div>
        </section>
    `;

    await fetchAndRenderEquipments();
    document.getElementById('btn-add-equipment').addEventListener('click', openAddEquipmentModal);
}

// ==========================================
// LÓGICA DE CADASTRO
// ==========================================

function openAddEquipmentModal() {
    if (document.getElementById('equipment-modal')) {
        document.getElementById('equipment-modal').remove();
    }
    const modalHTML = `
        <div id="equipment-modal" class="modal-overlay active" role="dialog" aria-modal="true">
            <div class="modal">
                <div class="modal-header">
                    <h3>Register New Equipment</h3>
                    <button class="btn-close" aria-label="Close modal" onclick="closeEquipmentModal()">&times;</button>
                </div>
                
                <form id="form-add-equipment">
                    <div class="input-group">
                        <label for="eq-name">Equipment Name</label>
                        <input type="text" id="eq-name" required placeholder="Ex: Microscópio Eletrônico LEQM-01">
                    </div>
                    
                    <div class="input-group">
                        <label for="eq-image">Image URL (Optional)</label>
                        <input type="url" id="eq-image" placeholder="https://link-da-imagem.com/img.jpg">
                    </div>

                    <div id="modal-feedback" class="feedback-msg" aria-live="polite"></div>
                    
                    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: var(--space-md);">
                        <button type="button" class="btn" style="background: #e2e8f0; color: var(--text-main);" onclick="closeEquipmentModal()">Cancel</button>
                        <button type="submit" id="btn-save-eq" class="btn btn-primary">
                            <span class="btn-text">Save Equipment</span>
                            <span class="spinner hidden" aria-hidden="true"></span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('form-add-equipment').addEventListener('submit', handleAddEquipment);
}

window.closeEquipmentModal = function() {
    const modal = document.getElementById('equipment-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
};

async function handleAddEquipment(event) {
    event.preventDefault();

    const name = document.getElementById('eq-name').value.trim();
    const imageUrl = document.getElementById('eq-image').value.trim();

    UI.showFormFeedback('modal-feedback', '', false);
    UI.setButtonLoading('btn-save-eq', true);

    try {
        const params = new URLSearchParams();
        params.append('nome', name);
        if (imageUrl) params.append('imagem_url', imageUrl);
        const response = await api.fetchProtected(`/equipments/?${params.toString()}`, {
            method: 'POST'
        });

        if (response.ok) {
            UI.showToast('Equipment added successfully!', 'success');
            closeEquipmentModal();
            await fetchAndRenderEquipments(); 
        } else {
            const data = await response.json();
            UI.showFormFeedback('modal-feedback', data.detail || 'Failed to save equipment.', true);
        }
    } catch (error) {
        console.error('Error adding equipment:', error);
        UI.showFormFeedback('modal-feedback', 'Connection error. Try again.', true);
    } finally {
        UI.setButtonLoading('btn-save-eq', false);
    }
}

// ==========================================
// LÓGICA DE BUSCA E MONTAGEM DA TABELA
// ==========================================

async function fetchAndRenderEquipments() {
    const container = document.getElementById('equipments-container');

    try {
        const response = await api.fetchProtected('/equipments/');
        if (!response.ok) throw new Error('API Error');
        
        const equipments = await response.json();

        if (equipments.length === 0) {
            container.innerHTML = `
                <div class="text-center" style="padding: var(--space-lg) 0;">
                    <p class="text-muted mb-md">No equipments found in the inventory.</p>
                </div>
            `;
            return;
        }

        let tableHTML = `
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                    <tr style="border-bottom: 2px solid #e2e8f0; color: var(--text-muted);">
                        <th style="padding: 12px 16px;">ID</th>
                        <th style="padding: 12px 16px;">Equipment Name</th>
                        <th style="padding: 12px 16px;">Status</th>
                    </tr>
                </thead>
                <tbody>
        `;

        equipments.forEach(eq => {
            tableHTML += `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;">
                    <td style="padding: 12px 16px; color: var(--text-muted);">#${eq.id}</td>
                    <td style="padding: 12px 16px; font-weight: 500;">${eq.nome}</td>
                    <td style="padding: 12px 16px;">
                        <span style="background-color: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 99px; font-size: 0.75rem; font-weight: 600;">Active</span>
                    </td>
                </tr>
            `;
        });

        tableHTML += `</tbody></table>`;
        container.innerHTML = tableHTML;

    } catch (error) {
        container.innerHTML = `
            <div class="text-center text-danger" style="padding: var(--space-md);">
                Failed to load data. Please refresh the page.
            </div>
        `;
    }
}