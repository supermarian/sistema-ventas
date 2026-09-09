# Guia de Cuadre de Caja

**Estado:** Base funcional implementada; ampliacion de consulta y detalle en progreso
**Modalidad:** Firestore + Hosting, compatible con el plan Spark y sin dependencia obligatoria de Cloud Functions
**Referencia funcional:** pantalla de cuadre mostrada por el negocio

## 1. Objetivo

El cuadre de caja debe permitir comprobar que el dinero, las ventas y los movimientos
registrados por cada caja coinciden antes de cerrar una jornada. Debe conservar el
historial y permitir reabrir una revision archivada cuando sea necesario investigar,
corregir o volver a verificar un cierre.

La pantalla web no copia literalmente la interfaz antigua. Conserva su flujo de
trabajo: seleccionar sucursal, ver cajas pendientes, revisar movimientos, comparar
montos sugeridos contra montos entregados y registrar la diferencia.

## 2. Vista principal propuesta

### Encabezado y contexto

- Sucursal seleccionada.
- Fecha o jornada seleccionada.
- Usuario responsable de la consulta.
- Estado de conexion.
- Boton de busqueda por fecha.
- Filtro por estado del cuadre.

### Cajas pendientes de cuadrar

La tabla debe mostrar una fila por apertura o turno:

- Sucursal.
- Numero de apertura o `idApertura`.
- Fecha.
- Hora de apertura y cierre.
- Numero de turno.
- Identificador o nombre de la caja.
- Cajero responsable.
- Fondo inicial.
- Estado: pendiente, en revision, aprobado, observado o archivado.

Una fila seleccionada debe cargar el detalle inferior sin perder la lista de
jornadas. Los cierres archivados deben seguir siendo consultables.

## 3. Detalle del cuadre

### Movimientos de caja

El detalle debe separar los ingresos y egresos que forman el resultado:

- Ventas de contado.
- Cobros de credito.
- Iniciales o fondo de apertura.
- Depositos de clientes.
- Otros ingresos.
- Devoluciones y notas de credito.
- Egresos de caja.
- Ajustes autorizados.
- Total de ingresos.
- Total de egresos.
- Total neto.

Formula base para efectivo esperado:

```text
efectivoEsperado = fondoInicial + ventasEfectivo + cobrosCredito
                   + otrosIngresos + depositos - devoluciones - egresos
```

El detalle debe mostrar siempre el origen del valor y no permitir que el usuario
modifique silenciosamente un total calculado.

### Tipos de pago

La tabla de pagos debe mostrar por cada metodo:

- Metodo: efectivo, tarjeta, transferencia, credito, nota de credito u otro.
- Monto sugerido por las ventas y movimientos registrados.
- Monto entregado o contado por el cajero.
- Diferencia por metodo.
- Observacion, cuando exista.

Los totales deben mostrar:

```text
totalSugerido = suma de montos sugeridos
totalEntregado = suma de montos entregados
diferencia = totalSugerido - totalEntregado
```

La diferencia debe señalar claramente si existe **FALTANTE**, **SOBRANTE** o
**CUADRADO**. Una diferencia no debe ocultarse dentro del total neto.

## 4. Acciones de la pantalla

### Acciones disponibles para el cajero

- Abrir caja.
- Cerrar caja.
- Imprimir comprobante del cierre.
- Consultar el resumen de su jornada.

Al cerrar, el registro se crea como `PENDIENTE_REVISION`. El cajero no aprueba ni
archiva su propio cuadre.

### Acciones disponibles para Administrador o Jefe

- Buscar por fecha o jornada.
- Filtrar por estado.
- Seleccionar sucursal y caja.
- Ver detalle de movimientos.
- Ver las facturas de la jornada y sus totales.
- Iniciar revisión.
- Aprobar.
- Marcar como observado con motivo obligatorio.
- Reabrir un cuadre archivado.
- Archivar después de una aprobación.
- Imprimir o reimprimir el resumen del cuadre.

## 5. Estados y transiciones

El flujo obligatorio es:

```text
PENDIENTE_REVISION -> EN_REVISION -> APROBADO -> ARCHIVADO
```

Cuando hay una diferencia:

```text
EN_REVISION -> OBSERVADO -> EN_REVISION
```

Un cierre archivado puede reabrirse para investigación:

```text
ARCHIVADO -> EN_REVISION
```

Reglas:

- No se puede crear un cuadre directamente como aprobado o archivado.
- No se puede archivar un cuadre pendiente, observado o en revisión.
- `OBSERVADO` exige motivo.
- Cada transición registra UID, correo y fecha.
- Un cierre archivado no se elimina.
- Los datos originales del cierre no se editan; solo se agregan datos de revisión.
- Las reglas de Firestore validan las transiciones aunque alguien intente llamar la
  API desde fuera de la interfaz.

## 6. Modelo de datos recomendado

### `aperturas_caja/{aperturaId}`

