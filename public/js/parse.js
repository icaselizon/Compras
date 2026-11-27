import { norm } from './ingredients.js';

// Convierte "Arroz Indiana 99.9 1800 g" → { qty: 1800, unit: 'g' }
const UNIT_MAP = {
  kg: ['g', 1000], kilo: ['g', 1000], kilos: ['g', 1000], kilogramo: ['g', 1000], kilogramos: ['g', 1000],
  g: ['g', 1], gr: ['g', 1], grs: ['g', 1], gramo: ['g', 1], gramos: ['g', 1], grm: ['g', 1],
  lb: ['g', 453.6], lbs: ['g', 453.6], libra: ['g', 453.6], libras: ['g', 453.6],
  oz: ['g', 28.35], onz: ['g', 28.35],
  l: ['ml', 1000], lt: ['ml', 1000], lts: ['ml', 1000], litro: ['ml', 1000], litros: ['ml', 1000],
  ml: ['ml', 1], mililitros: ['ml', 1], cc: ['ml', 1],
  un: ['un', 1], und: ['un', 1], unid: ['un', 1], unids: ['un', 1], unidad: ['un', 1], unidades: ['un', 1], u: ['un', 1], uds: ['un', 1], pzas: ['un', 1], piezas: ['un', 1], pzs: ['un', 1], ea: ['un', 1],
};

const SIZE_RE = /(\d+(?:[.,]\d+)?)\s*(kilogramos|kilogramo|kilos|kilo|kg|gramos|gramo|grs|grm|gr|g|libras|libra|lbs|lb|onz|oz|litros|litro|lts|lt|l|mililitros|ml|cc|unidades|unidad|unids|unid|und|uds|un|piezas|pzas|pzs|u)\b/g;

export function parseSize(text) {
  let t = norm(text).replace(/(\d),(\d{3})\b/g, '$1$2');
  // "Precio indicado por kilo": se vende a granel, el precio es por kg
  if (/por (kilo|kg)\b/.test(t)) return { qty: 1000, unit: 'g', bulk: true };
  if (/por libra\b/.test(t)) return { qty: 453.6, unit: 'g', bulk: true };
  if (/por unidad\b/.test(t)) return { qty: 1, unit: 'un' };
  // "4 a 6 unidades aproximadamente" no es el tamaño del paquete
  t = t.replace(/\d+\s*a\s*\d+\s*(unidades|unidad|uds|ud)\b[^-]*/g, ' ');
  // "6 x 140 g" → multiplicar; "6 Pack 852 g" ya trae el total
  let pack = 1;
  const pm = t.match(/\b(\d+)\s*x\s*(?=\d+(?:[.,]\d+)?\s*(?:g|gr|ml|kg|l)\b)/);
  if (pm) pack = Number(pm[1]) || 1;
  const found = [];
  let m;
  SIZE_RE.lastIndex = 0;
  while ((m = SIZE_RE.exec(t))) {
    const [base, mult] = UNIT_MAP[m[2]];
    found.push({ qty: parseFloat(m[1].replace(',', '.')) * mult, unit: base });
  }
  // Preferir peso/volumen sobre conteo, salvo que solo haya conteo
  const wv = found.find(f => f.unit !== 'un');
  const cnt = found.find(f => f.unit === 'un');
  if (wv) return { qty: wv.qty * pack, unit: wv.unit, count: cnt ? cnt.qty : null };
  if (cnt) return { qty: cnt.qty * pack, unit: 'un' };
  if (/\b(kg|kilo|kilogramo)\b/.test(t)) return { qty: 1000, unit: 'g', bulk: true };
  if (/\b(lb|libra)\b/.test(t)) return { qty: 453.6, unit: 'g', bulk: true };
  if (/\b(unidad|c\/u|cu|und|ud)\b/.test(t)) return { qty: 1, unit: 'un' };
  return null;
}

// Cantidad de unidades indicada en el nombre ("Cartón de 30 uds"), ignorando rangos aproximados
export function parseCount(text) {
  const t = norm(text).replace(/\d+\s*a\s*\d+\s*(unidades|unidad|uds|ud)\b/g, ' ');
  const m = t.match(/(\d+)\s*(unidades|unidad|uds|ud|un|und|piezas|pzas|ea)\b/);
  return m ? Number(m[1]) : null;
}

// ¿El producto corresponde al ingrediente?
// productName: nombre base (debe empezar con `lead`); fullName: nombre + presentación
export function matches(ing, productName, fullName = productName) {
  const t = norm(`${productName} ${fullName}`);
  const tokens = t.split(/[^a-z0-9ñ]+/).filter(Boolean);
  const hasWord = w => (w.includes(' ') ? t.includes(w) : tokens.some(tok => tok.startsWith(w)));
  const first = norm(productName).split(/[^a-z0-9ñ]+/).filter(Boolean)[0] || '';
  const lead = ing.lead || (ing.inc || []).slice(0, 1);
  if (lead.length && !lead.some(w => first.startsWith(w))) return false;
  if (!(ing.inc || []).every(hasWord)) return false;
  if (ing.any && !ing.any.some(hasWord)) return false;
  if ((ing.exc || []).some(hasWord)) return false;
  return true;
}

// Tamaño del paquete expresado en la unidad base del ingrediente (o null si no se puede convertir)
export function sizeInIngredientUnit(ing, size) {
  if (!size) return null;
  if (size.unit === ing.u) return size.qty;
  // g ↔ ml se tratan como equivalentes (densidad ≈ 1)
  if ((size.unit === 'g' && ing.u === 'ml') || (size.unit === 'ml' && ing.u === 'g')) return size.qty;
  if (ing.u === 'un' && ing.per) {
    if (size.count) return size.count;
    if (size.unit === 'g' || size.unit === 'ml') return size.qty / ing.per;
  }
  if (ing.u !== 'un' && size.unit === 'un' && ing.per) return size.qty * ing.per;
  return null;
}
