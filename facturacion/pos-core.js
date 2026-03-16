import { 
    collection, addDoc, getDocs, query, where, 
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

    // 5. Operaciones con Base de Datos (Firebase)
    obtenerUsuario: async (db, email) => {
        try {
            const q = query(collection(db, "usuarios"), where("email", "==", email));
            const snap = await getDocs(q);
            return !snap.empty ? { id: snap.docs[0].id, ...snap.docs[0].data() } : null;
        } catch (e) {
            console.error("Error obteniendo usuario:", e);
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