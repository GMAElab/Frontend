// ==========================================
// 1. CONSTRUÇÃO DA TELA DE POPs
// ==========================================
// Importar POP de .docx é só para admin/técnico/coordenador — espelha
// IMPORTADORES em routers/pops.py, que é quem de fato barra o acesso.
function podeImportarPop(user) {
    return ['admin', 'tecnico', 'coordenador'].includes(user.role);
}

document.addEventListener('viewChanged', (e) => {
    if (e.detail.view === 'pops' || e.detail.view === 'pop') {
        const container = document.getElementById('dynamic-content');
        const user = JSON.parse(localStorage.getItem('user_data') || '{}');

        if (!document.getElementById('popsTableBody')) {
            container.innerHTML = `
                <header class="page-head fade-in">
                    <div>
                        <p class="eyebrow">laboratório</p>
                        <h1>Procedimentos operacionais padrão</h1>
                        <p class="lede">Os POPs vigentes do laboratório, prontos para consulta e exportação em .docx.</p>
                    </div>
                    <div class="page-actions">
                        ${podeImportarPop(user) ? `
                        <button class="btn btn-secondary" id="btn-importar-pop" onclick="document.getElementById('pop-import-file').click()">Importar .docx</button>
                        <input type="file" id="pop-import-file" class="hidden" accept=".docx" onchange="window.importarPopDocx(this)">` : ''}
                        <button class="btn btn-primary" onclick="window.openPopModal()">Novo POP</button>
                    </div>
                </header>

                <div class="table-container fade-in">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Título</th>
                                <th>Status</th>
                                <th>Emissão</th>
                                <th class="end">Ações</th>
                            </tr>
                        </thead>
                        <tbody id="popsTableBody">
                            <tr><td colspan="5">${window.UI.loading()}</td></tr>
                        </tbody>
                    </table>
                </div>
            `;
        }
                if (typeof loadPopsTable === 'function') loadPopsTable();
    }
});

