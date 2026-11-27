# 🧺 Canasta

Planificador semanal de comidas y compras para Costa Rica. Elegís tu súper (Walmart o Masxmenos), cuántos comen, qué días cocinás, alergias, gustos y presupuesto. La app arma el menú con recetas ticas, la lista de compras con precios reales del catálogo en línea y te dice cuánto te sobra.

No necesita `npm install`: solo Node.js 18 o superior.

## Probar en la computadora

```powershell
cd C:\Compras
npm run sync     # descarga precios de Walmart y Masxmenos (~1 min por tienda)
npm start        # levanta la app en http://localhost:3000
```

`npm start` también actualiza los precios solo, si tienen más de un día.

## Abrirla en el iPhone (misma red WiFi)

1. Con `npm start` corriendo, la consola muestra una dirección tipo `http://192.168.x.x:3000`.
2. Abrila en **Safari** del iPhone. La primera vez Windows puede preguntar si permite Node.js en la red: aceptá en redes privadas.
3. Compartir → **Agregar a pantalla de inicio**.

Así funciona mientras la computadora esté encendida y en la misma red. Para tenerla siempre disponible, con modo sin conexión, publicala con HTTPS (abajo).

## Publicarla gratis con HTTPS (GitHub Pages)

1. Creá un repositorio en GitHub (puede ser privado si tenés GitHub Pro; si no, público) y subí esta carpeta.
2. Mové `github-pages.yml` a la carpeta `.github/workflows/` (creala si no existe) antes de subir.
3. En el repositorio: **Settings → Pages → Source: GitHub Actions**.
4. El flujo `.github/workflows/github-pages.yml` publica la app y **descarga los precios todos los días a las 5:17 a. m.**
5. Abrí `https://<tu-usuario>.github.io/<repo>/` en Safari → Compartir → Agregar a pantalla de inicio.

En la versión publicada el botón “Actualizar precios ahora” no funciona (no hay servidor); los precios se renuevan solos cada día. Podés forzarlo en **Actions → Publicar Canasta → Run workflow**.

## Estructura

| Archivo | Qué hace |
|---|---|
| `scripts/sync.js` | Consulta `/api/catalog_system/pub/products/search` (VTEX) de cada tienda y guarda `public/data/prices-*.json` |
| `public/js/ingredients.js` | Ingredientes, términos de búsqueda, filtros y precios estimados de respaldo |
| `public/js/recipes.js` | Recetas (4 porciones base) con pasos |
| `public/js/planner.js` | Arma la semana: filtra por preferencias y optimiza costo + variedad dentro del presupuesto |
| `public/js/app.js` | Pantallas: configuración, plan, lista, receta, ajustes |
| `server.js` | Servidor local sin dependencias + sincronización diaria |

## Cómo se calcula el costo

- Un niño cuenta como media porción.
- Se suman las cantidades de toda la semana por ingrediente y se compran **paquetes completos**, escogiendo la presentación que sale más barata para esa cantidad (por ejemplo, un arroz de 1,8 kg sirve para varias recetas).
- Lo que marcás como “ya lo tengo” no suma.
- Si un ingrediente no aparece en el catálogo se usa un precio estimado y se marca como **estimado**.

## Agregar recetas o ingredientes

Agregá un objeto en `recipes.js` (cantidades para 4 porciones, en la unidad del ingrediente). Si usa un ingrediente nuevo, definilo en `ingredients.js` con su término de búsqueda (`s`), palabras obligatorias (`inc`) y palabras que lo descartan (`exc`), luego corré `npm run sync`.

## Pendiente

- PriceSmart (requiere membresía y bloquea consultas automáticas) y Auto Mercado (usa otro buscador).
- Los API de catálogo no son oficiales: si una tienda los cambia, hay que ajustar `scripts/sync.js`.
