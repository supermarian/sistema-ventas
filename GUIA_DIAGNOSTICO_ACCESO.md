# Guia de Diagnostico: La Aplicacion No Abre o No Permite Entrar

**Incidente registrado:** 2026-09-05  
**Sintoma observado:** En el celular se mostraba el fondo azul y la tarjeta de login, pero el acceso no completaba correctamente.  
**Error exacto capturado:** No visible en la captura, pero el código confirmó una causa en la consulta del rol de Google.

## Comprobaciones realizadas

- `git pull --ff-only`: completado; el repositorio ya estaba actualizado.
- `https://supermercado-marian.web.app`: responde HTTP 200.
- `https://supermercado-marian.firebaseapp.com`: responde HTTP 200.
- El HTML base del login llega a cargar.
- Existe un service worker con caché local para `index.html` y archivos principales.

**Conclusión provisional:** no parece una caída básica de Firebase Hosting. Las causas más probables son caché/service worker desactualizado, red o bloqueo de Firebase Auth/Firestore en el navegador.

## Causa confirmada en el acceso con Google

Después de autenticar con Google, `index.html` consulta la colección `usuarios` para obtener el rol. La regla anterior solo permitía esa lectura si el token ya tenía un rol de empleado. Una cuenta Google puede estar autenticada sin tener todavía el claim `rol`, por lo que Firestore rechazaba la consulta y el flujo no llegaba a `menu.html`.

Corrección aplicada:

- `firestore.rules` permite leer el documento cuyo correo coincide con el correo del usuario autenticado.
- `index.html` muestra el error real en pantalla y propaga correctamente los errores del flujo manual y de Google.

**Paso pendiente:** publicar las reglas actualizadas y la nueva versión de `index.html`. La corrección local no cambia el sitio publicado hasta ejecutar el despliegue de Firebase.

## Diagnostico rapido desde el celular

1. Abrir la URL exacta en una pestaña privada.
2. Probar con datos móviles y luego con Wi-Fi.
3. Recargar completamente la página.
4. Borrar los datos del sitio para `supermercado-marian.web.app`.
5. Cerrar y abrir de nuevo el navegador.
6. Confirmar que JavaScript, cookies y almacenamiento local estén habilitados.
7. Probar con otro navegador o dispositivo.
8. Anotar el texto exacto del error y la hora del intento.

Si funciona en pestaña privada pero no en la normal, la causa casi siempre es caché, cookies o service worker.

## Tabla de síntomas y solución

| Síntoma o error | Causa probable | Acción |
|---|---|---|
| `ERR_INTERNET_DISCONNECTED`, `ERR_TIMED_OUT` o página no encontrada | Red, DNS o dominio incorrecto | Cambiar de red, revisar la URL y probar los dos dominios de Firebase Hosting |
| Fondo o login viejo, cambios recientes no aparecen | Service worker o caché antigua | Borrar datos del sitio, registrar nuevamente el service worker y recargar |
| `auth/network-request-failed` | Firebase Auth no alcanza el servidor o la red lo bloquea | Probar otra red, revisar fecha/hora del teléfono y comprobar Firebase Auth |
| `auth/invalid-credential`, `auth/invalid-login-credentials` | Correo o contraseña incorrectos | Verificar credenciales y usar recuperación de contraseña |
| `auth/unauthorized-domain` | El dominio no está autorizado en Firebase Authentication | Agregar el dominio usado en Firebase Console > Authentication > Settings > Authorized domains |
| `Missing or insufficient permissions` | Reglas de Firestore o usuario sin permiso | Revisar `firestore.rules`, rol del usuario y claims de Firebase Auth |
| Login visible pero el botón parece no hacer nada | JavaScript bloqueado, error de módulo o archivo externo no cargado | Revisar Console y Network; confirmar que los scripts de `gstatic.com` respondan |
| Login correcto pero no redirige | Fallo consultando `usuarios` o `clientes` | Revisar la consulta de rol, el UID y los datos del usuario en Firestore |
| Error de CORS o `blocked by client` | Extensión, navegador o política de red | Desactivar bloqueadores, probar privado u otro navegador/red |
| Pantalla blanca después de entrar | Error JavaScript en la página destino | Revisar el primer error rojo de Console y la respuesta de la página redirigida |
| `failed-precondition` de IndexedDB | Varias pestañas usando persistencia offline | Cerrar pestañas, borrar datos del sitio y abrir una sola sesión |
| `Failed to get Firebase project` / `403 PERMISSION_DENIED` / `serviceusage.services.use` | La cuenta de Firebase CLI no tiene acceso al proyecto | Usar la cuenta propietaria o asignar permisos IAM en `supermercado-marian`; cerrar sesión y volver a ejecutar `firebase login` |
| `Unsafe attempt to load URL` entre `special-space...` y `github.dev` | La aplicación se abrió dentro de una vista previa con un origen diferente al autorizado por Google | Abrir directamente `https://supermercado-marian.web.app`, no el preview de Codespaces/GitHub, y probar Google desde ese dominio |

