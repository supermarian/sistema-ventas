import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, getDoc, getDocs, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
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
const storage = getStorage(app);
const functions = getFunctions(app, 'us-central1');
let productosCache = [];
let imagenesProductoActual = [];
let imagenesNuevas = [];
let imagenesEliminadas = [];
let lineasRecepcion = [];
let recepcionValidada = false;
let modoItbisBloqueado = null;
let tasaItbisBloqueada = null;

const calcularCostosRecepcion = () => {
    const tasa = Number(document.getElementById('recepcionTasaItbis')?.value || 0) / 100;
    const flete = Number(document.getElementById('recepcionFlete')?.value || 0);
    const modo = document.getElementById('recepcionModoItbis')?.value || 'SIN_ITBIS';
    const subtotalBase = lineasRecepcion.reduce((total, linea) => total + linea.cantidad * linea.costoUnitario - linea.descuento, 0);
    return lineasRecepcion.map(linea => {
        const base = linea.cantidad * linea.costoUnitario - linea.descuento;
        const fleteDistribuido = subtotalBase > 0 ? flete * base / subtotalBase : 0;
        const itbis = base * tasa;
        return { ...linea, itbis, fleteDistribuido, costoConFlete: base + fleteDistribuido };
    });
};

const prepararAutorizacionMargen = (costo, precio, margen) => {
    const minimo = costo > 0 ? costo * (1 + margen / 100) : 0;
    if (costo <= 0 || precio >= minimo) return null;
    const motivo = document.getElementById('motivoMargen').value.trim();
    if (!motivo) throw new Error('Indica el motivo para autorizar un precio bajo el margen mínimo.');
    return {
        autorizadoPor: auth.currentUser?.uid || '',
        autorizadoEmail: auth.currentUser?.email || '',
        motivo,
        autorizadoEn: new Date().toISOString()
    };
};

const comprimirImagen = archivo => new Promise((resolve, reject) => {
    const imagen = new Image();
    const url = URL.createObjectURL(archivo);
    imagen.onload = () => {
        const escala = Math.min(1, 1600 / Math.max(imagen.width, imagen.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(imagen.width * escala));
        canvas.height = Math.max(1, Math.round(imagen.height * escala));
        canvas.getContext('2d').drawImage(imagen, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
            URL.revokeObjectURL(url);
            if (!blob) return reject(new Error('No se pudo comprimir la imagen.'));
            resolve(blob);
        }, 'image/webp', 0.82);
    };
    imagen.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('El archivo seleccionado no es una imagen válida.'));
    };
    imagen.src = url;
});

const renderGaleriaProducto = () => {
    const galeria = document.getElementById('galeriaProducto');
    if (!galeria) return;
    const existentes = imagenesProductoActual.map((imagen, indice) => `
        <div class="foto-producto">
            <img src="${imagen.url}" alt="${imagen.alt || 'Foto del producto'}">
            <button type="button" title="Quitar foto" onclick="window.quitarImagenProducto(${indice}, false)">×</button>
            <small>${imagen.esPrincipal ? 'Principal' : 'Guardada'}</small>
        </div>`).join('');
    const nuevas = imagenesNuevas.map((imagen, indice) => `
        <div class="foto-producto">
            <img src="${imagen.previewUrl}" alt="Vista previa del producto">
            <button type="button" title="Quitar foto" onclick="window.quitarImagenProducto(${indice}, true)">×</button>
            <small>${indice === 0 && !imagenesProductoActual.length ? 'Principal' : 'Nueva'}</small>
        </div>`).join('');
    galeria.innerHTML = existentes + nuevas || '<span class="info-tag">Aún no hay fotos asociadas.</span>';
};

const subirImagenesProducto = async productoId => {
    const subidas = [];
    for (const [indice, imagen] of imagenesNuevas.entries()) {
        const blob = await comprimirImagen(imagen.file);
        const ruta = `productos/${productoId}/${Date.now()}-${indice}.webp`;
        const referencia = ref(storage, ruta);
        await uploadBytes(referencia, blob, { contentType: 'image/webp' });
        subidas.push({
            url: await getDownloadURL(referencia),
            path: ruta,
            alt: imagen.file.name.replace(/\.[^.]+$/, '').slice(0, 120),
            esPrincipal: !imagenesProductoActual.length && indice === 0,
            orden: imagenesProductoActual.length + indice + 1
        });
    }
    return [...imagenesProductoActual, ...subidas];
};

