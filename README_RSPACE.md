# Módulo RSpace ELN & Inventory — Documentação Técnica e Funcional

Este documento descreve a arquitetura, segurança, variáveis de ambiente e todas as funcionalidades implementadas no módulo **RSpace ELN & Inventory** integrado ao portal **SGCI / GMAE (LEQM)**.

* **Documentação Oficial RSpace API v1:** https://community.researchspace.com/public/apiDocs#rspace-eln/tag/documents
* **Servidor RSpace Padrão:** `https://community.researchspace.com`
* **Acesso no Portal SGCI:** Menu lateral **Conhecimento > RSpace ELN** (ou atalho de teclado `G` seguido de `R`, ou `Ctrl + K`).

---

## 1. Configuração de Variáveis de Ambiente

A API Key do RSpace **nunca** é exposta no código do Frontend (Vercel). Toda a comunicação com o RSpace ocorre via proxy seguro no Backend FastAPI (`API/services/rspace_service.py` e `API/routers/rspace.py`).

### No Backend (`API/.env` e painel **Environment** do Render)

| Variável | Exemplo / Valor Padrão | Descrição |
| :--- | :--- | :--- |
| `RSPACE_URL` | `https://community.researchspace.com` | URL base da instância do RSpace (sem `/api/v1` no final). |
| `RSPACE_API_KEY` | `COLE_SUA_API_KEY_AQUI` | Chave institucional/padrão da API do RSpace (gerada em *My RSpace > My Profile > Manage API Key*). |
| `RSPACE_TIMEOUT_SECONDS` | `25` | Tempo limite (em segundos) para chamadas HTTP de saída para o RSpace. |
| `RSPACE_ALLOWED_HOSTS` | `community.researchspace.com` | Lista de domínios autorizados (separados por vírgula) contra ataques de SSRF. |

### No Frontend (Vercel)

* **Nenhuma variável adicional é necessária na Vercel**, pois o Frontend conversa exclusivamente com o Backend do SGCI autenticado via cookie `HttpOnly` + `X-CSRF-Token`.

---

## 2. Arquitetura de Cibersegurança Aplicada no Módulo

1. **Isolamento de Credenciais (Zero Exposure no Cliente):**
   * O cabeçalho `apiKey` é injetado exclusivamente no servidor FastAPI. O navegador jamais recebe a chave em texto claro (apenas uma versão mascarada, ex.: `abcd...9876`, para conferência visual).
2. **Chave Institucional (`.env`) + Chave Pessoal por Usuário (Cifrada em Repouso):**
   * Além da chave global configurada no `.env`, cada pesquisador pode vincular sua própria API Key pessoal do RSpace pelo botão **Credenciais API** no portal.
   * A chave pessoal é cifrada em repouso na coluna `usuarios.rspace_api_key_enc` usando **Fernet (AES-128-CBC + HMAC-SHA256)** derivado do `SECRET_KEY` via `PBKDF2HMAC (SHA-256, 200.000 iterações)`.
3. **Proteção contra SSRF e DNS Rebinding:**
   * A URL do servidor RSpace é validada com `urllib.parse`, exigindo esquema `https://`, bloqueando credenciais embutidas na URL, validando o `hostname` contra a allowlist (`RSPACE_ALLOWED_HOSTS` / `*.researchspace.com`) e resolvendo o DNS (`socket.getaddrinfo`) para rejeitar IPs privados, loopback (`127.0.0.1`), link-local (`169.254.169.254` — metadados de nuvem) e redes reservadas.
4. **Sanitização de HTML Cientifico (Prevenção de Stored/Reflected XSS):**
   * Os campos de documentos do RSpace contêm HTML rico (tabelas, observações experimentais). Tanto no Backend (`sanitize_rspace_html`) quanto no Frontend (`sanitizarHtmlCliente`), tags perigosas (`<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>`, `<meta>`), handlers `on*` (`onerror`, `onload`, `onclick`) e protocolos `javascript:` / `vbscript:` são removidos antes da renderização.
