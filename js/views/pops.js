// ==========================================
// 1. CONSTRUTOR DE TELA (O GATILHO)
// ==========================================
document.addEventListener('viewChanged', (e) => {
    if (e.detail.view === 'pops' || e.detail.view === 'pop') {
        console.log("--> Montando tela de POPs dinamicamente...");
        
        const container = document.getElementById('dynamic-content');
        
        // Desenha a interface (Tabela + Botão) magicamente se ela não existir
        if (!document.getElementById('popsTableBody')) {
            container.innerHTML = `
                <div class="admin-container fade-in">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
                        <div>
                            <h2 style="margin-bottom: 5px;">📄 Procedimentos (POPs)</h2>
                            <p class="text-muted">Base de conhecimento, calibração e padrões do laboratório.</p>
                        </div>
                        <button class="btn btn-primary" onclick="window.openPopModal()" style="font-weight: bold; padding: 10px 20px; background: #059669; border: none; color: white; cursor: pointer; border-radius: 6px;">+ Criar Novo POP</button>
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
        
        // Agora que a tabela existe, manda buscar os dados!
        if (typeof loadPopsTable === 'function') loadPopsTable();
    }
});

// ==========================================
// 2. ABERTURA E GERAÇÃO DINÂMICA DO FORMULÁRIO
// ==========================================
window.openPopModal = function() {
    const modal = document.getElementById('popModal');
    if (!modal) return window.UI.showToast("Modal popModal não encontrado no HTML.", "error");
    
    modal.style.setProperty('display', 'flex', 'important');
    
    const user = JSON.parse(localStorage.getItem('user_data') || '{}');
    const dataHoje = new Date().toLocaleDateString('pt-BR');

    // Injeta o formulário do Word completo
    const formContainer = document.getElementById('popForm');
    if (formContainer) {
        formContainer.innerHTML = `
            <div class="grid-fluida" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div>
                    <label style="font-weight:bold; font-size:14px;">Código do Documento *</label>
                    <input type="text" id="pop-codigo" class="form-control" placeholder="Ex: POP-001" required style="width:100%; padding:8px;">
                </div>
                <div>
                    <label style="font-weight:bold; font-size:14px;">Título do Procedimento *</label>
                    <input type="text" id="pop-titulo" class="form-control" required style="width:100%; padding:8px;">
                </div>
                <div>
                    <label style="font-weight:bold; font-size:14px;">Versão</label>
                    <input type="text" id="pop-versao" class="form-control" value="1.0" style="width:100%; padding:8px;">
                </div>
                <div>
                    <label style="font-weight:bold; font-size:14px;">Data de Emissão</label>
                    <input type="text" id="pop-data" class="form-control" value="${dataHoje}" readonly style="width:100%; padding:8px; background:#f3f4f6;">
                </div>
                <div style="grid-column: 1 / -1;">
                    <label style="font-weight:bold; font-size:14px;">Responsável</label>
                    <input type="text" id="pop-responsavel" class="form-control" value="${user.nome || ''}" readonly style="width:100%; padding:8px; background:#f3f4f6;">
                </div>
            </div>

            <hr style="margin: 20px 0; border-color: #eee;">
            <h4 style="color: #0056b3; margin-bottom:15px;">Estrutura do Documento</h4>

            <div style="display: flex; flex-direction: column; gap: 15px;">
                <div><label style="font-weight:bold;">1. Objetivo</label><textarea id="pop-obj" class="form-control" rows="2" style="width:100%; padding:8px;"></textarea></div>
                <div><label style="font-weight:bold;">2. Aplicação e Escopo</label><textarea id="pop-escopo" class="form-control" rows="2" style="width:100%; padding:8px;"></textarea></div>
                <div><label style="font-weight:bold;">3. Responsabilidades</label><textarea id="pop-resp-detalhe" class="form-control" rows="2" style="width:100%; padding:8px;"></textarea></div>
                <div><label style="font-weight:bold;">4. Materiais e Equipamentos</label><textarea id="pop-materiais" class="form-control" rows="2" style="width:100%; padding:8px;"></textarea></div>
                <div><label style="font-weight:bold;">5. Procedimento Operacional</label><textarea id="pop-procedimento" class="form-control" rows="4" style="width:100%; padding:8px;"></textarea></div>
                <div><label style="font-weight:bold;">6. Controle de Qualidade</label><textarea id="pop-qualidade" class="form-control" rows="2" style="width:100%; padding:8px;"></textarea></div>
                <div><label style="font-weight:bold;">7. Segurança e Riscos</label><textarea id="pop-seguranca" class="form-control" rows="2" style="width:100%; padding:8px;"></textarea></div>
                <div><label style="font-weight:bold;">8. Manutenção e Calibração</label><textarea id="pop-manutencao" class="form-control" rows="2" style="width:100%; padding:8px;"></textarea></div>
                <div><label style="font-weight:bold;">9. Referências</label><textarea id="pop-referencias" class="form-control" rows="2" style="width:100%; padding:8px;"></textarea></div>
                <div><label style="font-weight:bold;">10. Anexos</label><textarea id="pop-anexos" class="form-control" rows="2" style="width:100%; padding:8px;"></textarea></div>
            </div>
            
            <div style="margin-top: 25px; display: flex; gap: 10px; justify-content: flex-end;">
                <button type="button" class="btn btn-secondary" onclick="closePopModal()" style="padding:10px 20px;">Cancelar</button>
                <button type="button" class="btn btn-primary" onclick="handleSavePop(event)" style="padding:10px 20px; background:#0056b3; color:white; border:none; border-radius:5px;">💾 Salvar POP</button>
            </div>
        `;
    }
};

window.closePopModal = function() {
    const modal = document.getElementById('popModal');
    if (modal) modal.style.display = 'none';
};

// ==========================================
// 3. SALVAR O POP (JSON EMBUTIDO)
// ==========================================
window.handleSavePop = async function(event) {
    event.preventDefault();
    
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
        anexos: document.getElementById('pop-anexos').value
    };

    const popData = {
        codigo: document.getElementById('pop-codigo').value,
        titulo: document.getElementById('pop-titulo').value,
        descricao: JSON.stringify(conteudoCompleto) // O truque da serialização
    };

    try {
        const res = await window.api.fetchProtected('/pops', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(popData)
        });

        if (!res.ok) throw new Error("Erro ao salvar.");
        
        window.closePopModal();
        loadPopsTable();
        window.UI.showToast("Procedimento salvo e padronizado!", "success");
    } catch (err) {
        window.UI.showToast("Erro ao salvar POP. O Código já existe?", "error");
    }
};

// ==========================================
// 4. TABELA DE EXIBIÇÃO
// ==========================================
async function loadPopsTable() {
    try {
        const response = await window.api.fetchProtected('/pops');
        if (!response.ok) throw new Error('Falha ao carregar POPs');
        const pops = await response.json();
        
        window.popsDataList = pops; 
        
        const tbody = document.getElementById('popsTableBody');
        if (!tbody) return;
        
        if (pops.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Nenhum POP registrado.</td></tr>';
            return;
        }

        let html = '';
        pops.forEach(pop => {
            html += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px 10px;"><strong>${window.escapeHTML(pop.codigo)}</strong></td>
                    <td style="padding: 12px 10px;">${window.escapeHTML(pop.titulo)}</td>
                    <td style="padding: 12px 10px;"><span style="background: #D1FAE5; color: #065F46; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight:bold;">ATIVO</span></td>
                    <td style="padding: 12px 10px;">${pop.data_criacao ? new Date(pop.data_criacao).toLocaleDateString('pt-BR') : 'N/A'}</td>
                    <td style="padding: 12px 10px;">
                        <button onclick="viewPopDetails('${pop.codigo}')" class="btn btn-outline-primary btn-sm" style="padding: 5px 10px;">📄 Documento</button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    } catch (error) {
        window.UI.showToast("Erro ao carregar lista de POPs", "error");
    }
}

// ==========================================
// 5. VISÃO PROFUNDA E GERAÇÃO DE PDF
// ==========================================
window.viewPopDetails = function(codigo) {
    const pop = window.popsDataList.find(p => p.codigo === codigo);
    if (!pop) return;

    let dados = {};
    try { 
        dados = JSON.parse(pop.descricao); 
    } catch(e) { 
        dados = { objetivo: pop.descricao };
    }

    const divDocumento = document.createElement('div');
    divDocumento.id = "pop-document-container";
    divDocumento.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:10000; display:flex; justify-content:center; overflow-y:auto; padding: 20px;";
    
    divDocumento.innerHTML = `
        <div style="background:#fff; width:210mm; min-height:297mm; padding: 20mm; position:relative; font-family: Arial, sans-serif; color: #000; box-shadow: 0 0 15px rgba(0,0,0,0.5);">
            
            <div data-html2canvas-ignore="true" style="position: sticky; top: -20px; background: #f8f9fa; padding: 15px; margin: -20px -20px 20px -20px; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; z-index: 10;">
                <button onclick="document.getElementById('pop-document-container').remove()" class="btn btn-secondary" style="padding: 8px 15px;">⬅ Voltar</button>
                <button onclick="gerarPDF('${pop.codigo}')" class="btn btn-primary" style="padding: 8px 15px; background:#DC2626; color:white; border:none; font-weight:bold; cursor:pointer;">🖨️ BAIXAR .PDF</button>
            </div>

            <div id="conteudo-para-pdf" style="padding: 10px;">
                <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
                    <h2 style="margin:0; color:#00BFFF; font-size:28px;">GMAE</h2>
                    <p style="margin:5px 0 0 0; font-size:12px; font-weight:bold; letter-spacing: 1px;">GRUPO DE PESQUISA EM MATERIAIS ELETROATIVOS</p>
                    <h3 style="margin: 15px 0 5px 0;">Procedimento Operacional Padrão (POP)</h3>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
                    <tr>
                        <td style="border: 1px solid #000; padding: 8px;"><strong>Título:</strong> ${window.escapeHTML(pop.titulo)}</td>
                        <td style="border: 1px solid #000; padding: 8px;"><strong>Código:</strong> ${pop.codigo}</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #000; padding: 8px;"><strong>Versão:</strong> ${dados.versao || '1.0'}</td>
                        <td style="border: 1px solid #000; padding: 8px;"><strong>Data:</strong> ${dados.data_emissao || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td colspan="2" style="border: 1px solid #000; padding: 8px;"><strong>Responsável:</strong> ${dados.responsavel || 'N/A'}</td>
                    </tr>
                </table>

                <style> 
                    .pop-sec { margin-bottom: 15px; font-size: 14px; line-height: 1.5; }
                    .pop-sec h4 { margin: 0 0 5px 0; font-size: 14px; font-weight: bold; }
                    .pop-sec p { margin: 0; white-space: pre-wrap; }
                </style>

                <div class="pop-sec"><h4>1. Objetivo</h4><p>${dados.objetivo || '-'}</p></div>
                <div class="pop-sec"><h4>2. Aplicação e Escopo</h4><p>${dados.escopo || '-'}</p></div>
                <div class="pop-sec"><h4>3. Responsabilidades</h4><p>${dados.responsabilidades || '-'}</p></div>
                <div class="pop-sec"><h4>4. Materiais e Equipamentos Necessários</h4><p>${dados.materiais || '-'}</p></div>
                <div class="pop-sec"><h4>5. Procedimento Operacional</h4><p>${dados.procedimento || '-'}</p></div>
                <div class="pop-sec"><h4>6. Controle de Qualidade</h4><p>${dados.qualidade || '-'}</p></div>
                <div class="pop-sec"><h4>7. Segurança e Riscos</h4><p>${dados.seguranca || '-'}</p></div>
                <div class="pop-sec"><h4>8. Manutenção e Calibração</h4><p>${dados.manutencao || '-'}</p></div>
                <div class="pop-sec"><h4>9. Referências</h4><p>${dados.referencias || '-'}</p></div>
                <div class="pop-sec"><h4>10. Anexos</h4><p>${dados.anexos || '-'}</p></div>
                
                <div class="pop-sec" style="margin-top: 30px;">
                    <h4>11. Histórico de Revisões</h4>
                    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; margin-top: 10px;">
                        <tr style="background:#f0f0f0;">
                            <th style="border: 1px solid #000; padding: 5px;">Data</th>
                            <th style="border: 1px solid #000; padding: 5px;">Versão</th>
                            <th style="border: 1px solid #000; padding: 5px;">Descrição</th>
                            <th style="border: 1px solid #000; padding: 5px;">Responsável</th>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #000; padding: 5px;">${dados.data_emissao || '-'}</td>
                            <td style="border: 1px solid #000; padding: 5px;">${dados.versao || '1.0'}</td>
                            <td style="border: 1px solid #000; padding: 5px;">Criação do documento</td>
                            <td style="border: 1px solid #000; padding: 5px;">${dados.responsavel || '-'}</td>
                        </tr>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(divDocumento);
};

window.gerarPDF = function(codigo) {
    const elemento = document.getElementById('conteudo-para-pdf');
    const opcoes = {
        margin:       10, 
        filename:     `POP_${codigo}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true }, 
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opcoes).from(elemento).save();
    window.UI.showToast("Iniciando download do PDF...", "success");
};