# Guia de Copias de Seguridad de la Base de Datos

**Estado:** Requisito pendiente de implementacion  
**Prioridad sugerida:** Critica antes de produccion  
**Acceso:** Administrador y Jefe, con auditoria obligatoria.

## Objetivo

Proteger los datos de Firebase y permitir recuperar la informacion si ocurre un error, eliminacion accidental, problema de acceso o perdida de un dispositivo. El sistema debe crear copias automaticamente cada dia y tambien permitir una copia manual desde `configuracion.html`.

La copia automatica debe ejecutarse en servidor. No debe depender de que un usuario tenga abierto el navegador o el celular.

## Funciones visibles en Configuracion

Agregar una seccion **Copias de seguridad** con:

- Estado de la ultima copia automatica.
- Fecha, hora, usuario/servicio y cantidad de registros respaldados.
- Estado de la ultima copia manual.
- Boton **Crear copia ahora**.
- Boton **Descargar copia** para obtener una copia autorizada.
- Selector de archivo `.json` o `.zip`.
- Boton **Validar copia** antes de aplicarla.
- Boton **Restaurar/Actualizar base de datos** despues de la validacion.
- Historial de copias y restauraciones.
- Mensajes claros de progreso, exito y error.

En movil, los botones deben ser faciles de usar y la descarga debe mostrar el nombre y la fecha del archivo. Las operaciones largas deben mostrar progreso y no permitir doble clic.

## Permisos

- **Administrador:** puede crear, descargar, validar y restaurar copias.
- **Jefe:** puede crear, descargar y validar copias; la restauracion debe quedar habilitada solo si el negocio decide otorgarle ese permiso de forma explicita.
- **Cajero y otros roles:** no pueden ver ni ejecutar operaciones de copias.
- Los permisos deben validarse en Cloud Functions/servidor y en Firestore Rules. Ocultar botones no es suficiente.

## Copia automatica diaria

Implementar una tarea programada en Cloud Functions con Cloud Scheduler/Cloud Tasks:

1. Ejecutar una vez al dia en una hora configurable.
2. Exportar las colecciones autorizadas a Cloud Storage o usar el mecanismo oficial de exportacion de Firestore.
3. Guardar fecha, estado, version del formato y cantidad de documentos.
4. Cifrar la copia y restringir el acceso al bucket.
5. Conservar una politica de retencion, por ejemplo 30 copias diarias y 12 mensuales.
6. No guardar credenciales, contrasenas ni tokens en el archivo exportado.
7. Registrar error y notificar a Administrador si la copia falla.
8. No sobrescribir la copia anterior hasta comprobar que la nueva termino correctamente.

Colecciones iniciales a considerar:

- `clientes`
- `clientes_portal`
- `deudas_clientes`
- `productos`
- `usuarios`
- `cotizaciones`
- `ventas_realizadas`
- `pagos_creditos`
- `recepciones_compras`
- `movimientos_inventario`
- `configuracion-sistema`
- `configuracion-venta-factura`

La lista debe ser configurable y debe excluir datos temporales, colas locales y secretos.

## Copia manual descargable

Al pulsar **Crear copia ahora**:

- El servidor genera una copia consistente con identificador unico.
- El archivo incluye metadatos: fecha, proyecto, version del esquema y colecciones incluidas.
- El nombre sugerido es `backup-supermercado-marian-YYYY-MM-DD-HHmm.zip`.
- La descarga requiere autenticacion reciente y permiso de Administrador o Jefe.
- Se debe registrar quien la genero y descargo.
- Si la copia contiene datos sensibles, no debe enviarse por correo ni publicarse en enlaces abiertos.

La copia manual es adicional a la automatica. No reemplaza la retencion ni la proteccion del respaldo en servidor.

## Cargar una copia descargada

La opcion **Actualizar/Restaurar desde archivo** debe funcionar asi:

1. Seleccionar el archivo local.
2. Validar extension, tamano, checksum, estructura y version.
3. Mostrar un resumen antes de aplicar: colecciones, documentos, fechas y diferencias.
4. Rechazar archivos incompletos, alterados o de otro proyecto.
5. Crear una copia de seguridad de emergencia de la base actual antes de modificarla.
6. Solicitar confirmacion explicita escribiendo `RESTAURAR`.
7. Aplicar los datos en lotes controlados y mostrar progreso.
8. Registrar cada operacion, usuario, archivo, resultado y errores.
9. Permitir reintentar sin duplicar documentos.
10. Mostrar el resultado final y recomendar revisar productos, clientes, ventas y configuracion.

Por defecto, la restauracion debe ejecutarse en modo **fusion segura**: actualizar documentos identificados por su ID y crear los que no existan, sin borrar datos actuales. Una opcion de reemplazo total debe quedar separada, protegida y deshabilitada hasta definir un procedimiento de recuperacion probado.

