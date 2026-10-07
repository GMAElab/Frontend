// ==========================================
// OPÇÕES DE VÍNCULO: EQUIPAMENTOS E PESSOAS
// ==========================================
(function () {
    const LIMITE_DE_OPCOES = 500;

    async function buscarLista(endpoint) {
        const res = await window.api.fetchProtected(endpoint);
        if (!res.ok) throw new Error('Falha ao carregar opções');
        return res.json();
    }

    // ==========================================
    // LISTAS
    // ==========================================
    function equipamentos() {
        return buscarLista(`/equipments/?limit=${LIMITE_DE_OPCOES}`);
    }

    function equipe() {
        return buscarLista('/usuarios/equipe');
    }

    // ==========================================
    // OPÇÕES PARA FILTROS E SELECTS
    // ==========================================
    async function opcoesDeEquipamento() {
        return (await equipamentos()).map(e => ({ valor: e.id, rotulo: e.nome }));
    }

    async function opcoesDePessoa() {
        return (await equipe()).map(u => ({ valor: u.id, rotulo: u.nome }));
    }

    // ==========================================
    // CAIXAS DE MARCAR
    // ==========================================
    function chips(nome, itens, marcados, rotuloDe) {
        if (!itens.length) return '<span class="help">Nada cadastrado ainda.</span>';
        const selecionados = new Set((marcados || []).map(Number));
        return `<div class="check-chips scroll">${itens.map(item => `
            <label class="check-chip">
                <input type="checkbox" name="${nome}" value="${item.id}" ${selecionados.has(item.id) ? 'checked' : ''}>
                ${window.escapeHTML(rotuloDe(item))}
            </label>`).join('')}</div>`;
    }

    function idsMarcados(nome) {
        return Array.from(document.querySelectorAll(`input[name="${nome}"]:checked`)).map(cb => Number(cb.value));
    }

    window.Vinculos = { equipamentos, equipe, opcoesDeEquipamento, opcoesDePessoa, chips, idsMarcados };
})();
