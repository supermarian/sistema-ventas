# 🎯 CHECKLIST RÁPIDO - ESTADO DEL PROYECTO

**Última actualización:** 2026-09-15
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

## ESTADO DEL BOT DE WHATSAPP

La base del bot ya está implementada en `functions/index.js` mediante Firebase Cloud Functions. El webhook verifica solicitudes de Meta, recibe mensajes, busca productos, mantiene la conversación y crea cotizaciones.

- [x] Procesamiento del mismo mensaje con control de duplicados.
- [x] Estados `PROCESANDO`, `PROCESADO` y `ERROR_REINTENTABLE`.
- [x] Recuperación de trabajos abandonados durante más de dos minutos.
- [x] Ejecutar Firebase CLI mediante `npx`.
- [x] Autenticar Firebase y seleccionar `supermercado-marian`.
- [x] Desplegar `whatsappWebhook` en `us-central1`.
- [x] Verificar el challenge del webhook con token correcto: respuesta HTTP 200.
- [x] Generar PDF de cotización desde la respuesta del bot.
- [ ] Confirmar el número de negocio real de WhatsApp en Meta y asegurar que el Access Token vigente sea el correcto.
- [ ] Configurar y mantener `WHATSAPP_TOKEN` y `WHATSAPP_VERIFY_TOKEN` como secretos operativos en Firebase.
- [ ] Verificar el webhook en Meta con el número real del negocio.
- [ ] Probar producto encontrado, no encontrado, selección y confirmación.
- [ ] Confirmar que la cotización aparezca en el POS.

La guía principal y el orden de implementación están en [BOT Y DEMAS .MD](BOT%20Y%20DEMAS%20.MD).

## ESTADO DE IMPORTACIÓN DESDE PDF

Se dejó documentado el flujo operativo para importar productos desde PDF sin crear registros a ciegas.

- [x] Revisar columnas del PDF y decidir qué campos son relevantes para inventario.
- [x] Definir código como clave principal para actualizar o crear productos.
- [x] Mantener lote activo e inactivo por código; evitar duplicados por nombre sin validación.
- [x] Cargar revisión antes de confirmar la importación final.
- [x] Bloquear filas con columnas faltantes o datos inconsistentes.
- [ ] Validar con el PDF real del catálogo antes de cerrar la carga masiva.
- [ ] Definir la política final de margen y precio de venta para cada producto importado.
- [ ] Confirmar el ajuste de unidades y nombres según el catálogo maestro real.

## ACTUALIZACIÓN DE TRABAJO DEL 2026-09-15

Se registran aquí las decisiones tomadas recientemente para continuidad del proyecto:

- El bot ya responde con datos de producto y cotización; el siguiente freno operativo es la configuración real del número y token de Meta.
- La importación desde PDF ya no se hace automática; sigue un proceso asistido con revisión manual antes de escribir en Firestore.
- La clave de negocio para la carga masiva es el código del producto; si un lote inactivo reutiliza un código existente, se actualiza en lugar de duplicarse.
- La documentación del proyecto debe mantenerse actualizada con cada cambio funcional importante para evitar perder contexto entre ciclos de trabajo.
- La caché del navegador puede seguir mostrando el menú antiguo y la vista vieja de Almacén aunque el código ya esté actualizado: la corrección es recargar con Ctrl+F5, borrar el service worker o hacer un deploy nuevo con el cache invalidado.

## SIGUIENTE PRIORIDAD: DISEÑO GENERAL Y AUTO LAYOUT

Después de completar la configuración y prueba básica de WhatsApp, la siguiente prioridad visual será mejorar todo el sistema, no únicamente Facturación. El auto layout debe aplicarse a escritorio, tablet y móvil, conservando permisos, funciones y datos actuales.

### Alcance visual

