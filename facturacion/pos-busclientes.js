/**
 * pos-busclientes.js 
 * Versión corregida: Sin errores de referencia y con freno de Enter.
 */

// 1. BUSCADOR DE CLIENTES

let indiceSeleccionado = -1; // Rastrea la posición en la lista

window.filtrarClientesNombre = (e) => {
    const term = e.target.value.toLowerCase().trim();
    const lista = document.getElementById('resultados-clientes');
    
    // 1. Si no hay texto, limpiar y resetear índice
    if (term.length < 1) { 
        lista.style.display = 'none'; 
        indiceSeleccionado = -1;
        return; 
    }

    // 2. Filtrar desde el state que ya tienes sincronizado
    const encontrados = (state.clientes || []).filter(c => 
        (c.nombre || "").toLowerCase().includes(term)
    );

    // --- MANEJO DE TECLAS ---
    const items = lista.querySelectorAll('.item-resultado');

    if (e.key === "ArrowDown") {
        e.preventDefault();
        indiceSeleccionado = (indiceSeleccionado + 1) % items.length;
        resaltarItem(items);
        return;
    } 
    
    if (e.key === "ArrowUp") {
        e.preventDefault();
        indiceSeleccionado = (indiceSeleccionado - 1 + items.length) % items.length;
        resaltarItem(items);
        return;
    }

    if (e.key === "Enter") {
        e.preventDefault();
        // Si hay uno resaltado con flechas, elegir ese. Si no, elegir el primero.
        if (indiceSeleccionado >= 0 && items[indiceSeleccionado]) {
            items[indiceSeleccionado].click();
        } else if (encontrados.length > 0) {
            window.seleccionarCliente(encontrados[0]);
        }
        lista.style.display = 'none';
        indiceSeleccionado = -1;
        return;
    }

    // --- SI ES CUALQUIER OTRA TECLA (Escribir) ---
    indiceSeleccionado = -1;
    lista.innerHTML = "";
    
 encontrados.forEach(cliente => {
        const item = document.createElement('div');
        item.className = 'item-resultado'; 
        item.style = "padding:10px; border-bottom:1px solid #eee; cursor:pointer; transition: 0.2s;";
        
        // 1. CALCULAMOS LOS VALORES
        const deuda = Number(cliente.deuda || 0);
        const limite = Number(cliente.limite || 0);
        const disponible = limite - deuda;

        // 2. CREAMOS EL HTML CON LA DEUDA INCLUIDA
        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong>${cliente.nombre}</strong><br>
                    <small style="color: #d9534f;">Debe: RD$ ${deuda.toLocaleString()}</small>
                </div>
                <div style="text-align: right;">
                    <small style="display: block; font-size: 10px; color: #999;">DISPONIBLE</small>
                    <strong style="color: ${disponible > 0 ? '#28a745' : '#d9534f'};">
                        RD$ ${disponible.toLocaleString()}
                    </strong>
                </div>
            </div>
        `;
        
        item.onclick = () => {
            window.seleccionarCliente(cliente);
            lista.style.display = 'none';
        };
        lista.appendChild(item);
    });

    lista.style.display = encontrados.length > 0 ? 'block' : 'none';
};

// Función para ponerle color al que vas seleccionando con flechas
function resaltarItem(items) {
    items.forEach((item, index) => {
        if (index === indiceSeleccionado) {
            item.style.backgroundColor = "#e7f3ff"; // Azul resaltado
            item.style.borderLeft = "4px solid #007bff";
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.style.backgroundColor = "white";
            item.style.borderLeft = "none";
        }
    });
}
// Función auxiliar para pintar el cliente donde vas bajando
function actualizarResaltado(items) {
    items.forEach((item, index) => {
        if (index === indiceSeleccionado) {
            item.style.backgroundColor = "#e7f3ff"; // Azul resaltado
            item.style.borderLeft = "4px solid #007bff";
            item.scrollIntoView({ block: 'nearest' }); // Para que baje el scroll solo
        } else {
            item.style.backgroundColor = "white";
            item.style.borderLeft = "none";
        }
    });
}

// 2. SELECCIONAR CLIENTE
window.seleccionarCliente = (cliente) => {
    // Usamos el 'state' que es global en tu POS
    state.clienteSeleccionado = cliente;
    localStorage.setItem('marian_pos_client', JSON.stringify(cliente));

    document.getElementById('nombre-cliente-ok').innerText = "✅ " + cliente.nombre;
    document.getElementById('tel-cliente-ok').innerText = "📱 " + (cliente.telefono || "Sin tel.");
    
    const limiteElemento = document.getElementById('limite-cliente-ok');
    if (limiteElemento) {
        limiteElemento.innerText = "RD$ " + (Number(cliente.limite) || 0).toLocaleString();
    }

    document.getElementById('info-cliente-sel').style.display = 'block';
    document.getElementById('resultados-clientes').style.display = 'none';
    document.getElementById('buscadorCliente').value = "";

    // Actualizamos el monitor de crédito
    window.actualizarLimiteEnTiempoReal();
    
    const msgCobro = document.getElementById('mensaje-tipo-cobro');
    if (msgCobro && cliente.permiteCredito) msgCobro.style.display = 'block';
};

// 3. DESELECCIONAR CLIENTE (La X roja)
window.deseleccionarCliente = () => {
    state.clienteSeleccionado = null;
    localStorage.removeItem('marian_pos_client');
    document.getElementById('info-cliente-sel').style.display = 'none';
    
    const msgCobro = document.getElementById('mensaje-tipo-cobro');
    if (msgCobro) msgCobro.style.display = 'none';
    
    document.getElementById('buscadorCliente').value = "";
};

// 4. MONITOR DE CRÉDITO (Matemática del disponible)
window.actualizarLimiteEnTiempoReal = () => {
    if (!state.clienteSeleccionado) return;

    const c = state.clienteSeleccionado;
    
    // 1. Valores base de Firebase
    const limite = Number(c.limite || 0);
    const deudaAnterior = Number(c.deuda || c.balance || 0);
    
    // 2. Lo que el cliente está comprando AHORA en el carrito
    const totalCarrito = state.carrito.reduce((acc, item) => 
        acc + (Number(item.precio) * Number(item.cantidad)), 0);
    
    // 3. MATEMÁTICA CORRECTA
    const consumidoTotal = deudaAnterior + totalCarrito; // Lo que ya debía + lo nuevo
    const disponibleReal = limite - consumidoTotal;     // Resta final

    // 4. PINTAR EN PANTALLA
    const elLimite = document.getElementById('limite-cliente-ok');
    const elConsumido = document.getElementById('consumido-cliente-ok');
    const elDisponible = document.getElementById('monto-disponible-grande');

    if (elLimite) elLimite.innerText = "RD$ " + limite.toLocaleString();
    if (elConsumido) elConsumido.innerText = "RD$ " + consumidoTotal.toLocaleString();
    
    if (elDisponible) {
        elDisponible.innerText = "RD$ " + disponibleReal.toLocaleString();
        
        // Cambiar color si se pasa del límite
        if (disponibleReal < 0) {
            elDisponible.style.color = "#d9534f"; // Rojo
        } else {
            elDisponible.style.color = "#28a745"; // Verde
        }
    }
};