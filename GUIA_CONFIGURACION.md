# Guia del Menu de Configuracion

**Acceso:** Administrador y Jefe.  
**Ruta:** `configuracion.html`

El Panel Principal tambien muestra un boton **Configuracion** en la esquina superior derecha, al lado del titulo **Súper Marian - Panel Principal**. Solo aparece para Administrador y Jefe y lleva a la misma pagina de configuracion.

## Secciones superiores

La configuracion debe mostrar un menu superior para entrar rapidamente a:

1. **Tipos de comprobantes:** activar/desactivar B01, B02, B13, B16, e-CF y otros tipos autorizados; editar la siguiente numeracion y guardar cambios.
2. **Firebase:** abrir el proyecto, Firestore, usuarios, uso y facturacion desde enlaces de administracion.
3. **Copias:** descargar una copia manual sin Blaze y mostrar el estado de la copia automatica cuando Cloud Functions este habilitado.
4. **Bot:** configurar dentro de esta misma pagina el telefono publico, Phone Number ID y activacion del bot.
5. **Catalogo Offline:** actualizar el catalogo de productos que utiliza Caja sin conexion.

El menu debe funcionar en desktop y movil; en pantallas pequenas se permite desplazamiento horizontal sin romper los botones.

## Copias sin Blaze

Mientras el proyecto permanezca en el plan Spark, el boton **Descargar copia manual** crea un JSON local con las colecciones autorizadas. Esta copia queda en el equipo del usuario y debe guardarse en un lugar seguro.

La copia automatica diaria en Cloud Storage requiere plan Blaze, Cloud Functions y Cloud Scheduler. El mensaje informativo de la seccion Copias debe aclarar esta diferencia al pasar el mouse o tocar el indicador de ayuda.

## Permisos

Los tipos marcados como **Activos** en Configuracion aparecen en Facturacion dentro de una lista desplegable. Si se activa uno, Facturacion muestra ese tipo; si se activan varios, el cajero puede seleccionar el comprobante antes de aplicar la venta. El numero siguiente se conserva por cada codigo.

- Administrador y Jefe pueden abrir Configuracion. La pagina valida el claim de Firebase y, como respaldo, el rol del documento `usuarios` asociado al correo autenticado.
- Solo Administrador y Jefe pueden modificar comprobantes y configurar el bot.
- La copia manual solo debe estar disponible para Administrador y Jefe.
- Cajero, Consultor y Contador deben ser redirigidos al menu si intentan abrir la pagina directamente.
- Las reglas y las funciones deben validar los permisos; no basta con ocultar secciones.

## Estado actual

- [x] Menu superior agregado en `configuracion.html`.
- [x] Seccion de tipos de comprobantes existente y funcional.
- [x] Enlaces de administracion de Firebase.
- [x] Copia manual local sin Blaze.
- [x] Mensaje explicativo sobre Blaze.
- [x] Formulario del bot integrado en Configuracion, sin salir al menu.
- [x] Boton de Configuracion en la esquina superior derecha del Panel Principal.
- [x] Tipos activos disponibles como lista desplegable en Facturacion.
- [x] Numeracion independiente por tipo de comprobante.
- [x] Division por uso: Caja, Devoluciones y notas, y Compras/recepcion.
- [x] Caja excluye notas de credito, notas de debito y comprobantes de compras.
- [x] Menu separado de Devoluciones y notas para Administrador y Jefe.
- [x] Formato de miles en la numeracion (`1,000`) y contador de comprobantes registrados por tipo.
- [x] Guardado de tipos y secuencias en `configuracion-sistema/comprobantes` y `configuracion-venta-factura`.
- [x] Acceso de Administrador y Jefe a correcciones administrativas y devoluciones auditadas.
- [x] Formulario visible al seleccionar una factura para corregir tipo de comprobante, número, fecha, cliente y total.
- [ ] Copia automatica diaria en servidor.
- [ ] Restauracion validada desde archivo.

El modulo de Devoluciones y notas registra la operacion administrativa y conserva la factura original. La correccion administrativa permite modificar tipo de comprobante, numero, fecha, cliente y total con auditoria de valores anteriores y nuevos. La generacion de una nota fiscal/e-CF y el retorno automatico de stock siguen pendientes de implementacion.

### Validacion de permisos

Si aparece `Missing or insufficient permissions` al guardar comprobantes, las reglas de Firestore deben estar desplegadas y el usuario debe tener rol `Administrador` o `Jefe` en el claim de Firebase, en `usuarios/{UID}` o en `accesos_admin/{UID}` con `activo: true`. El rol guardado solo en `localStorage` no concede permisos.
