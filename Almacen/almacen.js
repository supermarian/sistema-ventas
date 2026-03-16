import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { existeDuplicado } from './validaciones.js';

const firebaseConfig = {
    apiKey: "AIzaSyAy4En1r4frGng-tWFtA68FGLf0vupJ0AY",
    authDomain: "supermercado-marian.firebaseapp.com",
    projectId: "supermercado-marian",
    storageBucket: "supermercado-marian.firebasestorage.app",
    messagingSenderId: "627337795444",
    appId: "1:627337795444:web:e9a4cb48ff164b78477e21"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
let productosCache = [];
let busquedaActiva = false; 

// --- GESTIÓN DE BÚSQUEDA ---
window.ejecutarBusqueda = () => {
    busquedaActiva = true; 
    window.renderizarTabla();
};

// --- ESCUCHAR DATOS EN TIEMPO REAL ---
onSnapshot(collection(db, "productos"), (snap) => {
    productosCache = [];
    let idsNumericos = [0];
    
    snap.forEach(d => {
        const data = { idDoc: d.id, ...d.data() };
        productosCache.push(data);
        if (data.idSecuencial) idsNumericos.push(parseInt(data.idSecuencial));
    });

    const proximoId = Math.max(...idsNumericos) + 1;
    
    // CAMBIO: Solo autocompletar el ID si el formulario está vacío (Modo Nuevo Producto)
    const campoId = document.getElementById('secuencialProd');
    const editando = document.getElementById('editId').value;
    if (!editando && campoId.value === "") { 
        campoId.value = proximoId.toString().padStart(7, '0');
    }
    
    window.renderizarTabla();
});

// --- FUNCIÓN PARA MOSTRAR LA TABLA ---
window.renderizarTabla = () => {
    const busq = document.getElementById('busqueda').value.trim().toLowerCase();
    const cuerpo = document.getElementById('tablaCuerpo');
    const info = document.getElementById('txtInfo');
    
    cuerpo.innerHTML = "";
    let listaFinal = [];

    if (busq === "" && busquedaActiva) {
        listaFinal = [...productosCache].sort((a, b) => parseInt(b.idSecuencial) - parseInt(a.idSecuencial));
        info.innerText = `📋 Inventario Completo: ${listaFinal.length} artículos.`;
    } else if (busq !== "" && busquedaActiva) {
        listaFinal = productosCache.filter(p => 
            p.nombre.toLowerCase().includes(busq) || 
            (p.codigo && p.codigo.toLowerCase().includes(busq)) || 
            p.idSecuencial.includes(busq)
        ).sort((a, b) => parseInt(a.idSecuencial) - parseInt(b.idSecuencial));
        info.innerText = `🔍 Encontrados: ${listaFinal.length}`;
    } else {
        // Vista inicial: 10 más recientes
        listaFinal = [...productosCache]
            .sort((a, b) => parseInt(b.idSecuencial) - parseInt(a.idSecuencial))
            .slice(0, 10);
        info.innerText = "📌 Mostrando los 10 más recientes. Presiona Enter para buscar.";
    }

    listaFinal.forEach(p => {
        // Lógica visual para productos INACTIVOS
        const esInactivo = p.estatus === "INACTIVO";
        const trStyle = esInactivo ? "style='background:#f2f2f2; color:#999;'" : "";
        const badge = esInactivo ? "❌" : "✅";

        cuerpo.innerHTML += `
            <tr ${trStyle} onclick="window.cargarEdicion('${p.idDoc}','${p.idSecuencial}','${p.codigo || ''}','${p.nombre}',${p.precio},${p.stock},'${p.estatus || 'ACTIVO'}')">
                <td><span class="id-db">${p.idSecuencial}</span></td>
                <td>${p.codigo || 'S/C'}</td>
                <td><b>${p.nombre}</b></td>
                <td>RD$ ${p.precio}</td>
                <td>${p.stock}</td>
                <td style="text-align:center;">${badge}</td>
            </tr>`;
    });
    busquedaActiva = false; 
};

// --- GUARDAR NUEVO PRODUCTO ---
document.getElementById('btnGuardar').onclick = async () => {
    const nombre = document.getElementById('nomProd').value.trim();
    const idSec = document.getElementById('secuencialProd').value;
    const codBarra = document.getElementById('codBarra').value.trim();

    if(!nombre) return alert("El nombre es obligatorio");

    // Validaciones de Duplicados
    if (await existeDuplicado(db, 'idSecuencial', idSec)) return alert("❌ Error: Este ID ya fue usado.");
    if (codBarra && codBarra !== "" && await existeDuplicado(db, 'codigo', codBarra)) return alert("❌ Error: Código de barras duplicado.");

    await addDoc(collection(db, "productos"), {
        idSecuencial: idSec,
        codigo: codBarra || "S/C",
        nombre: nombre,
        precio: Number(document.getElementById('preProd').value) || 0,
        stock: Number(document.getElementById('stockProd').value) || 0,
        estatus: "ACTIVO", // Siempre se crea activo
        timestamp: Date.now()
    });
    alert("✅ ¡Producto Guardado!");
    limpiarForm();
};

// --- ACTUALIZAR PRODUCTO (Sin Eliminar) ---
window.actualizarProducto = async () => {
    const idDocActual = document.getElementById('editId').value;
    const codBarra = document.getElementById('codBarra').value.trim();

    if (codBarra && codBarra !== "S/C") {
        const duplicado = await existeDuplicado(db, 'codigo', codBarra, idDocActual);
        if (duplicado) return alert("❌ Error: El código ya pertenece a otro producto.");
    }

    await updateDoc(doc(db, "productos", idDocActual), {
        codigo: codBarra,
        nombre: document.getElementById('nomProd').value,
        precio: Number(document.getElementById('preProd').value),
        stock: Number(document.getElementById('stockProd').value),
        estatus: document.getElementById('estatusProd').value // Aquí guardamos el cambio de estatus
    });
    alert("✅ ¡Cambios guardados con éxito!");
    window.cancelarEdicion();
};

// --- UTILIDADES ---
window.cargarEdicion = (id, idSec, cod, nom, pre, sto, est) => {
    document.getElementById('editId').value = id;
    document.getElementById('secuencialProd').value = idSec;
    document.getElementById('codBarra').value = cod;
    document.getElementById('nomProd').value = nom;
    document.getElementById('preProd').value = pre;
    document.getElementById('stockProd').value = sto;
    document.getElementById('estatusProd').value = est || "ACTIVO";
    
    document.getElementById('formTitulo').innerText = "📝 Editando Producto";
    document.getElementById('btnGuardar').style.display = "none";
    document.getElementById('btnActualizar').style.display = "block";
    document.getElementById('btnCancelar').style.display = "block";
    window.scrollTo(0,0);
};

window.cancelarEdicion = () => {
    limpiarForm();
    document.getElementById('formTitulo').innerText = "+ Registrar Nuevo Producto";
    document.getElementById('btnGuardar').style.display = "block";
    document.getElementById('btnActualizar').style.display = "none";
    document.getElementById('btnCancelar').style.display = "none";
};

function limpiarForm() {
    document.getElementById('codBarra').value = "";
    document.getElementById('nomProd').value = "";
    document.getElementById('preProd').value = "";
    document.getElementById('stockProd').value = "";
    document.getElementById('estatusProd').value = "ACTIVO";
}


// --- LÓGICA DE ESCÁNER PROFESIONAL ---
let html5QrCode;
let estaEscaneando = false; 

// Estilo moderno para el contenedor de video (Reader)
const styleReader = `
    #reader {
        width: 100%;
        max-width: 400px;
        margin: auto;
        border: 4px solid #1a73e8; /* Borde moderno azul */
        border-radius: 12px;
        overflow: hidden;
        position: relative;
        box-shadow: 0 0 15px rgba(26, 115, 232, 0.4);
        display: none; /* Se oculta por defecto */
    }
    #reader video {
        border-radius: 8px;
    }
    #reader.scanning {
        animation: pulseBorder 1.5s infinite;
    }
    @keyframes pulseBorder {
        0% { box-shadow: 0 0 15px rgba(26, 115, 232, 0.4); }
        50% { box-shadow: 0 0 25px rgba(26, 115, 232, 0.8); }
        100% { box-shadow: 0 0 15px rgba(26, 115, 232, 0.4); }
    }
`;

// Insertar estilos CSS en el head
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = styleReader;
document.head.appendChild(styleSheet);


window.iniciarEscaner = () => {
    // Si ya está activo, no duplicamos
    if (estaEscaneando || (html5QrCode && html5QrCode.isScanning)) return; 
    
    // Feedback visual moderno: Mostrar y aplicar efecto
    const readerDiv = document.getElementById('reader');
    readerDiv.style.display = "block";
    readerDiv.classList.add('scanning');

    html5QrCode = new Html5Qrcode("reader");
    const config = { 
        fps: 20, 
        qrbox: { width: 280, height: 180 },
        aspectRatio: 1.0
    };

    html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
            const campoCod = document.getElementById('codBarra');

            // 1. Evitar lectura repetida del mismo código
            if (campoCod.value === decodedText && estaEscaneando) {
                return; 
            }

            // 2. Ejecutar lectura exitosa
            estaEscaneando = true; 
            campoCod.value = decodedText;
            
            // Sonido y Vibración profesional
            new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3').play();
            if (navigator.vibrate) navigator.vibrate(100);

            // 3. BÚSQUEDA AUTOMÁTICA: ¿Ya existe este producto?
            const productoEncontrado = productosCache.find(p => p.codigo === decodedText);
            if (productoEncontrado) {
                // Cargar datos para editar
                window.cargarEdicion(
                    productoEncontrado.idDoc, 
                    productoEncontrado.idSecuencial, 
                    productoEncontrado.codigo, 
                    productoEncontrado.nombre, 
                    productoEncontrado.precio, 
                    productoEncontrado.stock, 
                    productoEncontrado.estatus
                );
            }

            // Feedback visual rápido
            campoCod.style.border = "3px solid #34a853";
            
            // 4. Tiempo de espera (2 seg) antes de permitir la siguiente lectura
            setTimeout(() => {
                estaEscaneando = false;
                campoCod.style.border = "1px solid #ddd";
            }, 2000); 

        },
        (errorMessage) => {
            // Ignorar errores de escaneo
        }
    ).catch((err) => {
        console.error("Error al iniciar cámara:", err);
        alert("Asegúrate de dar permisos de cámara y usar HTTPS");
    });
};

// Detener cámara al salir, guardar o cancelar
window.detenerEscaner = () => {
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
            const readerDiv = document.getElementById('reader');
            readerDiv.innerHTML = "";
            readerDiv.style.display = "none";
            readerDiv.classList.remove('scanning');
            console.log("Cámara apagada");
        });
    }
};