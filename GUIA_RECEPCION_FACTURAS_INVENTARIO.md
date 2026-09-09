# Guia de Recepcion de Facturas y Actualizacion de Inventario

**Estado:** Parcial: recepcion aplicada transaccional implementada; faltan borradores y catalogos
**Prioridad sugerida:** Alta  
**Referencia:** Flujo de recepcion de compras y mantenimiento de inventario mostrado en las pantallas de referencia.

## Alcance actual

Ya existe un inventario basico para consultar y mantener productos, precios, stock, estatus y codigos de barras desde el modulo de Almacen. Tambien existen alertas de bajo stock y consumo de existencias desde facturacion.

Ya existe una primera recepcion aplicada desde Almacen. La callable `registrarRecepcionCompra` valida permisos, evita duplicados por proveedor + factura + almacen, actualiza stock y costo dentro de una transaccion y registra lineas y movimientos. Aun faltan borradores, catalogos formales de proveedores y almacenes, impuestos, devoluciones y pruebas de extremo a extremo.

## Objetivo

Crear un flujo de **recepcion de compras** que permita registrar una factura de proveedor, agregar sus productos y actualizar el almacen de forma controlada. El mantenimiento de inventario debe conservar la informacion comercial, fiscal y operativa de cada producto, incluyendo precios, unidades, existencias y datos de reposicion.

La referencia visual sirve para conservar el alcance funcional. No es necesario copiar exactamente la apariencia antigua; la implementacion debe respetar el diseno actual de la aplicacion y funcionar en desktop y movil.

## 1. Recepcion de facturas de proveedores

### Encabezado de la recepcion

La pantalla debe permitir registrar:

- Proveedor: codigo, nombre, RNC o identificacion fiscal y contacto.
- Sucursal y almacen destino.
- Numero de factura del proveedor.
- Fecha de factura y fecha de recepcion.
- Dias de vencimiento y condicion de pago: contado o credito.
- Numero de comprobante fiscal, cuando aplique.
- Tipo de comprobante, incluyendo factura de compras y comprobante electronico de compras si estan habilitados.
- ITBIS retenido, impuesto ISR, flete y otros cargos o descuentos.
- Notas y referencia interna.

El numero de factura debe validarse junto con el proveedor para evitar registrar dos veces la misma compra. Debe existir una confirmacion visible antes de aplicar la recepcion.

### Detalle de productos

Cada linea debe permitir:

- Buscar por codigo interno, codigo de barras o descripcion.
- Seleccionar unidad de compra y unidad de venta.
- Registrar cantidad recibida.
- Registrar cantidad en oferta o bonificada, si existe.
- Registrar costo unitario, descuento e impuesto.
- Consultar costo anterior y costo promedio o costo actual.
- Mostrar subtotal, ITBIS y costo neto por linea.
- Agregar, modificar y eliminar lineas antes de confirmar.

La tabla debe mostrar como minimo: codigo, cantidad, unidad, descripcion, referencia, costo, descuento, ITBIS, costo neto y total.

### Totales y acciones

Calcular y mostrar claramente:

- Total bruto.
- Descuentos.
- ITBIS.
- Flete.
- Total neto de la recepcion.
- Cantidad total de items.

Acciones esperadas:

- Nueva recepcion.
- Guardar borrador.
- Confirmar y aplicar al almacen.
- Imprimir o descargar comprobante interno.
- Cancelar sin aplicar cambios.
- Consultar recepciones anteriores.

## 2. Actualizacion del almacen

Al confirmar una recepcion, el sistema debe:

1. Validar permisos del usuario y que la factura no haya sido aplicada antes.
2. Guardar la cabecera y sus lineas en una coleccion de compras/recepciones.
3. Aumentar el stock del producto en el almacen seleccionado.
4. Actualizar el costo de compra y conservar el costo anterior.
5. Recalcular el costo sin ITBIS o costo promedio segun la politica definida.
6. Actualizar fecha y cantidad de ultima compra.
7. Registrar proveedor, factura y usuario que hizo la entrada.
8. Crear un movimiento de inventario auditable por cada producto.
9. Recalcular alertas de stock bajo.
10. Mantener una operacion idempotente: reintentar no debe duplicar existencias.

Si un producto no existe, el sistema debe permitir crearlo desde la recepcion o dejarlo pendiente de asociacion. No debe aumentar existencias de una linea sin producto identificado.

## 3. Mantenimiento ampliado de productos

La ficha de producto debe evolucionar desde los campos actuales (`idSecuencial`, `codigo`, `nombre`, `precio`, `stock`, `unidad`, `estatus`) para contemplar:

### Identificacion y clasificacion

- Codigo interno/secuencial.
- Codigo de barras.
- Descripcion.
- Familia.
- Marca.
- Departamento.
- Tipo de inventario: venta, servicio, insumo u otro.
- Categoria.
- Referencia del fabricante o proveedor.
- Foto opcional.

### Venta, costos e impuestos

- Unidad minima de venta.
- Unidad de compra y equivalencia de unidades.
- Costo actual.
- Costo anterior.
- Costo sin ITBIS.
- Tipo de impuesto e ITBIS aplicable.
- Precio de venta principal.
- Precios alternos, por ejemplo precio 0, 1, 2 y 3.
- Margen o porcentaje de ganancia.
- Precio minimo autorizado y control de venta por debajo del costo.

