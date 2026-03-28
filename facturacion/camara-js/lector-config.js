// camara-js/lector-config.js

export function iniciarEscaner() {
    const contenedor = document.getElementById('contenedor-lector');
    if (contenedor) contenedor.style.display = 'block';
    
    // MEJORA: Si ya existe una instancia activa, no creamos una nueva
    if (!window.html5QrCodeInstance) {
        window.html5QrCodeInstance = new Html5Qrcode("reader");
    }

    const config = { 
        fps: 15, 
        qrbox: { width: 250, height: 150 }
    };

    // Verificamos si ya está escaneando para evitar el error "Already scanning"
    if (window.html5QrCodeInstance.isScanning) return;

    window.html5QrCodeInstance.start(
        { facingMode: "environment" }, 
        config, 
        (decodedText) => {
            if (window.validarYProcesarLectura) {
                window.validarYProcesarLectura(decodedText);
            }
        }
    ).catch(err => {
        console.error("Error cámara:", err);
        // Si falla porque quedó abierta, intentamos resetearla
        window.detenerEscaner();
    });
}

export function detenerEscaner() {
    if (window.html5QrCodeInstance) {
        window.html5QrCodeInstance.stop()
            .then(() => {
                document.getElementById('contenedor-lector').style.display = 'none';
                console.log("Cámara apagada");
            })
            .catch(err => console.warn("La cámara ya estaba cerrada o hubo un error al detener:", err));
    } else {
        document.getElementById('contenedor-lector').style.display = 'none';
    }
}

window.iniciarEscaner = iniciarEscaner;
window.detenerEscaner = detenerEscaner;