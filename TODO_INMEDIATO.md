# 🎯 CHECKLIST RÁPIDO - ESTADO DEL PROYECTO

**Última actualización:** 2026-09-09
**Avance estimado:** 40% del proyecto completo. El MVP ya tiene varias áreas funcionales, pero aún no está listo para producción.

## ESTIMACION ACTUALIZADA

El trabajo pendiente estimado es de **52 a 91 horas** para cerrar el MVP operativo sin eliminacion de fondo, o **58 a 103 horas** si se incluye procesamiento avanzado de imagen e IA. Para la app movil, el quitar fondo se planifica localmente en el celular, sin enviar la foto a un servicio externo. A 4 horas diarias representa aproximadamente **13 a 23 dias laborables**, o **15 a 26 dias** con fondo avanzado.

El detalle por bloque y los supuestos estan en [PLAN_EVOLUCION_OPERATIVA.md](PLAN_EVOLUCION_OPERATIVA.md). Estas cifras no incluyen trabajo ya realizado.

## DECISIONES NUEVAS

El plan detallado para auditoria de cierres, recepcion validada, margenes, imagenes, devoluciones y WhatsApp queda en [PLAN_EVOLUCION_OPERATIVA.md](PLAN_EVOLUCION_OPERATIVA.md).

Prioridad inmediata: implementar la revision de cierres como un segundo registro (`revisiones_cierres`) sin modificar el cierre original del cajero. Despues se completa el flujo borrador -> validacion -> aplicacion de recepciones.

La carga inicial de productos desde PDF queda definida como importacion asistida. No se crearan productos automaticamente ni se copiaran codigos del sistema externo como codigos de barras; primero se revisaran nombre, costo, unidad, duplicados e imagen.

El historial de entradas de Almacen ya esta visible en modo consulta. Ya existen catalogos basicos de proveedores y almacenes, con condicion y dias de pago, y alertas locales de vencimiento; faltan campos ampliados y pruebas con permisos reales.

Los productos ya pueden guardar una referencia empresarial independiente del codigo de barras. La futura IA debe usarla como señal de coincidencia, no como una decisión automática.

En la entrada de factura el usuario puede elegir Con/Sin ITBIS y la tasa antes de agregar productos. Al comenzar las líneas, el sistema conserva esa elección y avisa si se intenta cambiarla para no mezclar cálculos fiscales.

El historial tambien permite abrir el detalle de cada entrada y consultar sus lineas sin modificar facturas aplicadas.

## 🔴 BLOQUEADORES (HACER PRIMERO)

### Diagnóstico actualizado: 2026-09-07

Antes de agregar nuevas funciones, validar en este orden:

1. Normalizar el documento `usuarios/{UID}` de cada cuenta real y eliminar dependencia de roles antiguos guardados en `localStorage`.
2. Probar solicitudes de `dispositivos_autorizados` con dos cuentas y dos navegadores; confirmar que cada registro tenga correo, UID, rol y estado.
3. Registrar aperturas de caja en Firestore. El estado actual depende principalmente de `localStorage`, por lo que una caja abierta en otro equipo no puede recuperarse de forma confiable.
4. Probar cierre de jornada anterior, cierre por diferencia y apertura posterior.
5. Solo después completar devolución real de productos y notas fiscales.

| Tarea | Prioridad | Esfuerzo | Estado |
|-------|-----------|----------|--------|
| Recuperación de contraseña | 🔴 CRÍTICA | 2h | ✅ Implementado |
| Panel de perfil cliente | 🔴 CRÍTICA | 3h | ⚠️ Parcial: faltan compras y PDF |
| Validar relación Cliente-Deuda | 🔴 CRÍTICA | 1h | ⚠️ En progreso |
| Dashboard de ventas | 🔴 CRÍTICA | 5h | ⚠️ Implementado: falta validar métricas |

---

## 🟡 IMPORTANTES (PRÓXIMAS 2 SEMANAS)

