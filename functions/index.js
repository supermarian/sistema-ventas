const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

admin.initializeApp();
setGlobalOptions({ region: 'us-central1' });

const ROLES = new Set(['Administrador', 'Jefe', 'Cajero', 'Consultor', 'Contador']);
const db = admin.firestore();
const TELEFONO_WHATSAPP_POR_DEFECTO = '809-573-7989';
const WHATSAPP_TOKEN = defineSecret('WHATSAPP_TOKEN');
const WHATSAPP_VERIFY_TOKEN = defineSecret('WHATSAPP_VERIFY_TOKEN');
const palabrasIgnoradas = new Set(['un', 'una', 'uno', 'unos', 'unas', 'de', 'del', 'el', 'la', 'los', 'las', 'me', 'mandame', 'mándame', 'por', 'favor', 'quiero', 'dame']);
const cantidadesTexto = new Map([['un', 1], ['una', 1], ['uno', 1], ['dos', 2], ['tres', 3], ['cuatro', 4], ['cinco', 5], ['seis', 6], ['siete', 7], ['ocho', 8], ['nueve', 9], ['diez', 10]]);
const normalizarTexto = texto => String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();

const esAdministrador = async uid => {
    const token = await admin.auth().getUser(uid);
    return token.customClaims?.admin === true || token.customClaims?.rol === 'Administrador';
};

exports.asignarRol = onCall(async request => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
    if (!(await esAdministrador(request.auth.uid))) {
        throw new HttpsError('permission-denied', 'Solo un administrador puede asignar roles.');
    }

    const { email, rol } = request.data || {};
    if (!email || !ROLES.has(rol)) {
        throw new HttpsError('invalid-argument', 'Correo o rol inválido.');
    }

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
        if (perfilSnapshot.exists) {
            transaction.set(perfilRef, {
                uid: usuario.uid,
                email: usuario.email,
                rol,
                actualizadoEn: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }
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

exports.procesarMensajeChat = onCall(async request => {
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
});

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
            if (configuracion.data()?.botActivo === true && mensaje.type === 'text') {
                await enviarMensajeWhatsApp(mensaje.from, 'Recibimos tu mensaje. Estamos preparando tu cotización.');
            }
        }
        return response.sendStatus(200);
    } catch (error) {
        console.error('Error en webhook de WhatsApp:', error);
        return response.sendStatus(500);
    }
});
