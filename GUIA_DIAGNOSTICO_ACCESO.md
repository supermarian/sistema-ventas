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
