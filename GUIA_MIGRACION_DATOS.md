# Guia de Migracion Gradual de Datos

## Objetivo

Actualizar la estructura del sistema sin perder los datos antiguos. Durante la migracion, la aplicacion debe leer el formato nuevo y el formato anterior, mostrar ambos y escribir los registros nuevos en la estructura vigente.

## Orden recomendado antes de migrar

No iniciar una migracion mientras el login o Google tengan errores. La captura del incidente mostro un bloqueo de origen entre un dominio de vista previa (`special-space...`) y `github.dev`; para autenticar se debe abrir directamente el dominio publicado:

```text
https://supermercado-marian.web.app
```

El dominio publicado evita que el navegador mezcle el origen del preview con Firebase Auth. Primero se debe comprobar que el login, Personal, Creditos y Configuracion abren correctamente; despues se puede migrar.

No usar como solucion borrar colecciones antiguas ni cambiar IDs manualmente sin copia.

## Regla principal

No borrar ni renombrar colecciones antiguas hasta comprobar que todos los modulos y reportes funcionan con la estructura nueva y existe una copia manual verificada.

## IDs de Firebase e IDs del negocio

La recomendacion general es **no reemplazar todos los IDs automaticos de Firebase**. Firestore puede seguir creando documentos con IDs aleatorios, mientras cada registro recibe un ID de negocio legible para busquedas, facturas, reportes y soporte.

Ejemplo para una apertura de caja:

```text
ID del documento Firebase: 0xH5e3otZ83RZsaxkDtB
idApertura: AP-2026-000001
```

El primer valor es interno y no se debe editar. El segundo es el numero que puede ver el usuario, imprimir en reportes y buscar en el sistema. Esto evita migraciones destructivas y conserva las referencias existentes.

### Campos recomendados por coleccion

| Coleccion | ID Firebase | ID de negocio recomendado |
|---|---|---|
| `usuarios` | Automatico o UID para perfiles autenticados | `idUsuario` |
| `clientes` | Automatico | `idCliente` |
| `clientes_fiado` | Automatico | `idCliente` o `idCredito` |
| `deudas_clientes` | Automatico | `idCredito` y `nroFactura` |
| `productos` | Automatico | `idSecuencial` y `codigo` |
| `ventas_realizadas` | Automatico o `idOperacion` offline | `nroFactura` |
| `cotizaciones` | Automatico | `nroCotizacion` |
| `aperturas_caja` | Automatico | `idApertura` |
| `cierres_caja` | Automatico | `idCierre` |
| `movimientos_caja` | Automatico | `idMovimiento` |
| `recepciones_compras` | Automatico | `idRecepcion` y `numeroFactura` |
| `movimientos_inventario` | Automatico | `idMovimiento` |

### Reglas para estos IDs

- No reutilizar un ID de negocio.
- Generar el siguiente numero en una transaccion o mecanismo que evite duplicados.
- Mantener el ID Firebase en referencias internas cuando ya exista.
- Guardar tambien `creadoEn`, `actualizadoEn` y `actualizadoPor`.
- Para usuarios autenticados, conservar `uid` como campo obligatorio aunque el documento tenga ID automatico.
- En documentos nuevos, preferir IDs Firebase automaticos salvo que una integracion externa exija un ID fijo.

## Por que el perfil de usuario puede usar el UID

El documento antiguo tenía un ID aleatorio, por ejemplo `LnDwCXCgdgHJ0w1tKoQ2`. Ese ID funciona como identificador de Firestore, pero no demuestra qué cuenta de Firebase Authentication pertenece al perfil.

El UID de Authentication, por ejemplo `nS7CoswL3qUyGmBLLJ0joACiXqf1`, es único y permanente para esa cuenta. Usarlo como ID en `usuarios/{UID}` permite:

- Relacionar directamente el perfil con `request.auth.uid`.
- Validar permisos sin buscar usuarios por correo.
- Evitar que dos cuentas compartan por error el mismo perfil.
- Renovar claims y roles sobre la cuenta correcta.

El documento antiguo no se borra de inmediato. Se conserva como respaldo durante la migración, pero el documento nuevo por UID es el perfil principal para permisos. En otras colecciones no es obligatorio cambiar el ID automatico: se agrega el campo de negocio correspondiente. El UID no cambia por cerrar sesión, cambiar de dispositivo o actualizar la contraseña; solo cambia si se crea otra cuenta Firebase.

