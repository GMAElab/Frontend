# 🔬 Sistema de Gestão de conhecimento e inovação - Frontend

Sistema de gestão laboratorial desenvolvido para o laboratório **LEQM**, focado no controle de ativos, processos de Pesquisa e Desenvolvimento (P&D) e Procedimentos Operacionais Padrão (POPs).

## 🚀 Tecnologias e Padrões

* **Arquitetura SPA (Single Page Application)**: Troca de telas dinâmica sem recarregar a página através do `UI.switchView`.
* **HTML5 & Acessibilidade**: Interface desenvolvida para ser acessível pela maioria dos dispositivos com acesso a internet
* **JavaScript Moderno (ES6+)**: Uso de `async/await`, `CustomEvents` e escopo global via `window` para integração modular.
* **CSS Dinâmico**: Estilização baseada em variáveis e estados controlados via JS para modais e abas.

## 📂 Estrutura do Projeto

```text
/
├── dashboard.html        # Estrutura principal e esqueletos fixos de modais
├── css/
│   ├── global.css        # Resets, fontes e variáveis de cores
│   ├── layout.css        # Sidebar, Topbar e grids principais
│   └── components.css    # Estilo de modais, tabelas e botões
└── js/
    ├── api.js            # Comunicação centralizada com o Backend
    ├── ui.js             # Roteador de telas e feedback visual (Toasts)
    ├── dashboard.js      # Inicialização do sistema e eventos globais
    └── views/
        ├── equipments.js # Gestão de ativos e dossiers técnicos
        └── processes.js  # Mapeamento P&D (Planejamento, Execução, Resultados)

# 🛠️ Funcionalidades Principais
📦 Gestão de Equipamentos
Cadastro de Ativos: Registro com descrição técnica, links de manuais e vídeos de treinamento.

Como usar determinado equipamento: Visualização rápida de detalhes e player de vídeo embutido (YouTube) sem sair da tela.

# 🧪 Processos de P&D
Fluxo de 3 Etapas: Mapeamento estruturado em Planejamento, Execução e Resultados/Anexos.

Gerenciamento de Dados: Controle de todos os campos técnicos, incluindo indicadores de desempenho e lições aprendidas.

Prevenção de Erros: IDs sincronizados entre HTML e JS para garantir salvamento íntegro e sem erros de null.

# 🔧 Como Rodar
Clone o repositório.

Certifique-se de que o backend (C# / Python) está ativo.

Abra o dashboard.html utilizando um servidor local (como Live Server do VS Code).

Para refletir alterações de código, utilize Ctrl + F5 para limpar o cache do navegador.

# 📝 Notas de Desenvolvimento (Sênior)
Resolução de Erros de Null: Todos os seletores document.getElementById foram sincronizados para evitar falhas de leitura de propriedades null.

Visibilidade de Modais: Implementado uso de style.setProperty('display', 'flex', 'important') para vencer conflitos de cache de CSS.