5. **Validação de Uploads por Magic Bytes:**
   * Todo envio de arquivo para a Galeria do RSpace (`/rspace/files`) ou importação de Word (`/rspace/import/word`) passa por verificação de tamanho máximo (25 MB), extensão permitida e assinatura binária (*magic bytes*) em `API/file_security.py`.
6. **Rate Limiting e Auditoria (`audit_logs`):**
   * Todas as rotas `/rspace/*` possuem limite de requisições por minuto via `slowapi` e todas as operações de criação, edição, exclusão, exportação e vínculo são gravadas na tabela `audit_logs` do SGCI.

---

## 3. Funcionalidades do Módulo RSpace (Aba por Aba)

O módulo no Frontend (`Frontend/js/views/rspace.js`) está dividido em **7 abas operacionais** mais **barra de status e credenciais**, cobrindo toda a especificação da API REST v1 do RSpace ELN (`/api/v1`) e do RSpace Inventory (`/api/inventory/v1`).

---

### 3.1. Status do Servidor e Credenciais API
* **Rotas:** `GET /rspace/config`, `PUT /rspace/config`, `DELETE /rspace/config`, `GET /rspace/status`
* **O que faz:**
  * Mostra no topo da tela se a conexão está usando a **Chave Institucional (`.env`)** ou uma **Chave Pessoal (Cifrada)**, além da chave mascarada e do servidor ativo.
  * Permite testar o ping ao vivo com o servidor RSpace (`/api/v1/status` e `/api/v1/sysinfo`), exibindo a versão do RSpace e o tempo de resposta.
  * No modal **Credenciais API**, o usuário pode testar e salvar sua própria API Key do RSpace ou removê-la para voltar a usar a chave institucional do laboratório.

---

### 3.2. Aba 1 — Documentos (ELN)
* **Rotas:**
  * `GET /rspace/documents` (busca simples e paginação)
  * `POST /rspace/documents/advanced-search` (busca avançada combinada)
  * `GET /rspace/documents/{doc_id}` (leitura integral com sanitização de campos HTML)
  * `POST /rspace/documents` (criação de documento com tags, pasta/caderno, formulário e múltiplos campos)
  * `PUT /rspace/documents/{doc_id}` (edição de nome, tags e conteúdo de cada campo)
  * `DELETE /rspace/documents/{doc_id}` (exclusão de documento)
* **O que faz:**
  * **Listagem e Busca Rápida:** Pesquisa documentos por termo livre (`query`), filtra por tags, ordena por última modificação, data de criação ou nome, e pagina os resultados.
  * **Busca Avançada (Construtor de Consultas):** Permite combinar múltiplos critérios (`AND` / `OR`) por `name`, `tag`, `form`, `created`, `lastModified`, `owner` ou `fullText`.
  * **Visualizador Completo de Documento:** Exibe metadados (`globalId`, proprietário, formulário, pasta, datas, tags) e renderiza todos os campos estruturados do experimento com HTML sanitizado, permitindo também anexar rapidamente um arquivo da Galeria do RSpace a um campo do documento.
  * **Criação e Edição Dinâmica:** Permite criar documentos em branco ou baseados em um **Formulário (`Form`)** do RSpace, adicionando quantos blocos/campos (`text`, `string`, `number`, `date`) forem necessários.

---

### 3.3. Integração Nativa com Módulos do SGCI (Processos, POPs e PTA)
* **Rotas:**
  * `POST /rspace/documents/from-process/{process_id}`
  * `POST /rspace/documents/from-pop/{pop_codigo}`
  * `POST /rspace/documents/{doc_id}/link-process/{process_id}`
