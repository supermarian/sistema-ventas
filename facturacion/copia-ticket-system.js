// copia-ticket-system.js

export const TicketSystem = {
    imprimir: (venta, items, esCopia = false) => {
        console.log(`${esCopia ? 'Reimprimiendo' : 'Generando'} ticket:`, venta.nroFactura);

        const ventana = window.open('', '_blank', 'width=400,height=600');
        if (!ventana) return alert("⚠️ Por favor, permite las ventanas emergentes para imprimir.");

        const fechaHoy = new Date().toLocaleString();

        // 1. CÁLCULO DE TOTALES
        let acumuladoSubtotal = 0;
        let acumuladoITBIS = 0;

        items.forEach(item => {
            const tasa = (item.itbis || 0) / 100;
            const subtotalLinea = Number(item.subtotal || 0);
            const neto = subtotalLinea / (1 + tasa);
            const itbis = subtotalLinea - neto;

            acumuladoITBIS += itbis;
            acumuladoSubtotal += neto;
        });

        // 2. GENERACIÓN DEL CONTENIDO HTML
        ventana.document.write(`
            <html>
            <head>
                <title>${esCopia ? 'COPIA - ' : ''}Factura ${venta.nroFactura}</title>
                <style>
                    body { 
                        font-family: 'Courier New', Courier, monospace; 
                        width: 280px; margin: 0 auto; padding: 10px;
                        font-size: 12px; color: #000;
                    }
                    .text-center { text-align: center; }
                    .separator { border-top: 1px dashed #000; margin: 8px 0; }
                    table { width: 100%; border-collapse: collapse; }
                    
                    /* Marca de agua para copias */
                    .watermark {
                        display: ${esCopia ? 'block' : 'none'};
                        position: fixed; top: 50%; left: 50%;
                        transform: translate(-50%, -50%) rotate(-45deg);
                        font-size: 50px; color: rgba(0, 0, 0, 0.1);
                        z-index: -1; font-weight: bold; white-space: nowrap;
                        border: 5px solid rgba(0, 0, 0, 0.1); padding: 10px;
                    }
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
                    <b>${esCopia ? 'COPIA DE FACTURA' : 'FACTURA ORIGINAL'}</b><br>
                    <b>No:</b> ${venta.nroFactura}<br>
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
                        ${items.map(item => `
                            <tr>
                                <td>${item.nombre.toUpperCase()}<br>
                                    <small>${item.cantidad} x RD$ ${Number(item.precio).toFixed(2)}</small>
                                </td>
                                <td align="right" valign="bottom">
                                    RD$ ${Number(item.subtotal).toFixed(2)}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="separator"></div>

                <table>
                    <tr><td>SUB-TOTAL (NETO):</td><td align="right">RD$ ${acumuladoSubtotal.toFixed(2)}</td></tr>
                    <tr><td>ITBIS TOTAL:</td><td align="right">RD$ ${acumuladoITBIS.toFixed(2)}</td></tr>
                    <tr style="font-weight:bold; font-size:14px">
                        <td>TOTAL A PAGAR:</td>
                        <td align="right">RD$ ${Number(venta.total).toFixed(2)}</td>
                    </tr>
                </table>

                <div class="separator"></div>
                <div class="text-center">
                    <p>¡GRACIAS POR SU COMPRA!</p>
                </div>

                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(() => { window.close(); }, 500);
                    };
                <\/script>
            </body>
            </html>
        `);

        ventana.document.close();
    }
};