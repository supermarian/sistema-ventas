const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const crypto = require('crypto');

admin.initializeApp();
setGlobalOptions({ region: 'us-central1' });

const ROLES = new Set(['Administrador', 'Jefe', 'Cajero', 'Consultor', 'Contador']);
const PERMISOS = new Set(['almacen', 'recepciones', 'productos', 'precios', 'facturacion', 'dashboard', 'reportes', 'personal', 'creditos', 'auditoria', 'bot', 'configuracion', 'correcciones']);
const db = admin.firestore();
const COLECCIONES_COPIA = [
    'clientes', 'clientes_portal', 'deudas_clientes', 'productos', 'usuarios',
    'cotizaciones', 'ventas_realizadas', 'pagos_creditos', 'recepciones_compras',
    'movimientos_inventario', 'cierres_caja', 'movimientos_caja', 'configuracion-sistema', 'configuracion-venta-factura'
];
const TELEFONO_WHATSAPP_POR_DEFECTO = '809-573-7989';
const WHATSAPP_TOKEN = defineSecret('WHATSAPP_TOKEN');
const WHATSAPP_VERIFY_TOKEN = defineSecret('WHATSAPP_VERIFY_TOKEN');
const PHOTOROOM_API_KEY = defineSecret('PHOTOROOM_API_KEY');
const palabrasIgnoradas = new Set(['un', 'una', 'uno', 'unos', 'unas', 'de', 'del', 'el', 'la', 'los', 'las', 'me', 'mandame', 'mándame', 'por', 'favor', 'quiero', 'dame']);
const cantidadesTexto = new Map([['un', 1], ['una', 1], ['uno', 1], ['dos', 2], ['tres', 3], ['cuatro', 4], ['cinco', 5], ['seis', 6], ['siete', 7], ['ocho', 8], ['nueve', 9], ['diez', 10]]);
const normalizarTexto = texto => String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();

const precioPublicadoValido = producto => {
    const precio = Number(producto.precio);
    const costo = Number(producto.costoActual);
    const margen = Number(producto.margenMinimo) > 2 ? Number(producto.margenMinimo) : 2;
    return Number.isFinite(precio) && precio > 0
        && (!Number.isFinite(costo) || costo <= 0 || precio >= costo * (1 + margen / 100));
};

const tienePermisoAuditoria = async request => {
    if (!request.auth) return false;
    const perfilSnapshot = await db.collection('usuarios').doc(request.auth.uid).get();
    const perfil = perfilSnapshot.exists ? perfilSnapshot.data() : {};
    const rol = request.auth.token.rol || perfil.rol;
    return ['Administrador', 'Jefe', 'Consultor', 'Contador'].includes(rol);
};

const tienePermisoArchivoAuditoria = async request => {
    if (!request.auth) return false;
    const perfilSnapshot = await db.collection('usuarios').doc(request.auth.uid).get();
    const perfil = perfilSnapshot.exists ? perfilSnapshot.data() : {};
    const rol = request.auth.token.rol || perfil.rol;
    return ['Administrador', 'Jefe'].includes(rol) || request.auth.token.admin === true;
};

const esAdministrador = async uid => {
    const token = await admin.auth().getUser(uid);
    return token.customClaims?.admin === true || token.customClaims?.rol === 'Administrador';
};

const puedeGestionarCopias = request => request.auth && (
    request.auth.token.admin === true || ['Administrador', 'Jefe'].includes(request.auth.token.rol)
);

const limpiarPermisos = permisos => Object.fromEntries(
    [...PERMISOS].map(permiso => [permiso, permisos?.[permiso] === true])
);

const puedeGestionarImagenes = async request => {
    if (!request.auth) return false;
    if (request.auth.token.admin === true || ['Administrador', 'Jefe'].includes(request.auth.token.rol)) return true;
    const perfil = await db.collection('usuarios').doc(request.auth.uid).get();
    return perfil.exists && perfil.data().permisos?.productos === true;
};

const prepararDatoCopia = dato => {
    if (dato && typeof dato.toDate === 'function') return { tipo: 'timestamp', valor: dato.toDate().toISOString() };
    if (Array.isArray(dato)) return dato.map(prepararDatoCopia);
    if (dato && typeof dato === 'object') return Object.fromEntries(Object.entries(dato).map(([clave, valor]) => [clave, prepararDatoCopia(valor)]));
    return dato;
};

const crearCopiaBaseDatos = async (tipo, creadoPor = 'sistema') => {
    const colecciones = {};
    let cantidadDocumentos = 0;
    for (const nombreColeccion of COLECCIONES_COPIA) {
        const snapshot = await db.collection(nombreColeccion).get();
        colecciones[nombreColeccion] = snapshot.docs.map(documento => ({
            id: documento.id,
            datos: prepararDatoCopia(documento.data())
        }));
        cantidadDocumentos += snapshot.size;
    }

    const creadoEn = new Date();
    const contenido = JSON.stringify({
        version: 1,
        proyecto: process.env.GCLOUD_PROJECT || 'supermercado-marian',
        tipo,
        creadoEn: creadoEn.toISOString(),
        colecciones
    });
    const nombreArchivo = `backups/${creadoEn.toISOString().slice(0, 10)}/${tipo}-${creadoEn.getTime()}.json`;
    const archivo = admin.storage().bucket().file(nombreArchivo);
    await archivo.save(contenido, {
        resumable: false,
        metadata: { contentType: 'application/json', metadata: { tipo, creadoPor } }
    });
    const registro = await db.collection('copias_seguridad').add({
        tipo,
        estado: 'completada',
        ruta: nombreArchivo,
        colecciones: COLECCIONES_COPIA,
        cantidadDocumentos,
        tamanoBytes: Buffer.byteLength(contenido),
        creadoPor,
        creadoEn: admin.firestore.Timestamp.fromDate(creadoEn)
    });
    return { copiaId: registro.id, ruta: nombreArchivo, cantidadDocumentos };
};

exports.crearCopiaManual = onCall(async request => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
    if (!puedeGestionarCopias(request)) throw new HttpsError('permission-denied', 'Solo un Administrador o Jefe puede crear copias.');
    try {
        return await crearCopiaBaseDatos('manual', request.auth.uid);
    } catch (error) {
        console.error('Error creando copia manual:', error);
        throw new HttpsError('internal', 'No se pudo crear la copia de seguridad.');
    }
});

