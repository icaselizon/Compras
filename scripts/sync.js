// Descarga precios reales de los catálogos en línea (plataforma VTEX) y los guarda en public/data/.
// Uso: node scripts/sync.js            → todas las tiendas
//      node scripts/sync.js walmart    → solo una
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import https from 'node:https';
import zlib from 'node:zlib';
import { INGREDIENTS } from '../public/js/ingredients.js';
import { parseSize, parseCount, matches, sizeInIngredientUnit } from '../public/js/parse.js';

export const STORES = {
  walmart:   { name: 'Walmart',   base: 'https://www.walmart.co.cr' },
  masxmenos: { name: 'Masxmenos', base: 'https://www.masxmenos.cr' },
};

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'data');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// GET con el módulo https nativo (evita un bug de fetch/undici en Node 24 que tumba el proceso
// cuando el servidor responde con error y cierra la conexión).
function getJson(url, redirects = 3) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate, br',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Canasta/1.0',
      },
      timeout: 20000,
    }, res => {
      const { statusCode = 0, headers } = res;
      if (statusCode >= 300 && statusCode < 400 && headers.location && redirects > 0) {
        res.resume();
        return resolve(getJson(new URL(headers.location, url).href, redirects - 1));
      }
      let stream = res;
      const enc = String(headers['content-encoding'] || '');
      if (enc.includes('br')) stream = res.pipe(zlib.createBrotliDecompress());
      else if (enc.includes('gzip')) stream = res.pipe(zlib.createGunzip());
      else if (enc.includes('deflate')) stream = res.pipe(zlib.createInflate());
      const chunks = [];
      stream.on('data', c => chunks.push(c));
      stream.on('error', reject);
      stream.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        if (statusCode !== 200 && statusCode !== 206) {
          const err = new Error(`HTTP ${statusCode}`);
          err.status = statusCode;
          return reject(err);
        }
        try { resolve(JSON.parse(body)); } catch { reject(new Error('Respuesta no es JSON')); }
      });
    });
    req.on('timeout', () => req.destroy(new Error('Tiempo de espera agotado')));
    req.on('error', reject);
  });
}

async function search(base, term) {
  const url = `${base}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(term)}&_from=0&_to=49`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      return await getJson(url);
    } catch (e) {
      if (attempt === 4 || (e.status && e.status < 500 && e.status !== 429)) throw e;
      await sleep(2000 * attempt); // más espera si la tienda pide ir más despacio (429)
    }
  }
}

// Convierte un producto VTEX en candidatos útiles para un ingrediente
export function toCandidates(ing, products, base) {
  const out = [];
  for (const p of products || []) {
    for (const item of p.items || []) {
      const offer = item.sellers?.find(s => s.sellerDefault)?.commertialOffer || item.sellers?.[0]?.commertialOffer;
      if (!offer || !offer.Price || offer.IsAvailable === false || offer.AvailableQuantity === 0) continue;
      const name = item.nameComplete || item.name || p.productName;
      if (!matches(ing, p.productName, name)) continue;

      // En VTEX los productos a granel (measurementUnit = kg) traen el precio POR KILO
      // y unitMultiplier = peso aproximado de una unidad vendida.
      const mu = String(item.measurementUnit || 'un').toLowerCase();
      const mult = Number(item.unitMultiplier) || 1;
      let price = offer.Price, size, byWeight = false;
      const parsed = parseSize(name) || parseSize(p.productName);
      if (mu === 'kg' || mu === 'lb') {
        const perUnitGrams = mu === 'kg' ? 1000 : 453.6;
        const count = ing.u === 'un' ? parseCount(name) || parseCount(p.productName) : null;
        if (count) {
          // p. ej. "Huevo ... Cartón de 30 uds": paquete fijo cuyo precio = precio/kg × peso
          price = offer.Price * mult;
          size = count;
        } else {
          byWeight = true;
          size = sizeInIngredientUnit(ing, { qty: perUnitGrams, unit: 'g' });
        }
      } else {
        let ps = parsed;
        if (!ps) {
          const spec = Object.keys(p).find(k => /gramaje|volumen|tamano|tamaño|contenido|peso/i.test(k));
          if (spec && Array.isArray(p[spec])) ps = parseSize(p[spec].join(' '));
        }
        if (!ps && ing.u === 'un') ps = { qty: 1, unit: 'un' }; // "Culantro en rollo", "Chayote"
        if (ps?.bulk) byWeight = true;
        size = sizeInIngredientUnit(ing, ps);
      }
      if (!size || size <= 0) continue;

      out.push({
        id: item.itemId,
        name,
        brand: p.brand || '',
        price: Math.round(price),
        list: Math.round((offer.ListPrice || offer.Price) * (price / offer.Price)),
        size: Math.round(size * 100) / 100,
        byWeight,
        img: item.images?.[0]?.imageUrl?.replace(/^http:/, 'https:') || '',
        url: p.link || (p.linkText ? `${base}/${p.linkText}/p` : ''),
      });
    }
  }
  // Quitar duplicados y ordenar por precio por unidad
  const seen = new Set();
  return out
    .filter(c => (seen.has(c.id) ? false : seen.add(c.id)))
    .sort((a, b) => a.price / a.size - b.price / b.size)
    .slice(0, 8);
}

export async function syncStore(key, log = console.log) {
  const store = STORES[key];
  const file = path.join(OUT, `prices-${key}.json`);
  let previous = {};
  try { previous = JSON.parse(await readFile(file, 'utf8')).items || {}; } catch { /* primera vez */ }
  const items = {};
  const missing = [];
  let errors = 0;
  for (const [ik, ing] of Object.entries(INGREDIENTS)) {
    try {
      const products = await search(store.base, ing.s);
      const cands = toCandidates(ing, products, store.base);
      if (cands.length) items[ik] = cands;
      else missing.push(ik);
      log(`  ${store.name} · ${ing.n}: ${cands.length ? `${cands.length} productos, desde ₡${cands[0].price}` : 'sin coincidencias'}`);
    } catch (e) {
      errors++;
      if (previous[ik]) items[ik] = previous[ik]; // conservar el último precio conocido
      else missing.push(ik);
      log(`  ${store.name} · ${ing.n}: ERROR ${e.message}`);
    }
    await sleep(600); // ser amables con el servidor
  }
  if (errors === Object.keys(INGREDIENTS).length) {
    throw new Error(`No se pudo conectar con ${store.name}. Se conservan los precios anteriores.`);
  }
  await mkdir(OUT, { recursive: true });
  const data = { store: key, name: store.name, updated: new Date().toISOString(), items, missing };
  await writeFile(file, JSON.stringify(data));
  log(`✔ ${store.name}: ${Object.keys(items).length} ingredientes con precio real, ${missing.length} con precio estimado.`);
  return data;
}

export async function syncAll(only, log = console.log) {
  const keys = only ? [only] : Object.keys(STORES);
  for (const k of keys) {
    if (!STORES[k]) throw new Error(`Tienda desconocida: ${k}`);
    log(`Sincronizando ${STORES[k].name}…`);
    await syncStore(k, log);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  syncAll(process.argv[2]).catch(e => { console.error(e); process.exit(1); });
}