## Revisión técnica en el navegador

En Chrome/Edge para Android:

1. Abrir la página.
2. Usar las herramientas remotas del navegador desde una computadora, si están disponibles.
3. Revisar **Console** y copiar el primer error rojo.
4. Revisar **Network** y filtrar por `index.html`, `firebase`, `auth`, `firestore` y `gstatic`.
5. Confirmar códigos HTTP: `200` para archivos y `4xx/5xx` para solicitudes fallidas.
6. Revisar Application/Storage y eliminar el service worker y las cachés del sitio.

No se debe diagnosticar solo con el último error visible: el primer error rojo normalmente explica los siguientes.

## Revisión de Firebase

- Authentication: proveedor Email/Password y Google habilitados.
- Authentication: dominio usado incluido en Authorized domains.
- Firestore: reglas publicadas y usuario autenticado.
- Firestore: documento del usuario en `usuarios` contiene el correo y rol esperados.
- Firestore: documento del cliente contiene `uid` correcto si es cliente.
- Hosting: última versión desplegada y archivos presentes.
- Cloud Functions: revisar logs si la autenticación o una función participa en el flujo.

## Publicar reglas, funciones y pagina

### Estado de publicacion: 2026-09-07

- [x] Firestore Rules publicadas correctamente.
- [x] Hosting publicado correctamente en `https://supermercado-marian.web.app`.
- [x] Correccion sintactica de Facturacion publicada; el boton **Abrir turno** vuelve a registrar su funcion.
- [x] Caja reorganizada con permiso principal y subpermisos para credito, reimpresion, egresos, cotizaciones y cierre.
- [x] Personal puede guardar cambios directamente en Firestore cuando Cloud Functions no esta disponible.
- [ ] Cloud Functions pendientes: el proyecto esta en Spark y Firebase exige Blaze para habilitar Artifact Registry y Cloud Build.

El despliegue completo se intento con la cuenta `marcospenarosario@gmail.com`. Las reglas compilaron, pero Functions se detuvo antes de publicar porque el proyecto necesita actualizarse a Blaze. No se requiere cambiar el codigo para resolverlo; despues de activar Blaze se puede repetir solamente el despliegue de Functions.

La correccion local no cambia el sitio publicado hasta desplegarla en el proyecto `supermercado-marian`. Estos comandos deben ejecutarse desde la carpeta raiz del repositorio, en una terminal donde la cuenta tenga acceso al proyecto. No se deben compartir contrasenas, tokens ni archivos de credenciales.

### 1. Instalar y autenticar Firebase CLI

Si `firebase --version` responde `command not found`, usar `npx` sin instalacion global:

```bash
npx firebase-tools@latest --version
npx firebase-tools@latest login
npx firebase-tools@latest projects:list
npx firebase-tools@latest use supermercado-marian
```

La cuenta que inicia sesion debe ser miembro del proyecto Firebase. Si el proyecto no aparece en `projects:list`, el propietario debe agregar esa cuenta desde Firebase Console > Project settings > Users and permissions.

### 2. Instalar dependencias de Cloud Functions

```bash
cd functions
npm install
npm run lint
cd ..
```

### 3. Publicar la correccion completa

```bash
npx firebase-tools@latest deploy --only firestore:rules,functions,hosting --project supermercado-marian
```

Para publicar primero solo el acceso y la funcion de roles:

```bash
npx firebase-tools@latest deploy --only firestore:rules,functions:asignarRol --project supermercado-marian
```

Para publicar solo la pagina despues de corregir caché o interfaz:

```bash
npx firebase-tools@latest deploy --only hosting --project supermercado-marian
```

Despues de activar el plan Blaze, publicar las funciones pendientes con:

