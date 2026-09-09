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
