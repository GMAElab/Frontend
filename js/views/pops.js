// ==========================================
// 1. CONSTRUÇÃO DA TELA DE POPs
// ==========================================
document.addEventListener('viewChanged', (e) => {
    if (e.detail.view === 'pops' || e.detail.view === 'pop') {
        const container = document.getElementById('dynamic-content');

        if (!document.getElementById('popsTableBody')) {
            container.innerHTML = `
                <div class="admin-container fade-in">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
                        <div>
                            <h2 style="margin-bottom: 5px; display: flex; align-items: center; gap: 10px;">${window.Icon('file-text', { size: 22 })} Procedimentos Operacionais Padrão (POPs)</h2>
                            <p class="text-muted">Gestão completa de POPs do laboratório.</p>
                        </div>
                        <button class="btn btn-primary" onclick="window.openPopModal()">+ Criar Novo POP</button>
                    </div>

                    <div class="card-responsivo" style="overflow-x: auto; background: var(--bg-surface); padding: 20px; border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
                        <table style="width:100%; text-align:left; border-collapse: collapse;">
                            <thead>
                                <tr style="border-bottom: 2px solid var(--border-color);">
                                    <th style="padding: 12px 10px;">Código</th>
                                    <th style="padding: 12px 10px;">Título do Procedimento</th>
                                    <th style="padding: 12px 10px;">Status</th>
                                    <th style="padding: 12px 10px;">Data de Emissão</th>
                                    <th style="padding: 12px 10px;">Ações</th>
                                </tr>
                            </thead>
                            <tbody id="popsTableBody">
                                <tr><td colspan="5" style="text-align:center; padding: 20px;"><span class="spinner"></span> Carregando documentos...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
        if (typeof loadPopsTable === 'function') loadPopsTable();
    }
});

// ==========================================
// 2. CRIAR E EDITAR POP
// ==========================================
window.openPopModal = function(codigoEdicao = null) {
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

    const tituloModal = popEdit ? `${window.Icon('edit-2', { size: 18 })} Editar Procedimento: ${popEdit.codigo}` : `${window.Icon('file-text', { size: 18 })} Novo Procedimento Operacional Padrão (POP)`;
    const textoBotaoSalvar = popEdit ? `Salvar Alterações` : `Salvar POP Oficial`;

    const escapeQuote = (str) => str ? str.replace(/"/g, '&quot;') : '';

    const modalHTML = `
    <div id="popModal" class="modal-overlay" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 999999; justify-content: center; align-items: center;">
        <div class="modal-content" style="max-width: 850px; width: 95%; padding: 25px; border-radius: 4px; border-top: 3px solid var(--primary); max-height: 90vh; overflow-y: auto;">

            <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 15px;">
                <h2 style="margin: 0; font-size: 19px; display: flex; align-items: center; gap: 10px;">${tituloModal}</h2>
                <button type="button" onclick="document.getElementById('popModal').remove()" style="background:none; border:none; font-size:28px; cursor:pointer; color:var(--text-faint); line-height:1;">&times;</button>
            </div>
            
            <form id="popForm" onsubmit="window.handleSavePop(event)">
                <div class="grid-fluida" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                    <div><label style="font-weight:600; font-size:14px;">Código do Documento *</label><input type="text" id="pop-codigo" value="${escapeQuote(popEdit ? popEdit.codigo : '')}" ${popEdit ? 'readonly class="form-control" style="width:100%; background:var(--bg-subtle);"' : 'class="form-control" style="width:100%;"'} required></div>
                    <div><label style="font-weight:600; font-size:14px;">Título do Procedimento *</label><input type="text" id="pop-titulo" value="${escapeQuote(popEdit ? popEdit.titulo : '')}" class="form-control" required style="width:100%;"></div>
                    <div><label style="font-weight:600; font-size:14px;">Versão</label><input type="text" id="pop-versao" class="form-control" value="${escapeQuote(dadosEdit.versao || '1.0')}" style="width:100%;"></div>
                    <div><label style="font-weight:600; font-size:14px;">Data de Emissão</label><input type="text" id="pop-data" class="form-control" value="${escapeQuote(dadosEdit.data_emissao || dataHoje)}" readonly style="width:100%; background:var(--bg-subtle);"></div>
                    <div style="grid-column: 1 / -1;"><label style="font-weight:600; font-size:14px;">Responsável</label><input type="text" id="pop-responsavel" class="form-control" value="${escapeQuote(dadosEdit.responsavel || user.nome || '')}" readonly style="width:100%; background:var(--bg-subtle);"></div>
                </div>

                <hr style="margin: 20px 0; border-color: var(--border-color);">

                <div style="background: var(--primary-light); padding: 15px; border-radius: var(--radius-md); margin-bottom: 20px; border: 1px solid var(--border-color); border-left: 3px solid var(--primary);">
                    <h4 style="margin: 0 0 10px 0; color: var(--primary-active); display:flex; align-items:center; gap:8px; font-size: 15px;">${window.Icon('sparkles', { size: 16 })} IA: Preenchimento Automático</h4>
                    <label style="font-size:13px; color:var(--text-muted);">Faça upload do Manual do Equipamento (.pdf) para pré-preencher a estrutura do POP:</label>
                    <div style="display: flex; gap: 10px; margin-top: 10px; align-items: center;">
                        <input type="file" id="manual-ia" class="form-control" accept=".pdf" style="flex: 1;">
                        <button type="button" id="btn-ia" onclick="gerarComIA()" class="btn btn-primary">Extrair Dados</button>
                    </div>
                    <span id="ia-loading" style="display:none; color: var(--primary-active); font-size: 13px; margin-top: 10px; font-weight: 600;">Lendo manual e reescrevendo documento...</span>
                </div>

                <div style="display: flex; flex-direction: column; gap: 15px;">
                    <div><label style="font-weight:bold;">1. Objetivo</label><textarea id="pop-obj" class="form-control" rows="2" style="width:100%; padding:8px;">${window.escapeHTML(dadosEdit.objetivo || '')}</textarea></div>
                    <div><label style="font-weight:bold;">2. Aplicação e Escopo</label><textarea id="pop-escopo" class="form-control" rows="2" style="width:100%; padding:8px;">${window.escapeHTML(dadosEdit.escopo || '')}</textarea></div>
                    <div><label style="font-weight:bold;">3. Responsabilidades</label><textarea id="pop-resp-detalhe" class="form-control" rows="2" style="width:100%; padding:8px;">${window.escapeHTML(dadosEdit.responsabilidades || '')}</textarea></div>
                    <div><label style="font-weight:bold;">4. Materiais e Equipamentos Necessários</label><textarea id="pop-materiais" class="form-control" rows="2" style="width:100%; padding:8px;">${window.escapeHTML(dadosEdit.materiais || '')}</textarea></div>
                    <div><label style="font-weight:bold;">5. Procedimento Operacional</label><textarea id="pop-procedimento" class="form-control" rows="5" style="width:100%; padding:8px;">${window.escapeHTML(dadosEdit.procedimento || '')}</textarea></div>
                    <div><label style="font-weight:bold;">6. Controle de Qualidade</label><textarea id="pop-qualidade" class="form-control" rows="2" style="width:100%; padding:8px;">${window.escapeHTML(dadosEdit.qualidade || '')}</textarea></div>
                    <div><label style="font-weight:bold;">7. Segurança e Riscos</label><textarea id="pop-seguranca" class="form-control" rows="2" style="width:100%; padding:8px;">${window.escapeHTML(dadosEdit.seguranca || '')}</textarea></div>
                    <div><label style="font-weight:bold;">8. Manutenção e Calibração</label><textarea id="pop-manutencao" class="form-control" rows="2" style="width:100%; padding:8px;">${window.escapeHTML(dadosEdit.manutencao || '')}</textarea></div>
                    <div><label style="font-weight:bold;">9. Referências</label><textarea id="pop-referencias" class="form-control" rows="2" style="width:100%; padding:8px;">${window.escapeHTML(dadosEdit.referencias || '')}</textarea></div>
                    <div style="background: var(--bg-subtle); padding: 15px; border: 1px dashed var(--border-strong); border-radius: var(--radius-md); margin-bottom: 15px;">
                        <label style="font-weight:600;">Evidência Visual (Imagem até 10MB - Opcional)</label>
                        <input type="file" id="pop-imagem-visual" class="form-control" style="width:100%; margin-top:5px;" accept="image/png, image/jpeg, image/jpg" onchange="previewImagem(event, 'preview-pop', 'img-preview-pop')">
                        <div id="preview-pop" style="display: none; margin-top: 10px; text-align: center;">
                            <img id="img-preview-pop" src="" style="max-width: 100%; max-height: 200px; border-radius: var(--radius-sm);" />
                            <p style="margin: 8px 0 0 0; font-size: 13px; color: var(--danger); cursor: pointer; font-weight: 600;" onclick="removerImagem('pop-imagem-visual', 'preview-pop')">Remover Imagem</p>
                        </div>
                    </div>
                    <div style="background: var(--bg-subtle); padding: 15px; border: 1px dashed var(--border-strong); border-radius: var(--radius-md);">
                        <label style="font-weight:600;">10. Anexos (PDF, DOCX, XLSX -Máx 10MB)</label>
                        <input type="file" id="pop-anexos-file" class="form-control" style="width:100%; margin-top:5px;" accept=".pdf, .doc, .docx, .xls, .xlsx, image/*">
                        <input type="hidden" id="pop-anexos-b64" value="${escapeQuote(dadosEdit.anexo_dados || '')}">
                        <input type="hidden" id="pop-anexos-meta" value="${escapeQuote(dadosEdit.anexo_meta || '')}">
                        <p id="anexo-status" style="font-size: 13px; color: var(--success); font-weight:600; margin-top: 5px; display: ${dadosEdit.anexo_dados ? 'block' : 'none'};">Arquivo em anexo mantido.</p>
                    </div>
                </div>

                <div style="margin-top: 25px; display: flex; gap: 10px; justify-content: flex-end;">
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
                const file = e.target.files[0];
                if (!file) return;
                if (file.size > 10 * 1024 * 1024) {
                    window.UI.showToast("Arquivo muito grande! Máximo de 10MB.", "error");
                    this.value = ''; return;
                }
                
                const statusText = document.getElementById('anexo-status');
                statusText.style.display = 'block';
                statusText.innerText = 'Fazendo upload para o servidor...';
                statusText.style.color = 'var(--warning)';

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
        
                    statusText.innerText = 'Arquivo salvo no servidor com sucesso!';
                    statusText.style.color = 'var(--success)';

                } catch (err) {
                    statusText.innerText = 'Falha no upload. Tente novamente.';
                    statusText.style.color = 'var(--danger)';
                    window.UI.showToast("Falha ao anexar arquivo.", "error");
                }
            });
        }
    }, 100);
};