- [x] Crear primera base visual común para encabezados, navegación, superficies, controles, tablas, tarjetas y modo oscuro.
- [x] Publicar la primera versión visual en Firebase Hosting para revisión.
- [ ] Extender la base visual al resto de módulos y revisar cada pantalla.
- [ ] Reorganizar el menú principal y sus accesos para que sea claro, responsive y consistente.
- [ ] Mejorar Facturación/POS: búsqueda, resultados, carrito, cobro, cotizaciones, crédito, egreso, cierre, offline y modales.
- [ ] Mejorar Gestión de facturas: correcciones, devoluciones, notas, búsqueda, tablas y formularios auditados.
- [ ] Mejorar Almacén y Compras: productos, recepción, tablas, imágenes, escáner, borradores y detalle de entradas.
- [ ] Mejorar Créditos, Personal, Auditoría, Cierres de caja, Dashboard, Reportes y Consulta de ventas.
- [ ] Mejorar Configuración, incluyendo comprobantes, copias, bot y catálogo offline.
- [ ] Revisar portal de clientes, perfil, catálogo, cotizaciones y pantallas de acceso cuando termine el núcleo administrativo.
- [x] Reorganizar Almacén en vistas internas: Productos, Recepción, Historial y Catálogos.
- [x] Cambiar el menú desplegable de Almacén por pestañas visibles tipo sistema de inventario.
- [x] Aplicar pestañas visibles a Facturación según subpermisos de Caja.
- [x] Separar el acceso al historial de ventas mediante Consulta de ventas.
- [x] Integrar modo claro/oscuro por usuario en Almacén.
- [ ] Eliminar progresivamente estilos inline repetidos y unificar variables, espaciado y breakpoints.
- [ ] Evitar desbordamiento horizontal en tablas, formularios, tarjetas y acciones.
- [ ] Revisar estados vacío, cargando, error, sin permisos, offline y modal en cada módulo.
- [ ] Probar resoluciones de escritorio, tablet y móvil después de cada grupo de pantallas.

### Primera entrega desplegada

- URL: `https://supermercado-marian.web.app`
- Tema probado inicialmente en `menu.html` y `configuracion.html`.
- Cada usuario puede elegir modo claro u oscuro; la preferencia se guarda asociada a su UID en el navegador.
- La primera revisión visual debe comprobar contraste, tablas, formularios, modales y navegación antes de extenderlo a Almacén, Facturación y los demás módulos.

En Almacén la primera entrega ya está desplegada con el menú `Secciones de Almacén`. La pantalla inicial prioriza productos e inventario; recepción, historial y catálogos se abren bajo demanda. Categorías y unidades quedan pendientes de definir como catálogos maestros antes de habilitar su creación.

La navegación de Almacén ahora mantiene arriba las pestañas `Inventario`, `Recepción`, `Historial compras`, `Historial ventas`, `Catálogos` y `Categorías y unidades`. En pantallas pequeñas la barra se desplaza horizontalmente, pero las secciones siguen visibles.

Facturación ya tiene la misma estructura visual: `Venta`, `Reimpresión`, `Cotizaciones`, `Créditos`, `Egresos` y `Cierre`. Cada pestaña reutiliza la acción existente y solo aparece si el usuario posee el subpermiso correspondiente.

Se corrigió la caché del navegador y del service worker: las páginas HTML y `sw.js` se publican con `Cache-Control: no-cache, no-store, must-revalidate`, y la caché offline pasó a `supermarian-app-v5`. Si un dispositivo aún muestra la captura anterior, debe recargar la página una vez con Ctrl+F5 o cerrar y abrir nuevamente la pestaña.

### Orden de implementación

1. Base visual y shell compartido.
2. Menú principal y navegación.
3. Facturación/POS y Gestión de facturas.
4. Almacén, Compras y Créditos.
5. Dashboard, Reportes, Consulta de ventas, Auditoría y Cierres.
6. Personal y Configuración.
7. Portal de clientes, perfil y acceso.

El rediseño no debe cambiar reglas de negocio, permisos, cálculos de ventas, inventario ni datos de Firestore.

La guía central de este trabajo está en [GUIA_DISENO_SISTEMA.md](GUIA_DISENO_SISTEMA.md). Debe actualizarse después de cada módulo visual.

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
| Consulta de ventas | 🟡 ALTA | 6-10h | ✅ Implementada: resumen y detalle cronológico |
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

