/**
 * Equipments View Controller
 * Handles the logic for displaying, adding, and managing lab equipments.
 */

// Escuta o evento global de mudança de tela disparado pelo ui.js
document.addEventListener('viewChanged', (event) => {
    if (event.detail.view === 'equipments') {
        renderEquipmentsView();
    }
});

/**
 * Função principal que monta a tela de Equipamentos
 */
async function renderEquipmentsView() {
    const mainContent = document.getElementById('dynamic-content');
    
    // 1. Monta o esqueleto da tela (Header e área da tabela)
    mainContent.innerHTML = `
        <div class="view-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-lg);">
            <div>
                <h3 style="margin-bottom: 4px;">Laboratory Equipments</h3>
                <p class="text-muted text-small">Manage all active R&D tools and machines.</p>
            </div>
            <button id="btn-add-equipment" class="btn btn-primary">
                + Add Equipment
            </button>
        </div>

        <section class="card">
            <div id="equipments-container" style="min-height: 200px; position: relative;">
                <div class="text-center mt-md text-muted">
                    <span class="spinner" style="position:relative; display:inline-block; border-color:#ccc; border-top-color:var(--color-primary); margin-right: 8px;"></span> 
                    Loading equipments...
                </div>
            </div>
        </section>
    `;

    // 2. Busca os dados reais na API
    await fetchAndRenderEquipments();

    // 3. Adiciona os eventos dos botões da nova tela
    const btnAdd = document.getElementById('btn-add-equipment');
    btnAdd.addEventListener('click', () => {
        // Por enquanto vamos dar um Toast. No próximo passo criamos o Modal!
        UI.showToast('Add equipment modal coming soon!', 'info');
    });
}

/**
 * Busca os dados na API e desenha a tabela/lista
 */
async function fetchAndRenderEquipments() {
    const container = document.getElementById('equipments-container');

    try {
        // Usa a nossa função centralizada que já envia o Token JWT
        const response = await api.fetchProtected('/equipments/');
        
        if (!response.ok) {
            throw new Error('Failed to fetch data');
        }

        const equipments = await response.json();

        // Se o banco estiver vazio (Nenhum equipamento cadastrado)
        if (equipments.length === 0) {
            container.innerHTML = `
                <div class="text-center" style="padding: var(--space-lg) 0;">
                    <p class="text-muted mb-md">No equipments found in the inventory.</p>
                    <button class="btn btn-primary" onclick="document.getElementById('btn-add-equipment').click()">Register First Equipment</button>
                </div>
            `;
            return;
        }

        // Se houver dados, monta uma tabela limpa
        let tableHTML = `
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                    <tr style="border-bottom: 2px solid #e2e8f0; color: var(--text-muted);">
                        <th style="padding: 12px 16px;">ID</th>
                        <th style="padding: 12px 16px;">Equipment Name</th>
                        <th style="padding: 12px 16px;">Status</th>
                        <th style="padding: 12px 16px; text-align: right;">Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        equipments.forEach(eq => {
            tableHTML += `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 12px 16px; color: var(--text-muted);">#${eq.id}</td>
                    <td style="padding: 12px 16px; font-weight: 500;">${eq.nome}</td>
                    <td style="padding: 12px 16px;">
                        <span style="background-color: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 99px; font-size: 0.75rem; font-weight: 600;">Active</span>
                    </td>
                    <td style="padding: 12px 16px; text-align: right;">
                        <button class="btn-icon" style="color: var(--color-primary);" aria-label="Edit">✏️</button>
                    </td>
                </tr>
            `;
        });

        tableHTML += `</tbody></table>`;
        container.innerHTML = tableHTML;

    } catch (error) {
        console.error("Error loading equipments:", error);
        container.innerHTML = `
            <div class="text-center text-danger" style="padding: var(--space-md);">
                Failed to load equipments. Please try again later.
            </div>
        `;
        UI.showToast('Error connecting to the database', 'error');
    }
}