// ==========================================
// 3. SALVAR / ATUALIZAR POP
// ==========================================
window.handleSavePop = async function(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]');
    const textoOriginal = btn.innerText;
    btn.innerText = "Salvando (Aguarde)..."; 
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
            let dataCriacao = "N/A";
            try { 
                const d = JSON.parse(pop.descricao); 
                if(d.data_emissao) dataCriacao = d.data_emissao; 
            } catch(e) {}

            html += `
                <tr style="border-bottom: 1px solid var(--border-light);">
                    <td style="padding: 12px 10px;"><strong>${escCodigo}</strong></td>
                    <td style="padding: 12px 10px;">${escTitulo}</td>
                    <td style="padding: 12px 10px;"><span class="badge badge-success">ATIVO</span></td>
                    <td style="padding: 12px 10px;">${dataCriacao}</td>
                    <td style="padding: 12px 10px; display:flex; gap: 6px; flex-wrap:wrap;">
                        <button onclick="viewPopDetails(this.getAttribute('data-id'))" data-id="${escCodigo}" class="btn btn-outline-primary btn-sm">${window.Icon('file-text', { size: 14 })} Abrir</button>
                        <button onclick="window.openPopModal(this.getAttribute('data-id'))" data-id="${escCodigo}" class="btn btn-secondary btn-sm">${window.Icon('edit-2', { size: 14 })} Editar</button>
                        <button onclick="window.removerPopOficial('${pop.codigo}')" class="btn btn-danger btn-sm">${window.Icon('trash-2', { size: 14 })} Excluir</button>
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

    divDocumento.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(27,24,21,0.85); z-index:10000; overflow-y:auto; padding: 40px 20px; box-sizing: border-box; display: block;";

    divDocumento.innerHTML = `
        <div style="background:#fff; width: 100%; max-width: 850px; margin: 0 auto; padding: 40px; position:relative; color: #000; box-shadow: var(--shadow-floating); box-sizing: border-box; min-height: 100%;">

            <div data-html2canvas-ignore="true" style="margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; display: flex; flex-wrap: wrap; gap: 10px; justify-content: space-between; align-items: center;">

                <button onclick="document.getElementById('pop-document-container').remove()" class="btn btn-secondary">${window.Icon('chevron-left', { size: 16 })} Voltar</button>

                <div style="display:flex; gap: 10px; flex-wrap: wrap;">
                    <button onclick="downloadPopDocx('${pop.codigo}', this)" class="btn btn-primary">${window.Icon('download', { size: 16 })} Baixar .DOCX</button>
                </div>
            </div>

            <div id="conteudo-para-pdf" style="width: 100%; max-width: 100%; box-sizing: border-box;">
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
    if (aviso) aviso.style.display = "block";

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

        window.UI.showToast("Análise feita com sucesso!", "success");

    } catch (err) {
        window.UI.showToast(err.message, "error");
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = "Extrair Dados"; }
        if (aviso) aviso.style.display = "none";
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