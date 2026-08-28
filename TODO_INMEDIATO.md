# 🎯 CHECKLIST RÁPIDO - FALTA HACER

## 🔴 BLOQUEADORES (HACER PRIMERO)

| Tarea | Prioridad | Esfuerzo | Estado |
|-------|-----------|----------|--------|
| Recuperación de contraseña | 🔴 CRÍTICA | 2h | ⏳ No iniciado |
| Panel de perfil cliente | 🔴 CRÍTICA | 3h | ⏳ No iniciado |
| Validar relación Cliente-Deuda | 🔴 CRÍTICA | 1h | ⚠️ En progreso |
| Dashboard de ventas | 🔴 CRÍTICA | 5h | ⏳ No iniciado |

---

## 🟡 IMPORTANTES (PRÓXIMAS 2 SEMANAS)

| Tarea | Prioridad | Esfuerzo | Estado |
|-------|-----------|----------|--------|
| Notificaciones por email | 🟡 ALTA | 4h | ⏳ No iniciado |
| Gestión de inventario | 🟡 ALTA | 6h | ⏳ No iniciado |
| Módulo de empleados | 🟡 ALTA | 4h | ⏳ No iniciado |
| Historial de cotizaciones | 🟡 ALTA | 2h | ⏳ No iniciado |

---

## 🟢 COMPLEMENTARIOS (DESPUÉS)

| Tarea | Prioridad | Esfuerzo | Estado |
|-------|-----------|----------|--------|
| Pagos online (Stripe) | 🟢 MEDIA | 8h | ⏳ No iniciado |
| Reportes avanzados | 🟢 MEDIA | 6h | ⏳ No iniciado |
| Cotizaciones con descuento | 🟢 MEDIA | 3h | ⏳ No iniciado |
| Configuración del sistema | 🟢 BAJA | 3h | ⏳ No iniciado |

---

## ⏱️ ESTIMACIÓN TOTAL

```
Bloqueadores:        11 horas
Importantes:         16 horas  
Complementarios:     20 horas
─────────────────────────────
TOTAL:              47 horas ≈ 2 semanas (trabajando 4h/día)
```

---

## 🚀 EMPEZAR AHORA (TOP 3)

### **1️⃣ RECUPERACIÓN DE CONTRASEÑA** (2h)
**Por qué:** Cliente se olvida contraseña y no puede entrar
**Pasos:**
1. Agregar link "¿Olvidaste contraseña?" en index.html
2. Nueva página: reset-password.html
3. Usar Firebase: sendPasswordResetEmail()
4. Probar con email real

### **2️⃣ PANEL DE PERFIL** (3h)
**Por qué:** Cliente necesita ver/editar sus datos y compras
**Pasos:**
1. Nueva página: perfil.html
2. Mostrar datos: nombre, email, teléfono, dirección
3. Botón editar
4. Guardar cambios en Firestore

### **3️⃣ VALIDAR DATOS CLIENTE** (1h)
**Por qué:** Hay inconsistencias entre tablas
**Pasos:**
1. Verificar que cliente nuevo se crea en AMBAS colecciones
2. Validar que deudas se cargan por UID correcto
3. Probar flujo: crear cuenta → verificar → ver deudas

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

