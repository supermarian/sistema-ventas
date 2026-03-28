// pos-events.js - VERSIÓN CORREGIDA FINAL
export const POSEvents = {
    init: function(state, POSCore, POSUI, db) {
        
        // --- 2. BUSCADOR DE PRODUCTOS (F1 / ESCÁNER) ---
        this.configurarBuscador(
            'buscador', 
            'resultados-flotantes', 
            () => state.productos || [],
            (term) => POSCore.buscarProducto(state.productos || [], term),
            (item) => {
                if (typeof window.seleccionarProductoDeLista === 'function') {
                    window.seleccionarProductoDeLista(item);
                }
            },
            POSUI
        );

        // 3. BOTONES DE BÚSQUEDA MANUAL (Teléfono y Cédula)
        this.setupBotonesManuales(state);

        // 4. ATAJOS DE TECLADO GLOBALES
        this.setupAtajosTeclado(POSUI);

        // 5. CERRAR LISTAS AL HACER CLIC FUERA
        this.setupCierreAutomatico();
    },

  

    configurarBuscador: function(inputId, listaId, getColeccion, filtrarFn, seleccionarFn, POSUI) {
        const input = document.getElementById(inputId);
        const lista = document.getElementById(listaId);
        let selectedIndex = -1;

        if (!input || !lista) return;

        input.addEventListener('keydown', (e) => {
            const items = lista.querySelectorAll('.res-item');
            
            if (e.key === 'ArrowDown' && lista.style.display === 'block') {
                e.preventDefault();
                selectedIndex = (selectedIndex + 1) % items.length;
                this.updateVisualSelection(items, selectedIndex);
            } 
            else if (e.key === 'ArrowUp' && lista.style.display === 'block') {
                e.preventDefault();
                selectedIndex = (selectedIndex - 1 + items.length) % items.length;
                this.updateVisualSelection(items, selectedIndex);
            } 
            else if (e.key === 'Enter') {
                e.preventDefault();
                const term = input.value.trim();

                if (lista.style.display === 'block' && selectedIndex > -1 && items[selectedIndex]) {
                    items[selectedIndex].click();
                    selectedIndex = -1;
                    return;
                }

                if (!term) return;
                const resultados = filtrarFn(term);

                if (resultados.length === 0) {
                    alert("❌ No encontrado: " + term);
                } else if (resultados.length === 1) {
                    seleccionarFn(resultados[0]);
                    input.value = "";
                    lista.style.display = 'none';
                } else {
                    this.renderizarLista(listaId, resultados, seleccionarFn);
                    lista.style.display = 'block';
                    selectedIndex = 0;
                    this.updateVisualSelection(lista.querySelectorAll('.res-item'), 0);
                }
            }
        });
    },

    renderizarLista: function(listaId, datos, seleccionarFn) {
        const lista = document.getElementById(listaId);
        if (!lista) return;

        lista.innerHTML = datos.map((item, i) => `
            <div class="res-item" style="padding:10px; border-bottom:1px solid #eee; cursor:pointer;">
                <strong>${item.nombre || "Sin nombre"}</strong><br>
                <small>RD$ ${Number(item.precio || 0).toLocaleString()}</small>
            </div>
        `).join('');

        lista.querySelectorAll('.res-item').forEach((div, i) => {
            div.onclick = () => {
                seleccionarFn(datos[i]);
                lista.style.display = 'none';
            };
        });
    },

    updateVisualSelection: function(items, index) {
        items.forEach((item, i) => {
            if (i === index) {
                item.style.background = "#e3f2fd"; // Azul claro de selección
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.style.background = "transparent";
            }
        });
    },

    setupBotonesManuales: function(state) {
        const btnTel = document.getElementById('btnBuscarTel');
        const inputTel = document.getElementById('busc-cli-tel');
        if (btnTel && inputTel) {
            btnTel.onclick = () => {
                const cliente = (state.clientes || []).find(c => c.telefono?.includes(inputTel.value));
                if (cliente) window.seleccionarCliente(cliente);
                else alert("No encontrado");
            };
        }
    },

    setupAtajosTeclado: function(POSUI) {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F1') { e.preventDefault(); document.getElementById('buscador')?.focus(); }
            if (e.key === 'F12') { e.preventDefault(); window.abrirInterfazPago?.(); }
            if (e.key === 'Escape') {
                document.getElementById('resultados-clientes').style.display = 'none';
                document.getElementById('resultados-flotantes').style.display = 'none';
                POSUI.cerrarModal('modalPago');
            }
        });
    },

    setupCierreAutomatico: function() {
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#buscadorCliente') && !e.target.closest('#resultados-clientes')) {
                document.getElementById('resultados-clientes').style.display = 'none';
            }
        });
    }
};