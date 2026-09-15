# Plan de evolucion operativa

**Estado:** Analisis aprobado para implementar por fases
**Fecha:** 2026-09-09
**Regla:** documentar, implementar una fase pequena, probarla y actualizar este plan antes de avanzar.

## Prioridad transversal de diseño

La siguiente fase visual aplica a todo el sistema y no solo a Facturación. Se debe crear una base común de auto layout responsive para menú, Facturación/POS, Gestión de facturas, Almacén, Compras, Créditos, Personal, Dashboard, Reportes, Auditoría, Cierres, Configuración y portal de clientes.

El objetivo es mejorar apariencia, lectura y uso en escritorio, tablet y móvil sin modificar reglas de negocio, permisos, cálculos ni datos de Firestore. El orden será: base visual compartida, menú, módulos operativos, módulos administrativos y finalmente portales.

Cada grupo debe validarse en estados normal, vacío, cargando, error, sin permisos y sin conexión. Las tablas y formularios deben adaptarse sin desbordamiento horizontal, y los estilos inline repetidos se eliminarán progresivamente.

Las reglas detalladas de navegación, pestañas, modo oscuro, auto layout y validación están en [GUIA_DISENO_SISTEMA.md](GUIA_DISENO_SISTEMA.md).

La primera entrega visual se publicó en `https://supermercado-marian.web.app` con la base compartida aplicada a Menú y Configuración. El modo claro/oscuro se guarda por UID en el navegador. Antes de extenderlo a los demás módulos se debe revisar contraste y legibilidad en escritorio, tablet y móvil.

Almacén ya cuenta con una primera navegación interna desplegable. La vista principal queda dedicada a productos e inventario; recepción, historial de recepciones, historial de ventas y catálogos se separan para reducir desplazamiento. Las categorías y unidades deben definirse como catálogos maestros antes de implementar su alta.

La navegación evolucionó a pestañas visibles permanentes, inspiradas en la pantalla de referencia del sistema de inventario. Este será el patrón para los demás módulos: las funciones principales quedan accesibles arriba y el panel de trabajo cambia debajo.

Facturación adopta el mismo patrón con pestañas vinculadas a permisos existentes. No se crean permisos nuevos ni se mezclan reimpresiones con correcciones, devoluciones o notas.

La publicación visual actualiza el service worker a `supermarian-app-v5` y evita cachear HTML para que los cambios sean visibles después del despliegue.

## Estado y estimacion consolidada

### Ya implementado

- Auditoria con detalle de cierre original y revision separada del auditor.
- Callables de confirmar y archivar revision con permisos diferenciados.
- Almacen y Entrada rapida usando el mismo flujo de recepcion.
- Busqueda de productos registrados por nombre, codigo, ID y referencia empresarial.
- Borrador persistente sin impacto en stock.
- Validacion visible antes de aplicar.
- Aplicacion transaccional con movimientos de inventario.
- Historial y detalle de entradas.
- Catalogos basicos de proveedores y almacenes.
- Condicion de pago por proveedor y vencimiento automatico.
- Alertas locales de facturas vencidas y proximas a vencer.
- Modo Con/Sin ITBIS elegido por el usuario, protegido al comenzar las lineas.
- Distribucion proporcional del flete entre lineas.
- Referencia empresarial guardada en productos, Productos rapidos y recepciones.
- Webhook de WhatsApp conectado al procesador conversacional, pendiente de pruebas reales y despliegue.

### Pendiente y estimacion de trabajo restante

| Bloque | Pendiente principal | Estimacion |
|---|---|---:|
| Auditoria | Probar faltantes, sobrantes, doble confirmacion y doble archivo con cuentas reales | 3-5 h |
| Consulta de ventas | Resumen por fecha y detalle cronologico de facturas, credito y presentaciones | 6-10 h |
| Compras | Completar sucursales, impuestos, campos ampliados y permisos reales | 6-10 h |
| Productos | Margenes, autorizacion bajo 2%, precio validado para clientes | 6-10 h |
| Entrada rapida | Escaneo + confirmacion + captura de varias fotos, compresion y almacenamiento seguro | 3-5 h restantes |
| Sugerencias | Coincidencias por codigo, referencia, nombre, marca, proveedor y unidad con confirmacion humana | 4-8 h |
| Imagen avanzada | Eliminacion de fondo en web y comparacion original/resultado | 6-12 h opcionales |
| Importacion | Bandeja PDF/CSV, revision de filas, asociacion de imagenes y reporte | 10-18 h |
| Devoluciones | Modulo separado, transaccion, auditoria y correcciones fiscales separadas | 8-14 h |
| WhatsApp | Pruebas con numero de prueba, reintentos, duplicados y credenciales | 3-5 h |
| Publicacion final | Blaze, secretos, despliegue completo, smoke tests y verificacion publica | 3-6 h |

