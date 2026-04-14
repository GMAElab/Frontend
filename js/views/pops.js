// ==========================================
// 1. ABERTURA DO FORMULÁRIO
// ==========================================
window.openPopModal = function() {
    const modal = document.getElementById('popModal');
    if (!modal) return console.error("Modal popModal não encontrado.");
    
    modal.style.setProperty('display', 'flex', 'important');
    const user = JSON.parse(localStorage.getItem('user_data') || '{}');
    const dataHoje = new Date().toLocaleDateString('pt-BR');

    const formContainer = document.getElementById('popForm');
    if (formContainer) {
        formContainer.innerHTML = `
            <div class="grid-fluida" style="grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div>
                    <label>Código do Documento: *</label>
                    <input type="text" id="pop-codigo" class="form-control" placeholder="Ex: POP-001" required>
                </div>
                <div>
                    <label>Título do Procedimento: *</label>
                    <input type="text" id="pop-titulo" class="form-control" required>
                </div>
                <div>
                    <label>Versão:</label>
                    <input type="text" id="pop-versao" class="form-control" value="1.0">
                </div>
                <div>
                    <label>Data de Emissão:</label>
                    <input type="text" id="pop-data" class="form-control" value="${dataHoje}" readonly style="background:#f3f4f6;">
                </div>
                <div style="grid-column: 1 / -1;">
                    <label>Responsável (Automático)</label>
                    <input type="text" id="pop-responsavel" class="form-control" value="${user.nome || ''}" readonly style="background:#f3f4f6;">
                </div>
            </div>

            <hr style="margin: 20px 0; border-color: #eee;">
            <h4 style="color: #0056b3;">Estrutura do Documento</h4>

            <div style="display: flex; flex-direction: column; gap: 15px;">
                <div><label>1. Objetivo:</label><textarea id="pop-obj" class="form-control" rows="2" placeholder="Qual o propósito deste procedimento?"></textarea></div>
                <div><label>2. Aplicação e Escopo:</label><textarea id="pop-escopo" class="form-control" rows="2"></textarea></div>
                <div><label>3. Responsabilidades:</label><textarea id="pop-resp-detalhe" class="form-control" rows="2" placeholder="Operadores: ... Supervisor: ..."></textarea></div>
                <div><label>4. Materiais e Equipamentos:</label><textarea id="pop-materiais" class="form-control" rows="2" placeholder="Liste ferramentas, reagentes e EPIs"></textarea></div>
                <div><label>5. Procedimento Operacional (Passo a Passo):</label><textarea id="pop-procedimento" class="form-control" rows="4" placeholder="5.1 Preparação... 5.2 Operação... 5.3 Finalização..."></textarea></div>
                <div><label>6. Controle de Qualidade:</label><textarea id="pop-qualidade" class="form-control" rows="2"></textarea></div>
                <div><label>7. Segurança e Riscos:</label><textarea id="pop-seguranca" class="form-control" rows="2"></textarea></div>
                <div><label>8. Manutenção e Calibração:</label><textarea id="pop-manutencao" class="form-control" rows="2"></textarea></div>
                <div><label>9. Referências:</label><textarea id="pop-referencias" class="form-control" rows="2"></textarea></div>
                <div><label>10. Anexos:</label><textarea id="pop-anexos" class="form-control" rows="2"></textarea></div>
            </div>
            
            <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                <button type="button" class="btn btn-secondary" onclick="closePopModal()">Cancelar</button>
                <button type="button" class="btn btn-primary" onclick="handleSavePop(event)">💾 Salvar POP</button>
            </div>
        `;
    }
};

window.closePopModal = function() {
    const modal = document.getElementById('popModal');
    if (modal) modal.style.display = 'none';
};

// ==========================================
// 2. SALVAR O POP (JSON EMBUTIDO)
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
        descricao: JSON.stringify(conteudoCompleto) 
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
        window.UI.showToast("Erro ao salvar POP. Verifique o código.", "error");
    }
};

// ==========================================
// 3. TABELA DE EXIBIÇÃO
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
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhum POP registrado.</td></tr>';
            return;
        }

        let html = '';
        pops.forEach(pop => {
            html += `
                <tr>
                    <td><strong>${window.escapeHTML(pop.codigo)}</strong></td>
                    <td>${window.escapeHTML(pop.titulo)}</td>
                    <td><span style="background: #D1FAE5; color: #065F46; padding: 4px 8px; border-radius: 12px; font-size: 11px;">ATIVO</span></td>
                    <td>
                        <button onclick="viewPopDetails('${pop.codigo}')" class="btn btn-outline-primary btn-sm">📄 Detalhes</button>
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
// 4. VISÃO DETALHADA E GERAÇÃO DE PDF
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
                <button onclick="document.getElementById('pop-document-container').remove()" class="btn btn-secondary">⬅ Voltar</button>
                <button onclick="gerarPDF('${pop.codigo}')" class="btn btn-primary" style="background:#DC2626; border-color:#DC2626;">🖨️ GERAR .PDF</button>
            </div>

            <div id="conteudo-para-pdf" style="padding: 10px;">
                
                <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
                    <h2 style="margin:0; color:#00BFFF;">GMAE</h2>
                    <p style="margin:5px 0 0 0; font-size:12px; font-weight:bold;">GRUPO DE PESQUISA EM MATERIAIS ELETROATIVOS</p>
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
                            <td style="border: 1px solid #000; padding: 5px;">Criação do documento via Sistema</td>
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
    
    window.UI.showToast("Gerando PDF... Verifique seus downloads.", "success");
};