// pos-pagos.js
export const POSPagos = {
    init: function(state, POSCore, POSUI, TicketSystem, db, addDoc, collection, serverTimestamp, doc, runTransaction) {
        
        // --- FUNCIÓN PARA ABRIR EL MODAL (F12) ---
  // --- 1. ACTUALIZAR ESTA FUNCIÓN PARA MOSTRAR/OCULTAR EL CRÉDITO ---
window.abrirInterfazPago = () => {
    const totalVenta = POSCore.calcularTotal(state.carrito);
    if (totalVenta <= 0) return alert("⚠️ El carrito está vacío");

    state.pagosRealizados = [];
    window.renderTablaPagos();

    const totalModal = document.getElementById('pagoTotalFactura');
    if (totalModal) totalModal.innerText = "RD$ " + totalVenta.toLocaleString();

    const optCredito = document.getElementById('optCredito');
    
    // VALIDACIÓN DE CRÉDITO
    if (state.clienteSeleccionado && state.clienteSeleccionado.permiteCredito) {
        const deudaActual = state.clienteSeleccionado.deuda || 0;
        const limite = state.clienteSeleccionado.limite || 0;
        
        // Verificamos si la venta actual cabe en su límite disponible
        if ((deudaActual + totalVenta) <= limite) {
            optCredito.style.display = 'block';
            optCredito.innerText = `Crédito (${state.clienteSeleccionado.nombre})`;
        } else {
            optCredito.style.display = 'none';
            alert(`⚠️ Límite insuficiente.\nDebe: RD$ ${deudaActual.toLocaleString()}\nLímite: RD$ ${limite.toLocaleString()}`);
        }
    } else {
        if (optCredito) optCredito.style.display = 'none';
        document.getElementById('pagoTipo').value = "Efectivo"; 
    }

    POSUI.abrirModal('modalPago');
};

        // --- NAVEGACIÓN INTELIGENTE ---
        const configurarNavegacionPago = () => {
            const inputs = ['pagoTipo', 'pagoMonto', 'pagoRef', 'pagoId'];
            
            inputs.forEach((id, index) => {
                const el = document.getElementById(id);
                if (!el) return;

                el.addEventListener('keydown', (e) => {
                    // Si presiona ENTER
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        
                        // Si no es el último campo, saltar al siguiente
                        if (index < inputs.length - 1) {
                            const siguiente = document.getElementById(inputs[index + 1]);
                            siguiente.focus();
                            if (siguiente.select) siguiente.select();
                        } else {
                            // Si es el último campo (pagoId), entonces APLICAR
                            window.agregarPagoLine();
                        }
                    }

                    // Navegación con flechas ARRIBA/ABAJO solo si está en el selector
                    if (id === 'pagoTipo') {
                        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                            // El navegador permite cambiar la opción con flechas por defecto si tiene el foco
                        }
                    }
                });
            });
        };

        // 1. AGREGAR PAGO A LA TABLA
        window.agregarPagoLine = () => {
            const tipo = document.getElementById('pagoTipo').value;
            const montoInput = document.getElementById('pagoMonto');
            const monto = parseFloat(montoInput.value) || 0;
            const ref = document.getElementById('pagoRef')?.value || "---";
            const ident = document.getElementById('pagoId')?.value || "---";

            if (monto <= 0) return alert("⚠️ Ingrese un monto válido.");

            state.pagosRealizados.push({ id: Date.now(), tipo, monto, referencia: ref, identificacion: ident });

            // Limpiar campos para un posible segundo pago
            montoInput.value = "";
            document.getElementById('pagoRef').value = "";
            document.getElementById('pagoId').value = "";
            
            window.renderTablaPagos();

            // Después de agregar uno, volver al tipo de pago por si quiere agregar otro (ej: mitad tarjeta, mitad efectivo)
            document.getElementById('pagoTipo').focus();
        };

        // 2. DIBUJAR TABLA Y CALCULAR DEVUELTA
        window.renderTablaPagos = () => {
            const tbody = document.getElementById('tablaPagosBody');
            if (!tbody) return;
            tbody.innerHTML = ""; 

            let totalPagado = 0;
            state.pagosRealizados.forEach((pago, index) => {
                totalPagado += pago.monto;
                const fila = document.createElement('tr');
                fila.innerHTML = `
                    <td>${pago.tipo}</td>
                    <td style="font-weight:bold;">RD$ ${pago.monto.toLocaleString()}</td>
                    <td>${pago.referencia}</td>
                    <td>${pago.identificacion}</td>
                    <td style="text-align:center;">
                        <button onclick="window.eliminarPago(${index})" style="background:none; border:none; color:red; cursor:pointer;">🗑️</button>
                    </td>
                `;
                tbody.appendChild(fila);
            });

            const totalVenta = POSCore.calcularTotal(state.carrito); 
            const diferencia = totalPagado - totalVenta;
            const lblDevuelta = document.getElementById('lblDevuelta');
            const pagoDevuelta = document.getElementById('pagoDevuelta');
            const btnFacturar = document.getElementById('btnFacturar');

            if (pagoDevuelta && lblDevuelta && btnFacturar) {
                if (diferencia >= 0) {
                    lblDevuelta.innerText = "Cambio / Devuelta:";
                    pagoDevuelta.style.color = "#28a745";
                    pagoDevuelta.innerText = `RD$ ${diferencia.toLocaleString()}`;
                    btnFacturar.disabled = false;
                } else {
                    lblDevuelta.innerText = "Falta por Pagar:";
                    pagoDevuelta.style.color = "#d9534f";
                    pagoDevuelta.innerText = `RD$ ${Math.abs(diferencia).toLocaleString()}`;
                    btnFacturar.disabled = true;
                }
            }
        };

        window.eliminarPago = (index) => {
            state.pagosRealizados.splice(index, 1);
            window.renderTablaPagos();
        };

        // 3. FINALIZAR E IMPRIMIR
