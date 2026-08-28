(() => {
    const mostrarEstado = () => {
        let aviso = document.getElementById('estadoConexion');
        if (!aviso) {
            aviso = document.createElement('div');
            aviso.id = 'estadoConexion';
            aviso.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;padding:8px;text-align:center;font:700 13px Segoe UI,sans-serif;display:none';
            document.body.appendChild(aviso);
        }
        const enLinea = navigator.onLine;
        aviso.textContent = enLinea ? 'EN LÍNEA' : 'SIN INTERNET: los cambios deben sincronizarse al recuperar la conexión';
        aviso.style.display = 'block';
        aviso.style.background = enLinea ? '#d1e7dd' : '#f4df91';
        aviso.style.color = enLinea ? '#0f5132' : '#5f4b00';
        aviso.style.borderBottom = enLinea ? '1px solid #a3cfbb' : '1px solid #c9a227';
        document.body.style.paddingTop = '30px';
    };
    window.addEventListener('online', mostrarEstado);
    window.addEventListener('offline', mostrarEstado);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mostrarEstado);
    else mostrarEstado();
})();
