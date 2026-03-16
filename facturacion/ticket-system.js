// ticket-system.js
export const TicketSystem = {
    imprimir: (venta, items, esCopia = false) => {
        console.log(`${esCopia ? 'Reimprimiendo' : 'Generando'} ticket:`, venta.nroFactura);

        // 1. Intentar abrir la ventana
        const ventana = window.open('', '_blank', 'width=400,height=600');
        if (!ventana) return alert("⚠️ Por favor, permite las ventanas emergentes para poder imprimir el ticket.");

        const fechaHoy = new Date().toLocaleString();

        // 2. CÁLCULO DE TOTALES (SUBTOTAL E ITBIS)
        let acumuladoSubtotal = 0;
        let acumuladoITBIS = 0;

        // Validamos que items sea un arreglo para evitar errores de .forEach
        const listaItems = Array.isArray(items) ? items : [];

        listaItems.forEach(item => {
            const tasa = (Number(item.itbis) || 0) / 100;
            const subtotalLinea = Number(item.subtotal || 0);
            const neto = subtotalLinea / (1 + tasa);
            const itbis = subtotalLinea - neto;

            acumuladoITBIS += itbis;
            acumuladoSubtotal += neto;
        });

        // 3. GENERACIÓN DEL CONTENIDO HTML
        ventana.document.write(`
            <html>
            <head>
                <title>${esCopia ? 'COPIA - ' : ''}Factura ${venta.nroFactura || '000'}</title>
                <style>
                    body { 
                        font-family: 'Courier New', Courier, monospace; 
                        width: 280px; margin: 0 auto; padding: 10px;
                        font-size: 12px; color: #000; position: relative;
                        line-height: 1.2;
                    }
                    .text-center { text-align: center; }
                    .separator { border-top: 1px dashed #000; margin: 8px 0; }
                    table { width: 100%; border-collapse: collapse; }
                    .watermark {
                        display: ${esCopia ? 'block' : 'none'};
                        position: fixed; top: 50%; left: 50%;
                        transform: translate(-50%, -50%) rotate(-45deg);
                        font-size: 50px; color: rgba(0, 0, 0, 0.1);
                        z-index: -1; font-weight: bold; white-space: nowrap;
                        border: 5px solid rgba(0, 0, 0, 0.1); padding: 10px;
                    }
                    th { border-bottom: 1px solid #000; }
                    .item-row td { padding: 4px 0; }
                </style>
            </head>
            <body>
                <div class="watermark">COPIA</div>

                <div class="text-center">
                    <h2 style="margin:0">SÚPER MARIAN</h2>
                    <p style="margin:2px 0">RNC: 123-45678-9<br>La Vega, RD</p>
                </div>

                <div class="separator"></div>

                <div>
                    <b>${esCopia ? '*** REIMPRESIÓN / COPIA ***' : 'FACTURA ORIGINAL'}</b><br>
                    <b>No:</b> ${venta.nroFactura || 'S/N'}<br>
                    <b>Fecha:</b> ${fechaHoy}<br>
                    <b>Cajero:</b> ${venta.cajero || 'General'}
                </div>

                <div class="separator"></div>

                <table>
                    <thead>
                        <tr>
                            <th align="left">DESC.</th>
                            <th align="right">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${listaItems.map(item => {
                            // Soporte para item.nombre o item.descripcion
                            const nombreProd = (item.nombre || item.descripcion || "Producto").toUpperCase();
                            const cant = item.cantidad || 1;
                            const unidad = item.unidad || 'Und';
                            const precio = Number(item.precio || 0).toFixed(2);
                            const sub = Number(item.subtotal || 0).toFixed(2);

                            return `
                                <tr class="item-row">
                                    <td>
                                        ${nombreProd}<br>
                                        <small>${cant} ${unidad} x RD$ ${precio}</small>
                                    </td>
                                    <td align="right" valign="bottom">
                                        RD$ ${sub}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>

                <div class="separator"></div>

                <table style="width:100%">
                    <tr>
                        <td>SUB-TOTAL (NETO):</td>
                        <td align="right">RD$ ${acumuladoSubtotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>ITBIS TOTAL:</td>
                        <td align="right">RD$ ${acumuladoITBIS.toFixed(2)}</td>
                    </tr>
                    <tr style="font-weight:bold; font-size:14px">
                        <td>TOTAL A PAGAR:</td>
                        <td align="right">RD$ ${Number(venta.total || 0).toFixed(2)}</td>
                    </tr>
                </table>

                <div class="separator"></div>

                <div class="text-center">
                    <p style="margin-bottom:5px">¡GRACIAS POR SU COMPRA!</p>
                    ${esCopia ? '<strong>*** DOCUMENTO SIN VALOR FISCAL ***</strong>' : ''}
                </div>

                <script>
                    window.onload = function() {
                        window.print();
                        // Pequeño retraso antes de cerrar para que no cancele la impresión en algunos navegadores
                        setTimeout(() => { window.close(); }, 800);
                    };
                <\/script>
            </body>
            </html>
        `);

        // 4. Finalizar el documento para procesar JS y CSS
        ventana.document.close();
    }
};