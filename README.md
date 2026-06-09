# Sistema de Gestão de Conhecimento e Inovação - Frontend

> Sistema de gestão laboratorial desenvolvido para o laboratório **LEQM**. Focado no controle de ativos, processos de Pesquisa e Desenvolvimento (P&D) e Procedimentos Operacionais Padrão (POPs).

---

## Tecnologias e Padrões

Este projeto foi construído priorizando leveza, acessibilidade e ausência de dependências complexas:

* **Arquitetura SPA (Single Page Application)**: Navegação fluida e dinâmica sem recarregamento de página, gerenciada nativamente via `UI.switchView`.
* **HTML5 & Acessibilidade**: Construído de forma estruturada (semântico) para garantir compatibilidade e usabilidade na maioria dos dispositivos com acesso à internet.
* **JavaScript Moderno**: Código assíncrono (`async/await`), integração modular via escopo global (`window`) e comunicação orientada a eventos (`CustomEvents`).
* **CSS Dinâmico**: Estilização baseada em variáveis CSS e estados controlados via JS para renderização de modais e transições de abas.

---

## Funcionalidades Implementadas até o momento

### Gestão de Equipamentos
* **Cadastro de Ativos**: Registro detalhado com especificações técnicas, links para manuais e anexos.
* **Treinamento Integrado**: Visualização rápida de instruções de uso (SOPs) com player de vídeo do YouTube embutido, permitindo capacitação sem sair da plataforma.

### Processos de P&D
* **Fluxo de 3 Etapas**: Mapeamento de processos estruturado metodicamente em **Planejamento**, **Execução** e **Resultados/Anexos**.
* **Gerenciamento de Dados**: Controle rigoroso de parâmetros técnicos, indicadores de desempenho (KPIs) e registro de lições aprendidas.
* **Integridade de Dados**: Prevenção de perda de dados através do sincronismo estrito de IDs entre a interface (HTML) e a lógica (JS).

---

## 📂 Estrutura do Projeto

A arquitetura de pastas foi pensada para manter a separação de responsabilidades (SoC):

```text
/
├── dashboard.html        # Estrutura principal e esqueletos fixos de modais
├── css/
│   ├── global.css        # Resets, tipografia e variáveis de cores
│   ├── layout.css        # Estruturação de Sidebar, Topbar e grids
│   └── components.css    # Estilização de modais, tabelas, botões e cards
└── js/
    ├── api.js            # Camada de serviços e comunicação com o Backend
    ├── ui.js             # Roteador de telas, manipulação de DOM e Toasts
    ├── dashboard.js      # Inicialização do sistema e listeners globais
    └── views/
        ├── equipments.js # Lógica de gestão de ativos e dossiers técnicos
        └── processes.js  # Lógica do fluxo de P&D (Planejamento a Resultados)