* **O que faz:**
  1. **Exportar Processo de P&D para o RSpace (`Enviar do SGCI`):** Converte automaticamente um Processo de P&D cadastrado no SGCI (com responsável, status, equipe, equipamentos, visão geral, etapas, indicadores e linha do tempo de atividades) em um documento estruturado dentro do RSpace ELN, além de registrar o vínculo na linha do tempo do processo.
  2. **Exportar POP para o RSpace (`Enviar do SGCI`):** Envia qualquer Procedimento Operacional Padrão (todas as 9 seções técnicas, código, versão e equipamento vinculado) diretamente para o RSpace ELN com as tags `sgci,pop`.
  3. **Vincular Documento RSpace a um Processo SGCI:** A partir de qualquer documento no RSpace, o botão **Vincular a Processo** cria automaticamente um registro na linha do tempo do processo no SGCI com o código `SD...`, resumo dos campos e link direto para o experimento no RSpace.
  4. **Importar Experimentos do RSpace no Planejamento Mensal (PTA):** Na tela de **Planejamento mensal (`Frontend/js/views/pta.js`)**, o botão **Importar experimentos do RSpace** busca os experimentos criados ou modificados no mês/ano selecionado e permite inserir o resumo estruturado diretamente na descrição das atividades do relato mensal.

---

### 3.4. Aba 2 — Pastas & Cadernos (Folders & Notebooks)
* **Rotas:**
  * `GET /rspace/folders/tree`
  * `GET /rspace/folders/{folder_id}`
  * `POST /rspace/folders`
  * `DELETE /rspace/folders/{folder_id}`
* **O que faz:**
  * Navega pela árvore hierárquica do Workspace do RSpace com trilha de navegação (*breadcrumb*).
  * Cria novas **Pastas (`FOLDER`)** ou **Cadernos de Laboratório (`NOTEBOOK`)** dentro da pasta atual ou na raiz do Workspace.
  * Permite abrir documentos que estão dentro de uma pasta ou excluir pastas/cadernos.

---

### 3.5. Aba 3 — Galeria / Arquivos (Files & Media)
* **Rotas:**
  * `GET /rspace/files`
  * `POST /rspace/files` (upload multipart seguro)
  * `GET /rspace/files/{file_id}`
  * `GET /rspace/files/{file_id}/download` (streaming autenticado via backend)
  * `POST /rspace/documents/{doc_id}/attach-file`
* **O que faz:**
  * Lista todos os arquivos da Galeria do RSpace, com filtro por tipo de mídia (`image`, `document`, `pdf`).
  * Faz upload de novos arquivos (imagens, PDFs, planilhas, documentos, ZIP, TXT/CSV) validados pelo `file_security.py` com legenda/descrição e opção de vincular imediatamente a um documento existente do RSpace.
  * Faz o download seguro do arquivo original passando pelo proxy autenticado da API.

---

### 3.6. Aba 4 — Formulários (Forms / Estruturas de Dados)
* **Rotas:**
  * `GET /rspace/forms`
  * `GET /rspace/forms/{form_id}`
  * `POST /rspace/forms`
  * `POST /rspace/forms/{form_id}/publish`
  * `POST /rspace/forms/{form_id}/unpublish`
* **O que faz:**
  * Lista os formulários padronizados do RSpace para criação de experimentos estruturados.
  * Permite inspecionar todos os campos de um formulário e clicar em **Criar documento com este formulário** (que já abre o modal de novo documento pré-carregado com os campos do formulário).
  * Permite criar novos formulários definindo campos tipados (`String`, `Text`, `Number`, `Date`, `Radio`, `Choice`) e publicar/despublicar formulários no RSpace.

---