window.quitarImagenProducto = async (indice, esNueva) => {
    if (esNueva) {
        URL.revokeObjectURL(imagenesNuevas[indice]?.previewUrl || '');
        imagenesNuevas.splice(indice, 1);
        renderGaleriaProducto();
        return;
    }
    const imagen = imagenesProductoActual[indice];
    if (!imagen) return;
    if (!confirm('¿Quitar esta foto del producto?')) return;
    try {
        imagenesEliminadas.push(imagen);
        imagenesProductoActual.splice(indice, 1);
        if (imagenesProductoActual.length) imagenesProductoActual[0].esPrincipal = true;
        renderGaleriaProducto();
        document.getElementById('estadoImagenesProducto').textContent = 'Foto quitada. Guarda los cambios para confirmar.';
    } catch (error) {
        console.error(error);
        alert('No se pudo quitar la foto. Revisa la conexión y los permisos.');
    }
};

document.getElementById('imagenesProducto').addEventListener('change', event => {
    for (const file of event.target.files) {
        if (!file.type.startsWith('image/')) continue;
        imagenesNuevas.push({ file, previewUrl: URL.createObjectURL(file) });
    }
    event.target.value = '';
    renderGaleriaProducto();
    document.getElementById('estadoImagenesProducto').textContent = `${imagenesNuevas.length} foto(s) nueva(s) pendiente(s) de guardar.`;
});

const actualizarResumenCostos = () => {
    const lineas = calcularCostosRecepcion();
    const subtotal = lineas.reduce((total, linea) => total + linea.cantidad * linea.costoUnitario - linea.descuento, 0);
    const itbis = lineas.reduce((total, linea) => total + linea.itbis, 0);
    const flete = lineas.reduce((total, linea) => total + linea.fleteDistribuido, 0);
    const resumen = document.getElementById('resumenCostosRecepcion');
    if (resumen) resumen.textContent = `Base: RD$ ${subtotal.toFixed(2)} · ITBIS: RD$ ${itbis.toFixed(2)} · Flete distribuido: RD$ ${flete.toFixed(2)} · Total estimado: RD$ ${(subtotal + itbis + flete).toFixed(2)}`;
};
const modoRapido = new URLSearchParams(window.location.search).get('modo') === 'rapido';

if (modoRapido) {
    document.title = 'Súper Marian - Entrada rápida';
    document.getElementById('tituloModulo').textContent = '🧾 Entrada rápida de factura';
    document.getElementById('gestionProductosCard').hidden = true;
    document.getElementById('consultaInventarioCard').hidden = true;
    document.getElementById('historialRecepcionesCard').hidden = true;
    document.getElementById('catalogosComprasCard').hidden = true;
    document.getElementById('recepcionCard').scrollIntoView({ block: 'start' });
}
let busquedaActiva = false; 
const configStockRef = doc(db, 'configuracion-sistema', 'inventario');
let proveedoresCache = [];

const cargarOpcionesCatalogo = (coleccion, selectorId, formatear) => onSnapshot(collection(db, coleccion), snapshot => {
    const selector = document.getElementById(selectorId);
    if (!selector) return;
    const actual = selector.value;
    selector.replaceChildren(new Option(coleccion === 'proveedores' ? 'Selecciona un proveedor' : 'Selecciona un almacén', ''));
    snapshot.docs
        .map(documento => ({ id: documento.id, ...documento.data() }))
        .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)))
        .forEach(item => selector.add(new Option(formatear(item), item.id)));
    if (actual) selector.value = actual;
});

cargarOpcionesCatalogo('proveedores', 'recepcionProveedorId', proveedor => proveedor.nombre);
cargarOpcionesCatalogo('almacenes', 'recepcionAlmacenId', almacen => `${almacen.nombre}${almacen.sucursal ? ` · ${almacen.sucursal}` : ''}`);

document.getElementById('recepcionProveedorId').addEventListener('change', event => {
    const opcion = event.target.selectedOptions[0];
    const proveedor = proveedoresCache.find(item => item.id === event.target.value);
    document.getElementById('recepcionProveedorNombre').value = opcion?.textContent || '';
    document.getElementById('recepcionCondicionPago').value = proveedor?.condicionPago || 'CONTADO';
    document.getElementById('recepcionDiasVencimiento').value = proveedor?.diasVencimiento || 0;
    window.actualizarFechaVencimiento();
});