// 3. FINALIZAR E IMPRIMIR
window.procesarFacturaMultiPago = async () => {
    const btn = document.getElementById('btnFacturar');
    if (state.carrito.length === 0) return;

    // Guardamos una copia del carrito ANTES de que cualquier cosa lo pueda borrar
    const copiaCarrito = [...state.carrito];
    const totalVenta = POSCore.calcularTotal(copiaCarrito);
    
    btn.disabled = true;
    btn.innerText = "⏳ Guardando...";

    let metodoFinal = state.pagosRealizados.length === 1 ? state.pagosRealizados[0].tipo : "Múltiple";

    try {
        // 1. GUARDAR Y OBTENER ID REAL
        const idReal = await window.finalizarVenta(metodoFinal);

        // 2. IMPRIMIR (Usamos la copia del carrito y el ID real)
        const datosTicket = {
            nroFactura: idReal,
            cajero: state.userDB?.nombre || "Cajero",
            total: totalVenta
        };
        TicketSystem.imprimir(datosTicket, copiaCarrito);

        // 3. AHORA SÍ: LIMPIAR TODO TRAS EL ÉXITO
        state.carrito = [];
        state.pagosRealizados = [];
        localStorage.removeItem('marian_pos_cart');
        
        // Actualizar UI
        window.renderTablaPagos();
        POSUI.renderCarrito(state.carrito);
        POSUI.cerrarModal('modalPago');
        if(state.clienteSeleccionado) window.deseleccionarCliente();
        
        btn.disabled = false;
        btn.innerText = "🖨️ Imprimir / Aplicar Venta";
        alert("✅ Venta aplicada con éxito: " + idReal);

    } catch (error) {
        console.error("Error al procesar:", error);
        alert("❌ Error: " + error);
        btn.disabled = false;
        btn.innerText = "🖨️ Reintentar";
    }
};

        configurarNavegacionPago();
    }
};