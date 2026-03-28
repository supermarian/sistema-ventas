// pos-core.js - VERSIÓN CORREGIDA (Sintaxis v8)
export const POSCore = {
    // 1. Búsqueda de Productos
    buscarProducto: (productos, termino) => {
        const val = termino.trim().toLowerCase();
        if (!val) return []; 
        return productos.filter(p => {
            const codigo = (p.codigo || "").toLowerCase();
            const nombre = (p.nombre || "").toLowerCase();
            return codigo === val || nombre.includes(val);
        });
    },

    // 2. Generador de Número de Factura
    generarNumeroFactura: (totalVentas) => {
        return "FAC-" + (totalVentas + 1).toString().padStart(6, '0');
    },

    // 3. Gestión de Carrito
    agregarProducto: (carrito, producto, cantidad) => {
        const nuevoCarrito = [...carrito];
        const itemExistente = nuevoCarrito.find(p => p.id === producto.id);
        const precioNum = Number(producto.precio) || 0;
        
        if (itemExistente) {
            itemExistente.cantidad += cantidad;
            itemExistente.subtotal = itemExistente.cantidad * precioNum;
        } else {
            nuevoCarrito.push({
                ...producto,
                cantidad: cantidad,
                precio: precioNum,
                subtotal: cantidad * precioNum
            });
        }
        return nuevoCarrito;
    },

    // 4. Cálculos Financieros
    calcularTotal: (carrito) => {
        return carrito.reduce((acc, p) => acc + (Number(p.subtotal) || 0), 0);
    },

    // 5. Operaciones con Base de Datos (Sintaxis V8)
    obtenerUsuario: async (db, email) => {
        try {
            const snap = await db.collection("usuarios").where("email", "==", email).get();
            return !snap.empty ? { id: snap.docs[0].id, ...snap.docs[0].data() } : null;
        } catch (e) {
            console.error("Error obteniendo usuario:", e);
            return null;
        }
    },

    buscarClientesDB: async (db, term) => {
        try {
            const snap = await db.collection("clientes_fiado").get();
            const resultados = [];
            snap.forEach(docSnap => {
                const cliente = docSnap.data();
                if ((cliente.nombre || "").toLowerCase().includes(term.toLowerCase())) {
                    resultados.push({ id: docSnap.id, ...cliente });
                }
            });
            return resultados;
        } catch (error) {
            console.error("Error en POSCore.buscarClientesDB:", error);
            return [];
        }
    },

    procesarVenta: async (db, datosVenta, carrito) => {
        try {
            const totalVenta = POSCore.calcularTotal(carrito);
            
            // --- LÓGICA DE CRÉDITO (Corregida para v8) ---
            if (datosVenta.clienteId && datosVenta.metodoPago === 'Crédito') {
                const clienteRef = db.collection("clientes_fiado").doc(datosVenta.clienteId);
                
                // 1. Aumentar deuda
                await clienteRef.update({ 
                    deuda: firebase.firestore.FieldValue.increment(totalVenta) 
                });

                // 2. Registrar movimiento
                await clienteRef.collection("movimientos").add({
                    monto: totalVenta,
                    nroFactura: datosVenta.nroFactura,
                    tipoOperacion: "COMPRA A CRÉDITO",
                    fecha: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            // --- REGISTRO DE VENTA GENERAL ---
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
                fecha: firebase.firestore.FieldValue.serverTimestamp()
            };

            const docRef = await db.collection("ventas_realizadas").add(ventaFinal);
            return { success: true, id: docRef.id };

        } catch (error) {
            console.error("Error en procesarVenta:", error);
            throw error;
        }
    }
};