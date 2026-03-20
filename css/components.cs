/* =========================================
   CARDS
========================================= */
.card {
    background-color: var(--bg-white);
    border-radius: var(--border-radius);
    padding: var(--space-lg);
    box-shadow: var(--box-shadow);
}

/* =========================================
   FORMULÁRIOS E INPUTS (Heurística 5 - Prevenção)
========================================= */
.input-group {
    margin-bottom: var(--space-md);
    text-align: left;
}

.input-group label {
    display: block;
    margin-bottom: var(--space-sm);
    font-weight: 500;
    color: var(--text-main);
}

.input-group input {
    width: 100%;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: var(--border-radius);
    font-size: 1rem;
    transition: border-color 0.2s, box-shadow 0.2s;
}

/* Foco claro para Acessibilidade */
.input-group input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(0, 86, 179, 0.2);
}

.input-group input.error {
    border-color: var(--color-danger);
}

/* =========================================
   BOTÕES E FEEDBACK (Heurística 1 - Visibilidade)
========================================= */
.btn {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    padding: 10px 20px;
    font-size: 1rem;
    font-weight: 600;
    border: none;
    border-radius: var(--border-radius);
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
}

.btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.btn-block { width: 100%; }

.btn-primary {
    background-color: var(--color-primary);
    color: white;
}

.btn-primary:hover:not(:disabled) {
    background-color: var(--color-primary-hover);
}

.btn-outline-danger {
    background-color: transparent;
    color: var(--color-danger);
    border: 1px solid var(--color-danger);
}

.btn-outline-danger:hover {
    background-color: var(--color-danger);
    color: white;
}

.btn-icon {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
}

/* Spinner de Carregamento */
.spinner {
    width: 20px;
    height: 20px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 1s ease-in-out infinite;
    position: absolute;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

/* Mensagens de Feedback em Forms */
.feedback-msg {
    font-size: 0.875rem;
    margin-bottom: var(--space-md);
    text-align: center;
    min-height: 20px; /* Evita que o layout pule */
}
.feedback-msg.error { color: var(--color-danger); }
.feedback-msg.success { color: var(--color-success); }

/* =========================================
   TOASTS (Notificações Flutuantes)
========================================= */
.toast-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.toast {
    min-width: 250px;
    padding: var(--space-md);
    border-radius: var(--border-radius);
    color: white;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: slideIn 0.3s ease forwards;
}

.toast.success { background-color: var(--color-success); }
.toast.error { background-color: var(--color-danger); }
.toast.info { background-color: var(--color-primary); }

@keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}