### Existencias y ubicacion

- Stock actual por almacen.
- Stock minimo y maximo.
- Punto de reorden.
- Ubicacion fisica.
- Permitir o no stock negativo, sujeto a permiso de Administrador.
- Estatus activo/inactivo.
- Indicador de producto no visible en el punto de venta.
- Indicador de producto fraccionable.

### Historial

- Historial de compras por proveedor y factura.
- Historial de ventas.
- Historial de cambios de costo y precio.
- Movimientos de entrada, salida, ajuste y traslado.
- Usuario, fecha, dispositivo y motivo de cada ajuste.

## 4. Modelo de datos sugerido

Los nombres son una propuesta compatible con las colecciones actuales y deben confirmarse antes de programar. Se recomienda conservar el ID automatico de Firebase y agregar IDs de negocio para mostrar y buscar los registros:

```text
productos/{productoId}
  idSecuencial, codigo, nombre, unidad, unidadesCompra
  familia, marca, departamento, tipoInventario, categoria
  costoActual, costoAnterior, costoSinItbis
  precio, preciosAlternos, tipoImpuesto, tasaItbis
  estatus, permitirStockNegativo, fraccionable
  stockMinimo, stockMaximo, puntoReorden, ubicacion
  proveedorPrincipalId, actualizadoPor, actualizadoEn

recepciones_compras/{recepcionId}
  idRecepcion, numeroFactura
  proveedorId, proveedorNombre, almacenId
  numeroFactura, comprobanteFiscal, tipoComprobante
  fechaFactura, fechaRecepcion, condicionPago, diasVencimiento
  subtotal, descuentos, itbis, itbisRetenido, isr, flete, total
  estado, usuarioId, creadoEn, aplicadoEn

recepciones_compras/{recepcionId}/lineas/{lineaId}
  productoId, codigo, descripcion, unidad
  cantidad, cantidadBonificada, costoUnitario, descuento, itbis, total

movimientos_inventario/{movimientoId}
  idMovimiento
  productoId, almacenId, tipo, cantidad, stockAnterior, stockNuevo
  costo, recepcionId, factura, usuarioId, motivo, creadoEn
```

La existencia por almacen puede mantenerse en un campo separado o en una subcoleccion. La decision debe hacerse antes de implementar para no mezclar stock global con stock por sucursal.

## 5. Reglas y controles obligatorios

- Solo Administrador, Jefe o usuarios con permiso de compras pueden confirmar recepciones.
- Un Cajero no debe modificar costos ni aplicar entradas de almacen.
- La factura debe tener proveedor, almacen, fecha, numero y al menos una linea valida.
- Cantidades y costos deben ser mayores o iguales a cero; una devolucion debe usar un flujo separado.
- No permitir duplicados por proveedor + numero de factura + sucursal.
- Confirmar la operacion con una transaccion o mecanismo equivalente de Firestore.
- No sobrescribir silenciosamente el costo anterior.
- Toda modificacion manual de stock debe exigir motivo y quedar en auditoria.
- El borrador no debe cambiar existencias.
- Una recepcion aplicada no debe editarse directamente; debe corregirse mediante ajuste o devolucion.
- Validar todos los permisos en reglas/backend, no solo ocultando botones.

## 6. Orden recomendado de implementacion

### Fase A: base funcional

- [ ] Definir proveedores, almacenes y catalogos de impuestos.
- [ ] Definir estructura final de recepciones y movimientos.
- [x] Crear pantalla basica de recepcion con cabecera y lineas.
- [ ] Guardar borrador y completar totales e impuestos.
- [x] Validar factura duplicada por proveedor, factura y almacen.

### Fase B: aplicacion al inventario

- [x] Aplicar recepcion con transaccion.
- [x] Actualizar stock, costo y ultima compra.
- [x] Registrar movimientos y auditoria.
- [x] Evitar doble aplicacion y soportar reintentos.

### Fase C: mantenimiento ampliado

- [ ] Agregar clasificacion, impuesto, precios alternos y ubicacion.
- [ ] Agregar stock minimo/maximo y punto de reorden.
- [ ] Agregar historial de compras, ventas y costos.
- [ ] Agregar filtros por almacen, proveedor, categoria y estatus.

### Fase D: validacion

- [ ] Probar factura contado y factura a credito.
- [ ] Probar varias lineas, bonificacion, descuento, ITBIS y flete.
- [ ] Probar producto nuevo y producto existente.
- [ ] Probar doble clic, recarga y perdida de conexion durante la confirmacion.
- [ ] Probar permisos de Administrador, Jefe, Compras y Cajero.
- [ ] Verificar que la venta consuma el stock actualizado.
- [ ] Verificar reportes, alertas de stock bajo y auditoria.

## Criterio de terminado

Se considera terminado cuando una recepcion confirmada aparece en el historial, incrementa exactamente el stock del almacen correcto, conserva costos e impuestos, puede auditarse y no vuelve a aplicarse al repetir la misma accion. El mantenimiento de productos debe permitir consultar y editar los datos ampliados sin romper el catalogo usado por facturacion y portal de clientes.
