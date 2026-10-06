# Sistema de Gestão de Conhecimento e Inovação - Frontend

> Sistema de gestão laboratorial desenvolvido para o laboratório **LEQM**. Focado no controle de ativos, processos de Pesquisa e Desenvolvimento (P&D), Procedimentos Operacionais Padrão (POPs), planejamento mensal e tarefas da equipe.

* **Portal:** https://sgci-hub.vercel.app
* **API (outro repositório):** [GMAElab/API](https://github.com/GMAElab/API)

---

## Tecnologias e Padrões

Este projeto foi construído priorizando leveza, acessibilidade e ausência de dependências complexas. Não há etapa de instalação nem de build: são apenas arquivos HTML, CSS e JavaScript.

* **Arquitetura SPA (Single Page Application)**: Navegação fluida e dinâmica sem recarregamento de página, gerenciada nativamente via `UI.switchView`.
* **HTML5 & Acessibilidade**: Construído de forma estruturada (semântico) para garantir compatibilidade e usabilidade na maioria dos dispositivos com acesso à internet.
* **JavaScript Moderno**: Código assíncrono (`async/await`), integração modular via escopo global (`window`) e comunicação orientada a eventos (`CustomEvents`).
* **CSS Dinâmico**: Estilização baseada em variáveis CSS e estados controlados via JS para renderização de modais e transições de abas.
* **Sessão por cookie**: O login fica em um cookie `HttpOnly` enviado pela API; as requisições que alteram dados levam o header `X-CSRF-Token`. Tudo isso é tratado em `js/api.js`.

---

## Como rodar no seu computador

```bash
git clone https://github.com/GMAElab/Frontend.git
```

Abra a pasta no VS Code, clique com o botão direito em `index.html` e escolha **Open with Live Server**. O portal abre em `http://127.0.0.1:5500`.

* Use a porta **5500** (padrão do Live Server). A API só aceita requisições de endereços autorizados, e essa porta já está na lista.
* Mesmo rodando localmente, o frontend conversa com a **API e o banco de produção**. O que for cadastrado ou apagado nos testes acontece nos dados reais.
* O endereço da API fica na primeira linha de `js/api.js` (`API_URL`) e também em `verificar-email.html`. Para usar uma API local, troque nesses 2 lugares e desfaça antes do commit.
* O login não funciona em guia anônima nem em navegadores que bloqueiam cookies de terceiros (Safari, Brave).

---

## Deploy

O frontend está hospedado na **Vercel**. Todo commit na branch `main` gera um novo deploy automaticamente, em poucos minutos. Não existe ambiente de teste separado: o que entra na `main` vai direto para o ar.

Se um deploy der problema, abra o projeto na Vercel, vá em **Deployments** e promova um deploy anterior para produção.

---

## Funcionalidades

### Acesso
* **Cadastro com aprovação**: O pedido feito em `registro.html` só vira conta depois de aprovado por um administrador e de o usuário confirmar o e-mail (`verificar-email.html`).
* **Login com 2FA**: Verificação em 2 etapas opcional por aplicativo autenticador, com códigos de backup e recuperação de senha.

### Gestão de Equipamentos
* **Cadastro de Ativos**: Registro detalhado com especificações técnicas, links para manuais e anexos.
* **Treinamento Integrado**: Visualização rápida de instruções de uso (SOPs) com player de vídeo do YouTube embutido, permitindo capacitação sem sair da plataforma.

### Processos de P&D
* **Fluxo de 3 Etapas**: Mapeamento de processos estruturado metodicamente em **Planejamento**, **Execução** e **Resultados/Anexos**.
* **Gerenciamento de Dados**: Controle rigoroso de parâmetros técnicos, indicadores de desempenho (KPIs) e registro de lições aprendidas.
* **Integridade de Dados**: Prevenção de perda de dados através do sincronismo estrito de IDs entre a interface (HTML) e a lógica (JS).

### POPs
* **Criação e Edição**: Procedimentos Operacionais Padrão com código próprio e anexos.
* **Exportação em Word**: Download de qualquer POP em `.docx`, no modelo do laboratório.
* **Geração por IA**: Envio do manual do equipamento em PDF (até 15 MB) para gerar um rascunho do POP.

### Planejamento mensal
* **Relatórios por Tópico**: Cada pessoa registra o que fez no mês e o percentual de avanço.
* **Aprovação**: A coordenação aprova ou devolve os relatórios e pode gerar uma síntese por IA dos aprovados.

### Tarefas
* **Atribuição**: Técnicos, coordenadores e administradores criam tarefas com prazo, prioridade e responsáveis.
* **Acompanhamento**: Progresso, comentários com foto ou vídeo curto, envio para revisão, conclusão ou devolução.
* **Acervo**: As tarefas concluídas ficam disponíveis para consulta de todos.

### Artigos
* **Busca Científica**: Pesquisa na base Scopus, com filtro por ano e ordenação.
* **Lista Pessoal**: Cada usuário salva os artigos que interessam.

### Administração
* **Usuários**: Aprovação de cadastros, mudança de tipo de usuário, redefinição de senha e de 2FA, exclusão de contas.
* **Histórico**: Consulta dos registros de auditoria do sistema.
* Visível apenas para administradores.

---

## 📂 Estrutura do Projeto

A arquitetura de pastas foi pensada para manter a separação de responsabilidades (SoC):

```text
/
├── index.html            # Tela de login
├── registro.html         # Pedido de cadastro
├── verificar-email.html  # Confirmação de e-mail
├── dashboard.html        # Estrutura principal e esqueletos fixos de modais
├── css/
│   ├── global.css        # Resets, tipografia e variáveis de cores
│   ├── layout.css        # Estruturação de Sidebar, Topbar e grids
│   └── components.css    # Estilização de modais, tabelas, botões e cards
└── js/
    ├── api.js            # Camada de serviços e comunicação com o Backend
    ├── auth.js           # Login, 2FA e recuperação de senha
    ├── register.js       # Envio do pedido de cadastro
    ├── ui.js             # Roteador de telas, manipulação de DOM e Toasts
    ├── dashboard.js      # Inicialização do sistema e listeners globais
    └── views/
        ├── equipments.js # Lógica de gestão de ativos e dossiers técnicos
        ├── processes.js  # Lógica do fluxo de P&D (Planejamento a Resultados)
        ├── pops.js       # POPs, exportação e geração por IA
        ├── pta.js        # Planejamento mensal
        ├── tarefas.js    # Tarefas da equipe
        ├── articles.js   # Busca e lista de artigos
        └── admin.js      # Administração de usuários e auditoria
```
