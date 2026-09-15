# Matriz de permisos por modulo

Este documento define como deben organizarse los permisos de empleados. La regla principal es que cada modulo tiene un permiso de entrada y, cuando contiene operaciones sensibles o distintas, subpermisos propios.

## Regla de uso

- El permiso principal permite ver y abrir el modulo.
- Los subpermisos controlan botones, acciones y ventanas dentro del modulo.
- Si el perfil tiene un objeto `permisos` guardado, ese objeto es la fuente actual y puede quitar accesos incluso a Administrador; el rol solo sirve como valor predeterminado cuando no hay permisos guardados.
- Administrador tiene todos los permisos.
- Jefe tiene los permisos operativos y administrativos definidos por el negocio, excepto las acciones reservadas al Administrador.
- Un permiso guardado solo en `localStorage` sirve para la interfaz; Firestore debe seguir validando la operacion.
- Si un modulo no tiene permiso, no debe aparecer en el menu ni poder abrirse escribiendo la URL.

## Caja / Facturacion

`facturacion` es el permiso principal. Las opciones internas son:

| Permiso | Funcion |
|---|---|
| `caja_credito` | Cobrar abonos de clientes con credito |
| `caja_reimpresion` | Buscar y reimprimir una factura |
| `caja_egreso` | Registrar salidas de dinero de caja |
| `caja_cotizaciones` | Consultar y cargar cotizaciones pendientes |
| `caja_cierre` | Cerrar turno y registrar diferencias |
| `caja_apertura` | Abrir turno; requiere perfil y PIN valido |
| `caja_venta_contado` | Registrar ventas normales |
| `caja_venta_credito` | Crear ventas a credito |

Flujo esperado:

1. Entrar a **Caja / Facturacion**.
2. Abrir turno con monto directo o desglose opcional.
3. Realizar venta normal.
4. Usar credito, reimpresion, egreso o cotizaciones solo si el subpermiso esta activo.
5. Cerrar turno solo si `caja_cierre` esta activo.

La venta de contado y la apertura son parte del uso principal de Caja. No deben esconderse mediante cinco casillas obligatorias al cajero.

### Navegación visual de Caja

La pantalla de Facturación muestra una barra de pestañas siempre visible. Las pestañas representan acciones existentes y se ocultan automáticamente cuando el usuario no tiene el subpermiso correspondiente:

| Pestaña | Permiso | Acción actual |
|---|---|---|
| Venta | `facturacion` | Productos, carrito y cobro |
| Reimpresión | `caja_reimpresion` | Enfoca la búsqueda de factura y conserva el ticket como copia |
| Cotizaciones | `caja_cotizaciones` | Abre las cotizaciones pendientes |
| Créditos | `caja_credito` | Abre el cobro de deudas |
| Egresos | `caja_egreso` | Abre el registro de salida de caja |
| Cierre | `caja_cierre` | Inicia el cierre del turno |

Las pestañas no crean permisos nuevos ni duplican lógica: llaman a los modales y controles existentes. La reimpresión permanece separada de Gestión de facturas (`correcciones`) para no confundir una copia de ticket con una corrección o devolución.

## Personal

| Permiso | Funcion |
|---|---|
| `personal` | Abrir y consultar Personal |
| `personal_crear` | Registrar un perfil de empleado existente en Authentication |
| `personal_editar` | Cambiar nombre, PIN, rol y permisos |
| `personal_eliminar` | Habilitar borrado por seleccion y confirmacion |

Eliminar nunca debe estar pegado a editar. Debe ser una accion separada, con seleccion, resumen de nombres y confirmacion.

## Otros modulos

| Modulo | Permiso principal |
|---|---|
| Almacen | `almacen` |
| Compras y recepciones | `compras` |
| Productos rapidos | `productos` |
| Control de precios | `precios` |
| Dashboard | `dashboard` |
| Reportes | `reportes` |
| Creditos | `creditos` |
| Auditoria | `auditoria` |
| Consulta de ventas | `consulta_ventas` |
| Cierres de caja | `cierres_caja` |
| Configuracion del bot | `bot` |
| Comprobantes y configuracion | `configuracion` |
| Correcciones de facturas | `correcciones` |

