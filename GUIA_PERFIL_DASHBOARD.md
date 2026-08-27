# 📱 GUÍA DE USO - Panel de Perfil & Dashboard

## 🎯 Nuevas Funcionalidades

Se han implementado dos nuevas secciones:
1. **Panel de Perfil del Cliente** (`perfil.html`)
2. **Dashboard de Ventas** (`dashboard.html`)

---

## 👤 PANEL DE PERFIL DEL CLIENTE

### **Acceso:**
```
Cliente.html → [👤 Mi Perfil]
```

### **¿Qué ve el cliente?**

#### **1. Mis Datos**
- Email (no editable)
- Nombre completo
- Teléfono
- Dirección
- Cédula
- RNC
- Botón: Guardar cambios

#### **2. Información de Crédito**
- Límite de crédito (asignado por administrador)
- ¿Puede comprar a crédito? (Sí/No)

#### **3. Mis Cotizaciones**
Tabla mostrando:
- Número de cotización
- Fecha
- Cantidad de productos
- Monto total
- Estado (PENDIENTE, ACEPTADA, RECHAZADA)
- Botón Ver detalles

#### **4. Mis Compras/Facturas**
Tabla con:
- Número de factura
- Fecha
- Cantidad de productos
- Monto total
- Estado (Pagada)

#### **5. Mis Deudas**
Tabla con:
- Número de factura
- Saldo pendiente
- Fecha de vencimiento
- Estado (Pendiente, Pagada, Vencida)

### **Funcionalidades:**
- ✅ Ver y editar datos personales
- ✅ Ver histórico de cotizaciones
- ✅ Ver facturas de compras
- ✅ Ver deudas con color rojo si vencidas
- ✅ Guardar cambios automáticamente

### **Datos que se sincronizan:**
```
TABLA: clientes
- uid
- email (no editable)
- nombre
- telefono
- direccion
- cedula
- rnc
- limiteCredito
- permiteCredito
```

---

## 📊 DASHBOARD DE VENTAS

### **Acceso:**
```
Menú Principal → [📊 Dashboard]
(Solo Administrador y Jefe)
```

### **¿Qué ve el vendedor/admin?**

#### **1. Métricas Principales**
```
Fila 1:
├─ Ventas Hoy: RD$ X,XXX (total monto)
└─ Transacciones Hoy: N (cantidad de ventas)

Fila 2:
├─ Deudas Pendientes: RD$ X,XXX (total deuda)
└─ Deudas Vencidas: N (cantidad vencidas)
```

#### **2. Gráfico de Ventas Últimos 7 Días**
- Gráfico de barras interactivo
- Muestra monto vendido por día
- Colores: Verde (#218739)
- Permite ver tendencia

#### **3. Top 5 Productos**
Tabla con:
- Nombre del producto
- Cantidad vendida
- Ingresos generados
- Ordenado por ingresos (mayor a menor)

#### **4. Clientes Más Activos**
Tabla con:
- Nombre del cliente
- Cantidad de compras
- Total gastado
- Top 5 clientes

#### **5. Clientes con Deudas Vencidas**
Tabla de ALERTA con:
- Nombre del cliente
- Teléfono (para contactar)
- Monto de deuda
- Días vencido

#### **6. Últimas 10 Ventas**
Tabla con:
- Número de factura
- Fecha
- Nombre del cliente
- Monto
- Método de pago

### **Funcionalidades:**
- ✅ Actualización en tiempo real
- ✅ Gráfico interactivo (Chart.js)
- ✅ Verifica rol (solo Admin/Jefe)
- ✅ Carga datos de todas las ventas
- ✅ Identifica clientes riesgosos (deudas vencidas)

---

## 🔄 FLUJO DE DATOS

### **Panel de Perfil**
```
Cliente entra en perfil.html
       ↓
Carga: datosCliente ← colección 'clientes' (uid)
       ↓
Muestra:
  ├─ Cotizaciones ← 'cotizaciones' (uidCliente)
  ├─ Facturas ← 'ventas_realizadas' (uidCliente)
  └─ Deudas ← 'deudas_clientes' (idCliente = uid)
       ↓
Cliente edita datos
       ↓
Guarda cambios en 'clientes'
```

### **Dashboard**
```
Admin/Jefe entra en dashboard.html
       ↓
Valida rol (Administrador o Jefe)
       ↓
Carga:
  ├─ ventas_realizadas ← todos
  ├─ deudas_clientes ← todos
  ├─ clientes ← todos
       ↓
Procesa datos:
  ├─ Ventas del día
  ├─ Deudas pendientes/vencidas
  ├─ Últimas 7 días (gráfico)
  ├─ Top productos
  ├─ Top clientes
  └─ Deudas vencidas (alerta)
       ↓
Renderiza dashboards con Chart.js
```

---

## 🔐 SEGURIDAD

### **Panel de Perfil:**
- ✅ Solo ve datos propios (filtrado por uid)
- ✅ Email no editable
- ✅ Redirige a login si no autenticado

### **Dashboard:**
- ✅ Solo Admin/Jefe pueden acceder
- ✅ Verifica rol en Firestore
- ✅ Redirige a menú si rol insuficiente
- ✅ Redirige a login si no autenticado

---

## 📋 DATOS UTILIZADOS

### **Colecciones consultadas:**

#### **perfil.html**
```
clientes           → Datos del cliente
cotizaciones       → Cotizaciones del cliente
ventas_realizadas  → Facturas del cliente
deudas_clientes    → Deudas del cliente
```

#### **dashboard.html**
```
usuarios           → Validar rol
ventas_realizadas  → Todas las ventas
deudas_clientes    → Todas las deudas
clientes           → Datos de clientes
```

---

## ⚙️ CONFIGURACIÓN

### **Para personalizar el Dashboard:**

1. **Cambiar período de gráfico (hoy es 7 días):**
   ```javascript
   // En dashboard.html, línea ~cargarGraficoVentas
   for(let i=6;i>=0;i--)  // Cambiar 6 por otro número
   ```

2. **Cambiar Top de productos (hoy es 5):**
   ```javascript
   .slice(0,5)  // Cambiar 5 por otro número
   ```

3. **Cambiar colores del gráfico:**
   ```javascript
   backgroundColor:'rgba(33,135,57,0.7)',  // Verde
   borderColor:'#218739'
   ```

---

## 🐛 TROUBLESHOOTING

**P: No veo datos en el dashboard**
- R: Verifica que hay ventas en 'ventas_realizadas'
- R: Confirma que eres Admin/Jefe
- R: Abre la consola (F12) para ver errores

**P: El gráfico no aparece**
- R: Verifica que Chart.js se cargue desde CDN
- R: Revisa que canvas tenga id "chartVentas"

**P: No puedo editar mi perfil**
- R: Verifica que tienes acceso a colección 'clientes'
- R: Recarga la página (F5)

**P: Deudas no aparecen en perfil**
- R: Verifica que idCliente en deudas = tu uid
- R: Abre consola para ver consulta a Firebase

---

## 🎯 PRÓXIMAS MEJORAS

- [ ] Exportar datos a PDF desde perfil
- [ ] Gráfico en perfil de gastos vs deudas
- [ ] Filtros por fecha en dashboard
- [ ] Notificaciones en dashboard
- [ ] Comparación mes anterior
- [ ] Predicción de ventas con IA

