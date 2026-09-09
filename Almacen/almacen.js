import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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
const auth = getAuth(app);
const functions = getFunctions(app, 'us-central1');
let productosCache = [];
let lineasRecepcion = [];
let busquedaActiva = false; 
const configStockRef = doc(db, 'configuracion-sistema', 'inventario');

auth.onAuthStateChanged(async user => {
    if (!user) return;
    const token = await user.getIdTokenResult();
    const esAdministrador = token.claims.admin === true || token.claims.rol === 'Administrador';
    const control = document.getElementById('permitirStockNegativo');
    if (!esAdministrador) {
        control.disabled = true;
        control.parentElement.style.opacity = '.6';
    }
    const configuracion = await getDoc(configStockRef);
    control.checked = configuracion.exists() && configuracion.data().permitirStockNegativo === true;
    control.addEventListener('change', async event => {
        if (!esAdministrador) return;
        await setDoc(configStockRef, { permitirStockNegativo: event.target.checked, actualizadoPor: user.uid, actualizadoEn: serverTimestamp() }, { merge: true });
    });
});

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
            <tr ${trStyle} onclick="window.cargarEdicion('${p.idDoc}','${p.idSecuencial}','${p.codigo || ''}','${p.nombre}',${p.precio},${p.stock},'${p.unidad || 'Und'}','${p.estatus || 'ACTIVO'}')">
                <td><span class="id-db">${p.idSecuencial}</span></td>
                <td>${p.codigo || 'S/C'}</td>
                <td><b>${p.nombre}</b></td>
                <td>RD$ ${p.precio}</td>
                <td>${p.stock}</td>
                <td>${p.unidad || 'Und'}</td>
                <td style="text-align:center;">${badge}</td>
            </tr>`;
    });
      const selector = document.getElementById('recepcionProducto');
      if (selector) {
          selector.replaceChildren(new Option('Selecciona un producto', ''));
          [...productosCache]
              .filter(producto => producto.estatus !== 'INACTIVO')
              .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)))
              .forEach(producto => selector.add(new Option(
                  `${producto.nombre} (${producto.idSecuencial || producto.idDoc})`,
                  producto.idDoc
              )));
      }
    busquedaActiva = false; 
};

window.agregarLineaRecepcion = () => {
    const productoId = document.getElementById('recepcionProducto').value;
    const producto = productosCache.find(item => item.idDoc === productoId);
    const cantidad = Number(document.getElementById('recepcionCantidad').value);
    const cantidadBonificada = Number(document.getElementById('recepcionBonificada').value || 0);
    const costoUnitario = Number(document.getElementById('recepcionCosto').value);
    if (!producto || !Number.isFinite(cantidad) || cantidad <= 0
        || !Number.isFinite(cantidadBonificada) || cantidadBonificada < 0
        || !Number.isFinite(costoUnitario) || costoUnitario < 0) {
        return alert('Selecciona un producto e indica cantidades y costo válidos.');
    }
    if (lineasRecepcion.some(linea => linea.productoId === productoId)) {
        return alert('Ese producto ya está agregado a la recepción.');
    }
    lineasRecepcion.push({
        productoId,
        codigo: producto.codigo || '',
        descripcion: producto.nombre,
        unidad: producto.unidad || 'Und',
        cantidad,
        cantidadBonificada,
        costoUnitario,
        descuento: 0,
        itbis: 0
    });
    window.renderizarLineasRecepcion();
    document.getElementById('recepcionProducto').value = '';
    document.getElementById('recepcionCantidad').value = '';
    document.getElementById('recepcionBonificada').value = '0';
    document.getElementById('recepcionCosto').value = '';
};

window.renderizarLineasRecepcion = () => {
    const cuerpo = document.getElementById('recepcionLineas');
    if (!cuerpo) return;
    cuerpo.innerHTML = lineasRecepcion.map((linea, indice) => `
        <tr>
            <td>${linea.descripcion}</td>
            <td>${linea.cantidad}</td>
            <td>${linea.cantidadBonificada}</td>
            <td>RD$ ${linea.costoUnitario.toFixed(2)}</td>
            <td><button type="button" onclick="window.quitarLineaRecepcion(${indice})">Quitar</button></td>
        </tr>`).join('');
};

window.quitarLineaRecepcion = indice => {
    lineasRecepcion.splice(indice, 1);
    window.renderizarLineasRecepcion();
};

window.aplicarRecepcion = async () => {
    const boton = document.getElementById('btnAplicarRecepcion');
    const datos = {
        proveedorId: document.getElementById('recepcionProveedorId').value.trim(),
        proveedorNombre: document.getElementById('recepcionProveedorNombre').value.trim(),
        almacenId: document.getElementById('recepcionAlmacenId').value.trim(),
        numeroFactura: document.getElementById('recepcionNumeroFactura').value.trim(),
        lineas: lineasRecepcion
    };
    if (!datos.proveedorId || !datos.almacenId || !datos.numeroFactura || !datos.lineas.length) {
        return alert('Completa proveedor, almacén, factura y agrega al menos una línea.');
    }
    boton.disabled = true;
    try {
        const respuesta = await httpsCallable(functions, 'registrarRecepcionCompra')(datos);
        alert(respuesta.data.estado === 'YA_APLICADA'
            ? 'Esta recepción ya estaba aplicada.'
            : 'Recepción aplicada y movimiento de inventario registrado.');
        lineasRecepcion = [];
        window.renderizarLineasRecepcion();
        document.getElementById('recepcionNumeroFactura').value = '';
    } catch (error) {
        console.error(error);
        alert(error.message || 'No se pudo aplicar la recepción.');
    } finally {
        boton.disabled = false;
    }
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
        unidad: document.getElementById('unidadProd').value,
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
    const productoAnterior = productosCache.find(producto => producto.idDoc === idDocActual);
    const precioNuevo = Number(document.getElementById('preProd').value);

    if (codBarra && codBarra !== "S/C") {
        const duplicado = await existeDuplicado(db, 'codigo', codBarra, idDocActual);
        if (duplicado) return alert("❌ Error: El código ya pertenece a otro producto.");
    }

    await updateDoc(doc(db, "productos", idDocActual), {
        codigo: codBarra,
        nombre: document.getElementById('nomProd').value,
        precio: precioNuevo,
        unidad: document.getElementById('unidadProd').value,
        estatus: document.getElementById('estatusProd').value // Aquí guardamos el cambio de estatus
    });
    const diferencia = precioNuevo - Number(productoAnterior?.precio || 0);
    if (productoAnterior && Math.abs(diferencia) > 0.009) {
        await addDoc(collection(db, "alertas_auditoria"), {
            tipo: Math.abs(diferencia) > Math.max(100, Math.abs(Number(productoAnterior.precio || 0)) * 0.2) ? "CAMBIO_PRECIO_IMPORTANTE" : "CAMBIO_PRECIO",
            idProducto: idDocActual, producto: document.getElementById('nomProd').value.trim(),
            precioAnterior: Number(productoAnterior.precio || 0), precioNuevo, diferencia,
            usuarioUid: auth.currentUser?.uid || "", cajeroEmail: auth.currentUser?.email || "",
            dispositivo: navigator.userAgent, fecha: serverTimestamp(), estado: "PENDIENTE",
            ventasObjetivo: 5, ventasRegistradas: 0
        });
    }
    alert("✅ ¡Cambios guardados con éxito!");
    window.cancelarEdicion();
};

// --- UTILIDADES ---
window.cargarEdicion = (id, idSec, cod, nom, pre, sto, unidad, est) => {
    document.getElementById('editId').value = id;
    document.getElementById('secuencialProd').value = idSec;
    document.getElementById('codBarra').value = cod;
    document.getElementById('nomProd').value = nom;
    document.getElementById('preProd').value = pre;
    document.getElementById('stockProd').value = sto;
    document.getElementById('stockProd').disabled = true;
    document.getElementById('unidadProd').value = unidad || "Und";
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
      document.getElementById('stockProd').disabled = false;
};

function limpiarForm() {
    document.getElementById('codBarra').value = "";
    document.getElementById('nomProd').value = "";
    document.getElementById('preProd').value = "";
    document.getElementById('stockProd').value = "";
    document.getElementById('unidadProd').value = "Und";
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