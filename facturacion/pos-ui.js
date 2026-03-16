export const POSUI = {
    // 1. GESTIÓN DE MODALES (Originales)
    abrirModal: (id) => {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = 'flex';
    },

    cerrarModal: (id) => {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = 'none';
    },

    // 2. FLUJO DE SELECCIÓN DE PRODUCTO (Original)
    abrirModalCantidad: (producto) => {
        const nombreDisplay = document.getElementById('nombreProdElegido');
        if (nombreDisplay) nombreDisplay.innerText = producto.nombre;
        
        const modalCant = document.getElementById('modalCantidad');
        if (modalCant) modalCant.style.display = 'flex';
        
        POSUI.ocultarResultados();
        const buscador = document.getElementById('buscador');
        if (buscador) buscador.value = ""; 

        setTimeout(() => {
            const input = document.getElementById('cantInput');
            if (input) {
                input.value = 1;
                input.focus();
                input.select();
            }
        }, 150);
    },

    // 3. RENDERIZADO DE TABLA DE VENTAS (Original)
    renderCarrito: (carrito) => {
        const body = document.getElementById('carritoBody');
        const displayTotal = document.getElementById('granTotal');
        let total = 0;
        
        if (!body) return;

        body.innerHTML = carrito.map((p, i) => {
            const subtotalVal = Number(p.subtotal) || 0;
            total += subtotalVal;
            
            return `
                <tr>
                    <td>${p.nombre}</td>
                    <td>${p.cantidad}</td>
                    <td>RD$ ${subtotalVal.toFixed(2)}</td>
                    <td>
                        <button onclick="window.eliminar(${i})" 
                                style="background:none;border:none;color:red;cursor:pointer;font-weight:bold;font-size:1.2rem;padding:0 10px;">
                            ✖
                        </button>
                    </td>
                </tr>`;
        }).join('');

        if (displayTotal) {
            displayTotal.innerText = "RD$ " + total.toLocaleString('en-US', { 
                minimumFractionDigits: 2,
                maximumFractionDigits: 2 
            });
        }
    },

    // 4. ESTADOS DEL SISTEMA (Originales)
    activarSistema: () => {
        const capa = document.getElementById('capa-bloqueo');
        const status = document.getElementById('txt-status');
        const btnCierre = document.getElementById('btn-cerrar-turno');
        
        if (capa) capa.style.display = 'none';
        if (status) {
            status.innerText = "🟢 CAJA ABIERTA";
            status.style.background = "var(--verde-pos, #28a745)";
        }
        if (btnCierre) btnCierre.style.display = 'inline-block';
    },

    bloquearSistema: () => {
        const capa = document.getElementById('capa-bloqueo');
        const status = document.getElementById('txt-status');
        const btnCierre = document.getElementById('btn-cerrar-turno');
        const buscador = document.getElementById('buscador');

        if (capa) capa.style.display = 'flex';
        if (status) {
            status.innerText = "🔴 CAJA CERRADA";
            status.style.background = "var(--rojo, #dc3545)";
        }
        if (btnCierre) btnCierre.style.display = 'none';
        if (buscador) buscador.value = "";
    },

    // 5. GESTIÓN DE CLIENTES (Original + Soporte para Crédito)
    mostrarClienteSeleccionado: (cliente) => {
        const infoDiv = document.getElementById('info-cliente-sel');
        if (!infoDiv) return;

        if (cliente) {
            infoDiv.style.display = 'block';
            document.getElementById('nombre-cliente-ok').innerText = cliente.nombre.toUpperCase();
            document.getElementById('tel-cliente-ok').innerText = cliente.telefono || 'Sin teléfono';
            
            // Si el cliente tiene permiso de crédito, lo marcamos visualmente
            if (cliente.permiteCredito) {
                document.getElementById('nombre-cliente-ok').innerHTML += ' <small style="color:blue">[APTO CRÉDITO]</small>';
            }
        } else {
            infoDiv.style.display = 'none';
        }
    },

    // 6. BUSCADOR VISUAL (Original)
    mostrarResultadosFlotantes: (productos) => {
        const contenedor = document.getElementById('resultados-flotantes');
        if (!contenedor) return;
        contenedor.innerHTML = ''; 

        if (productos && productos.length > 0) {
            productos.forEach((prod, index) => {
                const div = document.createElement('div');
                div.className = 'res-item';
                div.setAttribute('data-index', index);
                div.innerHTML = `
                    <div style="flex:1; pointer-events:none;">
                        <b style="display:block; color:black;">${prod.nombre}</b>
                        <small style="color:#666;">${prod.codigo || 'Sin código'}</small>
                    </div>
                    <div style="text-align:right; pointer-events:none;">
                        <span style="color:green; font-weight:bold; font-size:1.1rem;">
                            RD$ ${Number(prod.precio).toFixed(2)}
                        </span>
                    </div>`;
                div.onclick = () => window.seleccionarProductoDeLista(prod);
                contenedor.appendChild(div);
            });
            contenedor.style.display = 'block';
        } else {
            contenedor.style.display = 'none';
        }
    },

    ocultarResultados: () => {
        const res = document.getElementById('resultados-flotantes');
        if (res) res.style.display = 'none';
    },

    // --- NUEVAS FUNCIONALIDADES SOLICITADAS ---

    // 7. PREPARAR MODAL DE CIERRE (Similar a Abrir Caja)
    prepararModalCierre: (email, montoApertura, ventasData) => {
        const emailLabel = document.getElementById('emailCajeroCierre');
        const montoLabel = document.getElementById('montoAperturaCierre');
        const resumenDiv = document.getElementById('resumenCierre');

        if (emailLabel) emailLabel.innerText = email;
        if (montoLabel) montoLabel.innerText = "RD$ " + Number(montoApertura).toLocaleString();
        
        if (resumenDiv) {
            resumenDiv.innerHTML = `
                <div style="padding:10px; background:#f8f9fa; border-radius:8px;">
                    <div style="display:flex; justify-content:space-between">
                        <span>Efectivo en Ventas:</span> <b>RD$ ${ventasData.efectivo.toFixed(2)}</b>
                    </div>
                    <div style="display:flex; justify-content:space-between; color:blue">
                        <span>Ventas a Crédito:</span> <b>RD$ ${ventasData.credito.toFixed(2)}</b>
                    </div>
                    <hr>
                    <div style="display:flex; justify-content:space-between; font-weight:bold">
                        <span>TOTAL ESPERADO:</span> <span>RD$ ${(Number(montoApertura) + ventasData.efectivo).toFixed(2)}</span>
                    </div>
                </div>
            `;
        }
        POSUI.abrirModal('modalCierre');
    },

    // 8. PREPARAR MODAL PAGO (Maneja visibilidad de botón crédito)
    prepararModalPago: (total, cliente) => {
        const totalModal = document.getElementById('totalModal');
        const btnCredito = document.getElementById('btn-metodo-credito');

        if (totalModal) totalModal.innerText = "RD$ " + total.toLocaleString();

        if (btnCredito) {
            // Solo se muestra si hay un cliente seleccionado y tiene permiso de crédito
            if (cliente && cliente.permiteCredito) {
                btnCredito.style.display = 'block';
                btnCredito.style.border = "2px solid #856404";
                btnCredito.style.background = "#fff3cd";
            } else {
                btnCredito.style.display = 'none';
            }
        }
        POSUI.abrirModal('modalPago');
    }
};