exports.copiaAutomaticaDiaria = onSchedule({ schedule: 'every day 02:00', timeZone: 'America/Santo_Domingo' }, async () => {
    try {
        await crearCopiaBaseDatos('automatica');
    } catch (error) {
        console.error('Error creando copia automática:', error);
        throw error;
    }
});

exports.asignarRol = onCall(async request => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
    const perfilSolicitante = await db.collection('usuarios').doc(request.auth.uid).get();
    const rolSolicitante = request.auth.token.rol || (perfilSolicitante.exists ? perfilSolicitante.data().rol : '');
    const esAdminSolicitante = request.auth.token.admin === true || rolSolicitante === 'Administrador';
    const esJefeSolicitante = rolSolicitante === 'Jefe';
    if (!esAdminSolicitante && !esJefeSolicitante) {
        throw new HttpsError('permission-denied', 'Solo un Administrador o Jefe puede gestionar usuarios.');
    }

    const { email, rol, nombre, pin, permisos } = request.data || {};
    if (!email || !ROLES.has(rol)) {
        throw new HttpsError('invalid-argument', 'Correo o rol inválido.');
    }
    if (esJefeSolicitante && !['Cajero', 'Consultor', 'Contador'].includes(rol)) {
        throw new HttpsError('permission-denied', 'Un Jefe solo puede asignar Cajero, Consultor o Contador.');
    }
    const permisosNormalizados = limpiarPermisos(permisos);

    let usuario;
    try {
        usuario = await admin.auth().getUserByEmail(String(email).trim().toLowerCase());
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            throw new HttpsError('not-found', 'El correo no existe en Firebase Authentication.');
        }
        throw error;
    }

    const perfilesObjetivo = await db.collection('usuarios')
        .where('email', '==', usuario.email)
        .limit(1)
        .get();
    const perfilRef = perfilesObjetivo.empty
        ? db.collection('usuarios').doc(usuario.uid)
        : perfilesObjetivo.docs[0].ref;
    const controlRolesRef = db.collection('configuracion-sistema').doc('limites-roles');

    await db.runTransaction(async transaction => {
        await transaction.get(controlRolesRef);
        const jefesSnapshot = await transaction.get(db.collection('usuarios').where('rol', '==', 'Jefe'));
        const perfilSnapshot = await transaction.get(perfilRef);
        const yaEsJefe = perfilSnapshot.exists && perfilSnapshot.data().rol === 'Jefe';
        if (rol === 'Jefe' && !yaEsJefe && jefesSnapshot.size >= 3) {
            throw new HttpsError('resource-exhausted', 'No se pueden registrar más de 3 usuarios con rol Jefe.');
        }
        transaction.set(controlRolesRef, {
            ultimaAsignacion: admin.firestore.FieldValue.serverTimestamp(),
            limiteJefes: 3
        }, { merge: true });
        transaction.set(perfilRef, {
            uid: usuario.uid,
            email: usuario.email,
            nombre: String(nombre || perfilSnapshot.data()?.nombre || usuario.displayName || usuario.email),
            ...(pin ? { pin: String(pin) } : {}),
            rol,
            permisos: permisosNormalizados,
            actualizadoEn: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    });

    const claims = { ...(usuario.customClaims || {}), rol, admin: rol === 'Administrador' };
    await admin.auth().setCustomUserClaims(usuario.uid, claims);

    return { uid: usuario.uid, email: usuario.email, rol };
});

