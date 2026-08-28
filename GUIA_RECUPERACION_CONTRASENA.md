# 🔐 RECUPERACIÓN DE CONTRASEÑA - GUÍA COMPLETA

## 📋 DESCRIPCIÓN GENERAL

Se ha implementado un sistema completo de recuperación de contraseña usando Firebase Authentication con:
- 4 pasos visuales
- Validación de contraseña fuerte
- Enlace seguro por email
- Timer de reenvío
- Interfaz intuitiva

---

## 🎯 FLUJO DEL USUARIO

### **OPCIÓN 1: Usuario Olvida Contraseña**

```
Usuario en login (index.html)
         ↓
  [¿Olvidaste tu contraseña?]
         ↓
reset-password.html (PASO 1)
  ├─ Selecciona: Empleado o Cliente
  ├─ Ingresa email
  └─ Click: "Enviar Enlace de Recuperación"
         ↓
PASO 2: Correo Enviado
  ├─ Muestra email donde se envió enlace
  ├─ Opción: Reenviar (con timer de 60s)
  └─ Link en email: https://localhost:8000/reset-password.html?oobCode=XXXXX
         ↓
Usuario abre email y hace click en enlace
         ↓
PASO 3: Restablecer Contraseña
  ├─ Validación en tiempo real de fortaleza
  ├─ Requisitos visuales:
  │  ├─ Mínimo 8 caracteres
  │  ├─ Una letra mayúscula
  │  ├─ Una letra minúscula
  │  ├─ Un número
  │  └─ Un carácter especial (!@#$%)
  ├─ Confirmar contraseña
  └─ Click: "Restablecer Contraseña"
         ↓
PASO 4: Éxito
  ├─ Confirmación visual
  └─ Click: "Ir al Login"
         ↓
Usuario vuelve a index.html
     y puede entrar con nueva contraseña
```

---

## 🔗 ENLACES Y ACCESO

### **Acceso a la Página de Recuperación**

**Método 1 - Desde el Login:**
```
https://localhost:8000/index.html
  ↓
  Enlace: "¿Olvidaste tu contraseña?"
  ↓
https://localhost:8000/reset-password.html
```

**Método 2 - Directamente:**
```
https://localhost:8000/reset-password.html
```

**Método 3 - Desde Email (automático):**
```
Email de Firebase contiene:
https://supermercado-marian.firebaseapp.com/...?oobCode=XXXXX

(Redirige automáticamente a reset-password.html)
```

---

## 📧 FLUJO DE EMAIL

### **Paso 1: Usuario Solicita Recuperación**

Usuario completa:
- Tipo de cuenta (Empleado/Cliente)
- Email
- Click "Enviar Enlace de Recuperación"

**Backend (Firebase):**
```
sendPasswordResetEmail(auth, email)
  ↓
Firebase envía email con:
  ├─ Asunto: "Restablece tu contraseña"
  ├─ Contenido: Mensaje genérico de Firebase
  ├─ Enlace: oobCode único de 1 hora
  └─ Email desde: noreply@firebase.com
```

### **Paso 2: Usuario Recibe Email**

Email contiene:
```
Asunto: Restablece tu contraseña

Contenido:
"Para restablecer tu contraseña, abre este enlace:

[Link único con código de recuperación]

Este enlace expira en 1 hora."
```

### **Paso 3: Usuario Abre Enlace**

Cuando hace click en el email:
- Firebase redirige al sitio con `?oobCode=XXXXX`
- JavaScript valida el código
- Si es válido: Muestra PASO 3
- Si es inválido/expirado: Muestra error

---

## 🛡️ SEGURIDAD IMPLEMENTADA

### **En Cliente (Frontend)**

✅ **Validación de Contraseña:**
- Mínimo 8 caracteres
- Al menos 1 mayúscula
- Al menos 1 minúscula
- Al menos 1 número
- Al menos 1 carácter especial

