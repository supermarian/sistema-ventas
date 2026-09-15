# Guia de diseno del sistema

**Ultima actualizacion:** 2026-09-15  
**Estado:** primera fase visual desplegada

## Objetivo

El sistema debe verse como una aplicacion administrativa coherente en escritorio, tablet y movil. La apariencia puede mejorar sin cambiar reglas de negocio, permisos, calculos de ventas, inventario ni datos de Firestore.

La referencia visual es un sistema de inventario con una barra de secciones visible en la parte superior y un panel de trabajo debajo. No se debe apilar toda la funcionalidad en una sola pagina larga cuando las tareas pueden separarse en secciones.

## Patron de navegacion

Cada modulo debe tener:

1. Un encabezado claro con nombre del modulo y acciones generales.
2. Una barra horizontal de pestañas visibles para las tareas principales.
3. Un solo panel de trabajo activo debajo de la barra.
4. Desplazamiento horizontal de las pestañas en pantallas pequenas, sin ocultarlas dentro de un menu obligatorio.
5. Botones y controles secundarios dentro de la pestaña correspondiente.

Las pestañas no deben duplicar procesos. Deben llamar a las funciones existentes o cambiar la vista existente.

## Estado implementado

### Base visual compartida

- CSS compartido: `assets/sistema-theme.css`.
- Controlador de tema: `assets/sistema-theme.js`.
- Modo claro y oscuro.
- Preferencia guardada por UID en el navegador.
- Variables comunes para fondo, superficie, texto, texto secundario, bordes, color principal y sombras.
- HTML y service worker publicados sin cache persistente para que los cambios de interfaz sean visibles.

### Menu principal

- El usuario puede cambiar entre modo claro y oscuro.
- La navegacion conserva los permisos del usuario.
- El menu sigue siendo la entrada general a los modulos.

### Almacen

Pestanas visibles actuales:

- `Inventario`: crear, editar y consultar productos.
- `Recepcion`: registrar y validar entradas de compras.
- `Historial compras`: consultar recepciones y sus detalles.
- `Historial ventas`: enlace independiente hacia Consulta de ventas.
- `Catalogos`: proveedores y almacenes.
- `Categorias y unidades`: reservado para el catalogo maestro que se implementara despues.

La vista inicial de Almacen muestra productos e inventario. Las otras vistas no ocupan la pantalla hasta que el usuario las selecciona.

### Facturacion / Caja

Pestanas visibles actuales:

- `Venta`: productos, carrito y cobro.
- `Reimpresion`: busca y reimprime facturas usando el control existente.
- `Cotizaciones`: abre cotizaciones pendientes.
- `Creditos`: abre cobros de deudas.
- `Egresos`: abre el registro de salidas de caja.
- `Cierre`: inicia el cierre del turno.

Las pestañas de Caja se filtran con los subpermisos existentes:

- `caja_reimpresion`
- `caja_cotizaciones`
- `caja_credito`
- `caja_egreso`
- `caja_cierre`

No se crean permisos nuevos solo para cambiar la apariencia. `Reimpresion` sigue separada de `Gestion de facturas`, donde viven correcciones, devoluciones y notas.

## Regla de permisos visuales

- El permiso principal permite entrar al modulo.
- Los subpermisos controlan pestañas y acciones internas.
- Si el usuario no tiene permiso, la pestaña no debe mostrarse.
- Ocultar una pestaña no reemplaza la validacion de Firestore o backend.
- Administrador y Jefe pueden tener acceso administrativo segun la matriz vigente.
- La interfaz no debe depender de `localStorage` como seguridad.

## Auto layout responsive

Cada modulo debe cumplir:

- No producir desplazamiento horizontal de toda la pagina.
- Usar grids flexibles con `minmax`, `auto-fit` o columnas que colapsen.
- Mantener tablas dentro de un contenedor con desplazamiento horizontal controlado.
- Reordenar acciones en tablet y movil.
- Mantener botones y campos con tamano estable.
- Permitir que la barra de pestañas se desplace horizontalmente en movil.
- Evitar textos cortados dentro de botones y tarjetas.
- Mantener modales dentro del viewport con `max-width` y `max-height`.
- Probar al menos escritorio, tablet y movil despues de cada modulo.

## Modo oscuro

El modo oscuro debe:

- Aplicarse mediante `html[data-theme="dark"]`.
- Mantener contraste legible en texto, controles, tablas, tarjetas y modales.
- Usar superficies elevadas diferentes del fondo.
- Mantener visibles estados de alerta, error, exito y advertencia.
- Guardarse por UID para que cada usuario conserve su preferencia.
- Tener modo claro como valor predeterminado.
- No modificar datos ni permisos.

Al agregar un modulo nuevo, primero se deben usar las variables de `assets/sistema-theme.css`. No se deben crear colores oscuros aislados que rompan la apariencia general.

## Orden de trabajo

1. Base visual compartida y tema.
2. Menu principal.
3. Almacen y Facturacion.
4. Gestion de facturas, Compras y Creditos.
5. Dashboard, Reportes, Consulta de ventas, Auditoria y Cierres.
6. Personal y Configuracion.
7. Portal de clientes, perfil, catalogo y acceso.

## Proceso para cada modulo

1. Leer el HTML y localizar sus secciones y permisos existentes.
2. Definir las pestañas que representan tareas reales.
3. Conservar los IDs y funciones JavaScript actuales cuando sea posible.
4. Crear el layout visible y responsive.
5. Conectar el tema por UID.
6. Aplicar visibilidad con los permisos existentes.
7. Validar estados normal, vacio, cargando, error, sin permisos y offline.
8. Ejecutar comprobacion de sintaxis y desplegar Hosting.
9. Revisar la pantalla publicada en escritorio, tablet y movil.
10. Actualizar este documento y los documentos de estado.

## Regla para nuevas secciones

Antes de agregar una pestaña se debe responder:

- Que tarea resuelve.
- Que datos consulta o modifica.
- Que permiso la controla.
- Si ya existe una pantalla que debe reutilizarse.
- Si debe ser una pestaña, un modal, un enlace o un modulo independiente.

No se deben crear pestañas vacias o botones que aparenten funcionar sin una implementacion real. Categorias, unidades, marcas y departamentos deben convertirse en catalogos maestros antes de habilitar su creacion.

## Despliegue visual

El sitio publicado es:

```text
https://supermercado-marian.web.app
```

Comando usado para publicar la interfaz:

```bash
npx firebase-tools deploy --only hosting
```

Si una pantalla antigua continua visible, comprobar primero el service worker y la cache del navegador. Actualmente HTML y `sw.js` se publican con `no-cache`, y el service worker vigente es `supermarian-app-v5`.