exports.guardarConfiguracionWhatsApp = onCall(async request => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
    const rol = request.auth.token.rol;
    if (request.auth.token.admin !== true && !['Administrador', 'Jefe'].includes(rol)) {
        throw new HttpsError('permission-denied', 'Solo un Administrador o Jefe puede configurar el bot.');
    }

    const telefonoVisible = String(request.data?.telefono || TELEFONO_WHATSAPP_POR_DEFECTO).trim();
    const digitos = telefonoVisible.replace(/\D/g, '');
    const telefono = digitos.length === 10
        ? `+1${digitos}`
        : digitos.length === 11 && digitos.startsWith('1') ? `+${digitos}` : '';
    if (!telefono) {
        throw new HttpsError('invalid-argument', 'El teléfono no tiene un formato válido.');
    }
    const phoneNumberId = String(request.data?.phoneNumberId || '').trim();
    if (phoneNumberId && !/^[A-Za-z0-9_-]{5,100}$/.test(phoneNumberId)) {
        throw new HttpsError('invalid-argument', 'El Phone Number ID de Meta no tiene un formato válido.');
    }
    await db.collection('configuracion-sistema').doc('whatsapp').set({
        telefono,
        telefonoVisible,
        phoneNumberId,
        botActivo: request.data?.botActivo === true,
        actualizadoPor: request.auth.uid,
        actualizadoEn: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return { telefono, telefonoVisible, phoneNumberId, botActivo: request.data?.botActivo === true };
});

exports.procesarFondoProducto = onCall({ secrets: [PHOTOROOM_API_KEY] }, async request => {
    if (!await puedeGestionarImagenes(request)) {
        throw new HttpsError('permission-denied', 'No tienes permiso para procesar imágenes de productos.');
    }

    const productoId = String(request.data?.productoId || '').trim();
    const imagePath = String(request.data?.imagePath || '').trim();
    if (!productoId || !imagePath || !imagePath.startsWith(`productos/${productoId}/`)) {
        throw new HttpsError('invalid-argument', 'El producto y la imagen no son válidos.');
    }

    const productoRef = db.collection('productos').doc(productoId);
    const productoSnapshot = await productoRef.get();
    if (!productoSnapshot.exists) throw new HttpsError('not-found', 'El producto no existe.');
    const imagenes = Array.isArray(productoSnapshot.data().imagenes) ? productoSnapshot.data().imagenes : [];
    const imagen = imagenes.find(item => item.path === imagePath);
    if (!imagen) throw new HttpsError('not-found', 'La imagen no está asociada al producto.');

    const bucket = admin.storage().bucket();
    const archivoOriginal = bucket.file(imagePath);
    const [metadata] = await archivoOriginal.getMetadata();
    if (Number(metadata.size || 0) > 10 * 1024 * 1024) {
        throw new HttpsError('invalid-argument', 'La imagen supera el límite de 10 MB.');
    }
    const [contenido] = await archivoOriginal.download();
    const formulario = new FormData();
    formulario.append('image_file', new Blob([contenido], { type: metadata.contentType || 'image/webp' }), 'producto.webp');

    let respuesta;
    try {
        respuesta = await fetch('https://sdk.photoroom.com/v1/segment', {
            method: 'POST',
            headers: { 'x-api-key': PHOTOROOM_API_KEY.value() },
            body: formulario
        });
    } catch (error) {
        console.error('Error conectando con PhotoRoom:', error);
        throw new HttpsError('unavailable', 'No se pudo conectar con el procesador de imágenes.');
    }
    if (!respuesta.ok) {
        console.error('PhotoRoom rechazó la imagen:', respuesta.status, await respuesta.text());
        throw new HttpsError('failed-precondition', 'El procesador no pudo quitar el fondo.');
    }

    const resultado = Buffer.from(await respuesta.arrayBuffer());
    const processedPath = `productos/${productoId}/processed-${Date.now()}.png`;
    const archivoProcesado = bucket.file(processedPath);
    await archivoProcesado.save(resultado, { resumable: false, metadata: { contentType: 'image/png' } });
    const [processedUrl] = await archivoProcesado.getSignedUrl({
        action: 'read',
        expires: '03-09-2491'
    });
    const imagenActualizada = {
        ...imagen,
        procesadaUrl: processedUrl,
        procesadaPath: processedPath,
        procesadaEn: new Date().toISOString()
    };
    await productoRef.update({ imagenes: imagenes.map(item => item.path === imagePath ? imagenActualizada : item) });
    return { productoId, imagePath, processedPath, processedUrl };
});

exports.archivarCierreCaja = onCall(async request => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
    if (!['Administrador', 'Jefe'].includes(request.auth.token.rol) && request.auth.token.admin !== true) {
        throw new HttpsError('permission-denied', 'Solo un Administrador o Jefe puede archivar cierres.');
    }
    if (!await tienePermisoAuditoria(request)) {
        throw new HttpsError('permission-denied', 'Tu usuario no tiene permiso para gestionar auditoría y cierres.');
    }

    const cierreId = String(request.data?.cierreId || '').trim();
    const motivo = String(request.data?.motivo || '').trim();
    if (!cierreId) throw new HttpsError('invalid-argument', 'El cierre es obligatorio.');
    if (motivo.length > 300) throw new HttpsError('invalid-argument', 'El motivo no puede superar 300 caracteres.');

    const cierreRef = db.collection('cierres_caja').doc(cierreId);
    const cierreSnapshot = await cierreRef.get();
    if (!cierreSnapshot.exists) throw new HttpsError('not-found', 'El cierre no existe.');
    if (cierreSnapshot.data().estado === 'ARCHIVADO') {
        return { id: cierreId, estado: 'ARCHIVADO' };
    }

    await cierreRef.update({
        estado: 'ARCHIVADO',
        archivadoEn: admin.firestore.FieldValue.serverTimestamp(),
        archivadoPorUid: request.auth.uid,
        archivadoPorEmail: request.auth.token.email || '',
        motivoArchivo: motivo || 'Revisión de cuadre completada'
    });

    return { id: cierreId, estado: 'ARCHIVADO' };
});

exports.registrarVentaOffline = onCall(async request => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión para sincronizar la venta.');

    const venta = request.data || {};
    if (venta.tipo !== 'VENTA_CONTADO' || !venta.idOperacion || !Array.isArray(venta.items) || !venta.items.length) {
        throw new HttpsError('invalid-argument', 'La venta offline no tiene un formato válido.');
    }

    const ventaRef = db.collection('ventas_realizadas').doc(String(venta.idOperacion));
    const correlativoRef = db.collection('configuracion-venta-factura').doc('correlativo');
    const puedeEditarPrecios = request.auth.token.admin === true
        || ['Administrador', 'Jefe'].includes(request.auth.token.rol);
    const totalCalculado = venta.items.reduce((total, item) => {
        const cantidad = Number(item.cantidad);
        const precio = Number(item.precio);
        return total + (Number.isFinite(cantidad) && Number.isFinite(precio) ? cantidad * precio : 0);
    }, 0);
    if (!Number.isFinite(totalCalculado) || Math.abs(totalCalculado - Number(venta.total)) > 0.01) {
        throw new HttpsError('invalid-argument', 'El total de la venta no coincide con sus productos.');
    }

    try {
        return await db.runTransaction(async transaction => {
            const ventaExistente = await transaction.get(ventaRef);
            if (ventaExistente.exists) {
                return { idOperacion: venta.idOperacion, estado: 'SINCRONIZADA', id: ventaRef.id, nroFactura: ventaExistente.data().nroFactura };
            }

            const referencias = venta.items.map(item => db.collection('productos').doc(String(item.id)));
            const [correlativoSnapshot, ...productosSnapshots] = await transaction.getAll(correlativoRef, ...referencias);
            const ultimoNumero = correlativoSnapshot.exists ? Number(correlativoSnapshot.data().ultimoNumeroFactura || 0) : 0;
            const nroFactura = `FAC-${(ultimoNumero + 1).toString().padStart(12, '0')}`;
            const cambiosPrecio = [];

            productosSnapshots.forEach((snapshot, indice) => {
                if (!snapshot.exists) throw new HttpsError('failed-precondition', `El producto ${venta.items[indice].nombre || 'seleccionado'} no existe.`);
                const stockActual = Number(snapshot.data().stock) || 0;
                const cantidad = Number(venta.items[indice].cantidad) || 0;
                const precioActual = Number(snapshot.data().precio) || 0;
                const precioVenta = Number(venta.items[indice].precio) || 0;
                if (!precioPublicadoValido({ ...snapshot.data(), precio: precioVenta })) {
                    throw new HttpsError('failed-precondition', `El precio de ${venta.items[indice].nombre || 'el producto'} no está validado para publicación.`);
                }
                if (Math.abs(precioVenta - precioActual) > 0.009) {
                    if (!puedeEditarPrecios) throw new HttpsError('permission-denied', 'El usuario no puede modificar precios.');
                    cambiosPrecio.push({
                        idProducto: referencias[indice].id,
                        producto: venta.items[indice].nombre || 'Producto',
                        precioAnterior: precioActual,
                        precioNuevo: precioVenta
                    });
                }
                if (cantidad <= 0 || stockActual < cantidad) {
                    throw new HttpsError('failed-precondition', `Stock insuficiente para ${venta.items[indice].nombre || 'el producto'}.`);
                }
            });

            transaction.set(correlativoRef, { ultimoNumeroFactura: ultimoNumero + 1 }, { merge: true });
            productosSnapshots.forEach((snapshot, indice) => {
                const stockActual = Number(snapshot.data().stock) || 0;
                const cantidad = Number(venta.items[indice].cantidad) || 0;
                const cambio = cambiosPrecio.find(item => item.idProducto === referencias[indice].id);
                transaction.update(referencias[indice], {
                    stock: stockActual - cantidad,
                    ...(cambio ? { precio: cambio.precioNuevo } : {})
                });
            });
            transaction.set(ventaRef, {
                nroFactura,
                idOperacion: venta.idOperacion,
                fecha: admin.firestore.FieldValue.serverTimestamp(),
                idCliente: venta.cliente?.id || 'anonimo',
                cliente: venta.cliente?.nombre || 'Consumidor Final',
                items: venta.items,
                productos: venta.items,
                total: Number(venta.total) || 0,
                metodoPago: venta.metodoPago || 'Efectivo',
                pagos: Array.isArray(venta.pagos) ? venta.pagos : [],
                cajero: venta.cajero || 'Desconocido',
                cajeroEmail: venta.cajeroEmail || '',
                usuarioUid: request.auth.uid,
                origen: 'OFFLINE_SINCRONIZADA'
            });
            cambiosPrecio.forEach(cambio => {
                const diferencia = cambio.precioNuevo - cambio.precioAnterior;
                const umbral = Math.max(100, Math.abs(cambio.precioAnterior) * 0.2);
                transaction.set(db.collection('alertas_auditoria').doc(), {
                    tipo: Math.abs(diferencia) > umbral ? 'CAMBIO_PRECIO_IMPORTANTE' : 'CAMBIO_PRECIO',
                    ...cambio,
                    diferencia,
                    umbral,
                    idVenta: ventaRef.id,
                    nroFactura,
                    usuarioUid: request.auth.uid,
                    cajeroNombre: venta.cajero || 'Desconocido',
                    cajeroEmail: venta.cajeroEmail || '',
                    fecha: admin.firestore.FieldValue.serverTimestamp(),
                    estado: 'PENDIENTE',
                    origen: 'OFFLINE_SINCRONIZADA'
                });
            });
            return { idOperacion: venta.idOperacion, estado: 'SINCRONIZADA', id: ventaRef.id, nroFactura };
        });
    } catch (error) {
        if (error instanceof HttpsError) throw error;
        console.error('Error sincronizando venta offline:', error);
        throw new HttpsError('internal', 'No se pudo sincronizar la venta offline.');
    }
});