```bash
npx firebase-tools@latest deploy --only functions --project supermercado-marian
```

### 4. Comprobar la funcion de sincronizacion offline

```bash
npx firebase-tools@latest functions:list --project supermercado-marian
npx firebase-tools@latest functions:log --only registrarVentaOffline --project supermercado-marian
```

`registrarVentaOffline` debe aparecer en la region `us-central1`. Si el navegador continua mostrando CORS, normalmente la funcion aun no fue desplegada, el despliegue fallo o se esta usando una version antigua del sitio. Despues de publicar, cerrar sesion, borrar los datos del sitio y entrar nuevamente desde `https://supermercado-marian.web.app`.

### Error 403 de IAM

Si aparece `Failed to get Firebase project`, `403 PERMISSION_DENIED` o `serviceusage.services.use`, la cuenta usada por la CLI no tiene permisos suficientes. El propietario debe agregarla temporalmente como **Editor** o asignar permisos equivalentes para Firebase Hosting, Firestore Rules, Cloud Functions, Artifact Registry, Service Account User y **Service Usage Consumer**. Luego repetir `login`, `projects:list` y el despliegue.

El error no se corrige cambiando el navegador ni las reglas locales. Las ventas normales, la apertura de caja, el cierre y la gestion directa de perfiles funcionan con Firestore sin Blaze. La sincronizacion de ventas guardadas sin conexion mediante `registrarVentaOffline` y la asignacion remota de claims siguen pendientes mientras no exista Cloud Functions.

### Actualizacion de cache

El service worker se incremento a `supermarian-app-v4` para forzar la descarga de la correccion de Facturacion. Si un dispositivo conserva la pantalla anterior, cerrar todas las pestañas del sitio, abrir nuevamente la URL publicada y borrar los datos del sitio una sola vez.

## Autorizacion por dispositivo

La coleccion `dispositivos_autorizados` se utiliza para impedir que un empleado entre desde un navegador no aprobado. El primer acceso desde un equipo nuevo crea un registro `PENDIENTE`; el Administrador puede abrir Personal, filtrar por ID, correo, rol o estado y cambiarlo a `AUTORIZADO` o `BLOQUEADO`.

El Administrador y el Jefe no quedan bloqueados por este control para poder recuperar equipos y autorizar solicitudes. Los cajeros y demas empleados si deben tener el estado `AUTORIZADO` antes de usar Menu o Facturacion.

El ID se guarda en el almacenamiento local del navegador. Si se borran los datos del sitio, se genera otro ID y debe aprobarse otra vez. Esto es intencional. No se debe considerar una huella fisica infalible; para seguridad reforzada se requiere App Check o un backend con gestion central de sesiones.

## Procedimiento de recuperación

1. Confirmar que Hosting responde HTTP 200.
2. Probar pestaña privada.
3. Si funciona, limpiar caché/service worker del dispositivo afectado.
4. Si no funciona, copiar el primer error rojo de Console.
5. Determinar si falla la carga, autenticación, consulta de Firestore o redirección.
6. Probar con una cuenta autorizada conocida.
7. Revisar reglas y dominios autorizados antes de modificar código.
8. Registrar la solución y la fecha en este archivo.

## Datos que deben enviarse para resolver el próximo incidente

- URL exacta usada.
- Modelo del celular y navegador.
- Red utilizada: Wi-Fi o datos móviles.
- Hora del error.
- Texto exacto del mensaje.
- Captura de Console/Network, si se dispone.
- Si la pestaña privada funciona.
- Si otro usuario o dispositivo sí puede entrar.

## Estado de este incidente

- [x] Hosting comprobado y responde.
- [x] `git pull --ff-only` ejecutado.
- [ ] Error exacto de Console capturado.
- [ ] Se confirmó si el problema era caché/service worker.
- [ ] Se confirmó si Firebase Auth o Firestore rechazó la solicitud.
- [ ] Se registró la solución definitiva.

## Solucion comprobada: la ventana privada si permite entrar

Durante este incidente, la aplicacion abrio correctamente en una ventana privada. Esto confirma que el problema estaba en los datos guardados del navegador normal: cache antigua, service worker o cookies/sesion de Firebase dañadas.

### Procedimiento confirmado

