# H. Álvarez × First Edition — Catálogo Cycling Collection

Catálogo web (single-page) para la venta de la colección de ciclismo **H. Álvarez × First Edition**: gorra y camisetas/maillots de la línea "First Edition", con carrito de selección, ficha de producto, formulario de pedido y pago integrado con **PayPal**. El backend de pago se resuelve con **Netlify Functions** (serverless).

## Estructura del repositorio

```
.
├── index.html                 # Toda la web: HTML + CSS + JS embebidos (SPA de una sola página)
├── netlify.toml                # Configuración de build/deploy para Netlify
└── netlify/
    └── functions/
        ├── create-paypal-order.js   # Crea la orden de PayPal en el servidor (calcula el importe)
        └── capture-paypal-order.js  # Captura/confirma el pago una vez el cliente lo aprueba
```

- **`index.html`**: contiene el catálogo completo (hero, carrusel de la gorra, grid de productos "First Edition", modal de ficha de producto con selector de color/talla, carrito lateral, formulario de datos de contacto, modal de agradecimiento con resumen del pedido y solicitud de factura). También incluye, en línea, los estilos (`<style>`) y toda la lógica de la tienda (`<script>`): catálogo de productos, carrito, checkout y la carga del SDK de PayPal en el cliente.
- **`netlify/functions/create-paypal-order.js`**: recibe los artículos del carrito y **calcula el importe en el servidor** (con una tabla de precios independiente del navegador) para evitar manipulación de precios desde el cliente; después crea la orden contra la API de PayPal (sandbox o real).
- **`netlify/functions/capture-paypal-order.js`**: captura el pago de la orden ya aprobada por el usuario en PayPal.
- **`netlify.toml`**: indica a Netlify que las funciones están en `netlify/functions`, que se publica la raíz del repo (`.`) y que el bundler de funciones es `esbuild`.

## Catálogo de producto

| Producto | Colección | Colores | Tallas |
|---|---|---|---|
| GAM White (gorra) | Gorra | Blanco | Única |
| DNA Cyclist | First Edition | Blanco / Negro | XXS–XXL |
| Racing Blueprint | First Edition | Blanco / Negro | XXS–XXL |
| Attack | First Edition | Blanco / Negro | XXS–XXL |
| Signature | First Edition | Blanco / Negro | XXS–XXL |
| Overlay | First Edition | Blanco / Negro | XXS–XXL |
| Tech | First Edition | Blanco / Negro | XXS–XXL |
| Brush | First Edition | Azul / Negro | XXS–XXL |

Cada producto tiene ficha propia (foto frontal/trasera, tags descriptivos, selector de color y talla) y se añade a un carrito persistente en la propia página, desde donde se pasa al formulario de pedido y al pago.

## Flujo de compra

1. El usuario navega el catálogo y añade productos (color/talla) a su selección.
2. Rellena sus datos de contacto (nombre, teléfono, email, notas) en el formulario de pedido.
3. Se muestra el botón de **PayPal**, cargado con el SDK oficial (`paypal.com/sdk/js`) en el cliente.
4. Al pagar, el front llama a la función `create-paypal-order` (el importe se recalcula en servidor con la tabla de precios de `PRICES`, para que no pueda alterarse desde el navegador).
5. Tras la aprobación del usuario, se llama a `capture-paypal-order` para confirmar el cobro.
6. Se muestra una pantalla de agradecimiento con el resumen del pedido, opción de copiar como texto, reenviar confirmación por email, enviar por WhatsApp o solicitar factura (con CIF/NIF y dirección).

## Despliegue (Netlify)

El proyecto está pensado para desplegarse directamente en **Netlify**:

- `publish = "."` → se sirve el `index.html` de la raíz.
- `functions = "netlify/functions"` → Netlify despliega automáticamente las funciones serverless de esa carpeta.

### Variables de entorno necesarias

Las funciones de PayPal requieren estas variables configuradas en Netlify (Site settings → Environment variables):

| Variable | Descripción |
|---|---|
| `PAYPAL_CLIENT_ID` | Client ID de la app de PayPal (sandbox o live) |
| `PAYPAL_SECRET` | Secret de la app de PayPal |
| `PAYPAL_ENV` | `live` para producción; cualquier otro valor usa el entorno sandbox |

> ⚠️ Importante: los precios están definidos por duplicado, una vez en `index.html` (para mostrarlos al usuario) y otra en `netlify/functions/create-paypal-order.js` (fuente de verdad para el cobro). Si cambias un precio, debes actualizar ambos sitios para que coincidan.

## Desarrollo local

Al ser una SPA estática con funciones serverless, se puede probar localmente con la [Netlify CLI](https://docs.netlify.com/cli/get-started/):

```bash
npm install -g netlify-cli
netlify dev
```

Esto sirve `index.html` y emula las funciones de `netlify/functions` en local, permitiendo probar el flujo completo de checkout con credenciales de PayPal sandbox.

## Notas

- Todo el front (HTML, CSS y JS) vive en un único fichero `index.html`, sin build step ni dependencias de frontend.
- No hay `package.json` en el repositorio; las funciones de Netlify se ejecutan sobre el runtime de Node que provee Netlify (usan `fetch` nativo).
- El proyecto está en español y orientado al público de la colección de ciclismo H. Álvarez.