exports.registrarRecepcionCompra = onCall(async request => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión para registrar una recepción.');

    const datos = request.data || {};
    const proveedorId = String(datos.proveedorId || '').trim();
    const proveedorNombre = String(datos.proveedorNombre || '').trim();
    const almacenId = String(datos.almacenId || '').trim();
    const numeroFactura = String(datos.numeroFactura || '').trim();
    const lineas = Array.isArray(datos.lineas) ? datos.lineas : [];
    const proveedorSnapshot = await db.collection('proveedores').doc(proveedorId).get();
    if (!proveedorSnapshot.exists || proveedorSnapshot.data().activo === false) {
        throw new HttpsError('failed-precondition', 'El proveedor no existe o está inactivo.');
    }
    const proveedor = proveedorSnapshot.data();
    const condicionPago = String(datos.condicionPago || proveedor.condicionPago || 'CONTADO');
    const diasVencimiento = condicionPago === 'CREDITO'
        ? Number(datos.diasVencimiento ?? proveedor.diasVencimiento ?? 0)
        : 0;
    if (!['CONTADO', 'CREDITO'].includes(condicionPago) || !Number.isInteger(diasVencimiento) || diasVencimiento < 0) {
        throw new HttpsError('invalid-argument', 'La condición y los días de vencimiento no son válidos.');
    }
    const perfilSnapshot = await db.collection('usuarios').doc(request.auth.uid).get();
    const perfil = perfilSnapshot.exists ? perfilSnapshot.data() : {};
    const rol = request.auth.token.rol || perfil.rol;
    const permisos = perfil.permisos || {};
    const puedeComprar = ['Administrador', 'Jefe'].includes(rol)
        || permisos.compras === true
        || (Array.isArray(permisos) && permisos.includes('compras'));

    if (!puedeComprar) {
        throw new HttpsError('permission-denied', 'El usuario no tiene permiso para registrar compras.');
    }
    if (!proveedorId || !almacenId || !numeroFactura || !lineas.length) {
        throw new HttpsError('invalid-argument', 'La recepción requiere proveedor, almacén, factura y al menos una línea.');
    }

    const productosIds = new Set();
    const lineasValidadas = lineas.map((linea, indice) => {
        const productoId = String(linea.productoId || '').trim();
        const cantidad = Number(linea.cantidad);
        const cantidadBonificada = Number(linea.cantidadBonificada || 0);
        const costoUnitario = Number(linea.costoUnitario);
        if (!productoId || productosIds.has(productoId)) {
            throw new HttpsError('invalid-argument', `La línea ${indice + 1} tiene un producto inválido o repetido.`);
        }
        if (!Number.isFinite(cantidad) || cantidad <= 0
            || !Number.isFinite(cantidadBonificada) || cantidadBonificada < 0
            || !Number.isFinite(costoUnitario) || costoUnitario < 0) {
            throw new HttpsError('invalid-argument', `La línea ${indice + 1} tiene cantidades o costo inválidos.`);
        }
        productosIds.add(productoId);
        return {
            productoId,
            codigo: String(linea.codigo || ''),
            descripcion: String(linea.descripcion || ''),
            unidad: String(linea.unidad || 'Und'),
            cantidad,
            cantidadBonificada,
            costoUnitario,
            descuento: Number(linea.descuento || 0),
            itbis: Number(linea.itbis || 0)
        };
    });

    const claveDuplicado = crypto.createHash('sha256')
        .update(`${proveedorId}|${numeroFactura.toUpperCase()}|${almacenId}`)
        .digest('hex');
    const recepcionRef = db.collection('recepciones_compras').doc(claveDuplicado);
    const referencias = lineasValidadas.map(linea => db.collection('productos').doc(linea.productoId));
    const subtotal = lineasValidadas.reduce((total, linea) => total + (linea.cantidad * linea.costoUnitario) - linea.descuento, 0);

    try {
        return await db.runTransaction(async transaction => {
            const [recepcionSnapshot, ...productosSnapshots] = await transaction.getAll(recepcionRef, ...referencias);
            if (recepcionSnapshot.exists && recepcionSnapshot.data().estado !== 'BORRADOR') {
                return {
                    estado: 'YA_APLICADA',
                    idRecepcion: recepcionSnapshot.id,
                    recepcion: recepcionSnapshot.data()
                };
            }

            productosSnapshots.forEach((snapshot, indice) => {
                if (!snapshot.exists) {
                    throw new HttpsError('failed-precondition', `El producto ${lineasValidadas[indice].productoId} no existe.`);
                }
            });

            const ahora = admin.firestore.FieldValue.serverTimestamp();
            transaction.set(recepcionRef, {
                idRecepcion: recepcionRef.id,
                proveedorId,
                proveedorNombre,
                almacenId,
                numeroFactura,
                fechaFactura: datos.fechaFactura || null,
                fechaRecepcion: datos.fechaRecepcion || null,
                condicionPago,
                diasVencimiento,
                subtotal,
                descuentos: Number(datos.descuentos || 0),
                itbis: Number(datos.itbis || 0),
                flete: Number(datos.flete || 0),
                total: Number(datos.total || subtotal),
                estado: 'APLICADA',
                usuarioId: request.auth.uid,
                creadoEn: ahora,
                aplicadoEn: ahora
            });

            lineasValidadas.forEach((linea, indice) => {
                const referenciaProducto = referencias[indice];
                const producto = productosSnapshots[indice].data();
                const stockAnterior = Number(producto.stock) || 0;
                const entrada = linea.cantidad + linea.cantidadBonificada;
                const stockNuevo = stockAnterior + entrada;
                transaction.update(referenciaProducto, {
                    stock: stockNuevo,
                    costoAnterior: Number(producto.costoActual || 0),
                    costoActual: linea.costoUnitario,
                    ultimaCompra: ahora,
                    actualizadoPor: request.auth.uid,
                    actualizadoEn: ahora
                });
                transaction.set(db.collection('recepciones_compras').doc(recepcionRef.id)
                    .collection('lineas').doc(String(indice + 1).padStart(4, '0')), {
                    ...linea,
                    total: (linea.cantidad * linea.costoUnitario) - linea.descuento
                });
                transaction.set(db.collection('movimientos_inventario').doc(), {
                    idMovimiento: `${recepcionRef.id}-${indice + 1}`,
                    productoId: linea.productoId,
                    almacenId,
                    tipo: 'ENTRADA_RECEPCION',
                    cantidad: entrada,
                    stockAnterior,
                    stockNuevo,
                    costo: linea.costoUnitario,
                    recepcionId: recepcionRef.id,
                    factura: numeroFactura,
                    usuarioId: request.auth.uid,
                    motivo: 'Recepción de compra',
                    creadoEn: ahora
                });
            });

            return { estado: 'APLICADA', idRecepcion: recepcionRef.id };
        });
    } catch (error) {
        if (error instanceof HttpsError) throw error;
        console.error('Error registrando recepción de compra:', error);
        throw new HttpsError('internal', 'No se pudo registrar la recepción de compra.');
    }
});