### Total estimado

- **Obligatorio para cerrar el MVP operativo, sin quitar fondo:** **52 a 91 horas**.
- **Con eliminacion de fondo e IA avanzada:** **58 a 103 horas**.
- Ya se han realizado aproximadamente **25 a 35 horas** de implementacion y analisis en esta iteracion; esos tiempos no se suman al pendiente.
- Con una dedicacion de 4 horas diarias, el trabajo restante equivale aproximadamente a **13-23 dias laborables** sin fondo avanzado o **15-26 dias** incluyendolo.

La eliminacion de fondo debe mantenerse opcional hasta validar costo, privacidad, calidad y dependencia de un servicio externo. La captura de varias fotos, compresion WebP y almacenamiento seguro ya estan implementados; la integración web con PhotoRoom queda lista en código y requiere configurar el secreto y probar calidad/costo antes de activarse en producción.

### Decision para la app movil

En la app movil el quitar fondo se ejecutara **en el mismo celular**, antes de
subir la imagen a Firebase Storage. La imagen original y la procesada se
conservaran como referencias separadas en `imagenes[]`, pero la foto no se
enviara a PhotoRoom por defecto.

- Usar un modelo/libreria nativa compatible con Android e iOS y procesamiento
	local, por ejemplo una integracion ONNX/TFLite validada para el tamaño de la
	app y la memoria disponible.
- Mostrar progreso y permitir conservar la original si el resultado no es
	satisfactorio.
- Procesar una copia comprimida; nunca destruir la foto original.
- Si el dispositivo no puede procesarla, informar al usuario y dejar la imagen
	original disponible. El backend web queda como alternativa administrativa,
	no como requisito de la app movil.
- Probar rendimiento, consumo de bateria, memoria, modo sin conexion y calidad
	en equipos de gama baja antes de activarlo para todos.

## Estado de lo ya implementado

- [x] Acceso normal a Almacen para mantenimiento y consulta de inventario.
- [x] Acceso `Entrada rapida` mediante el modo `?modo=rapido`.
- [x] Busqueda de productos registrados por nombre, codigo o ID, excluyendo inactivos.
- [x] Captura o seleccion de varias fotos por producto desde Almacen.
- [x] Compresion WebP, vista previa y almacenamiento protegido en Firebase Storage.
- [x] Referencias `imagenes[]` con URL, ruta, orden e imagen principal.
- [x] Presentaciones múltiples por producto con código, nombre, precio y factor de unidad base.
- [x] Factura impresa y reimpresa con presentación, código y equivalencia de unidades base.
- [x] Consulta de ventas independiente con resumen por filtros y detalle cronológico por línea.
- [x] Guardar costo actual, margen mínimo y margen calculado en la ficha de producto.
- [x] Callable `registrarRecepcionCompra` con transaccion, duplicado determinista y movimientos.
- [x] Conexion inicial del webhook de WhatsApp con el procesador conversacional.
- [ ] Recepcion completa con borrador, validacion visible e historial de entradas.
- [x] Auditoria de cierres con detalle original y segundo registro del auditor.

## 1. Auditoria de cierres: doble registro

> **Separacion obligatoria:** Consulta de Ventas no pertenece a Auditoria.
> Consulta ventas y facturas; Auditoria consulta cierres de caja y revisiones.
> Devoluciones es otro flujo independiente que modifica inventario.

### Problema actual

`cierres_caja` representa el cierre declarado por el cajero. Auditoria hoy lista sus datos, pero no tiene una accion de revision ni conserva el conteo fisico que realiza el auditor.

