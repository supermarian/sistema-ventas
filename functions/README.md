# Roles seguros

La función `asignarRol` configura los permisos reales de Firebase Authentication y sincroniza `usuarios/{uid}`.

Roles permitidos:

- `Administrador`: acceso completo.
- `Jefe`: operación, precios, almacén, créditos y reportes.
- `Cajero`: facturación y caja.
- `Consultor`: consultas y reportes.
- `Contador`: consultas y reportes.

La pantalla **Personal/Usuarios** vincula cuentas existentes y guarda los permisos de módulos en `usuarios/{UID}.permisos`.
El menú usa ese perfil para mostrar los módulos y las funciones sensibles deben validarlo
también en backend. Para gestionar cierres de caja, el usuario necesita rol `Administrador`
o `Jefe` y `permisos.auditoria=true`; Administrador conserva acceso global.

## Inicialización

1. Crea primero el usuario administrador en Firebase Authentication.
2. Asigna manualmente el claim inicial con un script seguro o Firebase Admin SDK:

```js
await admin.auth().setCustomUserClaims(UID_DEL_ADMIN, {
  rol: 'Administrador',
  admin: true
});
```

3. Despliega las funciones y reglas desde la raíz:

```bash
npm --prefix functions install
firebase deploy --only functions,firestore
```

Después de iniciar sesión, el administrador puede llamar a `asignarRol` para vincular los demás correos. Los claims se actualizan al renovar el token de sesión, por lo que el usuario debe cerrar sesión y entrar de nuevo después de cambiar su rol.

No guardes claves de servicio dentro del repositorio ni en el frontend.

## Eliminación opcional de fondo

La callable `procesarFondoProducto` usa PhotoRoom y conserva la imagen original
en Storage. El resultado se guarda en la misma entrada de `imagenes[]` como
`procesadaUrl` y `procesadaPath`.

Configura la clave únicamente con Firebase Secrets antes de desplegar:

```bash
firebase functions:secrets:set PHOTOROOM_API_KEY
firebase deploy --only functions:procesarFondoProducto
```

La clave nunca debe guardarse en HTML, Markdown, Git ni en mensajes del chat.
