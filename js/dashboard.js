document.addEventListener('DOMContentLoaded', async () => {
    if (!api.getToken()) {
        window.location.href = "index.html";
        return;
    }

    const display = document.getElementById('mainDisplay');
    const pageTitle = document.getElementById('pageTitle');

    // Função para carregar equipamentos
    async function loadEquipments() {
        display.innerHTML = '<div class="spinner"></div>';
        try {
            const response = await api.fetchProtected('/equipments/');
            const equipments = await response.json();

            if (response.ok) {
                renderEquipments(equipments);
            } else {
                display.innerHTML = `<p class="error">Erro ao carregar: ${equipments.detail}</p>`;
            }
        } catch (err) {
            display.innerHTML = '<p class="error">Falha na conexão com a API.</p>';
        }
    }

    function renderEquipments(list) {
        pageTitle.innerText = "Laboratório / Equipamentos";
        display.innerHTML = list.map(item => `
            <article class="card">
                <div class="card-icon"><i class="fas fa-tools"></i></div>
                <div class="card-info">
                    <h3>${item.nome}</h3>
                    <p>${item.imagem_path ? 'Imagem disponível' : 'Sem imagem cadastrada'}</p>
                    <span class="status-tag">Ativo</span>
                </div>
            </article>
        `).join('');
    }
    loadEquipments();
    document.getElementById('menuEquipments').addEventListener('click', loadEquipments);
});