onSnapshot(collection(db, 'proveedores'), snapshot => {
    proveedoresCache = snapshot.docs.map(documento => ({ id: documento.id, ...documento.data() }));
});

window.actualizarFechaVencimiento = () => {
    const fecha = document.getElementById('recepcionFechaFactura').value;
    const dias = Number(document.getElementById('recepcionDiasVencimiento').value || 0);
    const condicion = document.getElementById('recepcionCondicionPago').value;
    if (!fecha || condicion !== 'CREDITO' || dias <= 0) {
        document.getElementById('recepcionFechaVencimiento').value = '';
        return;
    }
    const vencimiento = new Date(`${fecha}T00:00:00`);
    vencimiento.setDate(vencimiento.getDate() + dias);
    document.getElementById('recepcionFechaVencimiento').value = vencimiento.toISOString().slice(0, 10);
};

document.getElementById('recepcionFechaFactura').addEventListener('change', window.actualizarFechaVencimiento);
document.getElementById('recepcionCondicionPago').addEventListener('change', window.actualizarFechaVencimiento);
document.getElementById('recepcionModoItbis').addEventListener('change', event => {
    if (lineasRecepcion.length && modoItbisBloqueado !== event.target.value) {
        event.target.value = modoItbisBloqueado;
        alert('El modo Con/Sin ITBIS ya está usado por las líneas. Termina o limpia esta factura antes de cambiarlo.');
        return;
    }
    actualizarResumenCostos();
});
document.getElementById('recepcionTasaItbis').addEventListener('input', event => {
    if (lineasRecepcion.length && tasaItbisBloqueada !== Number(event.target.value || 0)) {
        event.target.value = tasaItbisBloqueada;
        alert('La tasa de ITBIS ya está usada por las líneas. Termina o limpia esta factura antes de cambiarla.');
        return;
    }
    actualizarResumenCostos();
});
document.getElementById('recepcionFlete').addEventListener('input', actualizarResumenCostos);

window.guardarProveedorCatalogo = async () => {
    const nombre = document.getElementById('nuevoProveedorNombre').value.trim();
    const identificacion = document.getElementById('nuevoProveedorIdentificacion').value.trim();
    if (!nombre) return alert('Indica el nombre del proveedor.');
    const condicionPago = document.getElementById('nuevoProveedorCondicion').value;
    const diasVencimiento = Number(document.getElementById('nuevoProveedorDias').value || 0);
    await addDoc(collection(db, 'proveedores'), { nombre, identificacion, condicionPago, diasVencimiento, activo: true, creadoEn: serverTimestamp() });
    document.getElementById('nuevoProveedorNombre').value = '';
    document.getElementById('nuevoProveedorIdentificacion').value = '';
};

window.guardarAlmacenCatalogo = async () => {
    const nombre = document.getElementById('nuevoAlmacenNombre').value.trim();
    const sucursal = document.getElementById('nuevoAlmacenSucursal').value.trim();
    if (!nombre) return alert('Indica el nombre del almacén.');
    await addDoc(collection(db, 'almacenes'), { nombre, sucursal, activo: true, creadoEn: serverTimestamp() });
    document.getElementById('nuevoAlmacenNombre').value = '';
    document.getElementById('nuevoAlmacenSucursal').value = '';
};

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

const escaparHtml = valor => String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