// ==========================================
// 2. CRIAR E EDITAR POP
// ==========================================
// `importado` é a resposta de POST /pops/importar-docx: abre o formulário de
// um POP novo já preenchido com o que foi lido do .docx, para revisão.
window.openPopModal = function(codigoEdicao = null, importado = null) {
    const modalAntigo = document.getElementById('popModal');
    if (modalAntigo) modalAntigo.remove();

    window.currentEditPopCode = codigoEdicao;

    const user = JSON.parse(localStorage.getItem('user_data') || '{}');
    const dataHoje = new Date().toLocaleDateString('pt-BR');

    let popEdit = null;
    let dadosEdit = {};

    if (codigoEdicao) {
        popEdit = window.popsDataList.find(p => p.codigo === codigoEdicao);
        if (popEdit) {
            try {
                dadosEdit = JSON.parse(popEdit.descricao);
            } catch(e) {
                dadosEdit = { objetivo: popEdit.descricao };
            }
        }
    }

    if (importado) dadosEdit = importado.dados || {};
    const base = popEdit || importado || {};

    const tituloModal = popEdit ? `Editar ${window.escapeHTML(popEdit.codigo)}` : (importado ? 'Importar POP' : 'Novo POP');
    const textoBotaoSalvar = popEdit ? 'Salvar alterações' : 'Salvar POP';

    // Data e responsável são travados num POP criado aqui (hoje / quem está
    // logado), mas num POP importado valem os do documento original.
    const travaOrigem = importado ? '' : 'readonly';
    const avisoImportacao = importado ? `
                <div class="note warn">
                    <strong>Lido de ${window.escapeHTML(importado.arquivo || 'arquivo .docx')}.</strong>
                    Confira cada seção antes de salvar — nada foi gravado ainda.
                    ${(importado.avisos || []).map(a => `<br>• ${window.escapeHTML(a)}`).join('')}
                </div>` : '';

    const secoes = [
        ['pop-obj', 'Objetivo', 'objetivo', 2],
        ['pop-escopo', 'Aplicação e escopo', 'escopo', 2],
        ['pop-resp-detalhe', 'Responsabilidades', 'responsabilidades', 2],
        ['pop-materiais', 'Materiais e equipamentos necessários', 'materiais', 2],
        ['pop-procedimento', 'Procedimento operacional', 'procedimento', 6],
        ['pop-qualidade', 'Controle de qualidade', 'qualidade', 2],
        ['pop-seguranca', 'Segurança e riscos', 'seguranca', 2],
        ['pop-manutencao', 'Manutenção e calibração', 'manutencao', 2],
        ['pop-referencias', 'Referências', 'referencias', 2],
    ];

    const escapeQuote = (str) => str ? str.replace(/"/g, '&quot;') : '';

    const modalHTML = `
    <div id="popModal" class="modal-overlay is-open">
        <div class="modal-content modal-lg">
            <div class="modal-header">
                <div>
                    <p class="eyebrow">procedimento operacional padrão</p>
                    <h3>${tituloModal}</h3>
                </div>
                ${window.UI.closeButton("document.getElementById('popModal').remove()")}
            </div>

            <form id="popForm" onsubmit="window.handleSavePop(event)">
                ${avisoImportacao}
                <div class="field-grid">
                    <div class="input-group">
                        <label for="pop-codigo">Código do documento</label>
                        <input type="text" id="pop-codigo" class="mono" value="${escapeQuote(base.codigo || '')}" ${popEdit ? 'readonly' : ''} required>
                    </div>
                    <div class="input-group">
                        <label for="pop-titulo">Título</label>
                        <input type="text" id="pop-titulo" value="${escapeQuote(base.titulo || '')}" required>
                    </div>
                    <div class="input-group">
                        <label for="pop-versao">Versão</label>
                        <input type="text" id="pop-versao" class="mono" value="${escapeQuote(dadosEdit.versao || '1.0')}">
                    </div>
                    <div class="input-group">
                        <label for="pop-data">Data de emissão</label>
                        <input type="text" id="pop-data" class="mono" value="${escapeQuote(dadosEdit.data_emissao || dataHoje)}" ${travaOrigem}>
                    </div>
                    <div class="input-group span-2">
                        <label for="pop-responsavel">Responsável</label>
                        <input type="text" id="pop-responsavel" value="${escapeQuote(dadosEdit.responsavel || user.nome || '')}" ${travaOrigem}>
                    </div>
                </div>

                <div class="file-field">
                    <label for="manual-ia">Preencher a partir do manual do equipamento</label>
                    <div class="inline-form">
                        <input type="file" id="manual-ia" class="form-control" accept=".pdf">
                        <button type="button" id="btn-ia" onclick="gerarComIA()" class="btn btn-secondary">Extrair do PDF</button>
                    </div>
                    <span class="help">Opcional. O PDF é lido por IA e as seções abaixo são pré-preenchidas. Revise tudo antes de salvar.</span>
                    <span id="ia-loading" class="help hidden">Lendo o manual. Isso pode levar um minuto.</span>
                </div>

                ${secoes.map(([id, rotulo, chave, linhas], i) => `
                <div class="input-group">
                    <label for="${id}"><span class="mono text-faint">${i + 1}</span> ${rotulo}</label>
                    <textarea id="${id}" rows="${linhas}">${window.escapeHTML(dadosEdit[chave] || '')}</textarea>
                </div>`).join('')}

                <div class="file-field">
                    <label for="pop-imagem-visual">Imagem de referência (opcional)</label>
                    <input type="file" id="pop-imagem-visual" accept="image/png, image/jpeg, image/jpg" onchange="previewImagem(event, 'preview-pop', 'img-preview-pop')">
                    <span class="help">PNG ou JPG, até 10 MB.</span>
                    <div id="preview-pop" class="preview-single">
                        <img id="img-preview-pop" src="" alt="">
                        <button type="button" class="link-btn danger" onclick="removerImagem('pop-imagem-visual', 'preview-pop')">Remover imagem</button>
                    </div>
                </div>

                <div class="file-field">
                    <label for="pop-anexos-file"><span class="mono text-faint">10</span> Anexo</label>
                    <input type="file" id="pop-anexos-file" accept=".pdf, .doc, .docx, .xls, .xlsx, image/*">
                    <span class="help">PDF, DOCX, XLSX ou imagem, até 10 MB.</span>
                    <input type="hidden" id="pop-anexos-b64" value="${escapeQuote(dadosEdit.anexo_dados || '')}">
                    <input type="hidden" id="pop-anexos-meta" value="${escapeQuote(dadosEdit.anexo_meta || '')}">
                    <p id="anexo-status" class="help text-success${dadosEdit.anexo_dados ? '' : ' hidden'}">Há um arquivo anexado. Envie outro para substituir.</p>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('popModal').remove()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">${textoBotaoSalvar}</button>
                </div>
            </form>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    setTimeout(() => {
        const fileInput = document.getElementById('pop-anexos-file');
        if (fileInput) {
            fileInput.addEventListener('change', async function(e) {
                if (!e.target.files[0]) return;
                // JPG/PNG são comprimidos antes da checagem de tamanho, então
                // fotos grandes cabem no limite de 10MB do anexo
                const file = await window.comprimirImagem(e.target.files[0]);
                if (file.size > 10 * 1024 * 1024) {
                    window.UI.showToast("Arquivo muito grande! Máximo de 10MB.", "error");
                    this.value = ''; return;
                }

                const statusText = document.getElementById('anexo-status');
                statusText.className = 'help';
                statusText.innerText = 'Enviando arquivo...';

                const formData = new FormData();
                formData.append("file", file);

                try {
                    const res = await window.api.fetchProtected('/upload-anexo', {
                        method: 'POST',
                        body: formData
                    });

                    if (!res.ok) throw new Error("Erro ao fazer upload do anexo");

                    const data = await res.json();

                    document.getElementById('pop-anexos-b64').value = data.url_arquivo;
                    document.getElementById('pop-anexos-meta').value = JSON.stringify({ name: data.nome_original });

                    statusText.className = 'help text-success';
                    statusText.innerText = 'Arquivo anexado.';

                } catch (err) {
                    statusText.className = 'help text-danger';
                    statusText.innerText = 'O envio falhou. Tente novamente.';
                    window.UI.showToast("Falha ao anexar arquivo.", "error");
                }
            });
        }
    }, 100);
};

// ==========================================
// 2.1 IMPORTAR POP DE UM .DOCX
// ==========================================
window.importarPopDocx = async function(input) {
    const file = input.files[0];
    input.value = ''; // permite escolher o mesmo arquivo de novo
    if (!file) return;

    const btn = document.getElementById('btn-importar-pop');
    if (btn) { btn.disabled = true; btn.innerText = 'Lendo...'; }

    const formData = new FormData();
    formData.append("file", file);

    try {
        const res = await window.api.fetchProtected('/pops/importar-docx', {
            method: 'POST',
            body: formData
        });

        if (!res.ok) {
            const erro = await res.json().catch(() => ({}));
            throw new Error(erro.detail || "Não foi possível ler este .docx.");
        }

        const importado = await res.json();
        importado.arquivo = file.name;
        window.openPopModal(null, importado);
    } catch (err) {
        window.UI.showToast(err.message || "Erro ao importar o POP.", "error");
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = 'Importar .docx'; }
    }
};

// ==========================================
// 3. SALVAR / ATUALIZAR POP
// ==========================================
window.handleSavePop = async function(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]');
    const textoOriginal = btn.innerText;
    btn.innerText = "Salvando...";
    btn.disabled = true;

    try {
        let linkDaImagem = await window.fazerUploadImagem('pop-imagem-visual');
        const conteudoCompleto = {
            versao: document.getElementById('pop-versao').value,
            data_emissao: document.getElementById('pop-data').value,
            responsavel: document.getElementById('pop-responsavel').value,
            objetivo: document.getElementById('pop-obj').value,
            escopo: document.getElementById('pop-escopo').value,
            responsabilidades: document.getElementById('pop-resp-detalhe').value,
            materiais: document.getElementById('pop-materiais').value,
            procedimento: document.getElementById('pop-procedimento').value,
            qualidade: document.getElementById('pop-qualidade').value,
            seguranca: document.getElementById('pop-seguranca').value,
            manutencao: document.getElementById('pop-manutencao').value,
            referencias: document.getElementById('pop-referencias').value,
            anexo_dados: document.getElementById('pop-anexos-b64').value,
            anexo_meta: document.getElementById('pop-anexos-meta').value
        };

        const popData = {
            codigo: document.getElementById('pop-codigo').value,
            titulo: document.getElementById('pop-titulo').value,
            descricao: JSON.stringify(conteudoCompleto),
            imagem_url: linkDaImagem
        };

        let res;
        if (window.currentEditPopCode) {
            res = await window.api.fetchProtected(`/pops/${window.currentEditPopCode}/`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(popData)
            });
        } else {
            res = await window.api.fetchProtected('/pops/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(popData)
            });
        }

        if (!res.ok) throw new Error("Erro ao salvar no banco de dados.");

        document.getElementById('popModal').remove();
        loadPopsTable();
        window.UI.showToast(window.currentEditPopCode ? "POP atualizado com sucesso!" : "Procedimento salvo com sucesso!", "success");

    } catch (err) {
        window.UI.showToast(err.message || "Erro ao salvar POP.", "error");
    } finally {
        btn.innerText = textoOriginal;
        btn.disabled = false;
    }
};
// ==========================================
// 4. TABELA DE EXIBIÇÃO
// ==========================================
async function loadPopsTable() {
    try {
        const response = await window.api.fetchProtected('/pops/');
        if (!response.ok) throw new Error('Falha ao carregar');
        const pops = await response.json();
        window.popsDataList = pops;

        const tbody = document.getElementById('popsTableBody');
        if (!tbody) return;
        if (pops.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5">${window.UI.emptyState({ title: 'Nenhum POP registrado', description: 'Crie o primeiro Procedimento Operacional Padrão do laboratório.' })}</td></tr>`;
            return;
        }

        let html = '';
        pops.forEach(pop => {
            const escCodigo = window.escapeHTML ? window.escapeHTML(pop.codigo) : pop.codigo.replace(/'/g, "&apos;");
            const escTitulo = window.escapeHTML ? window.escapeHTML(pop.titulo) : pop.titulo.replace(/'/g, "&apos;");
            let dataCriacao = "—";
            try {
                const d = JSON.parse(pop.descricao);
                if(d.data_emissao) dataCriacao = d.data_emissao;
            } catch(e) {}

            html += `
                <tr>
                    <td class="code">${escCodigo}</td>
                    <td><strong>${escTitulo}</strong></td>
                    <td><span class="badge badge-success">ativo</span></td>
                    <td class="num">${window.escapeHTML(dataCriacao)}</td>
                    <td>
                        <div class="row-actions">
                            <button onclick="viewPopDetails(this.getAttribute('data-id'))" data-id="${escCodigo}" class="link-btn">Abrir</button>
                            <button onclick="window.openPopModal(this.getAttribute('data-id'))" data-id="${escCodigo}" class="link-btn muted">Editar</button>
                            <button onclick="window.removerPopOficial(this.getAttribute('data-id'))" data-id="${escCodigo}" class="link-btn danger">Excluir</button>
                        </div>
                    </td>
                </tr>`;

        });
        tbody.innerHTML = html;
    } catch (error) {
        window.UI.showToast("Erro ao carregar lista de procedimentos", "error");
        const tbody = document.getElementById('popsTableBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="5">${window.UI.errorState('Erro ao carregar lista de procedimentos.')}</td></tr>`;
    }
}

// ==========================================
// 5. VISUALIZAÇÃO E DOWNLOAD
// ==========================================
function formatPopSection(title, content) {
    return `<div class="pop-sec" style="margin-bottom: 15px; width: 100%; max-width: 100%;">
                <h4 style="margin: 0 0 5px 0; font-size: 12pt; font-weight: bold; color: #000;">${window.escapeHTML(title)}</h4>
                <div style="margin: 0; white-space: pre-wrap; word-wrap: break-word; text-align: justify; color: #000; font-size: 11pt;">${content ? window.escapeHTML(content) : 'Não informado.'}</div>
            </div>`;
}

function renderPopDocxTemplate(pop, dados) {
    const renderField = (value) => {
        if (!value) return 'Não informado.';
        if (value === '[object Object]') return 'Aviso: dados corrompidos. Edite o POP e passe a IA novamente.';

        let strValue = typeof value === 'object' ? JSON.stringify(value, null, 2).replace(/[\{\}\[\]"]/g, '') : String(value);
        return window.escapeHTML(strValue);
    };

    const version = dados.versao || '1.0';

    return `
        <div style="font-family: Arial, sans-serif; color: #000; width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden;">

            <h2 style="text-align: center; font-size: 16pt; margin-bottom: 20px; color: #000; font-weight: bold;">Prévia do Procedimento Operacional Padrão (POP)</h2>

            <div style="margin-bottom: 25px; line-height: 1.6; font-size: 11pt; word-wrap: break-word;">
                <strong>Título do Procedimento:</strong> ${renderField(pop.titulo)}<br>
                <strong>Código do Documento:</strong> ${renderField(pop.codigo)}<br>
                <strong>Versão:</strong> ${version}<br>
                <strong>Data de Emissão:</strong> ${renderField(dados.data_emissao)}<br>
                <strong>Responsável:</strong> ${renderField(dados.responsavel)}
            </div>

            ${formatPopSection('1. Objetivo', dados.objetivo)}
            ${formatPopSection('2. Aplicação e Escopo', dados.escopo)}
            ${formatPopSection('3. Responsabilidades', dados.responsabilidades)}
            ${formatPopSection('4. Materiais e Equipamentos Necessários', dados.materiais)}
            ${formatPopSection('5. Procedimento Operacional', dados.procedimento)}
            ${formatPopSection('6. Controle de Qualidade', dados.qualidade)}
            ${formatPopSection('7. Segurança e Riscos', dados.seguranca)}
            ${formatPopSection('8. Manutenção e Calibração', dados.manutencao)}
            ${formatPopSection('9. Referências', dados.referencias)}

            ${pop.imagem_url ? `
            <div class="pop-sec" style="margin-bottom: 15px; width: 100%; max-width: 100%;">
                <h4 style="margin: 0 0 5px 0; font-size: 12pt; font-weight: bold; color: #000;">Imagens</h4>
                <div style="margin: 0; text-align: center;">
                    <img src="${window.escapeHTML(pop.imagem_url)}" style="max-width: 400px; border: 1px solid #000;" />
                </div>
            </div>` : ''}

            <div class="pop-sec" style="margin-bottom: 15px; width: 100%; max-width: 100%;">
                <h4 style="margin: 0 0 5px 0; font-size: 12pt; font-weight: bold; color: #000;">10. Anexos</h4>
                <div style="margin: 0; font-size: 11pt; color: #000;">
                    ${dados.anexo_dados
                        ? `<a href="${dados.anexo_dados.startsWith('http') ? dados.anexo_dados : window.API_URL + dados.anexo_dados}" target="_blank" style="display: inline-block; padding: 8px 15px; background: #333; color: white; text-decoration: none; border-radius: 4px; font-weight: bold; font-family: Arial;">Baixar Anexo Oficial</a>`
                        : 'Não informado.'}
                </div>
            </div>

            <div class="pop-sec" style="margin-top: 25px; width: 100%; max-width: 100%; overflow-x: auto;">
                <h4 style="margin: 0 0 10px 0; font-size: 12pt; font-weight: bold; color: #000;">11. Histórico de Revisões</h4>
                <table style="width: 100%; border-collapse: collapse; font-size: 11pt; border: 1px solid #000; text-align: left;">
                    <thead>
                        <tr style="background: #f9f9f9;">
                            <th style="border: 1px solid #000; padding: 8px;">Data</th>
                            <th style="border: 1px solid #000; padding: 8px;">Versão</th>
                            <th style="border: 1px solid #000; padding: 8px;">Descrição das Atividades</th>
                            <th style="border: 1px solid #000; padding: 8px;">Responsável</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="border: 1px solid #000; padding: 8px;">${renderField(dados.data_emissao)}</td>
                            <td style="border: 1px solid #000; padding: 8px;">${version}</td>
                            <td style="border: 1px solid #000; padding: 8px;">Criação do documento oficial</td>
                            <td style="border: 1px solid #000; padding: 8px;">${renderField(dados.responsavel)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>`;
}

window.viewPopDetails = function(codigo) {
    const pop = window.popsDataList.find(p => p.codigo === codigo);
    if (!pop) return;

    let dados = {};
    try { dados = JSON.parse(pop.descricao); } catch(e) { dados = { objetivo: pop.descricao }; }

    const divDocumento = document.createElement('div');
    divDocumento.id = "pop-document-container";

    divDocumento.className = 'doc-viewer';

    divDocumento.innerHTML = `
        <div class="doc-toolbar" data-html2canvas-ignore="true">
            <button onclick="document.getElementById('pop-document-container').remove()" class="link-btn">${window.Icon('arrow-left', { size: 14 })} Voltar</button>
            <button onclick="downloadPopDocx(this.getAttribute('data-id'), this)" data-id="${window.escapeHTML(pop.codigo)}" class="btn btn-secondary btn-sm">Baixar .docx</button>
        </div>
        <div class="doc-page">
            <div id="conteudo-para-pdf">
                ${renderPopDocxTemplate(pop, dados)}
            </div>
        </div>`;
    document.body.appendChild(divDocumento);
};

window.downloadPopDocx = async function(codigo, btn) {
    const textoOriginal = btn ? btn.innerText : null;
    if (btn) { btn.disabled = true; btn.innerText = 'Gerando...'; }

    try {
        const res = await window.api.fetchProtected(`/pops/${encodeURIComponent(codigo)}/export-docx`);
        if (!res.ok) throw new Error('Erro ao gerar o documento .docx.');

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `POP_${codigo}.docx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch (err) {
        window.UI.showToast(err.message || 'Erro ao baixar o POP.', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = textoOriginal; }
    }
};

// ==========================================
// 6. INTEGRAÇÃO COM IA
// ==========================================
window.gerarComIA = async function() {
    const fileInput = document.getElementById('manual-ia');
    const btn = document.getElementById('btn-ia');
    const aviso = document.getElementById('ia-loading');

    if (!fileInput || !fileInput.files[0]) { window.UI.showToast("Selecione o PDF do manual.", "error"); return; }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append("file", file);

    if (btn) { btn.disabled = true; btn.innerText = "Analisando..."; }
    if (aviso) aviso.classList.remove('hidden');

    try {
        const res = await window.api.fetchProtected('/pops/ai/gerar-pop/', {
            method: 'POST',
            body: formData
        });

        if (!res.ok) throw new Error("A IA não conseguiu ler este PDF.");
        const dados = await res.json();

        const injetar = (idHTML, chave1, chave2) => {
            const el = document.getElementById(idHTML);
            let valor = dados[chave1] || dados[chave2] || dados[chave1.toLowerCase()] || dados[chave1.toUpperCase()];

            if (el && valor && valor !== "...") {
                if (typeof valor === 'object') {
                    el.value = JSON.stringify(valor, null, 2);
                } else {
                    el.value = valor;
                }
            }
        };

        injetar('pop-obj', 'objetivo', 'Objetivo');
        injetar('pop-escopo', 'escopo', 'Escopo');
        injetar('pop-resp-detalhe', 'responsabilidades', 'Responsabilidades');
        injetar('pop-materiais', 'materiais', 'Materiais');
        injetar('pop-procedimento', 'procedimento', 'Procedimento');
        injetar('pop-qualidade', 'qualidade', 'Qualidade');
        injetar('pop-seguranca', 'seguranca', 'Segurança');
        injetar('pop-manutencao', 'manutencao', 'Manutencao');
        injetar('pop-referencias', 'referencias', 'Referências');

        window.UI.showToast("Seções preenchidas a partir do manual. Revise antes de salvar.", "success");

    } catch (err) {
        window.UI.showToast(err.message, "error");
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = "Extrair do PDF"; }
        if (aviso) aviso.classList.add('hidden');
    }
};

window.removerPopOficial = async function(codigo) {
    const ok = await window.UI.confirm(
        `Você está prestes a excluir permanentemente o POP ${codigo}. Essa ação não pode ser desfeita.`,
        { title: 'Excluir POP?', danger: true }
    );
    if (!ok) return;

    try {
        const res = await window.api.fetchProtected(`/pops/admin/${codigo}/`, {
            method: 'DELETE'
        });

        if (!res.ok) {
            const erro = await res.json();
            throw new Error(erro.detail || "Erro ao excluir.");
        }

        window.UI.showToast("POP removido com sucesso!", "success");
        loadPopsTable();
    } catch (err) {
        window.UI.showToast(err.message, "error");
    }
};