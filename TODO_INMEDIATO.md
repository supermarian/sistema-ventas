# 🎯 CHECKLIST RÁPIDO - ESTADO DEL PROYECTO

**Última actualización:** 2026-09-06
**Avance estimado:** 40% del proyecto completo. El MVP ya tiene varias áreas funcionales, pero aún no está listo para producción.

## 🔴 BLOQUEADORES (HACER PRIMERO)

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
Bloqueadores:        11 horas
Importantes:         16 horas  
Complementarios:     20 horas
─────────────────────────────
TOTAL:              47 horas de alcance pendiente ≈ 2 semanas (trabajando 4h/día)
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

