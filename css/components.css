/* =========================================
   MODAIS (Janelas Flutuantes)
========================================= */
.modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(4px); /* Efeito de desfoque estilo Apple */
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
}

.modal-overlay.active {
    opacity: 1;
    visibility: visible;
}

.modal {
    background: var(--bg-white);
    border-radius: var(--border-radius);
    width: 100%;
    max-width: 500px;
    padding: var(--space-lg);
    box-shadow: var(--box-shadow-hover);
    transform: translateY(-20px);
    transition: transform 0.3s ease;
}

.modal-overlay.active .modal {
    transform: translateY(0);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-md);
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: var(--space-sm);
}

.modal-header h3 {
    margin: 0;
    color: var(--text-main);
}

.btn-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--text-muted);
    transition: color 0.2s;
}

.btn-close:hover {
    color: var(--color-danger);
}