onSnapshot(collection(db, 'recepciones_compras'), snapshot => {
    const cuerpo = document.getElementById('historialRecepcionesBody');
    if (!cuerpo) return;
    const recepciones = snapshot.docs
        .map(documento => ({ id: documento.id, ...documento.data() }))
        .sort((a, b) => {
            const fechaA = (a.actualizadoEn || a.aplicadoEn || a.creadoEn)?.toMillis?.() || 0;
            const fechaB = (b.actualizadoEn || b.aplicadoEn || b.creadoEn)?.toMillis?.() || 0;
            return fechaB - fechaA;
        });
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const limite = new Date(hoy);
    limite.setDate(limite.getDate() + 7);
    const estadoPago = recepcion => {
        if (recepcion.estado !== 'APLICADA' || recepcion.condicionPago !== 'CREDITO' || !recepcion.fechaVencimiento) return { texto: 'No aplica', clase: '' };
        const vencimiento = new Date(`${recepcion.fechaVencimiento}T00:00:00`);
        if (vencimiento < hoy) return { texto: 'VENCIDA', clase: 'style="color:#b42318;font-weight:700"' };
        if (vencimiento <= limite) return { texto: 'POR VENCER', clase: 'style="color:#b54708;font-weight:700"' };
        return { texto: 'Vigente', clase: '' };
    };
    const pagos = recepciones.map(estadoPago);
    document.getElementById('recepcionesVencidas').textContent = pagos.filter(pago => pago.texto === 'VENCIDA').length;
    document.getElementById('recepcionesPorVencer').textContent = pagos.filter(pago => pago.texto === 'POR VENCER').length;
    document.getElementById('recepcionesCredito').textContent = pagos.filter(pago => pago.texto !== 'No aplica').length;
    cuerpo.innerHTML = recepciones.length ? recepciones.map((recepcion, indice) => {
        const fecha = (recepcion.actualizadoEn || recepcion.aplicadoEn || recepcion.creadoEn)?.toDate?.().toLocaleString() || '---';
        const estado = escaparHtml(recepcion.estado || 'BORRADOR');
        const pago = pagos[indice];
        return `<tr><td>${escaparHtml(fecha)}</td><td>${escaparHtml(recepcion.numeroFactura || '---')}</td><td>${escaparHtml(recepcion.proveedorNombre || recepcion.proveedorId || '---')}</td><td>${escaparHtml(recepcion.condicionPago || 'CONTADO')} · ${Number(recepcion.diasVencimiento || 0)} días</td><td>${escaparHtml(recepcion.fechaVencimiento || '---')}</td><td>RD$ ${Number(recepcion.total || recepcion.subtotal || 0).toFixed(2)}</td><td>${escaparHtml(recepcion.usuarioId || '---')}</td><td><strong>${estado}</strong></td><td ${pago.clase}>${pago.texto}</td><td><button type="button" onclick="window.verDetalleRecepcion('${escaparHtml(recepcion.id)}')">Ver detalle</button></td></tr>`;
    }).join('') : '<tr><td colspan="10">No hay entradas registradas.</td></tr>';
}, error => console.error('No se pudo cargar el historial de recepciones:', error));

window.verDetalleRecepcion = async recepcionId => {
    const recepcion = await getDoc(doc(db, 'recepciones_compras', recepcionId));
    if (!recepcion.exists()) return alert('La entrada ya no está disponible.');
    const datos = recepcion.data();
    const fecha = (datos.actualizadoEn || datos.aplicadoEn || datos.creadoEn)?.toDate?.().toLocaleString() || '---';
    const formato = valor => `RD$ ${Number(valor || 0).toFixed(2)}`;
    document.getElementById('detalleRecepcionCabecera').innerHTML = [
        ['Factura', datos.numeroFactura || '---'],
        ['Suplidor', datos.proveedorNombre || datos.proveedorId || '---'],
        ['Almacén', datos.almacenId || '---'],
        ['Fecha', fecha],
        ['Condición', `${datos.condicionPago || 'CONTADO'} · ${Number(datos.diasVencimiento || 0)} días`],
        ['Vencimiento', datos.fechaVencimiento || '---'],
        ['Total', formato(datos.total || datos.subtotal)],
        ['Estado', datos.estado || 'BORRADOR']
    ].map(([etiqueta, valor]) => `<div class="detalle-dato"><small>${escaparHtml(etiqueta)}</small><strong>${escaparHtml(valor)}</strong></div>`).join('');
    const lineas = await getDocs(collection(db, 'recepciones_compras', recepcionId, 'lineas'));
    document.getElementById('detalleRecepcionLineas').innerHTML = lineas.empty
        ? '<tr><td colspan="6">Esta entrada no tiene líneas guardadas.</td></tr>'
        : lineas.docs.map(linea => {
            const datosLinea = linea.data();
            const total = datosLinea.total ?? Number(datosLinea.cantidad || 0) * Number(datosLinea.costoUnitario || 0) - Number(datosLinea.descuento || 0);
            return `<tr><td>${escaparHtml(datosLinea.descripcion || datosLinea.productoId)}<br><small>Ref: ${escaparHtml(datosLinea.referenciaEmpresa || 'Sin referencia')}</small></td><td>${escaparHtml(datosLinea.unidad || 'Und')}</td><td>${escaparHtml(datosLinea.cantidad)}</td><td>${escaparHtml(datosLinea.cantidadBonificada || 0)}</td><td>${formato(datosLinea.costoUnitario)}</td><td>${formato(total)}</td></tr>`;
        }).join('');
    document.getElementById('modalDetalleRecepcion').hidden = false;
};

