(() => {
    const COLA_OFFLINE_KEY = 'supermarian_offline_queue';

    const leerCola = () => {
        try {
            const cola = JSON.parse(localStorage.getItem(COLA_OFFLINE_KEY) || '[]');
            return Array.isArray(cola) ? cola : [];
        } catch (error) {
            console.error('No se pudo leer la cola offline:', error);
            return [];
        }
    };

    window.offlineQueue = {
        list: leerCola,
        enqueue(operacion) {
            const cola = leerCola();
            const entrada = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                creadaEn: new Date().toISOString(),
                ...operacion
            };
            cola.push(entrada);
            localStorage.setItem(COLA_OFFLINE_KEY, JSON.stringify(cola));
            window.dispatchEvent(new Event('offlineQueueChanged'));
            return entrada;
        },
        remove(id) {
            const cola = leerCola().filter(entrada => entrada.id !== id);
            localStorage.setItem(COLA_OFFLINE_KEY, JSON.stringify(cola));
            window.dispatchEvent(new Event('offlineQueueChanged'));
        },
        update(id, cambios) {
            const cola = leerCola().map(entrada => entrada.id === id
                ? { ...entrada, ...cambios }
                : entrada);
            localStorage.setItem(COLA_OFFLINE_KEY, JSON.stringify(cola));
            window.dispatchEvent(new Event('offlineQueueChanged'));
        }
    };

    const mostrarEstado = () => {
        let aviso = document.getElementById('estadoConexion');
        if (!aviso) {
            aviso = document.createElement('div');
            aviso.id = 'estadoConexion';
            aviso.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;padding:8px;text-align:center;font:700 13px Segoe UI,sans-serif;display:none';
            document.body.appendChild(aviso);
        }
        const enLinea = navigator.onLine;
        const pendientes = leerCola().filter(entrada => ['PENDIENTE', 'SINCRONIZANDO', 'ERROR', 'CONFLICTO'].includes(entrada.estado)).length;
        const resumenCola = pendientes ? ` | VENTAS PENDIENTES: ${pendientes}` : '';
        aviso.textContent = enLinea ? `EN LÍNEA${resumenCola}` : `SIN INTERNET: los cambios deben sincronizarse al recuperar la conexión${resumenCola}`;
        aviso.style.display = 'block';
        aviso.style.background = enLinea ? '#d1e7dd' : '#f4df91';
        aviso.style.color = enLinea ? '#0f5132' : '#5f4b00';
        aviso.style.borderBottom = enLinea ? '1px solid #a3cfbb' : '1px solid #c9a227';
        document.body.style.paddingTop = '30px';
    };
    window.addEventListener('online', mostrarEstado);
    window.addEventListener('offline', mostrarEstado);
    window.addEventListener('offlineQueueChanged', mostrarEstado);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mostrarEstado);
    else mostrarEstado();

    if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
        navigator.serviceWorker.register('/sw.js').catch(error => {
            console.error('No se pudo registrar el service worker:', error);
        });
    }
})();