No se debe editar el cierre del cajero. Si el cajero declara RD$ 1,000 y el auditor cuenta RD$ 500, el cierre original debe seguir mostrando RD$ 1,000 como declarado. El auditor debe guardar RD$ 500 como segundo registro y el sistema debe mostrar la diferencia entre ambos.

### Decision de modelo

Conservar:

- `cierres_caja/{cierreId}`: registro original e inmutable del cajero.
- `revisiones_cierres/{revisionId}`: registro del auditor enlazado con `cierreId`.

Campos minimos de `revisiones_cierres`:

- `cierreId`, `idTurno`, `fechaRevision`.
- `auditorUid`, `auditorNombre`, `auditorEmail`.
- `montoContadoAuditor` y `desgloseEfectivoAuditor`.
- `montoEsperadoCajero`, `montoContadoCajero`, `diferenciaCajero`.
- `diferenciaAuditoria`: contado del auditor menos esperado del cajero.
- `observacion`, `evidencia` si luego se habilitan adjuntos.
- `estado`: `PENDIENTE`, `EN_REVISION`, `CONFIRMADO`, `OBSERVADO`, `ARCHIVADO`.
- `creadoEn`, `confirmadoEn`, `archivadoEn`.

### Flujo esperado

1. El cajero cierra y el sistema guarda `cierres_caja` sin cambios.
2. Auditoria muestra el mismo resumen visual del cierre: fondo, ventas efectivo, ventas a credito, egresos, esperado, contado, desglose, facturas y diferencia.
3. El auditor pulsa `Ver factura` o `Revisar cierre`.
4. Se abre un detalle de solo lectura para los datos del cajero y un panel separado para el conteo del auditor.
5. El auditor registra su conteo y observacion; no puede cambiar ventas, egresos, facturas, fondo ni diferencia del cajero.
6. `Confirmar revision` guarda el segundo registro y calcula las diferencias.
7. `Archivar cierre` solo se permite despues de confirmar y deja ambos registros consultables.
8. Si hay diferencia, se marca `OBSERVADO`; archivar no borra ni corrige el cierre original.

### Regla de permisos

- Cajero: crea su cierre; no crea ni actualiza revisiones.
- Consultor/Contador: puede revisar y confirmar, segun permiso de auditoria.
- Jefe/Administrador: puede revisar, confirmar y archivar.
- Nadie actualiza `cierres_caja` desde Auditoria.
- La confirmacion debe usar una callable o transaccion para impedir doble revision y doble archivo.

### Criterios de aceptacion

- El detalle del auditor reproduce los datos del cierre sin permitir editarlos.
- Una diferencia entre cajero y auditor queda visible y no cambia las ventas.
- El registro conserva quien cerro, quien conto, fechas y observaciones.
- Repetir confirmar o archivar no crea duplicados.
- Una revision archivada sigue siendo consultable en modo historico.

## 2. Recepcion de compras e inventario

### Orden obligatorio

1. **Borrador:** proveedor, sucursal, almacen, factura, fecha, condicion, impuestos y lineas; no modifica existencias.
2. **Validacion:** confirmar campos, duplicado por proveedor + numero de factura + almacen, costos, descuentos, impuestos y permisos.
3. **Aplicacion:** una transaccion actualiza stock/costo y crea movimientos.
4. **Historial:** Almacen muestra quien recibio, suplidor, factura, costo de entrada, cantidades y fecha.
5. **Devolucion:** flujo separado para devolver una factura o lineas ya aplicadas.

La recepcion transaccional basica ya existe, pero debe evolucionar a este flujo de borrador y validacion antes de considerarse terminada.

### Datos de producto a completar

- Costo actual, costo anterior y costo sin impuesto.
- Precio de venta y precios alternos.
- Margen calculado y margen minimo configurable.
- Unidad de compra y unidad de venta.
- Existencia actual y, cuando se defina el modelo, existencia por almacen.
- Suplidor principal, referencia, ubicacion y parametros de reposicion.
- Varias imagenes del producto, imagen principal y texto alternativo.
- Presentaciones de venta con código de barras propio, por ejemplo unidad factor 1 y caja factor 12.

### Margenes

