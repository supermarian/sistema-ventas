# 📧 Flujo de Verificación de Email - Cliente Súper Marian

## Resumen
Sistema de confirmación de email usando **Firebase Authentication** (gratuito y seguro).

---

## 🔄 FLUJO COMPLETO

### **PASO 1: CREAR CUENTA**
```
┌─────────────────────────────────────────────────────┐
│           PANTALLA: Crear Cuenta                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Email:        [  cliente@gmail.com  ]             │
│  Contraseña:   [  •••••••••  ]                      │
│                                                     │
│  [Entrar]  [Crear cuenta]                           │
│                                                     │
│  ✓ Cuenta creada. Revisa tu email                   │
│    para confirmarla.                                │
│                                                     │
└─────────────────────────────────────────────────────┘
        ↓
        GOOGLE GMAIL RECIBE:
        ┌─────────────────────────────────────┐
        │ De: noreply@supermercado-marian...  │
        │ Asunto: Verifica tu email           │
        │                                     │
        │ Haz click aquí para verificar:      │
        │ [VERIFICAR EMAIL]                   │
        │                                     │
        │ Si no solicitaste esto, ignóralo    │
        └─────────────────────────────────────┘
        ↓
```

---

### **PASO 2: ENTRAR (Email NO verificado)**
```
┌─────────────────────────────────────────────────────┐
│           PANTALLA: Login Cliente                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Email:        [  cliente@gmail.com  ]             │
│  Contraseña:   [  •••••••••  ]                      │
│                                                     │
│  [Entrar]  [Crear cuenta]                           │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ 📧 Pendiente verificar email                │  │
│  │ Se envió un enlace a tu correo. Haz click   │  │
│  │ para confirmar tu cuenta.                   │  │
│  │                                              │  │
│  │  [Reenviar email]                            │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
        ↓
        CLIENTE HACE CLICK EN EMAIL
        ↓
```

---

### **PASO 3: ENTRAR (Email VERIFICADO) ✓**
```
┌─────────────────────────────────────────────────────┐
│           PANTALLA: Catálogo de Cliente             │
├─────────────────────────────────────────────────────┤
│ 🛒 Súper Marian | Catálogo para clientes | [Salir] │
│                                                     │
│  ✓ Email verificado correctamente                  │
│  Se cargó el catálogo y deudas                      │
│                                                     │
│  ┌─ Busca Productos ─┐  ┌─ Mi Cotización ─┐       │
│  │                   │  │                  │       │
│  │ Producto 1 $10    │  │ Producto x 1     │       │
│  │ [Agregar]         │  │ Total: $10.00    │       │
│  │                   │  │ [Enviar]         │       │
│  └───────────────────┘  └──────────────────┘       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 📊 DATOS GUARDADOS EN FIREBASE

### **Colección: clientes**
```json
{
  "uid": "abc123xyz",
  "email": "cliente@gmail.com",
  "nombre": "",
  "telefono": "",
  "emailVerificado": false,    ← SE ACTUALIZA AL CONFIRMAR
  "limiteCredito": 0,
  "permiteCredito": false,
  "fechaRegistro": "2026-08-27T..."
}
```

### **Colección: clientes_portal**
```json
{
  "uid": "abc123xyz",
  "email": "cliente@gmail.com",
  "rol": "Cliente",
  "emailVerificado": false,    ← SE ACTUALIZA AL CONFIRMAR
  "fechaRegistro": "2026-08-27T..."
}
```

---

## 🔐 FLUJO DE SEGURIDAD

```
1. CREAR CUENTA
   ├─ Validar email formato
   ├─ Validar contraseña (mín. 6 caracteres)
   ├─ Crear en Firebase Auth
   ├─ Crear en clientes (emailVerificado=false)
   ├─ Enviar email de verificación
   └─ Mostrar mensaje "Revisa tu email"

2. ENTRAR (No verificado)
   ├─ Validar credenciales
   ├─ Detectar emailVerificado=false
   ├─ Bloquear acceso al catálogo
   ├─ Mostrar aviso de pendiente verificación
   └─ Ofrecer reenviar email

3. CLIENTE VERIFICA EMAIL
   ├─ Click en link de email
   ├─ Firebase Auth marca como verificado
   └─ Email verificado en el navegador

4. ENTRAR (Verificado)
   ├─ Validar credenciales ✓
   ├─ Detectar emailVerificado=true
   ├─ Cargar catálogo
   ├─ Cargar deudas
   └─ Acceso completo ✓
```

---

## ✅ VENTAJAS DE ESTA IMPLEMENTACIÓN

| Aspecto | Beneficio |
|---------|-----------|
| **Seguridad** | Solo emails reales pueden crear cuenta |
| **Spam** | Evita bots automáticos |
| **Contacto** | Asegura email válido para futuras notificaciones |
| **Costo** | Gratis, incluido en Firebase |
| **Facilidad** | Sin código backend adicional |

---

## 🚀 PRÓXIMAS MEJORAS

### **Fase 2: Emails Personalizados**
```
Usar Cloud Functions + SendGrid para:
✓ Email de bienvenida personalizado
✓ Confirmación de cotización
✓ Avisos de deuda vencida
✓ Recordatorio de pago

Costo: ~$29/mes SendGrid
```

### **Fase 3: Recuperación de Contraseña**
```
Agregar botón: "¿Olvidaste tu contraseña?"
- Firebase Auth envía email de reset
- Usuario elige contraseña nueva
```

---

## 📋 CHECKLIST DE CONFIGURACIÓN

- [x] Verificación de email implementada en código
- [ ] Configurar email personalizado en Firebase Console
  - Ir a: Authentication → Templates → Verification Email
  - Agregar logo y mensaje personalizado
- [ ] Probar creación de cuenta con email real
- [ ] Verificar que email llega a bandeja
- [ ] Probar acceso bloqueado sin verificar
- [ ] Probar reenvío de email
- [ ] Verificar que usuario accede después de confirmar

---

## 🐛 TROUBLESHOOTING

**P: El email no llega**
- R: Revisar carpeta de spam/promotiones
- R: Cambiar email remitente en Firebase Console
- R: Aguardar 5 min (puede demorar)

**P: Cliente intenta entrar sin verificar**
- R: Se le muestra aviso de pendiente verificación
- R: Ofrecer botón para reenviar email

**P: ¿Cómo cambio el contenido del email?**
- R: Firebase Console → Authentication → Email Templates
- R: Personaliza asunto, mensaje y logo

**P: ¿Puedo obligar la verificación?**
- R: Sí, el código lo hace (bloquea acceso si no verifica)
