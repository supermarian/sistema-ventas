(() => {
    const defaultTheme = 'light';
    let userKey = 'global';

    const storageKey = () => `supermarian-theme-${userKey}`;
    const getTheme = () => localStorage.getItem(storageKey()) || localStorage.getItem('supermarian-theme-global') || defaultTheme;
    const applyTheme = theme => {
        const nextTheme = theme === 'dark' ? 'dark' : 'light';
        document.documentElement.dataset.theme = nextTheme;
        document.querySelectorAll('[data-theme-toggle]').forEach(button => {
            const dark = nextTheme === 'dark';
            button.setAttribute('aria-pressed', String(dark));
            button.setAttribute('title', dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
            button.querySelector('.theme-icon')?.replaceChildren(document.createTextNode(dark ? '☀️' : '🌙'));
            const label = button.querySelector('.theme-label');
            if (label) label.textContent = dark ? 'Modo claro' : 'Modo oscuro';
        });
    };

    const saveTheme = theme => {
        localStorage.setItem(storageKey(), theme);
        applyTheme(theme);
    };

    const bind = () => document.querySelectorAll('[data-theme-toggle]').forEach(button => {
        if (button.dataset.themeBound) return;
        button.dataset.themeBound = 'true';
        button.addEventListener('click', () => saveTheme(getTheme() === 'dark' ? 'light' : 'dark'));
    });

    window.SistemaTema = {
        setUsuario(uid) {
            userKey = String(uid || 'global').replace(/[^a-zA-Z0-9_-]/g, '_') || 'global';
            applyTheme(getTheme());
            bind();
        },
        aplicar(theme) { saveTheme(theme); }
    };

    applyTheme(getTheme());
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
    else bind();
})();