- El costo no debe ser visible para clientes.
- El precio de venta debe derivarse del costo y margen, pero conservar una regla clara para cambios manuales.
- Margen minimo recomendado: 2%.
- Un precio por debajo del margen minimo requiere permiso explicito de Administrador y debe registrar motivo, valor anterior, valor nuevo y usuario.
- Antes de publicar el precio al portal de clientes se debe validar que no sea menor al margen permitido, salvo autorizacion registrada.
- Caja debe seguir usando el precio vigente validado y registrar cambios importantes para Auditoria.

### Imagen del producto

- Guardar referencias seguras en `imagenes[]` (`url`, `path`, `alt`, `orden`, `esPrincipal`), no imagenes grandes dentro del documento de producto.
- Mantener `imagenUrl` e `imagenPath` como compatibilidad para consumidores antiguos.
- La carga y eliminacion requieren permiso de mantenimiento de productos.
- Almacen muestra vista previa; Caja muestra miniatura opcional junto al resultado; el catalogo de clientes muestra imagen y precio solo despues de validar el precio publicado.
- Debe existir imagen alternativa y comportamiento correcto si no hay imagen.

## 3. Importacion inicial desde PDF e imagenes

### Recomendacion

No conviene leer el PDF y crear productos directamente en `productos`. El PDF no contiene nuestro codigo de barras y sus codigos pertenecen a otro sistema; tampoco garantiza que el nombre, unidad o costo se extraigan sin errores. La mejor opcion es una **importacion asistida por revision**:

1. Cargar el PDF como archivo de origen y conservarlo como evidencia de importacion.
2. Extraer solamente nombre y costo a una bandeja temporal, nunca directamente al catalogo activo.
3. Mostrar una vista previa con fila original, nombre normalizado, costo, unidad, coincidencia sugerida y advertencias.
4. Permitir corregir nombre, costo y unidad antes de guardar.
5. Buscar coincidencias contra productos existentes por nombre normalizado y, si se dispone, por referencia del proveedor. No usar el codigo del sistema externo como nuestro codigo de barras.
6. Para productos nuevos, generar nuestro `idSecuencial`; dejar `codigo` vacio o `S/C` hasta que se escanee/asigne un codigo valido.
7. Marcar cada fila como `NUEVO`, `COINCIDENCIA`, `DUPLICADO`, `REVISAR` o `RECHAZADO`.
8. Solo un usuario autorizado confirma la importacion. La confirmacion crea productos en lote con trazabilidad y no cambia stock salvo que el usuario lo indique en una recepcion posterior.

### Imagenes

Las imagenes deben procesarse por separado del PDF. Lo recomendado es subirlas con un nombre de archivo que incluya el codigo interno o una referencia estable del proveedor, mostrar una previsualizacion y exigir asociacion manual cuando haya mas de una coincidencia. Una imagen sin asociacion confirmada no debe publicarse en Caja ni en el catalogo del cliente.

### Cuando usar cada alternativa

- Menos de 30 productos: entrada manual desde Almacen, porque permite validar unidad, costo, margen e imagen en el mismo paso.
- Entre 30 y 300 productos: importacion asistida desde PDF o, preferiblemente, desde CSV/XLSX entregado por el proveedor.
- Mas de 300 productos: preparar primero un CSV limpio y un lote de prueba; no depender de OCR del PDF sin validacion humana.

### Campos de importacion temporal

- `importacionId`, `archivoOrigen`, `filaOrigen`, `usuarioId`, `creadoEn`.
- `nombreOriginal`, `nombreNormalizado`, `costoOriginal`, `unidadOriginal`.
- `productoSugeridoId`, `estadoRevision`, `advertencias`, `imagenPendiente`.
- `confirmadoPor`, `confirmadoEn` cuando la fila sea aceptada.

### Criterios de seguridad

- No sobrescribir productos existentes por coincidencia aproximada sin confirmacion.
- No inventar codigos de barras.
- No aplicar stock desde una importacion de catalogo.
- No publicar precios al cliente hasta calcular y validar el margen minimo.
- Poder descargar un reporte de filas aceptadas, rechazadas y pendientes.

### Busqueda y detalle en Caja/Almacen

Los resultados deben mostrar, antes de seleccionar:

- Codigo y descripcion.
- Unidad de venta.
- Existencia disponible.
- Precio vigente para el usuario correspondiente.
- Suplidor o referencia cuando el usuario sea de Almacen.
- Imagen si existe.