exports.guardarBorradorRecepcion = onCall(async request => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión para guardar una recepción.');
    const perfilSnapshot = await db.collection('usuarios').doc(request.auth.uid).get();
    const perfil = perfilSnapshot.exists ? perfilSnapshot.data() : {};
    const rol = request.auth.token.rol || perfil.rol;
    const permisos = perfil.permisos || {};
    const puedeComprar = ['Administrador', 'Jefe'].includes(rol)
        || permisos.compras === true
        || (Array.isArray(permisos) && permisos.includes('compras'));
    if (!puedeComprar) throw new HttpsError('permission-denied', 'El usuario no tiene permiso para guardar compras.');
    const datos = request.data || {};
    const proveedorId = String(datos.proveedorId || '').trim();
    const proveedorNombre = String(datos.proveedorNombre || '').trim();
    const almacenId = String(datos.almacenId || '').trim();
    const numeroFactura = String(datos.numeroFactura || '').trim();
    const lineas = Array.isArray(datos.lineas) ? datos.lineas : [];
    const proveedorSnapshot = await db.collection('proveedores').doc(proveedorId).get();
    if (!proveedorSnapshot.exists || proveedorSnapshot.data().activo === false) {
        throw new HttpsError('failed-precondition', 'El proveedor no existe o está inactivo.');
    }
    const proveedor = proveedorSnapshot.data();
    const condicionPago = String(datos.condicionPago || proveedor.condicionPago || 'CONTADO');
    const diasVencimiento = condicionPago === 'CREDITO'
        ? Number(datos.diasVencimiento ?? proveedor.diasVencimiento ?? 0)
        : 0;
    if (!['CONTADO', 'CREDITO'].includes(condicionPago) || !Number.isInteger(diasVencimiento) || diasVencimiento < 0) {
        throw new HttpsError('invalid-argument', 'La condición y los días de vencimiento no son válidos.');
    }
    if (!proveedorId || !almacenId || !numeroFactura || !lineas.length) {
        throw new HttpsError('invalid-argument', 'El borrador requiere proveedor, almacén, factura y al menos una línea.');
    }
    const ids = new Set();
    for (const linea of lineas) {
        const productoId = String(linea.productoId || '').trim();
        const cantidad = Number(linea.cantidad);
        const costo = Number(linea.costoUnitario);
        if (!productoId || ids.has(productoId) || !Number.isFinite(cantidad) || cantidad <= 0 || !Number.isFinite(costo) || costo < 0) {
            throw new HttpsError('invalid-argument', 'El borrador contiene una línea inválida o repetida.');
        }
        ids.add(productoId);
    }
    const clave = crypto.createHash('sha256')
        .update(`${proveedorId}|${numeroFactura.toUpperCase()}|${almacenId}`)
        .digest('hex');
    const recepcionRef = db.collection('recepciones_compras').doc(clave);
    const existente = await recepcionRef.get();
    if (existente.exists && existente.data().estado !== 'BORRADOR') {
        throw new HttpsError('already-exists', 'Esta factura ya fue aplicada.');
    }
    const ahora = admin.firestore.FieldValue.serverTimestamp();
    const batch = db.batch();
    batch.set(recepcionRef, {
        idRecepcion: clave,
        proveedorId,
        proveedorNombre,
        almacenId,
        numeroFactura,
        condicionPago,
        diasVencimiento,
        fechaFactura: datos.fechaFactura || null,
        fechaVencimiento: datos.fechaVencimiento || null,
        subtotal: lineas.reduce((total, linea) => total + Number(linea.cantidad) * Number(linea.costoUnitario) - Number(linea.descuento || 0), 0),
        total: Number(datos.total || 0),
        estado: 'BORRADOR',
        usuarioId: request.auth.uid,
        creadoEn: existente.exists ? existente.data().creadoEn : ahora,
        actualizadoEn: ahora
    }, { merge: true });
    lineas.forEach((linea, indice) => batch.set(
        recepcionRef.collection('lineas').doc(String(indice + 1).padStart(4, '0')),
        { ...linea, actualizadoEn: ahora }
    ));
    await batch.commit();
    return { estado: 'BORRADOR', idRecepcion: clave };
});