## Compatibilidad actual

- Creditos nuevos: `deudas_clientes`.
- Creditos antiguos: `clientes_fiado`.
- Usuarios y empleados: `usuarios`, conservando documentos existentes.
- Productos: `productos`, conservando los campos antiguos mientras se agregan costos, categorias y ubicaciones.
- Ventas y cotizaciones: conservar `ventas_realizadas` y `cotizaciones` durante cualquier ampliacion.

El menu carga los creditos de `deudas_clientes` y `clientes_fiado` para mantener los avisos de vencimiento mientras se completa la migracion. No mezcla ni elimina registros automaticamente.

## Proceso recomendado

1. Crear una copia manual desde Configuracion.
2. Definir el mapeo de campos viejos a nuevos.
3. Leer ambas estructuras desde la interfaz.
4. Mostrar al usuario el origen del registro cuando sea necesario.
5. Escribir datos nuevos en la coleccion vigente.
6. Migrar por lotes pequenos y registrar IDs ya procesados.
7. Comparar cantidades, totales y saldos antes y despues.
8. Repetir la copia manual.
9. Probar login, Personal, Creditos, Facturacion, Reportes e Inventario.
10. Solo despues de varias verificaciones, planificar el archivado de la estructura antigua.

## Plan recomendado para este proyecto

### Paso 1: estabilizar acceso

- [x] Abrir el dominio `supermercado-marian.web.app` directamente, no una vista previa de GitHub/Codespaces.
- [x] Entrar con Google desde ese dominio.
- [x] Crear perfil `usuarios/{UID}` para la cuenta Administrador probada.
- [ ] Confirmar que Personal, Creditos y Configuracion cargan sin `permission-denied`.

### Paso 2: proteger datos

- [ ] Descargar la copia manual desde Configuracion.
- [ ] Guardar el JSON fuera del navegador y comprobar que no esta vacio.
- [ ] Anotar cantidad de usuarios, clientes, creditos, productos y ventas.

### Paso 3: compatibilidad

- [x] Leer `deudas_clientes` y `clientes_fiado` durante la transicion.
- [x] Crear el perfil probado con ID igual al UID de Firebase.
- [ ] Mantener los documentos antiguos intactos.
- [ ] Mostrar diferencias y duplicados antes de escribir.

### Paso 4: migracion controlada

- [ ] Migrar primero un usuario y uno o dos creditos de prueba.
- [ ] Verificar login, saldo, vencimiento y abonos.
- [ ] Migrar el resto por lotes pequenos.
- [ ] Repetir copia manual y comparar totales.
- [ ] Archivar la estructura vieja solo despues de una confirmacion del negocio.

**Recomendacion:** mantener ambas colecciones funcionando por ahora. La migracion debe ser de lectura compatible y escritura nueva; no conviene hacer una migracion destructiva mientras el proyecto aun esta corrigiendo autenticacion y permisos.

## Accion inmediata: reparar el perfil Administrador/Jefe

Los errores actuales `Missing or insufficient permissions` en Personal y Creditos indican que el navegador reconoce el rol guardado localmente, pero Firestore no encuentra el perfil autorizado en `usuarios/{UID}`. Esta reparacion no requiere activar Blaze y no borra datos.

1. Abrir Firebase Console > Authentication > Users.
2. Buscar el correo con el que se entra al sistema.
3. Copiar el **UID** exacto de esa cuenta.
4. Abrir Firestore > coleccion `usuarios` y localizar el registro antiguo por correo.
5. Crear un documento nuevo con ID exactamente igual al UID copiado.
6. Copiar los campos `email`, `nombre`, `rol` y `permisos` del registro antiguo. Para esta cuenta el rol debe ser `Administrador` o `Jefe`.
7. Guardar el documento nuevo. No borrar el documento antiguo todavía.
8. Cerrar sesión, cerrar la pestaña y volver a entrar desde `https://supermercado-marian.web.app`.
9. Probar Personal, Creditos y Configuracion.

Al existir `usuarios/{UID}`, las reglas actuales pueden validar el rol aun cuando el claim del token este atrasado. Despues de confirmar que todo funciona, se puede actualizar el claim desde el flujo de administracion y dejar el registro antiguo como respaldo temporal.

