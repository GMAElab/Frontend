// ==========================================
// 1. CONSTRUÇÃO DA TELA DE POPs
// ==========================================
document.addEventListener('viewChanged', (e) => {
    if (e.detail.view === 'pops' || e.detail.view === 'pop') {
        console.log("--> Montando tela de POPs dinamicamente...");
        const container = document.getElementById('dynamic-content');

        if (!document.getElementById('popsTableBody')) {
            container.innerHTML = `
                <div class="admin-container fade-in">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
                        <div>
                            <h2 style="margin-bottom: 5px;">📄 Procedimentos Operacionais Padrão (POPs)</h2>
                            <p class="text-muted">POPs feitos para os equipamentos do laboratório.</p>
                        </div>
                        <button class="btn btn-primary" onclick="window.openPopModal()" style="font-weight: bold; padding: 10px 20px; border: none; color: #fff; cursor: pointer; border-radius: 6px;">+ Criar Novo POP</button>
                    </div>
                    
                    <div class="card-responsivo" style="overflow-x: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                        <table style="width:100%; text-align:left; border-collapse: collapse;">
                            <thead>
                                <tr style="border-bottom: 2px solid #eee;">
                                    <th style="padding: 12px 10px;">Código</th>
                                    <th style="padding: 12px 10px;">Título / Equipamento</th>
                                    <th style="padding: 12px 10px;">Status</th>
                                    <th style="padding: 12px 10px;">Data de Emissão</th>
                                    <th style="padding: 12px 10px;">Ação</th>
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
// 2. Modal pra criar POP
// ==========================================
window.openPopModal = function() {
    const modalAntigo = document.getElementById('popModal');
    if (modalAntigo) modalAntigo.remove();
    
    const user = JSON.parse(localStorage.getItem('user_data') || '{}');
    const dataHoje = new Date().toLocaleDateString('pt-BR');

    const modalHTML = `
    <div id="popModal" class="modal-overlay" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 999999; justify-content: center; align-items: center;">
        <div class="modal-content" style="max-width: 850px; width: 95%; background: white; padding: 25px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.6); max-height: 90vh; overflow-y: auto;">
            
            <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 15px;">
                <h2 style="margin: 0; color: #333;">📄 Novo Procedimento Operacional Padrão (POP)</h2>
                <button type="button" onclick="document.getElementById('popModal').remove()" style="background:none; border:none; font-size:30px; cursor:pointer; color:#999;">&times;</button>
            </div>
            
            <form id="popForm" onsubmit="window.handleSavePop(event)">
                <div class="grid-fluida" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                    <div><label style="font-weight:bold; font-size:14px;">Código do Documento *</label><input type="text" id="pop-codigo" class="form-control" placeholder="Ex: POP-001" required style="width:100%; padding:8px;"></div>
                    <div><label style="font-weight:bold; font-size:14px;">Título do Procedimento *</label><input type="text" id="pop-titulo" class="form-control" required style="width:100%; padding:8px;"></div>
                    <div><label style="font-weight:bold; font-size:14px;">Versão</label><input type="text" id="pop-versao" class="form-control" value="1.0" style="width:100%; padding:8px;"></div>
                    <div><label style="font-weight:bold; font-size:14px;">Data de Emissão</label><input type="text" id="pop-data" class="form-control" value="${dataHoje}" readonly style="width:100%; padding:8px; background:#f3f4f6;"></div>
                    <div style="grid-column: 1 / -1;"><label style="font-weight:bold; font-size:14px;">Responsável</label><input type="text" id="pop-responsavel" class="form-control" value="${user.nome || ''}" readonly style="width:100%; padding:8px; background:#f3f4f6;"></div>
                </div>

                <hr style="margin: 20px 0; border-color: #eee;">
                
                <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #007bff;">
                    <h4 style="margin: 0 0 10px 0; color: #004080; display:flex; align-items:center; gap:8px;">✨ IA: Preenchimento Automático</h4>
                    <label style="font-size:13px; color:#004080;">Faça upload do Manual do Equipamento (.pdf) para pré-preencher a estrutura do POP:</label>
                    <div style="display: flex; gap: 10px; margin-top: 10px; align-items: center;">
                        <input type="file" id="manual-ia" class="form-control" accept=".pdf" style="flex: 1; padding: 8px;">
                        <button type="button" id="btn-ia" onclick="gerarComIA()" class="btn btn-primary" style="background: #004080; border: none; font-weight: bold; padding: 8px 15px; cursor: pointer;">Extrair Dados</button>
                    </div>
                    <span id="ia-loading" style="display:none; color: #004080; font-size: 13px; margin-top: 10px; font-weight: bold;">⏳ Lendo manual e escrevendo documento...</span>
                </div>

                <div style="display: flex; flex-direction: column; gap: 15px;">
                    <div><label style="font-weight:bold;">1. Objetivo</label><textarea id="pop-obj" class="form-control" rows="2" style="width:100%; padding:8px;"></textarea></div>
                    <div><label style="font-weight:bold;">2. Aplicação e Escopo</label><textarea id="pop-escopo" class="form-control" rows="2" style="width:100%; padding:8px;"></textarea></div>
                    <div><label style="font-weight:bold;">3. Responsabilidades</label><textarea id="pop-resp-detalhe" class="form-control" rows="2" style="width:100%; padding:8px;"></textarea></div>
                    <div><label style="font-weight:bold;">4. Materiais e Equipamentos Necessários</label><textarea id="pop-materiais" class="form-control" rows="2" style="width:100%; padding:8px;"></textarea></div>
                    <div><label style="font-weight:bold;">5. Procedimento Operacional</label><textarea id="pop-procedimento" class="form-control" rows="5" style="width:100%; padding:8px;"></textarea></div>
                    <div><label style="font-weight:bold;">6. Controle de Qualidade</label><textarea id="pop-qualidade" class="form-control" rows="2" style="width:100%; padding:8px;"></textarea></div>
                    <div><label style="font-weight:bold;">7. Segurança e Riscos</label><textarea id="pop-seguranca" class="form-control" rows="2" style="width:100%; padding:8px;"></textarea></div>
                    <div><label style="font-weight:bold;">8. Manutenção e Calibração</label><textarea id="pop-manutencao" class="form-control" rows="2" style="width:100%; padding:8px;"></textarea></div>
                    <div><label style="font-weight:bold;">9. Referências</label><textarea id="pop-referencias" class="form-control" rows="2" style="width:100%; padding:8px;"></textarea></div>
                    
                    <div style="background: #F9FAFB; padding: 15px; border: 1px dashed #D1D5DB; border-radius: 8px;">
                        <label style="font-weight:bold;">10. Anexos (PDF, DOCX, XLSX, Imagens - Máx 3MB)</label>
                        <input type="file" id="pop-anexos-file" class="form-control" style="width:100%; padding:8px; margin-top:5px;" accept=".pdf, .doc, .docx, .xls, .xlsx, image/*">
                        <input type="hidden" id="pop-anexos-b64">
                        <input type="hidden" id="pop-anexos-meta">
                        <p id="anexo-status" style="font-size: 13px; color: #004080; font-weight:bold; margin-top: 5px; display: none;">✅ Arquivo anexado com sucesso!</p>
                    </div>
                </div>
                
                <div style="margin-top: 25px; display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('popModal').remove()" style="padding:10px 20px;">Cancelar</button>
                    <button type="submit" class="btn btn-primary" style="padding:10px 20px; background:#111; color:white; border:none; border-radius:5px; font-weight:bold;">💾 Salvar POP Oficial</button>
                </div>
            </form>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    setTimeout(() => {
        const fileInput = document.getElementById('pop-anexos-file');
        if (fileInput) {
            fileInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (!file) return;
                if (file.size > 3 * 1024 * 1024) {
                    window.UI.showToast("Arquivo muito grande! Máximo de 3MB.", "error");
                    this.value = ''; return;
                }
                const reader = new FileReader();
                reader.onload = function(event) {
                    document.getElementById('pop-anexos-b64').value = event.target.result;
                    document.getElementById('pop-anexos-meta').value = JSON.stringify({ name: file.name, type: file.type });
                    document.getElementById('anexo-status').style.display = 'block';
                };
                reader.readAsDataURL(file);
            });
        }
    }, 100);
};

// ==========================================
// 3. SALVAR POP
// ==========================================
window.handleSavePop = async function(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]');
    btn.innerText = "Salvando..."; btn.disabled = true;

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
        descricao: JSON.stringify(conteudoCompleto) 
    };

    try {
        const res = await window.api.fetchProtected('/pops', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(popData)
        });
        if (!res.ok) throw new Error("Erro ao salvar.");
        
        document.getElementById('popModal').remove();
        loadPopsTable();
        window.UI.showToast("Procedimento salvo com sucesso!", "success");
    } catch (err) {
        window.UI.showToast("Erro ao salvar POP.", "error");
        btn.innerText = "💾 Salvar POP Oficial"; btn.disabled = false;
    }
};

