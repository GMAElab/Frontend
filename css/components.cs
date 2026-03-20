/* Substitua apenas estas partes no seu css/components.css */

.card {
    background-color: var(--bg-white);
    border-radius: var(--border-radius);
    padding: var(--space-lg);
    box-shadow: var(--box-shadow);
    border: 1px solid #e2e8f0; /* Borda super sutil */
    transition: box-shadow 0.3s ease;
}

.input-group input {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    font-size: 1rem;
    font-family: var(--font-family);
    transition: all 0.2s ease;
    background-color: #f8fafc;
}

.input-group input:focus {
    outline: none;
    border-color: var(--color-primary);
    background-color: #ffffff;
    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.15); /* Anel de foco suave */
}

.btn {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    padding: 12px 24px;
    font-size: 1rem;
    font-weight: 600;
    font-family: var(--font-family);
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    letter-spacing: 0.3px;
}

.btn-primary {
    background-color: var(--color-primary);
    color: white;
    box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
}

.btn-primary:hover:not(:disabled) {
    background-color: var(--color-primary-hover);
    transform: translateY(-1px); /* Efeito do botão subindo levemente */
    box-shadow: 0 6px 8px -1px rgba(37, 99, 235, 0.3);
}