**Importante:** no cambiar las reglas para permitir leer toda la coleccion `usuarios` a cualquier usuario autenticado. Esa coleccion contiene PINs y permisos.

## Acceso administrativo temporal sin Blaze

Mientras no se pueda asignar el claim mediante Cloud Functions, se puede habilitar temporalmente la cuenta desde una coleccion separada y sin PINs:

1. En Firestore pulsa **Iniciar colección**.
2. Nombre de la colección:

```text
accesos_admin
```

3. ID del documento: el UID de Authentication de la cuenta que administrará el sistema.
4. Agrega un campo:

```text
Campo: activo
Tipo: boolean
Valor: true
```

5. Guarda, cierra sesión y vuelve a entrar.

Las reglas publicadas usan `accesos_admin/{UID}` solo para autorizar a la cuenta administrativa a consultar `usuarios` y operar mientras se completa la asignación del claim. Cuando el claim `Administrador` o `Jefe` esté confirmado, este documento puede dejarse como respaldo o desactivarse poniendo `activo=false`.

La regla de empleado tambien reconoce `accesos_admin/{UID}`, por lo que ese permiso temporal habilita las lecturas de clientes, deudas, creditos antiguos y operaciones de empleados sin duplicar documentos.

Si Personal/Empleados vuelve a quedar vacio, revisar primero el correo y UID que muestra la propia pantalla. Crear `accesos_admin/{UID}` para ese UID exacto; no crear otro documento usando un ID aleatorio ni el UID de una cuenta Google diferente.

En el incidente actual, el UID correcto de la sesión es `ZPIrW03MIWQakruHnwE7O8blAwk2`. El documento `accesos_admin/nS7CoswL3qUyGmBLLJ0joACiXqf1` no autoriza esta sesión porque pertenece a otra cuenta.

## Correcciones de facturas

El menú incluye **Devoluciones y notas** para Administrador y Jefe. Al seleccionar una factura aparece el formulario de corrección. La corrección administrativa modifica únicamente tipo de comprobante, número, fecha, cliente y total; los valores anteriores y nuevos quedan registrados en `correcciones_facturas`. La devolución solo registra la solicitud administrativa. La factura no se elimina ni se anula.

## Datos que deben conservarse

- ID del documento.
- Cliente y UID relacionado.
- Numero de factura o credito.
- Saldo, monto original y pagos.
- Fechas de creacion, vencimiento y actualizacion.
- Usuario que hizo el cambio.
- Referencias a ventas y productos.

## Permisos durante la migracion

Las reglas de Firestore deben permitir la lectura necesaria a Administrador y Jefe, y las funciones de migracion deben ejecutarse con autenticacion. La interfaz no debe asumir que `localStorage` representa los permisos actuales: debe renovar el token de Firebase antes de consultar datos protegidos.

## Estado

- [x] Lectura simultanea de creditos nuevos y antiguos en el menu.
- [x] No borrar datos antiguos durante la transicion.
- [x] Renovar el token antes de iniciar listeners protegidos.
- [x] Evitar el contador de cotizaciones hasta que Firebase confirme el claim del rol.
- [x] Permitir que Firestore valide Administrador/Jefe desde `usuarios/{uid}` cuando el claim aun no existe.
- [x] Permitir que las reglas de empleados, Créditos y cotizaciones usen el rol del perfil migrado cuando el claim aun no existe.
- [x] Publicar las reglas actualizadas de Firestore.
- [x] Separar la regla de listado de `usuarios` para evitar recursión al validar el perfil.
- [ ] Crear herramienta de migracion por lotes.
- [ ] Validar duplicados y saldos.
- [ ] Archivar datos antiguos despues de una verificacion formal.

Si una cuenta antigua sigue recibiendo `permission-denied`, revisar que su documento de usuario use como ID el UID de Firebase. Los documentos antiguos con ID aleatorio deben migrarse o recibir el claim mediante un proceso administrativo antes de eliminar la compatibilidad. Para listar todos los usuarios, Personal requiere además el claim `rol=Administrador` o `rol=Jefe`; el perfil por UID no se usa para abrir toda la colección porque contiene PINs.
