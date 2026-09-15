Quiero desarrollar un sistema de ventas web llamado "Super Market Post", construido con GeekHook, con los siguientes componentes:



## 1. Estructura general de la página

- Navegación por pestañas (tabs) en la parte superior para cambiar entre funciones: Inventario, Facturación, Empleados, Cotizaciones.

- Cada pestaña carga su contenido en el área central sin recargar toda la página (cambio de contenido dinámico).

- Diseño limpio y responsivo (escritorio y móvil).

- Dentro de cada pestaña, los elementos se muestran como tarjetas o filas en lista vertical con scroll.

- Una pantalla/pestaña de inicio tipo dashboard con resumen: ventas del día, productos con bajo stock, cotizaciones pendientes de confirmar.

- Barra de búsqueda global (arriba) que busque productos, clientes o facturas sin importar la pestaña activa.

- Ícono de notificaciones para alertas (ej. stock bajo, cotización pendiente de revisión).

- Registro de actividad/historial: quién hizo qué y cuándo (ej. quién entró un producto, quién confirmó una entrada de inventario).



## 2. Módulo de inventario con entrada por PDF

- Permitir subir un PDF de un proveedor.

- Usar IA para extraer productos y precios del PDF.

- Generar una entrada en estado "pendiente" (no se suma al inventario todavía).

- Interfaz de revisión donde se pueda editar o excluir productos individuales de esa entrada antes de confirmarla.

- Al confirmar, los productos aprobados se suman al inventario real.



## 3. Reglas de precios

- Precio base por producto.

- Descuentos por cliente específico (margen fijo, aplica a cualquier producto que compre).

- Descuentos por producto/cantidad (por volumen de compra).

- El sistema debe poder combinar ambas reglas al calcular una cotización.



## 4. Bot de WhatsApp para cotizaciones

- Construido con Node.js y Express, corriendo en Kali Linux.

- Conectado a la API de WhatsApp Business de Meta (actualmente en fase de número de prueba).

- Dos rutas del webhook: GET /webhook (verificación) y POST /webhook (recepción de mensajes).

- Uso de ngrok para exponer el servidor local a internet durante desarrollo.

- Función de respuesta automática usando la API de WhatsApp Cloud (POST a graph.facebook.com).

- Primera versión: bot responde el precio de un producto buscándolo en una tabla simple (JSON o SQLite) con nombre y precio.

- Versión posterior: el bot aplica las reglas de precios por cliente/producto según quién pregunta.



## Prioridad de desarrollo

1. Bot de WhatsApp con precios fijos (sin PDF, sin descuentos).

2. Reglas de descuento por cliente.

3. Entrada de productos por PDF con IA y flujo de revisión/confirmación.

4. Extras de diseño (dashboard, búsqueda global, notificaciones, historial).



Dame el código y la guía paso a paso empezando por el punto 1 (bot de WhatsApp básico), incluyendo instalación de Node.js en Kali Linux.

---

## Estado vigente del bot - 2026-09-14

La implementación actual usa **Firebase Cloud Functions**, no un servidor Express separado como arquitectura principal. El webhook publicado es `whatsappWebhook` y tiene estas rutas:

- `GET`: verificación de Meta mediante `WHATSAPP_VERIFY_TOKEN`.
- `POST`: recepción de mensajes y respuestas mediante WhatsApp Cloud API.

El flujo básico ya implementado busca productos, conserva la conversación, permite seleccionar coincidencias y crea cotizaciones en Firestore. La configuración del teléfono, `Phone Number ID` y activación del bot se administra desde Configuración.

### Prioridad inmediata

1. Configurar los secretos `WHATSAPP_TOKEN` y `WHATSAPP_VERIFY_TOKEN`.
2. Desplegar Cloud Functions y verificar el webhook desde Meta.
3. Probar con el número de prueba: producto encontrado, producto inexistente, coincidencias y confirmación de cotización.
4. Confirmar que la cotización creada aparezca en el POS.
5. Revisar en Firestore los estados de `whatsapp_mensajes`: `PROCESANDO`, `PROCESADO` y `ERROR_REINTENTABLE`.