La existencia y el costo son datos internos; el costo no debe aparecer en Caja ni en el portal de clientes.

## 4. Consulta de Ventas

La **Consulta de Ventas** sera una pantalla independiente del menu. No debe
abrir ni modificar `cierres_caja`, `revisiones_cierres` o `alertas_auditoria`.
Su fuente principal sera `ventas_realizadas` y usara el permiso
`consulta_ventas`.

### Consultas disponibles

- Consulta del dia y consulta por rango de fechas, con filtro opcional de hora.
- Filtro por contado, credito, devolucion o todas las ventas.
- Filtro por cliente, cajero, sucursal, caja, factura y metodo de pago.
- Consulta de ventas a credito con numero de credito y saldo cuando exista.
- Consulta de entradas de productos mediante un enlace separado hacia Almacen;
	las recepciones de proveedores no se mezclan con las ventas.

### Resumen y detalle

La tabla principal mostrara una fila por factura con fecha, cliente, factura,
tipo, costo neto, ventas netas, ITBIS, ventas brutas, estado y hora. Debajo
mostrara totales del filtro activo: facturas, contado, credito, devoluciones,
subtotal, ITBIS y total bruto.

Al seleccionar una factura se abrira una tabla separada y **no se fusionaran
lineas distintas**. Cada vez que el cajero agregue una linea al carrito, esa
linea se guardara dentro de `ventas_realizadas.items` en ese mismo momento y
conservara su posicion original. No se debe sumar automaticamente el mismo
producto ni convertir varias pasadas en una sola linea.

Debe conservarse el orden original de la venta, incluyendo cuando el mismo
producto se pasa varias veces por unidad y luego por caja:

| Orden | Codigo | Presentacion | Nombre | Cantidad | Factor base | Precio unitario | Total |
|---:|---|---|---|---:|---:|---:|---:|
| 1 | 750001 | Unidad | Producto X | 1 | 1 | RD$ 60.00 | RD$ 60.00 |
| 2 | 750001 | Unidad | Producto X | 2 | 1 | RD$ 60.00 | RD$ 120.00 |
| 3 | 750099 | Caja | Producto X | 1 | 12 | RD$ 600.00 | RD$ 600.00 |

El registro guardado debe verse conceptualmente asi:

```json
{
	"items": [
		{ "orden": 1, "codigo": "750001", "presentacionNombre": "Unidad", "cantidad": 1, "factorConversion": 1, "precio": 60, "subtotal": 60 },
		{ "orden": 2, "codigo": "750001", "presentacionNombre": "Unidad", "cantidad": 2, "factorConversion": 1, "precio": 60, "subtotal": 120 },
		{ "orden": 3, "codigo": "750099", "presentacionNombre": "Caja", "cantidad": 1, "factorConversion": 12, "precio": 600, "subtotal": 600 }
	]
}
```

Aunque el resumen general pueda mostrar que se vendieron 3 unidades y 1 caja,
el detalle de la factura debe mostrar las tres lineas originales. El orden no
se reconstruye por nombre, codigo ni producto; se respeta el orden del arreglo
`items` guardado en la factura.

El resumen puede agrupar para estadisticas, pero el detalle debe conservar
codigo, presentacion, cantidad, precio, total y orden original. El modulo es
de solo lectura: correcciones y devoluciones tienen sus propios flujos.

## 5. Devoluciones y correcciones

### Devolucion de factura

Crear una entrada de menu separada para devoluciones de facturas aplicadas. Debe buscar la factura original, mostrar sus lineas y permitir devolver cantidades validas sin exceder lo vendido/recibido.

La devolucion debe crear un documento propio enlazado a la factura original, ajustar stock mediante transaccion y registrar motivo, usuario, fecha y cantidades. No se debe editar la factura original.

### Correcciones de comprobantes

Mantener separado el flujo administrativo de correccion de factura, nota de credito, anulacion o ajuste fiscal. No mezclarlo con devolucion de inventario porque sus permisos, documentos y consecuencias fiscales son distintos.

## 6. Bot de WhatsApp

### Estado actual