```text
idApertura, sucursalId, sucursalNombre, cajaId, cajaNombre
cajeroUid, cajeroNombre, cajeroEmail, turno
fondoInicial, fechaApertura, estado
```

### `cierres_caja/{cierreId}`

```text
idCierre, idApertura, sucursalId, sucursalNombre, cajaId, cajaNombre
fechaJornada, fechaCierre, cajeroNombre, cajeroEmail
montoInicial, fondoInicial, ventasEfectivo, ventasCredito, cobrosCredito
egresos, otrosIngresos, devoluciones, montoEsperadoEnCaja
montoRealContado, totalSugerido, totalEntregado, diferencia
metodosPago, desgloseEfectivo, totalFacturas, alertaDiferencia
estado, creadoPorUid, creadoPorEmail, creadoEn
revisionIniciadaPorUid, revisionIniciadaPorEmail, revisionIniciadaEn
aprobadoPorUid, aprobadoPorEmail, aprobadoEn
observadoPorUid, observadoPorEmail, observadoEn, motivoObservacion
archivadoPorUid, archivadoPorEmail, archivadoEn, motivoArchivo
```

### `movimientos_caja/{movimientoId}`

```text
tipo, categoria, descripcion, monto, metodoPago
idApertura, cierreId, sucursalId, cajaId
usuarioUid, usuarioEmail, creadoEn, referencia
```

### `ventas_realizadas/{ventaId}`

Las facturas deben conservar como minimo:

```text
nroFactura, fecha, total, metodoPago, pagos
cajero, cajeroEmail, usuarioUid, idApertura, cierreId
```

Si una venta se registra antes del cierre, debe poder asociarse a la jornada por
`idApertura` o, como respaldo, por fecha, caja y cajero. La asociación por fecha
sola no es suficiente cuando hay varias cajas o turnos simultáneos.

## 7. Seguridad sin Blaze

- La caja crea únicamente cierres pendientes y vinculados al usuario autenticado.
- Administrador y Jefe pueden revisar, aprobar, observar, reabrir y archivar.
- Consultor y Contador pueden consultar si tienen `permisos.auditoria=true`.
- El cajero no cambia estados de revisión.
- Se puede usar `accesos_admin/{UID}` con `activo=true` como acceso administrativo
  temporal mientras se completa la configuración del perfil.
- Firestore Rules es la autoridad de seguridad; ocultar botones no es suficiente.
- No se deben guardar contraseñas de Authentication en Firestore.
- El PIN operativo actual debe migrarse a un mecanismo más seguro antes de usar el
  sistema en producción.

## 8. Sincronización y datos faltantes

Los registros antiguos que solo tengan `fechaCierre`, `montoInicial` y totales se
muestran como cierres históricos con estado `PENDIENTE_REVISION`. No deben perderse.

Cuando falte el detalle de facturas, la pantalla debe indicar que el cierre existe
pero que no se pudo asociar el detalle. No se debe inventar el monto entregado.

Antes de operar con varias sucursales se debe completar:

- `sucursalId` y `sucursalNombre` en aperturas, ventas y cierres.
- `cajaId` y `cajaNombre`.
- `idApertura` en cada venta.
- Separación de movimientos por ingreso, egreso y devolución.
- Catálogo de métodos de pago.

## 9. Fases de implementación

### Fase A: consulta y revisión

- [x] Guardar cierre como `PENDIENTE_REVISION`.
- [x] Consultar cierres históricos.
- [x] Filtrar por fecha y estado.
- [x] Ver facturas de la jornada desde Auditoría.
- [x] Aprobar, observar, archivar y reabrir.
- [x] Validar transiciones en Firestore Rules.

### Fase B: detalle comparable

- [ ] Incorporar sucursal, caja e idApertura al POS.
- [ ] Guardar movimientos de caja normalizados.
- [ ] Guardar montos sugeridos y entregados por método de pago.
- [ ] Asociar cada factura a apertura, caja, turno y cierre.
- [ ] Mostrar desglose de ingresos y egresos como la pantalla de referencia.

### Fase C: operación diaria

- [ ] Imprimir y reimprimir cuadre desde Auditoría.
- [ ] Exportar detalle a PDF o formato de archivo autorizado.
- [ ] Agregar filtros por sucursal, caja y cajero.
- [ ] Agregar historial separado de eventos de auditoría.
- [ ] Ejecutar pruebas con faltantes, sobrantes, devoluciones y varias cajas.

## 10. Criterios de aceptación

- Un cajero cierra una jornada y aparece como pendiente.
- Un responsable puede encontrarla filtrando por fecha.
- El detalle muestra ventas y montos por forma de pago.
- Una diferencia se ve como faltante o sobrante.
- La observación exige explicación.
- El cierre aprobado puede archivarse.
- Un cierre archivado puede reabrirse sin borrar su historial.
- Un usuario sin permiso no puede leer ni modificar los cuadres.
- La solución funciona con Firestore + Hosting sin Cloud Functions.