// ==========================================
// 4. TABELA DE EXIBIÇÃO
// ==========================================
async function loadPopsTable() {
    try {
        const response = await window.api.fetchProtected('/pops');
        if (!response.ok) throw new Error('Falha ao carregar');
        const pops = await response.json();
        window.popsDataList = pops; 
        
        const tbody = document.getElementById('popsTableBody');
        if (!tbody) return;
        if (pops.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Nenhum POP registrado.</td></tr>'; return;
        }

        let html = '';
        pops.forEach(pop => {
            const escCodigo = window.escapeHTML ? window.escapeHTML(pop.codigo) : pop.codigo.replace(/'/g, "&apos;");
            const escTitulo = window.escapeHTML ? window.escapeHTML(pop.titulo) : pop.titulo.replace(/'/g, "&apos;");
            let dataCriacao = "N/A";
            try { const d = JSON.parse(pop.descricao); if(d.data_emissao) dataCriacao = d.data_emissao; } catch(e) {}

            html += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px 10px;"><strong>${escCodigo}</strong></td>
                    <td style="padding: 12px 10px;">${escTitulo}</td>
                    <td style="padding: 12px 10px;"><span style="background: #e7f3ff; color: #004080; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight:bold;">ATIVO</span></td>
                    <td style="padding: 12px 10px;">${dataCriacao}</td>
                    <td style="padding: 12px 10px;">
                        <button onclick="viewPopDetails(this.getAttribute('data-id'))" data-id="${escCodigo}" class="btn btn-outline-primary btn-sm" style="padding: 5px 10px; cursor: pointer; border-color:#007bff; color:#000;">📄 Abrir Documento</button>
                    </td>
                </tr>`;
        });
        tbody.innerHTML = html;
    } catch (error) { window.UI.showToast("Erro ao carregar lista", "error"); }
}

// ==========================================
// 5. O MODELO OFICIAL DO GMAE (.DOCX) -> PDF
// ==========================================

function formatPopSection(title, content) {
    return `<div class="pop-sec" style="margin-bottom: 20px; page-break-inside: avoid;">
                <h4 style="margin: 0 0 8px 0; font-size: 13pt; font-weight: 700; color: #000;">${title}</h4>
                <p style="margin: 0; white-space: pre-wrap; text-align: justify; color: #111; font-size: 11pt;">${content || 'Não informado.'}</p>
            </div>`;
}

function renderPopDocxTemplate(pop, dados) {
    const renderField = (value) => value ? value : 'Não informado.';
    const version = dados.versao || '1.0';

    return `
        <div style="font-family: Arial, sans-serif; color: #000;">
            <div style="text-transform: uppercase; font-size: 12px; letter-spacing: 1.5px; color: #007bff; font-weight: 700; margin-bottom: 12px;">Procedimento Operacional Padrão</div>
            <h1 style="margin: 0 0 12px 0; font-size: 26px; color: #000; line-height: 1.1;">${renderField(pop.titulo)}</h1>

            <div style="border: 1px solid #000; padding: 18px; border-radius: 10px; margin-bottom: 24px; background: #fff;">
                <p style="margin: 0 0 8px 0; font-size: 11pt;"><strong>Título do Procedimento:</strong> ${renderField(pop.titulo)}</p>
                <p style="margin: 0 0 8px 0; font-size: 11pt;"><strong>Código do Documento:</strong> ${renderField(pop.codigo)}</p>
                <p style="margin: 0 0 8px 0; font-size: 11pt;"><strong>Versão:</strong> ${version}</p>
                <p style="margin: 0 0 8px 0; font-size: 11pt;"><strong>Data de Emissão:</strong> ${renderField(dados.data_emissao)}</p>
                <p style="margin: 0; font-size: 11pt;"><strong>Responsável:</strong> ${renderField(dados.responsavel)}</p>
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
            <div class="pop-sec" style="margin-bottom: 20px; page-break-inside: avoid;">
                <h4 style="margin: 0 0 8px 0; font-size: 13pt; font-weight: 700; color: #000;">10. Anexos</h4>
                <div style="padding: 14px 16px; border: 1px solid #000; border-radius: 8px; background: #f7f9ff; color: #111;">${renderField(dados.anexo_dados ? 'Arquivo anexado' : 'Não informado.')}</div>
            </div>
            <div class="pop-sec" style="margin-top: 20px; page-break-inside: avoid;">
                <h4 style="margin: 0 0 8px 0; font-size: 13pt; font-weight: 700; color: #000;">11. Histórico de Revisões</h4>
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 10pt; margin-top: 10px;">
                    <tr style="background: #e7f3ff;">
                        <th style="border: 1px solid #000; padding: 8px;">Data</th>
                        <th style="border: 1px solid #000; padding: 8px;">Versão</th>
                        <th style="border: 1px solid #000; padding: 8px;">Descrição das Alterações</th>
                        <th style="border: 1px solid #000; padding: 8px;">Responsável</th>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #000; padding: 8px;">${renderField(dados.data_emissao)}</td>
                        <td style="border: 1px solid #000; padding: 8px;">${version}</td>
                        <td style="border: 1px solid #000; padding: 8px;">Criação do documento oficial</td>
                        <td style="border: 1px solid #000; padding: 8px;">${renderField(dados.responsavel)}</td>
                    </tr>
                </table>
            </div>
        </div>
    `;
}

window.viewPopDetails = function(codigo) {
    const pop = window.popsDataList.find(p => p.codigo === codigo);
    if (!pop) return;

    let dados = {};
    try { dados = JSON.parse(pop.descricao); } catch(e) { dados = { objetivo: pop.descricao }; }

    let anexoHTML = `<p style="color:#000; font-style:italic;">Nenhum anexo disponível.</p>`;
    let fileData = dados.anexo_dados || dados.anexos;
    
    if (fileData && fileData.startsWith('data:')) {
        let isImage = fileData.includes('image/');
        let meta = { name: `Anexo_${pop.codigo}` };
        try { if (dados.anexo_meta) meta = JSON.parse(dados.anexo_meta); } catch(e) {}

        if (isImage) {
            anexoHTML = `<div style="text-align:center;"><img src="${fileData}" style="max-width: 100%; max-height: 400px; border: 1px solid #000; padding: 5px;" alt="Anexo do POP"></div>`;
        } else {
            anexoHTML = `<a href="${fileData}" download="${meta.name}" style="display:inline-block; padding:10px 20px; background:#fff; color:#000; text-decoration:none; border: 2px solid #000; border-radius:5px; font-weight:bold;">📎 Baixar Documento Anexo: ${meta.name}</a>`;
        }
    }

    const renderField = (value) => value ? value : 'Não informado.';
    const version = dados.versao || '1.0';

    const divDocumento = document.createElement('div');
    divDocumento.id = "pop-document-container";
    divDocumento.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:10000; display:flex; justify-content:center; overflow-y:auto; padding: 20px;";
    
    divDocumento.innerHTML = `
        <div style="background:#fff; width:min(1000px, 100%); max-width: 95vw; min-height:auto; padding: 24px; position:relative; color: #000; box-shadow: 0 0 40px rgba(0,0,0,0.35); border: 1px solid #000;">
            
            <div data-html2canvas-ignore="true" style="position: sticky; top: 0; background: #fff; padding: 15px; margin: -24px -24px 20px -24px; border-bottom: 2px solid #000; display: flex; flex-wrap: wrap; gap: 10px; justify-content: space-between; align-items: center; z-index: 10;">
                <button onclick="document.getElementById('pop-document-container').remove()" class="btn" style="padding: 8px 15px; cursor: pointer; background:#fff; color:#000; border:1px solid #000; border-radius:4px;">⬅ Fechar Visualização</button>
                <div style="display:flex; gap: 10px; flex-wrap: wrap;">
                    <button onclick="downloadPopDocx('${pop.codigo}')" class="btn" style="padding: 8px 15px; background:#111; color:white; border:none; font-weight:bold; cursor:pointer; border-radius:4px;">📄 BAIXAR DOCX OFICIAL</button>
                    <button onclick="gerarPDF('${pop.codigo}')" class="btn" style="padding: 8px 15px; background:#007bff; color:white; border:none; font-weight:bold; cursor:pointer; border-radius:4px; box-shadow: 0 2px 4px rgba(0,123,255,0.3);">🖨️ EXPORTAR PDF OFICIAL (em desenvolvimento)</button>
                </div>
            </div>

            <div id="conteudo-para-pdf" style="padding: 5mm; font-size: 11pt; line-height: 1.5; color: #000;">
                ${renderPopDocxTemplate(pop, dados)}
            </div>
        </div>
    `;
    document.body.appendChild(divDocumento);
};

window.downloadPopDocx = async function(codigo) {
    try {
        const response = await window.api.fetchProtected(`/pops/${codigo}/export-docx`, {
            method: 'GET',
            headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
        });

        if (!response.ok) {
            throw new Error('Falha ao gerar o DOCX oficial do POP.');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `POP_${codigo}.docx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        window.UI.showToast('Download do DOCX oficial iniciado.', 'success');
    } catch (err) {
        window.UI.showToast(err.message || 'Erro ao baixar o DOCX.', 'error');
    }
};

window.gerarPDF = function(codigo) {
    const elemento = document.getElementById('conteudo-para-pdf');
    const opcoes = {
        margin:       10, 
        filename:     `POP_${codigo}_GMAE.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true }, 
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opcoes).from(elemento).save();
    window.UI.showToast("Iniciando download do PDF Oficial...", "success");
};

// ==========================================
// 6. MOTOR IA 
// ==========================================
window.gerarComIA = async function() {
    const fileInput = document.getElementById('manual-ia');
    const btn = document.getElementById('btn-ia');
    const aviso = document.getElementById('ia-loading');
    const token = localStorage.getItem('jwt_token');

    if (!token) { window.UI.showToast("Sessão inválida. Faça Login novamente.", "error"); return; }
    if (!fileInput || !fileInput.files[0]) { window.UI.showToast("Anexe o PDF do manual primeiro.", "error"); return; }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append("file", file);

    if (btn) { btn.disabled = true; btn.innerText = "⏳ Lendo..."; }
    if (aviso) aviso.style.display = "block";

    try {
        const res = await fetch('https://api-ic.onrender.com/ai/gerar-pop', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token.replace(/"/g, '')}` },
            body: formData
        });

        if (!res.ok) throw new Error("O Servidor recusou a análise do PDF.");
        const dados = await res.json();
        
        console.log("-> Dados brutos da IA:", dados);

        const injetar = (idHTML, chave1, chave2) => {
            const el = document.getElementById(idHTML);
            const valor = dados[chave1] || dados[chave2] || dados[chave1.toLowerCase()] || dados[chave1.toUpperCase()];
            if (el && valor && valor !== "...") el.value = valor;
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

        window.UI.showToast("✨ Preenchimento Automático Concluído!", "success");

    } catch (err) {
        window.UI.showToast(err.message, "error");
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = "Extrair Dados"; }
        if (aviso) aviso.style.display = "none";
    }
};