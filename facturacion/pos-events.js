export const POSEvents = {
    init: function(state, POSCore, POSUI) {
        // 1. BUSCADOR DE PRODUCTOS (F1)
        this.configurarBuscador(
            'buscador', 
            'resultados-flotantes', 
            () => state.productos,
            (term) => POSCore.buscarProducto(state.productos, term),
            (item) => window.seleccionarProductoDeLista(item),
            POSUI
        );

        // 2. BUSCADOR DE CLIENTES (Nombre o Cédula)
        this.configurarBuscador(
            'buscadorCliente', 
            'resultados-clientes', 
            () => state.clientes,
            (term) => state.clientes.filter(c => 
                c.nombre.toLowerCase().includes(term.toLowerCase()) || 
                (c.cedula && c.cedula.includes(term))
            ),
            (item) => window.seleccionarCliente(item),
            POSUI
        );

        // 3. BOTONES DE BÚSQUEDA MANUAL
        const btnTel = document.getElementById('btnBuscarTel');
        if (btnTel) {
            btnTel.onclick = () => {
                const tel = document.getElementById('busc-cli-tel').value.trim();
                const cliente = state.clientes.find(c => c.telefono === tel);
                if (cliente) window.seleccionarCliente(cliente);
                else alert("❌ Teléfono no registrado");
            };
        }

        const btnCed = document.getElementById('btnBuscarCedula');
        if (btnCed) {
            btnCed.onclick = () => {
                const ced = document.getElementById('inputCedulaSearch').value.trim();
                const cliente = state.clientes.find(c => c.cedula === ced);
                if (cliente) window.seleccionarCliente(cliente);
                else alert("❌ Cédula no encontrada");
            };
        }

        // 4. ATAJOS DE TECLADO
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F12') {
                e.preventDefault();
                window.abrirModalPago();
            }
            if (e.key === 'Escape') {
                POSUI.ocultarResultados();
                POSUI.cerrarModal('modalCantidad');
                POSUI.cerrarModal('modalPago');
            }
            if (e.key === 'F1') {
                e.preventDefault();
                document.getElementById('buscador').focus();
            }
        });

        // Cerrar listas al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container') && !e.target.closest('#buscadorCliente')) {
                const rf = document.getElementById('resultados-flotantes');
                const rc = document.getElementById('resultados-clientes');
                if(rf) rf.style.display = 'none';
                if(rc) rc.style.display = 'none';
            }
        });
    },

    configurarBuscador: function(inputId, listaId, getColeccion, filtrarFn, seleccionarFn, POSUI) {
        const input = document.getElementById(inputId);
        const lista = document.getElementById(listaId);
        let selectedIndex = -1;

        if (!input) return;

        input.addEventListener('keydown', (e) => {
            const items = lista.querySelectorAll('.res-item');
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (lista.style.display === 'none') return;
                selectedIndex = (selectedIndex + 1) % items.length;
                this.updateVisualSelection(items, selectedIndex);
            } 
            else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (lista.style.display === 'none') return;
                selectedIndex = (selectedIndex - 1 + items.length) % items.length;
                this.updateVisualSelection(items, selectedIndex);
            } 
            else if (e.key === 'Enter') {
                e.preventDefault();
                if (selectedIndex > -1 && items[selectedIndex]) {
                    items[selectedIndex].click();
                    selectedIndex = -1;
                } else {
                    const term = input.value.trim();
                    if (!term) return;
                    const resultados = filtrarFn(term);
                    if (resultados.length > 0) {
                        this.renderizarLista(listaId, resultados, seleccionarFn);
                        lista.style.display = 'block';
                        selectedIndex = 0;
                        this.updateVisualSelection(lista.querySelectorAll('.res-item'), 0);
                    }
                }
            }
        });

        input.addEventListener('input', () => { 
            selectedIndex = -1; 
            const term = input.value.trim();
            if (term.length < 2) {
                lista.style.display = 'none';
            } else {
                const resultados = filtrarFn(term);
                this.renderizarLista(listaId, resultados, seleccionarFn);
                lista.style.display = resultados.length > 0 ? 'block' : 'none';
            }
        });
    },

    renderizarLista: function(listaId, datos, seleccionarFn) {
        const lista = document.getElementById(listaId);
        lista.innerHTML = datos.map((item, i) => {
            const titulo = item.nombre || item.nombreProd;
            const sub = item.precio ? `RD$ ${item.precio}` : (item.telefono || 'Sin teléfono');
            const badgCredito = item.permiteCredito ? `<span style="color:var(--verde-pos); font-size:10px; font-weight:bold;"> [CRÉDITO OK]</span>` : '';
            
            return `
                <div class="res-item" id="${listaId}-item-${i}">
                    <div>
                        <strong>${titulo}</strong> ${badgCredito}<br>
                        <small style="color: #666;">${sub}</small>
                    </div>
                </div>
            `;
        }).join('');

        lista.querySelectorAll('.res-item').forEach((div, i) => {
            div.onclick = () => {
                seleccionarFn(datos[i]);
                lista.style.display = 'none';
                const input = document.getElementById(listaId === 'resultados-flotantes' ? 'buscador' : 'buscadorCliente');
                if(input) input.value = "";
            };
        });
    },

    updateVisualSelection: function(items, index) {
        items.forEach((item, i) => {
            if (i === index) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    }
};