✅ **Confirmación:**
- Las dos contraseñas deben coincidir
- Indicador visual de fortaleza en tiempo real

✅ **Protección de Código:**
- Verifica que el código de recuperación es válido
- Rechaza códigos expirados (> 1 hora)
- Manejo de errores específicos

### **En Backend (Firebase)**

✅ **Código de Recuperación:**
- Token único de una sola vez
- Expira en 1 hora
- Se invalida después de usar

✅ **Limitación de Intentos:**
- Firebase limita intentos de reset a 10/5 min
- Previene abuso

✅ **Email Verification:**
- Email de recuperación solo desde Firebase
- Dominio verificado

---

## 🎨 INTERFAZ VISUAL

### **PASO 1: Elegir Método**
```
╔════════════════════════╗
║  🔑 Recuperar Contraseña║
║  Restablece tu acceso    ║
╚════════════════════════╝

[Selecciona tipo de cuenta]
  ○ Soy Empleado/Admin
  ○ Soy Cliente

ℹ️ Información útil

[tu@email.com]

[Enviar Enlace de Recuperación]

← Volver al login
```

### **PASO 2: Correo Enviado**
```
╔════════════════════════╗
║  ✉️  Revisa tu Email    ║
║  Te hemos enviado un    ║
║  enlace                 ║
╚════════════════════════╝

    ✓ (icono animado)

¡Correo Enviado!
Hemos enviado un enlace a:
tu@email.com

Sigue instrucciones en email

┌─────────────────────────┐
│ ¿No recibiste el email? │
│   [Reenviar Email]      │
│   (Espera 60s...)       │
└─────────────────────────┘

← Volver al login
```

### **PASO 3: Nueva Contraseña**
```
╔════════════════════════╗
║  🔐 Nueva Contraseña   ║
║  Crea una contraseña   ║
║  segura                ║
╚════════════════════════╝

[Nueva Contraseña]
(indicador de fortaleza)

[Confirmar Contraseña]

Requisitos:
  ○ Mínimo 8 caracteres
  ○ Una letra mayúscula
  ○ Una letra minúscula
  ○ Un número
  ✓ Un carácter especial

[Restablecer Contraseña]

← Volver al login
```

### **PASO 4: Éxito**
```
╔════════════════════════╗
║      ✓ Éxito           ║
║                        ║
║  ¡Contraseña          ║
║   Actualizada!         ║
╚════════════════════════╝

Tu contraseña ha sido
restablecida con éxito.

Ya puedes iniciar sesión
con tu nueva contraseña.

[Ir al Login]
```

---

## 🔄 CASOS DE ERROR

### **Error 1: Email no encontrado**
```
⚠️ No existe cuenta con este correo

Solución:
  → Verifica que el email sea correcto
  → Si no tienes cuenta, regístrate primero
```

### **Error 2: Email no válido**
```
⚠️ Correo no válido

Solución:
  → Ingresa un email válido (ej: tu@gmail.com)
```

### **Error 3: Código expirado**
```
⚠️ Enlace expirado. Solicita uno nuevo

Solución:
  → Vuelve a reset-password.html
  → Pide un nuevo enlace
  → (Los códigos duran 1 hora)
```

### **Error 4: Contraseña débil**
```
⚠️ Contraseña muy débil

Solución:
  → Agrega mayúscula, número o símbolo
  → Mínimo 8 caracteres
```

### **Error 5: Contraseñas no coinciden**
```
⚠️ Las contraseñas no coinciden

Solución:
  → Repite exactamente la misma contraseña
  → En ambos campos
```

---

## 💾 DATOS GUARDADOS EN FIREBASE

### **Cambios en Firebase Auth**

Cuando se restablece la contraseña:

```javascript
confirmPasswordReset(auth, oobCode, newPassword)
  ↓
Firebase actualiza:
  ├─ Auth.user.password (hash bcrypt)
  ├─ Auth.passwordHash (nuevo)
  ├─ Auth.updatedAt (timestamp)
  └─ Auth.passwordResetTimestamp
```