El permiso `correcciones` se presenta al usuario como **Gestion de facturas** e incluye correcciones administrativas, devoluciones y notas. La devolucion real de productos requiere seleccionar lineas y cantidades; no debe simularse cambiando solamente el total de la factura.

Las reimpresiones se mantienen separadas de Gestión de facturas: el ticket ya debe indicar `REIMPRESIÓN / COPIA` y no confundirse con una factura original.

## Diagnostico obligatorio

Cada modulo debe escribir en consola errores con un prefijo estable:

```text
[SISTEMA VENTAS] MODULO_ACCION
```

El objeto de error debe incluir, cuando exista:

- `code` de Firebase.
- `message`.
- correo y UID de la sesion.
- UID del perfil encontrado.
- permiso o coleccion que fallo.

En Caja, un mensaje de PIN incorrecto no debe ocultar si falta el perfil. Primero se debe distinguir `PERFIL_CAJERO_NO_ENCONTRADO` de `APERTURA_PIN_INVALIDO`.

## Restriccion del plan Spark

Firestore y Hosting pueden funcionar sin Blaze. Sin embargo, sin Cloud Functions:

- No se pueden crear usuarios nuevos de Firebase Authentication desde Personal.
- No se puede asignar claims automaticamente.
- Las ventas offline quedan guardadas localmente, pero no se sincronizan mediante `registrarVentaOffline` hasta publicar la funcion.

Por eso, en plan Spark el usuario debe existir primero en Firebase Authentication y luego se crea o actualiza su perfil `usuarios/{UID}` con su `pin`, `rol` y `permisos`.

Personal no debe llamar `asignarRol` mientras Cloud Functions no este publicada: esa llamada provoca CORS en el plan Spark. En este modo, Personal busca el correo en `usuarios` y actualiza el perfil existente. Si el correo no existe, primero se debe crear manualmente en Firebase Authentication y crear `usuarios/{UID}`.

## Acceso por dispositivo

La coleccion `dispositivos_autorizados` controla los equipos de empleados:

| Campo | Uso |
|---|---|
| `dispositivoId` | Identificador persistente del navegador guardado localmente |
| `uid` | Usuario Firebase dueño de la sesion |
| `email`, `nombre`, `rol` | Filtros y trazabilidad administrativa |
| `estado` | `PENDIENTE`, `AUTORIZADO` o `BLOQUEADO` |
| `navegador`, `plataforma` | Informacion para reconocer el equipo |
| `ultimoAcceso` | Ultima actividad observada |

El ID del documento se forma como `UID__dispositivoId`. No se debe usar solamente `dispositivoId`, porque el mismo navegador puede ser utilizado por varias cuentas y una cuenta terminaría sobrescribiendo a otra.

Flujo:

1. Un empleado entra desde un navegador nuevo.
2. El sistema crea el dispositivo como `PENDIENTE`.
3. Menu y Facturacion quedan bloqueados.
4. Administrador/Jefe entra a Personal y filtra por dispositivo, correo, rol o estado.
5. El administrador pulsa **Autorizar** o **Bloquear**.
6. El empleado vuelve a entrar y el dispositivo autorizado puede usar sus permisos normales.

Personal muestra los 10 registros con `ultimoAcceso` más reciente despues de aplicar los filtros.

Este mecanismo es un control operativo del navegador, no una huella fisica imposible de copiar: alguien con acceso al navegador puede borrar su almacenamiento local y generar otro ID. Para una proteccion mas fuerte se necesita App Check, administracion central de sesiones o Cloud Functions. Aun asi, la autorizacion por dispositivo evita el acceso accidental desde equipos desconocidos y funciona en el plan Spark.

## Checklist para cada nuevo empleado

1. Crear o confirmar la cuenta en Firebase Authentication.
2. Copiar el UID real de esa cuenta.
3. Crear `usuarios/{UID}` con `email`, `nombre`, `pin`, `rol` y `permisos`.
4. Activar `facturacion` si trabajara en Caja.
5. Activar solo los subpermisos de Caja que realmente necesita.
6. Cerrar sesion y volver a entrar.
7. Revisar la consola: `PERFIL_CAJERO` debe mostrar `perfilEncontrado: true`.
8. Probar primero apertura, luego una venta de contado y finalmente las funciones autorizadas.