1. Cerrar las pestañas abiertas del sistema.
2. Abrir `https://supermercado-marian.web.app` en una ventana privada para verificar que el servicio funciona.
3. En la ventana normal, borrar los datos del sitio y el service worker de `supermercado-marian.web.app`.
4. Cerrar completamente el navegador y abrirlo de nuevo.
5. Entrar otra vez con Google y seleccionar la cuenta autorizada.

Tambien se publico el service worker `supermarian-app-v3`, que ahora intenta cargar primero la version online y usa la cache solo cuando no hay conexion. Si vuelve a ocurrir, la ventana privada es la prueba rapida para distinguir un problema local del navegador de un problema del servidor.

Estado actualizado:

- [x] Se confirmó que la ventana privada permite entrar.
- [x] Se identificó cache/service worker/sesion local como causa del incidente.
- [x] Se publico el service worker actualizado.

## Error actual de permisos en Personal, Creditos y Configuracion

### Permisos de módulos desde Usuarios

Los accesos visibles se administran en **Personal/Usuarios**, dentro de las casillas de
permisos. Al guardar un usuario se conserva el mapa en `usuarios/{UID}.permisos`, y el
menú lo lee desde Firebase al iniciar sesión. `localStorage` solo queda como respaldo
visual temporal; no debe considerarse una autorización de seguridad.

Para consultar cuadres, el usuario debe ser `Administrador`, `Jefe`, `Consultor` o
`Contador`. El acceso temporal `accesos_admin/{UID}` con `activo=true` también
funciona como acceso administrativo. Administrador y Jefe tienen acceso base a Auditoría y Personal para
evitar bloquear la gestión de permisos; Consultor y Contador necesitan
`permisos.auditoria=true`. Para cambiar estados se exige además rol `Administrador`
o `Jefe`.
Sin Blaze, esta autorización se valida directamente en las reglas de Firestore.

### Vincular un usuario sin Blaze

1. Entra a Firebase Console > Authentication > Users.
2. Crea la cuenta del empleado desde **Add user**.
3. Copia el UID generado.
4. Entra a **Personal** en la aplicación.
5. Completa nombre, correo, UID, PIN, rol y permisos.
6. Pulsa **Guardar perfil y permisos**.

El UID es obligatorio. Esta pantalla no crea cuentas de Authentication ni llama a
Cloud Functions. Al editar un perfil existente, el UID queda bloqueado para evitar
vincular por accidente los permisos a otra cuenta.

Para que la persona entre al sistema, debe usar el correo y la contraseña de la
cuenta creada en **Authentication > Users** desde la página principal. El UID no se
lo pide la aplicación al iniciar sesión: el UID solo lo usa el Administrador para
vincular esa cuenta con su perfil, rol y permisos en **Personal**.

### Entrada rápida de producto

**Productos rápidos** ahora se presenta como **Entrada rápida de producto**. Es un
formulario directo para crear un producto nuevo con código, nombre, precio de venta
y stock inicial. No realiza búsqueda ni edita productos existentes. La búsqueda y
edición de productos permanecen en **Almacén**. El permiso utilizado es
`usuarios/{UID}.permisos.productos`.

### Permiso de Entrada de factura

En **Personal**, el permiso se muestra como **Entrada de factura** y se guarda como
`usuarios/{UID}.permisos.recepciones`. Administrador y Jefe lo tienen habilitado por
defecto. Otros roles deben recibirlo explícitamente. El permiso permite consultar
y guardar borradores; no autoriza todavía aplicar una compra al inventario.

## Estados del cuadre sin Blaze

La especificación completa de la pantalla de cuadre, sus campos, movimientos,
métodos de pago y fases de implementación está en [GUIA_CUADRE_CAJA.md](GUIA_CUADRE_CAJA.md).

El cierre no se considera aprobado automáticamente. Su flujo es:

`PENDIENTE_REVISION` -> `EN_REVISION` -> `APROBADO` -> `ARCHIVADO`

Si hay una diferencia que debe aclararse, puede pasar a `OBSERVADO` con un motivo.
La operación vuelve a revisión cuando corresponda antes de archivarse. Firestore
solo permite las transiciones previstas y conserva el usuario, fecha y motivo de
cada decisión.

## Publicar permisos y cuadres

Desde la raíz del proyecto, iniciar sesión con una cuenta que tenga acceso IAM al
proyecto Firebase:

```bash
npx firebase-tools login
npx firebase-tools use supermercado-marian
```