El webhook y el procesador conversacional ya estan conectados en codigo. El numero de prueba de Meta debe usarse primero para validar mensajes entrantes, respuestas, busqueda de productos y creacion de cotizaciones.

### Proceso recomendado

1. Activar el bot en configuracion solo despues de guardar `phoneNumberId`.
2. Configurar `WHATSAPP_TOKEN` y `WHATSAPP_VERIFY_TOKEN` como secretos de Firebase.
3. Registrar en Meta la URL `whatsappWebhook` y el mismo token de verificacion.
4. Probar verificacion GET del webhook.
5. Enviar desde el numero de prueba: producto, seleccion numerica, `confirmar` y datos de cliente.
6. Verificar en Firestore `whatsapp_mensajes`, `conversaciones` y `cotizaciones`.
7. Probar mensaje duplicado y error de Meta antes de activar el numero real.

No guardar tokens en HTML, Markdown, Git ni mensajes del chat.

## 7. Orden de implementacion

### Fase 1: auditoria de cierres

- [x] Abrir detalle del cierre desde la accion de Auditoria en modo solo lectura.
- [x] Crear callable de confirmar revision.
- [x] Crear callable de archivar revision.
- [x] Mostrar detalle identico al cierre y panel separado del auditor.
- [x] Agregar `revisiones_cierres` y reglas de solo lectura/escritura controlada.
- [ ] Probar faltante, sobrante, doble confirmacion y doble archivo.

### Fase 2: recepcion completa

- [x] Separar borrador persistente de aplicacion; el borrador no modifica stock.
- [x] Agregar validacion visible antes de aplicar.
- [x] Mostrar historial de entradas por suplidor, factura, costo y fecha.
- [x] Ver detalle de una entrada con líneas, cantidades, bonificaciones y costo unitario.
- [x] Crear catálogos básicos de proveedores y almacenes para la recepción.
- [x] Guardar condición de pago y días de vencimiento por proveedor.
- [x] Copiar condición y calcular vencimiento automáticamente en la recepción.
- [x] Guardar referencia empresarial del producto y conservarla en las líneas de recepción.
- [x] Permitir alternar Con/Sin ITBIS antes de agregar líneas y bloquear cambios después con aviso.
- [ ] Definir sucursales, impuestos y campos ampliados de proveedores/almacenes.
- [ ] Probar permisos de Compras, Jefe, Administrador y Cajero (la clave `compras` ya está normalizada).
- [x] Mostrar alertas de facturas próximas a vencer y vencidas en el historial de Almacen.
- [ ] Usar referencia, marca, proveedor y unidad como señales de recomendación para la IA, siempre con confirmación humana.

### Fase 3: productos y precios

- [x] Agregar costo y precio con margen calculado en Almacen.
- [x] Bloquear margen menor al 2% salvo autorizacion auditada.
- [x] Agregar imagen y vista previa.
- [x] Mostrar existencia/unidad/precio e imagen en busqueda de Caja.
- [x] Validar precio antes de publicarlo al catalogo de clientes y cotizaciones.

### Fase 4: importacion asistida

- [ ] Preferir CSV/XLSX cuando el proveedor pueda entregarlo.
- [ ] Crear bandeja temporal para PDF con nombre y costo.
- [ ] Mostrar vista previa, coincidencias y advertencias.
- [ ] Confirmar cada fila o lote con permiso de Administrador.
- [ ] Generar IDs internos sin inventar codigos de barras.
- [ ] Asociar imagenes por lote con revision manual de coincidencias.
- [ ] Generar reporte de importacion y conservar el PDF original.

### Fase 5: devoluciones

- [ ] Crear modulo separado de devolucion de factura.
- [ ] Aplicar devoluciones con transaccion y auditoria.
- [ ] Mantener separado el flujo de correcciones fiscales.

### Fase 6: WhatsApp

- [ ] Probar webhook con numero de prueba.
- [ ] Confirmar busqueda, seleccion y cotizacion.
- [ ] Revisar errores, reintentos y mensajes duplicados.
- [ ] Activar produccion solo despues de completar pruebas.

## 8. Regla de trabajo

No marcar una tarea como terminada por tener pantalla. Se marca terminada cuando tiene reglas/backend, prueba de permisos, prueba de reintento y registro auditable.