### 3.7. Aba 5 — Inventário (RSpace Inventory API: Amostras, Subamostras, Recipientes, Templates e Código de Barras)
* **Rotas:**
  * **Amostras (`Samples`):** `GET /rspace/inventory/samples`, `GET /rspace/inventory/samples/{sample_id}`, `POST /rspace/inventory/samples`, `PUT /rspace/inventory/samples/{sample_id}`, `DELETE /rspace/inventory/samples/{sample_id}`
  * **Subamostras / Alíquotas (`Subsamples`):** `GET /rspace/inventory/subsamples`, `GET /rspace/inventory/subsamples/{subsample_id}`, `DELETE /rspace/inventory/subsamples/{subsample_id}`
  * **Recipientes / Caixas / Freezers (`Containers`):** `GET /rspace/inventory/containers`, `GET /rspace/inventory/containers/{container_id}`, `POST /rspace/inventory/containers`, `DELETE /rspace/inventory/containers/{container_id}`
  * **Modelos de Amostra (`Sample Templates`):** `GET /rspace/inventory/sample-templates`, `GET /rspace/inventory/sample-templates/{template_id}`, `POST /rspace/inventory/sample-templates`
  * **Busca por Código de Barras (`Barcode`):** `GET /rspace/inventory/barcode/{barcode}`
* **O que faz:**
  * Gerencia todo o ciclo de vida físico do laboratório no **RSpace Inventory**: cadastro de amostras com quantidade, unidade (`mL`, `g`, `mg`, `µL`, `un`), temperatura de armazenamento (ex.: `-80°C`, `4°C`) e tags.
  * Gerencia subamostras (alíquotas), recipientes/locais de armazenamento (caixas, racks, placas, freezers) e modelos de amostra.
  * Oferece busca instantânea por **Código de Barras / QR Code** para localizar rapidamente qualquer item físico registrado no inventário.

---

### 3.8. Aba 6 — Grupos & Compartilhamento (Groups & Sharing)
* **Rotas:**
  * `GET /rspace/groups`
  * `POST /rspace/share`
  * `DELETE /rspace/share/{share_id}`
* **O que faz:**
  * Lista os grupos de pesquisa e membros cadastrados no RSpace do usuário.
  * Permite compartilhar um ou mais documentos ou cadernos com grupos do RSpace definindo a permissão (`READ` para leitura ou `EDIT` para edição colaborativa) e a pasta de destino, além de revogar compartilhamentos existentes.

---

### 3.9. Aba 7 — Auditoria, Exportação Assíncrona (XML/HTML/PDF/ZIP) & Importação Word (`.docx`)
* **Rotas:**
  * **Auditoria (`Activity`):** `GET /rspace/activity`
  * **Exportação e Jobs:** `POST /rspace/export`, `POST /rspace/export/selection`, `GET /rspace/jobs/{job_id}`, `GET /rspace/jobs/{job_id}/download`
  * **Importação de Word:** `POST /rspace/import/word`
* **O que faz:**
  1. **Trilha de Auditoria do RSpace (`/api/v1/activity`):** Consulta o log de eventos do RSpace com filtros por `globalId` de documento (ex.: `SD12345`), período (`dateFrom` / `dateTo`), domínios (`RECORD`, `FILE`, `FOLDER`, `USER`) e ações (`CREATE`, `WRITE`, `READ`, `DELETE`, `SHARE`, `EXPORT`).
  2. **Exportação Assíncrona com Monitoramento de Progresso:**
     * Exporta todo o trabalho do usuário, o trabalho de um grupo ou uma seleção específica de documentos/cadernos nos formatos **HTML**, **XML**, **PDF** ou **Arquivo Completo**.
     * Monitora automaticamente o `jobId` (`/rspace/jobs/{job_id}`) com barra de progresso em tempo real (`RUNNING` -> `COMPLETED`) e libera o botão de download seguro (`/rspace/jobs/{job_id}/download`) assim que o pacote ZIP fica pronto.
  3. **Importação de Arquivo Word (`.docx`) para o RSpace:**
     * Envia um arquivo `.docx` (validado contra extensões e tamanho) que é convertido automaticamente pela API do RSpace (`/api/v1/import/word`) em um documento estruturado editável dentro do ELN.