Primero publica la página y las reglas. Esto permite revisar la interfaz aunque
Cloud Functions todavía no esté habilitado:

```bash
npx firebase-tools deploy --only "firestore:rules,hosting"
```

Las funciones son opcionales para este flujo. Sin Blaze, la pantalla de Usuarios
guarda permisos directamente en `usuarios/{UID}` y Auditoría archiva directamente
en `cierres_caja`; las reglas de Firestore siguen validando el rol y el permiso.
Para registrar una cuenta nueva sin Functions, primero créala manualmente en
Firebase Authentication, copia su UID y escríbelo en el campo UID de Personal.

Si más adelante activas Blaze, puedes publicar las funciones para automatizar la
sincronización por correo:

```bash
npx firebase-tools deploy --only "functions:asignarRol,functions:archivarCierreCaja"
```

Si se intenta publicar funciones en el plan Spark, Firebase mostrará un error
indicando que Cloud Functions requiere Blaze. Ese error no significa que las
reglas o Hosting estén dañados; son despliegues independientes.

Comprobar las funciones desplegadas:

```bash
npx firebase-tools functions:list
```

Después del despliegue, cerrar sesión y entrar de nuevo para renovar los claims.
En **Personal**, editar cada usuario y guardar sus casillas de acceso. El permiso
`Auditoría` controla la consulta y gestión de cuadres; el rol también se valida en
backend, por lo que ocultar una tarjeta del menú no sustituye la seguridad.

Si el menú muestra `Rango: Administrador` pero la consola muestra `Missing or insufficient permissions`, el rol está solo en `localStorage` o en un documento antiguo. Firestore necesita encontrar el perfil autorizado en `usuarios/{UID}` o en el claim de Firebase Auth.

La solución recomendada es crear el documento `usuarios/{UID}` desde Firebase Console copiando `email`, `nombre`, `rol` y `permisos` del registro antiguo. No se debe abrir la colección completa en las reglas porque contiene PINs. El procedimiento detallado está en [GUIA_MIGRACION_DATOS.md](GUIA_MIGRACION_DATOS.md).

### Diagnóstico actualizado de Créditos

Créditos ahora intenta leer por separado `clientes`, `deudas_clientes` y `clientes_fiado`. Si una colección falla, muestra los datos de las colecciones permitidas y escribe el nombre exacto de la colección bloqueada, correo y UID de la sesión. Comparar ese UID con el documento `accesos_admin/{UID}` en Firestore permite corregir manualmente la cuenta correcta.

### Diagnóstico actualizado de Personal/Empleados

Personal muestra el correo y UID reales de la sesión. Si aparece `permission-denied`, crear exactamente `accesos_admin/{UID}` con `activo` de tipo booleano en `true`, o asignar el claim `Administrador`/`Jefe`. No usar el ID aleatorio antiguo de `usuarios`; el permiso temporal debe usar el UID que aparece en pantalla.

### Incidente confirmado: UID de otra cuenta

En la captura del 2026-09-05, Personal mostró una sesión con UID:

```text
ZPIrW03MIWQakruHnwE7O8blAwk2
```

Pero anteriormente se creó el permiso temporal con:

```text
nS7CoswL3qUyGmBLLJ0joACiXqf1
```

Son cuentas Firebase diferentes. El segundo UID corresponde a otra cuenta Google, por eso Personal continúa recibiendo `Missing or insufficient permissions`. La corrección es crear `accesos_admin/ZPIrW03MIWQakruHnwE7O8blAwk2` con `activo=true`, o cerrar sesión y entrar con la cuenta que realmente corresponde al UID `nS7...`.

## Error de despliegue registrado el 2026-09-05

La cuenta `marcospe944r@gmail.com` inició sesión correctamente, pero Firebase CLI devolvió:

```text
Failed to get Firebase project supermercado-marian
403 PERMISSION_DENIED
Caller does not have permission
Grant the caller the roles/serviceusage.serviceUsageConsumer role
```

El proyecto existe porque Hosting responde, pero la cuenta no tiene acceso IAM. Para publicar reglas y Hosting, el propietario debe agregar esa cuenta al proyecto `supermercado-marian` con los permisos necesarios, incluyendo `Service Usage Consumer` y permisos de Firebase Hosting/Firestore Rules; después puede ser necesario esperar unos minutos y repetir el despliegue.