### **NO se guarda en Firestore**

- Firestore NO almacena contraseñas
- Las contraseñas solo están en Firebase Auth
- Esto es por seguridad

---

## ⏱️ TIEMPOS DE EXPIRACIÓN

| Elemento | Duración | Notas |
|----------|----------|-------|
| Enlace de reset | 1 hora | Firebase estándar |
| Timer reenvío | 60 segundos | Previene spam |
| Session de login | 1 mes (default) | Firebase Auth |

---

## 🔧 CONFIGURACIÓN DE EMAIL

### **Email Actual (Firebase Default)**

Firebase envía emails genéricos con:
- Plantilla estándar de Google
- Logo de Firebase
- Texto en inglés/español según navegador
- Sin personalización

### **Para Personalizar (Futuro)**

Opciones avanzadas:
1. **Cloud Functions + SendGrid**
   - Emails personalizados con logo Súper Marian
   - Diseño HTML personalizado
   - Seguimiento de clicks

2. **Firebase Email Templates**
   - Personalizables en Firebase Console
   - Logo, colores, texto
   - Multiidioma

---

## 📱 COMPATIBILIDAD

✅ **Navegadores Soportados:**
- Chrome/Edge (v90+)
- Firefox (v88+)
- Safari (v14+)
- Mobile Chrome/Safari

✅ **Responsive:**
- Desktop: 400px width optimizado
- Tablet: Se adapta
- Mobile: 100% responsive

---

## 🧪 TESTING

### **Caso 1: Reset Normal**
```
1. Ir a reset-password.html
2. Seleccionar tipo (Empleado/Cliente)
3. Ingresar email válido registrado
4. Click "Enviar Enlace"
5. Revisar email (Firebase)
6. Click en enlace
7. Ingresar nueva contraseña
8. Confirmar
9. Ver paso 4 (éxito)
10. Click "Ir al Login"
11. Intentar login con nueva contraseña
   ✓ Debe funcionar
```

### **Caso 2: Email No Registrado**
```
1. Ir a reset-password.html
2. Ingresar email NO registrado
3. Click "Enviar Enlace"
   ✓ Debe mostrar: "No existe cuenta"
```

### **Caso 3: Enlace Expirado**
```
1. Completar paso hasta recibir email
2. Esperar > 1 hora
3. Hacer click en enlace del email
   ✓ Debe mostrar: "Enlace expirado"
4. Solicitar nuevo enlace
```

### **Caso 4: Contraseña Débil**
```
1. En PASO 3, ingresar contraseña débil
   - Ej: "123456"
2. Los requisitos no se marcan
3. Click "Restablecer"
   ✓ Debe mostrar: "No cumple requisitos"
```

---

## 📞 SOPORTE

**Preguntas Comunes:**

**P: ¿Dónde recibo el email?**
- R: En la bandeja de entrada del correo registrado en tu cuenta
- R: Revisa spam/promociones si no lo ves

**P: ¿Cuánto tiempo dura el enlace?**
- R: 1 hora. Pasado ese tiempo, pide uno nuevo

**P: ¿Puedo cambiar mi contraseña sin olvidarla?**
- R: Sí, en el perfil (próxima feature)

**P: ¿Se notifica a mi admin si cambio contraseña?**
- R: No. Es solo entre tú y Firebase

**P: ¿Hay límite de intentos?**
- R: Firebase permite 10 resets por 5 minutos

---

## 🚀 PRÓXIMAS MEJORAS

- [ ] Personalizar email con logo Súper Marian
- [ ] Agregar autenticación de 2 factores (2FA)
- [ ] Opción de cambiar contraseña en perfil
- [ ] Historial de cambios de contraseña
- [ ] Notificación SMS alternativa
- [ ] Código QR en email de recuperación