exports.confirmarRevisionCierre = onCall(async request => {
    if (!(await tienePermisoAuditoria(request))) {
        throw new HttpsError('permission-denied', 'No tienes permiso para revisar cierres.');
    }
    const cierreId = String(request.data?.cierreId || '').trim();
    const montoContadoAuditor = Number(request.data?.montoContadoAuditor);
    const observacion = String(request.data?.observacion || '').trim();
    const desgloseEfectivoAuditor = request.data?.desgloseEfectivoAuditor || {};
    if (!cierreId || !Number.isFinite(montoContadoAuditor) || montoContadoAuditor < 0) {
        throw new HttpsError('invalid-argument', 'Indica un cierre y un monto contado válido.');
    }

    const cierreRef = db.collection('cierres_caja').doc(cierreId);
    const revisionRef = db.collection('revisiones_cierres').doc(cierreId);
    return db.runTransaction(async transaction => {
        const [cierreSnapshot, revisionSnapshot] = await transaction.getAll(cierreRef, revisionRef);
        if (!cierreSnapshot.exists) throw new HttpsError('not-found', 'El cierre no existe.');
        if (revisionSnapshot.exists && ['CONFIRMADO', 'ARCHIVADO'].includes(revisionSnapshot.data().estado)) {
            return { estado: revisionSnapshot.data().estado, revisionId: revisionRef.id, duplicado: true };
        }

        const cierre = cierreSnapshot.data();
        const montoEsperado = Number(cierre.montoEsperadoEnCaja ?? cierre.totalEnGaveta ?? 0);
        transaction.set(revisionRef, {
            revisionId: revisionRef.id,
            cierreId,
            idTurno: cierre.idTurno || '',
            auditorUid: request.auth.uid,
            auditorEmail: request.auth.token.email || '',
            montoEsperadoCajero: montoEsperado,
            montoContadoCajero: Number(cierre.montoRealContado ?? cierre.totalEnGaveta ?? 0),
            diferenciaCajero: Number(cierre.diferencia || 0),
            montoContadoAuditor,
            diferenciaAuditoria: montoContadoAuditor - montoEsperado,
            desgloseEfectivoAuditor,
            observacion,
            estado: 'CONFIRMADO',
            creadoEn: revisionSnapshot.exists ? revisionSnapshot.data().creadoEn : admin.firestore.FieldValue.serverTimestamp(),
            confirmadoEn: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        return { estado: 'CONFIRMADO', revisionId: revisionRef.id, diferenciaAuditoria: montoContadoAuditor - montoEsperado };
    });
});

exports.archivarRevisionCierre = onCall(async request => {
    if (!(await tienePermisoArchivoAuditoria(request))) {
        throw new HttpsError('permission-denied', 'No tienes permiso para archivar revisiones.');
    }
    const cierreId = String(request.data?.cierreId || '').trim();
    if (!cierreId) throw new HttpsError('invalid-argument', 'Falta el cierre.');
    const revisionRef = db.collection('revisiones_cierres').doc(cierreId);
    const revisionSnapshot = await revisionRef.get();
    if (!revisionSnapshot.exists) throw new HttpsError('failed-precondition', 'Primero debes confirmar la revisión.');
    if (revisionSnapshot.data().estado === 'ARCHIVADO') return { estado: 'ARCHIVADO', duplicado: true };
    if (revisionSnapshot.data().estado !== 'CONFIRMADO') {
        throw new HttpsError('failed-precondition', 'La revisión todavía no está confirmada.');
    }
    await revisionRef.update({
        estado: 'ARCHIVADO',
        archivadoPor: request.auth.uid,
        archivadoEn: admin.firestore.FieldValue.serverTimestamp()
    });
    return { estado: 'ARCHIVADO', revisionId: revisionRef.id };
});

exports.crearCotizacion = onCall(async request => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión para crear una cotización.');

    const datos = request.data || {};
    const items = Array.isArray(datos.items) ? datos.items : [];
    if (!items.length) throw new HttpsError('invalid-argument', 'La cotización debe tener productos.');

    const referencias = items.map(item => db.collection('productos').doc(String(item.id)));
    const productos = await db.getAll(...referencias);
    let total = 0;
    const itemsValidados = productos.map((producto, indice) => {
        if (!producto.exists || producto.data().estatus === 'INACTIVO') {
            throw new HttpsError('failed-precondition', `El producto ${items[indice].nombre || 'seleccionado'} no está disponible.`);
        }
        if (!precioPublicadoValido(producto.data())) {
            throw new HttpsError('failed-precondition', `El producto ${producto.data().nombre || 'seleccionado'} no tiene un precio publicado válido.`);
        }
        const cantidad = Number(items[indice].cantidad);
        if (!Number.isFinite(cantidad) || cantidad <= 0) {
            throw new HttpsError('invalid-argument', 'La cantidad de cada producto debe ser mayor que cero.');
        }
        const precio = Number(producto.data().precio) || 0;
        total += precio * cantidad;
        return {
            id: producto.id,
            nombre: producto.data().nombre || items[indice].nombre || 'Producto',
            codigo: producto.data().codigo || '',
            precio,
            cantidad,
            subtotal: precio * cantidad
        };
    });

    const telefono = String(datos.telefono || '').trim();
    const nombre = String(datos.nombre || '').trim();
    if (!telefono || !nombre) throw new HttpsError('invalid-argument', 'Nombre y teléfono son obligatorios.');

    const cotizacionRef = db.collection('cotizaciones').doc();
    await cotizacionRef.set({
        uidCliente: request.auth.uid,
        emailCliente: request.auth.token.email || '',
        nombre,
        telefono,
        direccion: String(datos.direccion || '').trim(),
        items: itemsValidados,
        total,
        estado: 'PENDIENTE',
        canal: String(datos.canal || 'WEB').toUpperCase(),
        fecha: admin.firestore.FieldValue.serverTimestamp(),
        actualizadoEn: admin.firestore.FieldValue.serverTimestamp()
    });

    return { id: cotizacionRef.id, estado: 'PENDIENTE', total };
});

const encontrarProductos = async textoOriginal => {
    const texto = normalizarTexto(textoOriginal);
    const palabras = texto.split(/\s+/);
    const cantidadNumerica = palabras.find(palabra => /^\d+$/.test(palabra));
    const palabraCantidad = palabras.find(palabra => cantidadesTexto.has(palabra));
    const cantidadSolicitada = cantidadNumerica ? Number(cantidadNumerica) : cantidadesTexto.get(palabraCantidad) || 1;
    const terminos = palabras.filter(termino => termino !== cantidadNumerica && termino !== palabraCantidad && termino.length > 1 && !palabrasIgnoradas.has(termino));
    if (!terminos.length) throw new HttpsError('invalid-argument', 'Escribe el producto que deseas buscar.');
    if (!Number.isInteger(cantidadSolicitada) || cantidadSolicitada < 1 || cantidadSolicitada > 100) {
        throw new HttpsError('invalid-argument', 'La cantidad debe ser un número entero entre 1 y 100.');
    }

    const snapshot = await db.collection('productos').limit(500).get();
    const resultados = snapshot.docs.filter(documento => documento.data().estatus !== 'INACTIVO').map(documento => {
        const producto = documento.data();
        const textoProducto = normalizarTexto([
            producto.nombre,
            producto.codigo,
            producto.marca,
            producto.categoria,
            producto.presentacion,
            ...(Array.isArray(producto.sinonimos) ? producto.sinonimos : [])
        ].join(' '));
        const coincidencias = terminos.filter(termino => textoProducto.includes(termino));
        return {
            id: documento.id,
            nombre: producto.nombre || 'Producto',
            codigo: producto.codigo || '',
            precio: Number(producto.precio) || 0,
            stock: Number(producto.stock) || 0,
            puntuacion: coincidencias.length / terminos.length
        };
    }).filter(producto => producto.puntuacion > 0)
        .sort((a, b) => b.puntuacion - a.puntuacion || a.nombre.localeCompare(b.nombre))
        .slice(0, 5);

    return {
        texto,
        cantidadSolicitada,
        estado: resultados.length === 1 ? 'ENCONTRADO' : resultados.length ? 'REQUIERE_SELECCION' : 'SIN_RESULTADOS',
        resultados
    };
};

exports.buscarProductosChat = onCall(async request => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión para buscar productos.');
    return encontrarProductos(request.data?.texto);
});