## Reglas para evitar perdida de datos

- Nunca restaurar directamente desde el navegador escribiendo colecciones sin una funcion autorizada.
- Nunca borrar toda la base como primer paso.
- Mantener un backup de emergencia antes de cualquier restauracion.
- Usar IDs estables y conservar `creadoEn`, `actualizadoEn` y `actualizadoPor`.
- Proteger la restauracion contra dos ejecuciones simultaneas.
- Mostrar diferencias antes de aplicar cambios.
- Probar primero en un proyecto o entorno de prueba.
- Verificar despues de restaurar que el login, ventas, creditos, inventario y reportes funcionen.

## Modelo de datos sugerido

```text
copias_seguridad/{copiaId}
  tipo: automatica | manual | emergencia
  estado: iniciada | completada | fallida | restaurada
  almacenamiento: cloud-storage
  ruta, nombreArchivo, checksum
  colecciones, cantidadDocumentos, tamanoBytes
  creadoPor, creadoEn, completadoEn

restauraciones/{restauracionId}
  copiaId, nombreArchivo, modo: fusion | reemplazo
  estado, diferencias, cantidadActualizados, cantidadCreados
  iniciadoPor, iniciadoEn, completadoEn, error
```

## Plan por fases

### Fase A: respaldo automatico

- [ ] Definir colecciones incluidas y politica de retencion.
- [ ] Configurar Cloud Storage privado.
- [ ] Crear Cloud Function programada diaria.
- [ ] Registrar estado, cantidad y errores.
- [ ] Probar una copia y su descarga.

### Fase B: Configuracion y copia manual

- [ ] Agregar seccion visible solo para Administrador/Jefe.
- [ ] Crear copia manual desde la interfaz.
- [ ] Descargar copias con URL temporal y autenticacion.
- [ ] Mostrar historial y estado de la ultima copia.

### Fase C: validacion y restauracion

- [ ] Validar archivo, checksum, proyecto y esquema.
- [ ] Mostrar diferencias antes de aplicar.
- [ ] Crear backup de emergencia automatico.
- [ ] Implementar restauracion en fusion segura.
- [ ] Auditar y probar recuperacion completa.

## Criterio de terminado

Se considera terminado cuando existe al menos una copia automatica diaria verificable, una copia manual descargable desde Configuracion, control de acceso para Administrador/Jefe, validacion de archivos y un procedimiento probado para actualizar/restaurar los datos sin duplicar ni borrar informacion accidentalmente.

## Estado de implementacion

- [x] Funciones de copia manual y automatica preparadas en `functions/index.js`.
- [x] Exportacion de colecciones y registro en `copias_seguridad` validado con `node --check`.
- [ ] Desplegar Cloud Functions.
- [x] Agregar descarga manual desde `configuracion.html` sin depender de Blaze.
- [ ] Implementar descarga y restauracion.

### Bloqueo encontrado el 2026-09-05

El despliegue de Functions fue rechazado porque el proyecto `supermercado-marian` esta en el plan Spark:

```text
Your project must be on the Blaze (pay-as-you-go) plan.
Required API cloudbuild.googleapis.com can't be enabled until the upgrade is complete.
```

Para activar el respaldo automatico hay que habilitar el plan Blaze desde [Uso y facturacion de Firebase](https://console.firebase.google.com/project/supermercado-marian/usage/details). Despues se debe repetir:

```bash
npx firebase-tools deploy --only functions
```

La copia manual desde Configuracion **si esta disponible sin Blaze** y descarga un JSON en el equipo del usuario. La copia automatica de servidor y la restauracion controlada requieren completar ese cambio y desplegar Functions.

## Nota sobre el problema de acceso en celular

Si el celular muestra el fondo pero no termina de cargar el login, revisar en este orden:

1. Confirmar que el sitio responde por HTTPS y que no aparece una pagina de error del hosting.
2. Probar la misma URL en ventana privada y en otra red.
3. Revisar si el navegador bloqueo JavaScript, cookies o almacenamiento local.
4. Revisar en consola/network errores de Firebase Auth, Firestore, CORS o archivos bloqueados.
5. Confirmar que `index.html` y sus scripts se sirven desde la misma version publicada.
6. Si solo falla en un celular, borrar datos del sitio o service worker y volver a cargar.
7. Si falla en todos los dispositivos, revisar Firebase Auth, Hosting, reglas y despliegue reciente.

La captura sugiere que el HTML base llega a cargar, pero no confirma si los scripts de Firebase terminaron correctamente. Hace falta la URL exacta y el mensaje de error de la consola/network para identificar la causa con seguridad.