| Tarea | Prioridad | Esfuerzo | Estado |
|-------|-----------|----------|--------|
| Notificaciones por email | 🟡 ALTA | 4h | ⏳ No iniciado |
| Gestión de inventario | 🟡 ALTA | 6h | ⚠️ Básica implementada; falta recepción |
| Consulta de ventas | 🟡 ALTA | 6-10h | ⏳ Pendiente: resumen y detalle cronológico |
| Módulo de empleados | 🟡 ALTA | 4h | ⚠️ CRUD y roles implementados; falta auditoría |
| Historial de cotizaciones | 🟡 ALTA | 2h | ✅ Implementado en perfil |

---

## 🟢 COMPLEMENTARIOS (DESPUÉS)

| Tarea | Prioridad | Esfuerzo | Estado |
|-------|-----------|----------|--------|
| Pagos online (Stripe) | 🟢 MEDIA | 8h | ⏳ No iniciado |
| Reportes avanzados | 🟢 MEDIA | 6h | ⏳ No iniciado |
| Cotizaciones con descuento | 🟢 MEDIA | 3h | ⏳ No iniciado |
| Configuración del sistema | 🟢 BAJA | 3h | ⚠️ Comprobantes, bot y copia manual implementados |

---

## ⏱️ ESTIMACIÓN TOTAL

```
Bloqueadores y validaciones:  11 horas mínimas
Bloques funcionales restantes: 35-70 horas
──────────────────────────────────────────
TOTAL:              46-81 horas de alcance pendiente ≈ 12-21 días (trabajando 4h/día)
```

---

## 🚀 EMPEZAR AHORA (TOP 3)

### **1️⃣ RECUPERACIÓN DE CONTRASEÑA** (implementado)
**Por qué:** Cliente se olvida contraseña y no puede entrar
Disponible en `index.html` y `reset-password.html`, usando Firebase Authentication.

### **2️⃣ PANEL DE PERFIL** (implementado parcialmente)
**Por qué:** Cliente necesita ver/editar sus datos y compras
La página `perfil.html` y la edición de datos básicos ya están disponibles. Queda ampliar
historial de cotizaciones, compras y recibos PDF.

## ✅ VERIFICACIÓN DEL ACCESO

- `git pull --ff-only` actualizado hasta `cd8d5ea`.
- `index.html` y `menu.html` responden por HTTP 200 en servidor local.
- El login consulta el rol en Firebase Auth y, como respaldo, en `usuarios.rol`.
- El acceso Google usa redirección para evitar `auth/popup-blocked` en `app.github.dev`.
- Pendiente: probar con una cuenta real de empleado y cliente en Firebase.

### **3️⃣ VALIDAR DATOS CLIENTE** (1h)
**Por qué:** Hay inconsistencias entre tablas
**Pasos:**
1. Verificar que cliente nuevo se crea en AMBAS colecciones
2. Validar que deudas se cargan por UID correcto
3. Probar flujo: crear cuenta → verificar → ver deudas

### **4️⃣ VALIDAR CIERRE DE SESIÓN Y CAMBIO DE CUENTA**
- [x] El menú ejecuta `signOut` de Firebase.
- [x] Se limpian los datos locales de la sesión.
- [x] El usuario vuelve a `index.html` para elegir otra cuenta.
- [ ] Probar manualmente con email/contraseña y Google en producción.

### **5️⃣ COMPLETAR INVENTARIO Y REPORTES**
- [ ] Crear recepción de facturas de proveedores.
- [ ] Registrar movimientos y auditoría de stock.
- [ ] Validar dashboard y reportes con datos reales.
- [ ] Agregar exportación PDF/Excel donde corresponda.

### **6️⃣ COMPLETAR DEVOLUCIONES FISCALES**
- [x] Mostrar formulario de corrección al seleccionar una factura.
- [x] Corregir tipo, número, fecha, cliente y total con auditoría.
- [ ] Generar notas fiscales/e-CF válidas.
- [ ] Devolver automáticamente el stock cuando corresponda.

---

## 📊 MATRIZ DE PRIORIDAD

```
IMPACTO
   ↑
   │  [Recuperación pwd]     [Dashboard]
   │  [Panel Perfil]         [Inventario]
   │  [Validar Datos]
   │
   └──────────────────────────────→ COMPLEJIDAD
```

**HACER PRIMERO:** Alto impacto + Baja complejidad
↓
Recuperación de contraseña
Validar datos cliente
Panel de perfil básico