const procesarMensajeChatInterno = async request => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión para usar el chatbot.');
    const texto = String(request.data?.texto || '').trim();
    if (!texto) throw new HttpsError('invalid-argument', 'El mensaje no puede estar vacío.');

    const conversacionId = String(request.data?.conversacionId || request.auth.uid);
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(conversacionId)) {
        throw new HttpsError('invalid-argument', 'Identificador de conversación inválido.');
    }
    const conversacionRef = db.collection('conversaciones').doc(conversacionId);
    const mensajeRef = conversacionRef.collection('mensajes').doc();
    const conversacionSnapshot = await conversacionRef.get();
    const conversacionAnterior = conversacionSnapshot.exists ? conversacionSnapshot.data() : {};
    const textoNormalizado = normalizarTexto(texto);
    const esConfirmacion = ['confirmar', 'confirmo', 'si', 'sí'].includes(textoNormalizado);
    const seleccion = textoNormalizado.match(/^(?:el|la)?\s*(\d+)$/);
    const opcionSeleccionada = seleccion && Array.isArray(conversacionAnterior.opciones)
        ? conversacionAnterior.opciones[Number(seleccion[1]) - 1]
        : null;
    const busqueda = esConfirmacion || opcionSeleccionada ? null : await encontrarProductos(texto);
    let estado = 'BUSCANDO_PRODUCTO';
    let respuesta = 'Indícame el producto y la cantidad que deseas.';
    let opciones = busqueda?.resultados || conversacionAnterior.opciones || [];
    let itemsPendientes = Array.isArray(conversacionAnterior.itemsPendientes) ? conversacionAnterior.itemsPendientes : [];
    if (opcionSeleccionada) {
        estado = 'REVISION_COTIZACION';
        opciones = [];
        itemsPendientes = [...itemsPendientes, { ...opcionSeleccionada, cantidad: conversacionAnterior.cantidadSolicitada || 1 }];
        respuesta = `Elegiste ${opcionSeleccionada.nombre}. ¿Deseas agregarlo a la cotización? Responde CONFIRMAR.`;
    } else if (busqueda?.estado === 'ENCONTRADO') {
        estado = 'REVISION_COTIZACION';
        respuesta = `Encontré ${busqueda.cantidadSolicitada} unidad(es) de ${busqueda.resultados[0].nombre}. ¿Deseas agregarlo a la cotización?`;
    } else if (busqueda?.estado === 'REQUIERE_SELECCION') {
        estado = 'ESPERANDO_OPCION';
        respuesta = 'Encontré varias opciones. Responde con el número del producto que deseas.';
    } else if (busqueda?.estado === 'SIN_RESULTADOS') {
        estado = 'SIN_RESULTADOS';
        respuesta = 'No encontré ese producto. Prueba con otro nombre, marca o presentación.';
    } else if (esConfirmacion) {
        if (!itemsPendientes.length) {
            estado = 'ESPERANDO_PRODUCTOS';
            respuesta = 'Todavía no hay una cotización lista para confirmar.';
        } else {
            const clienteSnapshot = await db.collection('clientes').doc(request.auth.uid).get();
            const datosCliente = clienteSnapshot.exists ? clienteSnapshot.data() : {};
            const nombreCliente = String(request.data?.nombre || datosCliente.nombre || '').trim();
            const telefonoCliente = String(request.data?.telefono || datosCliente.telefono || '').trim();
            if (!nombreCliente || !telefonoCliente) {
                estado = 'DATOS_CLIENTE';
                respuesta = 'Para crear la cotización necesito tu nombre y teléfono.';
            } else {
                const referencias = itemsPendientes.map(item => db.collection('productos').doc(String(item.id)));
                const productosActuales = await db.getAll(...referencias);
                const itemsValidados = productosActuales.map((producto, indice) => {
                    if (!producto.exists || producto.data().estatus === 'INACTIVO') {
                        throw new HttpsError('failed-precondition', `El producto ${itemsPendientes[indice].nombre || 'seleccionado'} ya no está disponible.`);
                    }
                    const cantidad = Number(itemsPendientes[indice].cantidad) || 1;
                    const precio = Number(producto.data().precio) || 0;
                    return { id: producto.id, nombre: producto.data().nombre || 'Producto', codigo: producto.data().codigo || '', precio, cantidad, subtotal: precio * cantidad };
                });
                const total = itemsValidados.reduce((suma, item) => suma + item.subtotal, 0);
                const cotizacionRef = db.collection('cotizaciones').doc();
                await cotizacionRef.set({
                    uidCliente: request.auth.uid,
                    emailCliente: request.auth.token.email || '',
                    nombre: nombreCliente,
                    telefono: telefonoCliente,
                    direccion: String(request.data?.direccion || datosCliente.direccion || '').trim(),
                    items: itemsValidados,
                    total,
                    estado: 'PENDIENTE',
                    canal: 'CHATBOT',
                    conversacionId,
                    fecha: admin.firestore.FieldValue.serverTimestamp(),
                    actualizadoEn: admin.firestore.FieldValue.serverTimestamp()
                });
                estado = 'COTIZACION_CREADA';
                respuesta = `Cotización creada correctamente. Número: ${cotizacionRef.id}. Total: RD$ ${total.toFixed(2)}.`;
                itemsPendientes = [];
                opciones = [];
            }
        }
    }

    await db.runTransaction(async transaction => {
        transaction.set(conversacionRef, {
            uidCliente: request.auth.uid,
            estado,
            ultimoMensaje: texto,
            opciones,
            itemsPendientes,
            cantidadSolicitada: busqueda?.cantidadSolicitada || conversacionAnterior.cantidadSolicitada || 1,
            actualizadoEn: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        transaction.set(mensajeRef, {
            direccion: 'ENTRANTE',
            texto,
            estado,
            creadoEn: admin.firestore.FieldValue.serverTimestamp()
        });
    });

    return { conversacionId, estado, respuesta, busqueda };
};

exports.procesarMensajeChat = onCall(procesarMensajeChatInterno);

const enviarMensajeWhatsApp = async (telefono, texto) => {
    const configuracion = await db.collection('configuracion-sistema').doc('whatsapp').get();
    const phoneNumberId = String(configuracion.data()?.phoneNumberId || '').trim();
    if (!phoneNumberId || !WHATSAPP_TOKEN.value()) throw new Error('WhatsApp no está configurado completamente.');
    const respuesta = await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${WHATSAPP_TOKEN.value()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: telefono,
            type: 'text',
            text: { body: texto }
        })
    });
    if (!respuesta.ok) throw new Error(`Meta rechazó el mensaje: ${respuesta.status}`);
};