window.cerrarDetalleRecepcion = () => {
    document.getElementById('modalDetalleRecepcion').hidden = true;
};

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
            <tr ${trStyle} onclick="window.cargarEdicion('${p.idDoc}','${p.idSecuencial}','${p.codigo || ''}','${p.referenciaEmpresa || ''}','${p.nombre}',${p.precio},${p.stock},'${p.unidad || 'Und'}','${p.estatus || 'ACTIVO'}')">
                <td><span class="id-db">${p.idSecuencial}</span></td>
                <td>${p.codigo || 'S/C'}</td>
                <td><b>${p.nombre}</b></td>
                <td>RD$ ${p.precio}</td>
                <td>${p.stock}</td>
                <td>${p.unidad || 'Und'}</td>
                <td style="text-align:center;">${badge}</td>
            </tr>`;
    });
    busquedaActiva = false; 
};

const normalizarBusqueda = valor => String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

window.buscarProductosRecepcion = () => {
    const texto = normalizarBusqueda(document.getElementById('recepcionProductoBusqueda').value);
    const resultados = document.getElementById('recepcionResultados');
    if (!texto) {
        resultados.hidden = true;
        resultados.replaceChildren();
        return;
    }
    const coincidencias = productosCache
        .filter(producto => producto.estatus !== 'INACTIVO')
        .filter(producto => [producto.nombre, producto.codigo, producto.idSecuencial]
            .some(valor => normalizarBusqueda(valor).includes(texto)))
        .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)))
        .slice(0, 12);
    resultados.replaceChildren();
    if (!coincidencias.length) {
        resultados.innerHTML = '<div class="recepcion-result"><span>No encontramos ese producto</span></div>';
    } else {
        coincidencias.forEach(producto => {
            const opcion = document.createElement('button');
            opcion.type = 'button';
            opcion.className = 'recepcion-result';
            opcion.innerHTML = `<strong>${producto.nombre}</strong><small>${producto.codigo || 'S/C'} · ID ${producto.idSecuencial || producto.idDoc}</small>`;
            opcion.addEventListener('click', () => window.seleccionarProductoRecepcion(producto));
            resultados.appendChild(opcion);
        });
    }
    resultados.hidden = false;
};

window.seleccionarProductoRecepcion = producto => {
    document.getElementById('recepcionProducto').value = producto.idDoc;
    document.getElementById('recepcionProductoBusqueda').value = producto.nombre;
    document.getElementById('recepcionProductoSeleccionado').textContent = `Seleccionado: ${producto.nombre} · Stock actual: ${producto.stock ?? 0}`;
    document.getElementById('recepcionResultados').hidden = true;
};

document.getElementById('recepcionProductoBusqueda').addEventListener('input', window.buscarProductosRecepcion);
document.getElementById('recepcionProductoBusqueda').addEventListener('keydown', event => {
    if (event.key === 'Escape') document.getElementById('recepcionResultados').hidden = true;
});

window.agregarLineaRecepcion = () => {
    const productoId = document.getElementById('recepcionProducto').value;
    const producto = productosCache.find(item => item.idDoc === productoId);
    const cantidad = Number(document.getElementById('recepcionCantidad').value);
    const cantidadBonificada = Number(document.getElementById('recepcionBonificada').value || 0);
    const costoCapturado = Number(document.getElementById('recepcionCosto').value);
    const modoItbis = document.getElementById('recepcionModoItbis').value;
    const tasaItbis = Number(document.getElementById('recepcionTasaItbis').value || 0) / 100;
    const costoUnitario = modoItbis === 'CON_ITBIS' ? costoCapturado / (1 + tasaItbis) : costoCapturado;
    if (!producto || !Number.isFinite(costoCapturado) || costoCapturado < 0 || !Number.isFinite(cantidad) || cantidad <= 0
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
        referenciaEmpresa: producto.referenciaEmpresa || '',
        descripcion: producto.nombre,
        unidad: producto.unidad || 'Und',
        cantidad,
        cantidadBonificada,
        costoUnitario,
        descuento: 0,
        itbis: 0,
        costoCapturado,
        modoItbis,
        tasaItbis: tasaItbis * 100
    });
    modoItbisBloqueado = modoItbis;
    tasaItbisBloqueada = Number(document.getElementById('recepcionTasaItbis').value || 0);
    recepcionValidada = false;
    document.getElementById('btnAplicarRecepcion').disabled = true;
    document.getElementById('estadoValidacionRecepcion').textContent = 'La factura cambió. Debes validarla nuevamente.';
    window.renderizarLineasRecepcion();
    actualizarResumenCostos();
    document.getElementById('recepcionProducto').value = '';
    document.getElementById('recepcionProductoBusqueda').value = '';
    document.getElementById('recepcionProductoSeleccionado').textContent = 'Ningún producto seleccionado';
    document.getElementById('recepcionCantidad').value = '';
    document.getElementById('recepcionBonificada').value = '0';
    document.getElementById('recepcionCosto').value = '';
};

window.renderizarLineasRecepcion = () => {
    const cuerpo = document.getElementById('recepcionLineas');
    if (!cuerpo) return;
    const lineasCalculadas = calcularCostosRecepcion();
    cuerpo.innerHTML = lineasCalculadas.map((linea, indice) => `
        <tr>
            <td>${linea.descripcion}<br><small>Ref: ${linea.referenciaEmpresa || 'Sin referencia'}</small></td>
            <td>${linea.cantidad}</td>
            <td>${linea.cantidadBonificada}</td>
            <td>RD$ ${linea.costoUnitario.toFixed(2)}<br><small>Flete: RD$ ${linea.fleteDistribuido.toFixed(2)}</small></td>
            <td><button type="button" onclick="window.quitarLineaRecepcion(${indice})">Quitar</button></td>
        </tr>`).join('');
};

window.quitarLineaRecepcion = indice => {
    lineasRecepcion.splice(indice, 1);
    if (!lineasRecepcion.length) {
        modoItbisBloqueado = null;
        tasaItbisBloqueada = null;
    }
    recepcionValidada = false;
    document.getElementById('btnAplicarRecepcion').disabled = true;
    document.getElementById('estadoValidacionRecepcion').textContent = 'La factura cambió. Debes validarla nuevamente.';
    window.renderizarLineasRecepcion();
    actualizarResumenCostos();
};

window.validarRecepcion = async () => {
    const proveedor = document.getElementById('recepcionProveedorId').value.trim();
    const almacen = document.getElementById('recepcionAlmacenId').value.trim();
    const factura = document.getElementById('recepcionNumeroFactura').value.trim();
    if (!proveedor || !almacen || !factura || !lineasRecepcion.length) {
        return alert('Completa proveedor, almacén, factura y agrega al menos una línea.');
    }
    const boton = document.getElementById('btnValidarRecepcion');
    boton.disabled = true;
    try {
        const lineasCalculadas = calcularCostosRecepcion();
        const respuesta = await httpsCallable(functions, 'guardarBorradorRecepcion')({
            proveedorId: proveedor,
            proveedorNombre: document.getElementById('recepcionProveedorNombre').value.trim(),
            almacenId: almacen,
            numeroFactura: factura,
            fechaFactura: document.getElementById('recepcionFechaFactura').value || null,
            fechaVencimiento: document.getElementById('recepcionFechaVencimiento').value || null,
            condicionPago: document.getElementById('recepcionCondicionPago').value,
            diasVencimiento: Number(document.getElementById('recepcionDiasVencimiento').value || 0),
            lineas: lineasCalculadas,
            descuentos: lineasCalculadas.reduce((total, linea) => total + Number(linea.descuento || 0), 0),
            itbis: lineasCalculadas.reduce((total, linea) => total + linea.itbis, 0),
            flete: lineasCalculadas.reduce((total, linea) => total + linea.fleteDistribuido, 0),
            total: lineasCalculadas.reduce((total, linea) => total + linea.cantidad * linea.costoUnitario - linea.descuento + linea.itbis + linea.fleteDistribuido, 0)
        });
        const subtotal = lineasCalculadas.reduce((total, linea) => total + linea.cantidad * linea.costoUnitario - linea.descuento, 0);
        recepcionValidada = true;
        document.getElementById('estadoValidacionRecepcion').textContent = `Borrador guardado y validado: ${lineasCalculadas.length} línea(s), subtotal RD$ ${subtotal.toFixed(2)}. Ya puedes aplicarla al inventario.`;
        document.getElementById('btnAplicarRecepcion').disabled = false;
        document.getElementById('btnValidarRecepcion').dataset.recepcionId = respuesta.data.idRecepcion;
    } catch (error) {
        alert(error.message || 'No se pudo guardar el borrador.');
    } finally {
        boton.disabled = false;
    }
};

window.aplicarRecepcion = async () => {
    const boton = document.getElementById('btnAplicarRecepcion');
    if (!recepcionValidada) return alert('Primero valida la recepción.');
    const lineasCalculadas = calcularCostosRecepcion();
    const datos = {
        proveedorId: document.getElementById('recepcionProveedorId').value.trim(),
        proveedorNombre: document.getElementById('recepcionProveedorNombre').value.trim(),
        almacenId: document.getElementById('recepcionAlmacenId').value.trim(),
        numeroFactura: document.getElementById('recepcionNumeroFactura').value.trim(),
        fechaFactura: document.getElementById('recepcionFechaFactura').value || null,
        fechaVencimiento: document.getElementById('recepcionFechaVencimiento').value || null,
        condicionPago: document.getElementById('recepcionCondicionPago').value,
        diasVencimiento: Number(document.getElementById('recepcionDiasVencimiento').value || 0),
        lineas: lineasCalculadas,
        descuentos: lineasCalculadas.reduce((total, linea) => total + Number(linea.descuento || 0), 0),
        itbis: lineasCalculadas.reduce((total, linea) => total + linea.itbis, 0),
        flete: lineasCalculadas.reduce((total, linea) => total + linea.fleteDistribuido, 0),
        total: lineasCalculadas.reduce((total, linea) => total + linea.cantidad * linea.costoUnitario - linea.descuento + linea.itbis + linea.fleteDistribuido, 0)
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
        modoItbisBloqueado = null;
        tasaItbisBloqueada = null;
        recepcionValidada = false;
        window.renderizarLineasRecepcion();
        document.getElementById('btnAplicarRecepcion').disabled = true;
        document.getElementById('estadoValidacionRecepcion').textContent = 'Recepción aplicada. Puedes preparar otra factura.';
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
    const costoActual = Number(document.getElementById('costoProd').value) || 0;
    const margenMinimo = Number(document.getElementById('margenProd').value) || 0;
    const precio = Number(document.getElementById('preProd').value) || 0;

    if(!nombre) return alert("El nombre es obligatorio");

    // Validaciones de Duplicados
    if (await existeDuplicado(db, 'idSecuencial', idSec)) return alert("❌ Error: Este ID ya fue usado.");
    if (codBarra && codBarra !== "" && await existeDuplicado(db, 'codigo', codBarra)) return alert("❌ Error: Código de barras duplicado.");
    let autorizacionMargen;
    try {
        autorizacionMargen = prepararAutorizacionMargen(costoActual, precio, margenMinimo);
    } catch (error) {
        return alert(error.message);
    }

    const productoRef = await addDoc(collection(db, "productos"), {
        idSecuencial: idSec,
        codigo: codBarra || "S/C",
        referenciaEmpresa: document.getElementById('referenciaEmpresa').value.trim(),
        nombre: nombre,
        costoActual,
        costoAnterior: 0,
        margenMinimo,
        margenPorcentaje: costoActual > 0 ? ((precio - costoActual) / costoActual) * 100 : 0,
        precio,
        stock: Number(document.getElementById('stockProd').value) || 0,
        unidad: document.getElementById('unidadProd').value,
        estatus: "ACTIVO", // Siempre se crea activo
        ...(autorizacionMargen ? { autorizacionMargen } : {}),
        timestamp: Date.now()
    });
    const imagenes = await subirImagenesProducto(productoRef.id);
    if (imagenes.length) await updateDoc(productoRef, { imagenes, imagenUrl: imagenes[0].url, imagenPath: imagenes[0].path });
    alert("✅ ¡Producto Guardado!");
    limpiarForm();
};

// --- ACTUALIZAR PRODUCTO (Sin Eliminar) ---
window.actualizarProducto = async () => {
    const idDocActual = document.getElementById('editId').value;
    const codBarra = document.getElementById('codBarra').value.trim();
    const productoAnterior = productosCache.find(producto => producto.idDoc === idDocActual);
    const precioNuevo = Number(document.getElementById('preProd').value);
    const costoActual = Number(document.getElementById('costoProd').value) || 0;
    const margenMinimo = Number(document.getElementById('margenProd').value) || 0;
    let autorizacionMargen;
    try {
        autorizacionMargen = prepararAutorizacionMargen(costoActual, precioNuevo, margenMinimo);
    } catch (error) {
        return alert(error.message);
    }

    if (codBarra && codBarra !== "S/C") {
        const duplicado = await existeDuplicado(db, 'codigo', codBarra, idDocActual);
        if (duplicado) return alert("❌ Error: El código ya pertenece a otro producto.");
    }

    const imagenes = await subirImagenesProducto(idDocActual);
    await updateDoc(doc(db, "productos", idDocActual), {
        codigo: codBarra,
        referenciaEmpresa: document.getElementById('referenciaEmpresa').value.trim(),
        nombre: document.getElementById('nomProd').value,
        costoAnterior: Number(productoAnterior?.costoActual || 0),
        costoActual,
        margenMinimo,
        margenPorcentaje: costoActual > 0 ? ((precioNuevo - costoActual) / costoActual) * 100 : 0,
        precio: precioNuevo,
        unidad: document.getElementById('unidadProd').value,
        estatus: document.getElementById('estatusProd').value,
        imagenes,
        imagenUrl: imagenes[0]?.url || '',
        imagenPath: imagenes[0]?.path || '',
        ...(autorizacionMargen ? { autorizacionMargen } : {})
    });
    await Promise.all(imagenesEliminadas.filter(imagen => imagen.path).map(imagen => deleteObject(ref(storage, imagen.path)).catch(error => console.warn('No se pudo eliminar una foto anterior:', error))));
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
window.cargarEdicion = (id, idSec, cod, referencia, nom, pre, sto, unidad, est) => {
    document.getElementById('editId').value = id;
    document.getElementById('secuencialProd').value = idSec;
    document.getElementById('codBarra').value = cod;
    document.getElementById('referenciaEmpresa').value = referencia || '';
    document.getElementById('nomProd').value = nom;
    const producto = productosCache.find(item => item.idDoc === id);
    document.getElementById('costoProd').value = producto?.costoActual ?? 0;
    document.getElementById('margenProd').value = producto?.margenMinimo ?? 2;
    document.getElementById('motivoMargen').value = '';
    document.getElementById('preProd').value = pre;
    document.getElementById('stockProd').value = sto;
    document.getElementById('stockProd').disabled = true;
    document.getElementById('unidadProd').value = unidad || "Und";
    document.getElementById('estatusProd').value = est || "ACTIVO";
    imagenesProductoActual = Array.isArray(producto?.imagenes)
        ? producto.imagenes.map((imagen, indice) => ({ ...imagen, esPrincipal: indice === 0 }))
        : producto?.imagenUrl ? [{ url: producto.imagenUrl, path: producto.imagenPath || '', esPrincipal: true }] : [];
    imagenesNuevas = [];
    imagenesEliminadas = [];
    renderGaleriaProducto();
    
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
    document.getElementById('referenciaEmpresa').value = "";
    document.getElementById('nomProd').value = "";
    document.getElementById('costoProd').value = "0";
    document.getElementById('preProd').value = "";
    document.getElementById('margenProd').value = "2";
    document.getElementById('motivoMargen').value = "";
    document.getElementById('stockProd').value = "";
    document.getElementById('unidadProd').value = "Und";
    document.getElementById('estatusProd').value = "ACTIVO";
    imagenesProductoActual = [];
    imagenesNuevas.forEach(imagen => URL.revokeObjectURL(imagen.previewUrl || ''));
    imagenesNuevas = [];
    imagenesEliminadas = [];
    document.getElementById('estadoImagenesProducto').textContent = '';
    renderGaleriaProducto();
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
                      productoEncontrado.referenciaEmpresa || '',
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