El despliegue inicial ya se realizó el 2026-09-15 en `us-central1`. La URL publicada de la función es:

```text
https://whatsappwebhook-uga4u7i37q-uc.a.run.app
```

El runtime Node.js 20 y la versión actual de `firebase-functions` muestran advertencias de mantenimiento durante el despliegue. Se actualizarán en una tarea separada, después de validar el bot y el diseño del POS.

El webhook evita procesar dos veces el mismo ID de mensaje. Si falla el procesamiento o el envío a Meta, conserva el error y permite reintentar. Un procesamiento abandonado durante más de dos minutos puede ser reclamado nuevamente.

### Comandos de despliegue

Desde la raíz del proyecto:

```bash
npm --prefix functions install
firebase functions:secrets:set WHATSAPP_TOKEN
firebase functions:secrets:set WHATSAPP_VERIFY_TOKEN
firebase deploy --only functions:whatsappWebhook
```

No se deben guardar tokens en este archivo, en el frontend ni dentro del repositorio. `ngrok` y Kali Linux pueden utilizarse para una prueba local alternativa, pero no son necesarios para el webhook actual basado en Firebase.

### Fuera de esta primera versión

- Descuentos por cliente o cantidad.
- Vinculación segura de teléfono WhatsApp con `clientes/{uid}`.
- Notas de voz, imágenes y atención humana.
- Importación de productos desde PDF.

Estas funciones se implementarán después de validar el bot básico de extremo a extremo.

## Siguiente bloque: diseño general y auto layout

Una vez configurado y probado Meta, la siguiente prioridad será mejorar la apariencia de todo el sistema, no solo `facturacion/facturacion.html`. El auto layout abarcará menú, Facturación/POS, Gestión de facturas, Almacén, Compras, Créditos, Personal, Dashboard, Reportes, Auditoría, Cierres, Configuración y portales.

La revisión visual debe conservar las funciones existentes y cubrir estados vacío, cargando, error, modo offline y acciones restringidas por permisos. Se trabajará primero una base visual común, luego los módulos operativos y administrativos, y finalmente los portales. Se actualizarán los `.md` al terminar cada bloque y se probarán escritorio, tablet y móvil antes de implementar descuentos.

La primera entrega de esta base visual ya está desplegada en `https://supermercado-marian.web.app`. El modo oscuro está disponible inicialmente en Menú y Configuración, con preferencia guardada por UID en el navegador. La siguiente revisión debe comprobar el aspecto real y luego extender el tema a Facturación, Almacén, Devoluciones, Compras y el resto del sistema.

La guía que define cómo continuaremos el diseño está en [GUIA_DISENO_SISTEMA.md](GUIA_DISENO_SISTEMA.md). Allí se conserva el patrón de pestañas visibles, permisos, modo oscuro, auto layout y proceso de validación.

Almacén ya recibió la primera reorganización: `Productos e inventario` es la vista inicial y el menú desplegable contiene `Nueva recepción`, `Historial de recepciones`, `Historial de ventas` y `Catálogos`. Categorías y unidades quedan para una fase posterior con catálogo maestro.

La navegación de Almacén fue ajustada a pestañas visibles permanentes, como en la referencia compartida. Este patrón se aplicará a los demás módulos para que la mayoría de opciones importantes siempre estén a la vista y el contenido secundario no alargue innecesariamente la pantalla.

Facturación ya aplica el patrón con `Venta`, `Reimpresión`, `Cotizaciones`, `Créditos`, `Egresos` y `Cierre`. La barra consulta los subpermisos de Caja y oculta las acciones no autorizadas para cada usuario.

La caché del sitio también fue actualizada para evitar que una versión anterior oculte cambios recién desplegados. El service worker actual es `supermarian-app-v5`.

