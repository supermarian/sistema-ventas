// camara-js/lector-logica.js
let ultimoCodigoLeido = null;
let estaBloqueado = false;
const TIEMPO_ESPERA = 2500; // 2.5 segundos de espera

window.validarYProcesarLectura = (codigo) => {
    // 1. REGLA DE SEGURIDAD
    if (estaBloqueado && codigo === ultimoCodigoLeido) {
        return; // Ignoramos si es el mismo producto escaneado muy rápido
    }

    estaBloqueado = true;
    ultimoCodigoLeido = codigo;
    
    // Reproducir un sonido de beep (opcional pero muy recomendado)
    reproducirBeep();

    console.log("🔎 Escaneado:", codigo);
    
    // 2. BUSCAR EL PRODUCTO
    // Asumiendo que tu arreglo global de productos se llama 'state.productos' o 'state.productosDB'
    const listaProductos = state.productos || state.productosDB || [];
    
    // Buscar coincidencia exacta del código de barras
    const producto = listaProductos.find(p => p.codigoBarras === codigo || p.codigo === codigo);

    if (producto) {
        // 3. AGREGAR AL CARRITO
        // Si tienes una función global, úsala. Si usas POSCore, asegúrate de llamarlo bien.
        if (typeof window.seleccionarProductoDeLista === 'function') {
            // Esta función suele venir de pos-events.js o facturacion.html
            window.seleccionarProductoDeLista(producto);
            console.log("✅ Añadido al carrito:", producto.nombre);
        } else {
            alert(`✅ Escaneado: ${producto.nombre}\n(Asegúrate de conectar la función agregarAlCarrito)`);
        }
    } else {
        alert("⚠️ Producto no encontrado: " + codigo);
    }

    // 4. DESBLOQUEO DE SEGURIDAD
    setTimeout(() => {
        estaBloqueado = false;
        console.log("🔄 Listo para escanear de nuevo");
    }, TIEMPO_ESPERA);
};

// Función extra: Sonido de Beep para mejor experiencia de usuario
function reproducirBeep() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 800; // Tono del beep
        
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); // Volumen (0.1 = bajo)
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.start();
        setTimeout(() => oscillator.stop(), 100); // Duración de 100ms
    } catch(e) { console.log("Audio no soportado"); }
}