import { 
    collection, addDoc, getDoc, getDocs, query, where,
    updateDoc, doc, increment, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export const POSCore = {
    // 1. Búsqueda de Productos (Optimizada para velocidad)
    buscarProducto: (productos, termino) => {
        const val = termino.trim().toLowerCase();
        if (!val) return []; 
        
        return productos.filter(p => {
            const codigo = (p.codigo || "").toLowerCase();
            const nombre = (p.nombre || "").toLowerCase();
            // Prioriza coincidencia exacta de código (útil para escáner) o coincidencia en nombre
            return codigo === val || nombre.includes(val);
        });
    },

    // 2. Generador de Número de Factura
    generarNumeroFactura: (totalVentas) => {
        return "FAC-" + (totalVentas + 1).toString().padStart(6, '0');
    },

    // 3. Gestión de Carrito (Evita duplicados y errores de cálculo)
    agregarProducto: (carrito, producto, cantidad) => {
        const nuevoCarrito = [...carrito];
        const precioNum = Number(producto.precio) || 0;
        nuevoCarrito.push({
            ...producto,
            lineaOrden: nuevoCarrito.length + 1,
            cantidad,
            precio: precioNum,
            subtotal: cantidad * precioNum
        });
        return nuevoCarrito;
    },

    // 4. Cálculos Financieros
    calcularTotal: (carrito) => {
        return carrito.reduce((acc, p) => acc + (Number(p.subtotal) || 0), 0);
    },

    // 5. Operaciones con Base de Datos (Firebase)
    obtenerUsuario: async (db, email, uid) => {
        try {
            if (uid) {
                try {
                    const perfilPorUid = await getDoc(doc(db, "usuarios", uid));
                    if (perfilPorUid.exists()) return { id: perfilPorUid.id, ...perfilPorUid.data() };
                } catch (errorPorUid) {
                    console.warn('[SISTEMA VENTAS] PERFIL_UID_NO_DISPONIBLE; se intentara por correo', {
                        code: errorPorUid?.code,
                        message: errorPorUid?.message,
                        email,
                        uid,
                        error: errorPorUid
                    });
                }
            }
            const q = query(collection(db, "usuarios"), where("email", "==", email));
            const snap = await getDocs(q);
            const perfil = snap.docs.find(documento => documento.data().uid === uid) || snap.docs[0];
            if (!perfil) return null;
            const datos = perfil.data();
            if (perfil.id !== uid && datos.uid !== uid) {
                console.warn('[SISTEMA VENTAS] PERFIL_UID_INCONSISTENTE', {
                    email,
                    uidSesion: uid,
                    uidPerfil: datos.uid || perfil.id,
                    documentoPerfil: perfil.id
                });
            }
            return { id: perfil.id, ...datos };
        } catch (e) {
            console.error('[SISTEMA VENTAS] PERFIL_LECTURA_RECHAZADA', {
                code: e?.code,
                message: e?.message,
                email,
                uid,
                coleccion: 'usuarios',
                error: e
            });
            return null;
        }
    },

    procesarVenta: async (db, datosVenta, carrito) => {
        try {
            const totalVenta = POSCore.calcularTotal(carrito);
            
            // Si la venta es a crédito (fiado), actualiza la deuda del cliente
            if (datosVenta.clienteId && datosVenta.metodoPago === 'Crédito') {
                const clienteRef = doc(db, "clientes_fiado", datosVenta.clienteId);
                await updateDoc(clienteRef, { 
                    deuda: increment(totalVenta) 
                });
            }

            const ventaFinal = {
                ...datosVenta,
                items: carrito.map(item => ({
                    id: item.id,
                    nombre: item.nombre,
                    cantidad: item.cantidad,
                    precio: item.precio,
                    subtotal: item.subtotal
                })),
                total: totalVenta,
                fecha: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, "ventas_realizadas"), ventaFinal);
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error("Error en procesarVenta:", error);
            throw error;
        }
    }
};