exports.whatsappWebhook = onRequest({ secrets: [WHATSAPP_TOKEN, WHATSAPP_VERIFY_TOKEN] }, async (request, response) => {
    if (request.method === 'GET') {
        const modo = request.query['hub.mode'];
        const token = request.query['hub.verify_token'];
        const reto = request.query['hub.challenge'];
        if (modo === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN.value()) return response.status(200).send(reto);
        return response.sendStatus(403);
    }
    if (request.method !== 'POST') return response.sendStatus(405);

    try {
          const contactos = (request.body?.entry || []).flatMap(entrada =>
              (entrada.changes || []).flatMap(cambio => cambio.value?.contacts || []))
              .reduce((mapa, contacto) => mapa.set(String(contacto.wa_id), contacto.profile?.name || ''), new Map());
        const mensajes = (request.body?.entry || []).flatMap(entrada =>
            (entrada.changes || []).flatMap(cambio => cambio.value?.messages || []));
        for (const mensaje of mensajes) {
            if (!mensaje.id || !mensaje.from) continue;
            const mensajeRef = db.collection('whatsapp_mensajes').doc(String(mensaje.id));
            try {
                await mensajeRef.create({
                    direccion: 'ENTRANTE',
                    telefono: String(mensaje.from),
                    tipo: mensaje.type || 'desconocido',
                    texto: mensaje.text?.body || '',
                    creadoEn: admin.firestore.FieldValue.serverTimestamp()
                });
            } catch (error) {
                if (error.code === 6 || error.code === 'already-exists') continue;
                throw error;
            }

            const configuracion = await db.collection('configuracion-sistema').doc('whatsapp').get();
            if (configuracion.data()?.botActivo === true && mensaje.type === 'text' && mensaje.text?.body) {
                const resultado = await procesarMensajeChatInterno({
                    auth: {
                        uid: `whatsapp_${mensaje.from}`,
                        token: { email: '' }
                    },
                    data: {
                        texto: mensaje.text.body,
                        conversacionId: `wa_${mensaje.from}`,
                        nombre: contactos.get(String(mensaje.from)) || 'Cliente WhatsApp',
                        telefono: mensaje.from
                    }
                });
                await enviarMensajeWhatsApp(mensaje.from, resultado.respuesta);
                await db.collection('whatsapp_mensajes').add({
                    direccion: 'SALIENTE',
                    telefono: String(mensaje.from),
                    texto: resultado.respuesta,
                    estado: resultado.estado,
                    creadoEn: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        return response.sendStatus(200);
    } catch (error) {
        console.error('Error en webhook de WhatsApp:', error);
        return response.sendStatus(500);
    }
});
