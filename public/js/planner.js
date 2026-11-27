import { INGREDIENTS } from './ingredients.js';
import { RECIPES } from './recipes.js';

export const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const MEALS = [['desayuno', 'Desayuno', '☀️'], ['almuerzo', 'Almuerzo', '🍽️'], ['cena', 'Cena', '🌙']];
export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map(r => [r.id, r]));

// Porciones equivalentes: un niño come ~media porción
export const portions = p => Math.max(1, p.adults + 0.5 * p.kids);

// ─── Precios ───────────────────────────────────────────────
export function buildPriceBook(storeData) {
  const book = {};
  for (const [k, ing] of Object.entries(INGREDIENTS)) {
    const real = storeData?.items?.[k];
    book[k] = real?.length
      ? real.map(c => ({ ...c, est: false }))
      : [{ id: `est-${k}`, name: `${ing.n} (precio estimado)`, price: ing.fb[1], list: ing.fb[1], size: ing.fb[0], byWeight: false, est: true, img: '', url: '' }];
  }
  return book;
}

// Mejor forma de comprar `qty` de un ingrediente: elige el producto que sale más barato
// tomando en cuenta que se compran paquetes completos.
export function bestBuy(book, k, qty) {
  let best = null;
  for (const c of book[k]) {
    let packs, cost;
    if (c.byWeight) {
      const step = c.size / 10; // se compra en fracciones de 100 g por kg
      packs = Math.ceil(qty / step - 1e-9) / 10;
      cost = packs * c.price;
    } else {
      packs = Math.max(1, Math.ceil(qty / c.size - 1e-9));
      cost = packs * c.price;
    }
    if (!best || cost < best.cost) best = { cand: c, packs, cost: Math.round(cost) };
  }
  return best;
}

// ─── Filtros por preferencias ──────────────────────────────
export function recipeAllergens(r) {
  const s = new Set();
  r.ing.forEach(([k]) => (INGREDIENTS[k].al || []).forEach(a => s.add(a)));
  return [...s];
}

export function recipeAllowed(r, prefs) {
  if (r.ap.some(a => !prefs.appliances.includes(a))) return false;
  const al = recipeAllergens(r);
  if (al.some(a => prefs.allergies.includes(a))) return false;
  for (const [k] of r.ing) if ((INGREDIENTS[k].t || []).some(t => prefs.dislikes.includes(t))) return false;
  return true;
}

export function candidatesFor(meal, prefs) {
  return RECIPES.filter(r => r.m.includes(meal) && recipeAllowed(r, prefs));
}

export function buildSlots(prefs) {
  const slots = [];
  prefs.days.forEach(d => prefs.meals.forEach(m => slots.push({ day: d, meal: m })));
  return slots;
}

// ─── Costo de un plan ──────────────────────────────────────
export function aggregate(recipeIds, prefs) {
  const f = portions(prefs) / 4;
  const need = {};
  for (const id of recipeIds) {
    const r = RECIPE_BY_ID[id];
    if (!r) continue;
    for (const [k, q] of r.ing) need[k] = (need[k] || 0) + q * f;
  }
  return need;
}

export function planCost(recipeIds, prefs, book) {
  const need = aggregate(recipeIds, prefs);
  let total = 0;
  for (const [k, q] of Object.entries(need)) {
    if (prefs.have.includes(k)) continue;
    total += bestBuy(book, k, q).cost;
  }
  return total;
}

export function shoppingList(recipeIds, prefs, book) {
  const need = aggregate(recipeIds, prefs);
  const lines = [];
  let total = 0, estimated = 0;
  for (const [k, q] of Object.entries(need)) {
    const ing = INGREDIENTS[k];
    const have = prefs.have.includes(k);
    const buy = bestBuy(book, k, q);
    if (!have) {
      total += buy.cost;
      if (buy.cand.est) estimated++;
    }
    lines.push({ k, ing, qty: q, have, ...buy });
  }
  return { lines, total, estimated };
}

// ─── Optimizador ───────────────────────────────────────────
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function objective(ids, slots, prefs, book) {
  const cost = planCost(ids, prefs, book);
  const counts = {};
  ids.forEach(id => (counts[id] = (counts[id] || 0) + 1));
  let repeats = 0;
  for (const c of Object.values(counts)) if (c > 1) repeats += (c - 1) * (c - 1);
  // misma receta el mismo día (p.ej. almuerzo y cena iguales)
  let sameDay = 0;
  for (let i = 0; i < slots.length; i++)
    for (let j = i + 1; j < slots.length; j++)
      if (slots[i].day === slots[j].day && ids[i] === ids[j]) sameDay++;
  const over = Math.max(0, cost - prefs.budget);
  const obj = over * 6 + repeats * prefs.budget * 0.03 + sameDay * prefs.budget * 0.08 + cost * 0.15;
  return { obj, cost };
}

export function makePlan(prefs, book, seed = Date.now()) {
  const rand = rng(seed);
  const slots = buildSlots(prefs);
  const pools = slots.map(s => candidatesFor(s.meal, prefs).map(r => r.id));
  if (pools.some(p => !p.length)) {
    const meal = slots[pools.findIndex(p => !p.length)].meal;
    return { error: `No hay recetas de ${meal} que cumplan tus preferencias. Probá quitar algún "no me gusta" o agregar aparatos de cocina.` };
  }
  const pick = arr => arr[Math.floor(rand() * arr.length)];
  let best = null;
  const restarts = 6, iters = 600;
  for (let r = 0; r < restarts; r++) {
    let ids = pools.map(pick);
    let cur = objective(ids, slots, prefs, book);
    for (let i = 0; i < iters; i++) {
      const si = Math.floor(rand() * slots.length);
      const cand = pick(pools[si]);
      if (cand === ids[si]) continue;
      const next = ids.slice();
      next[si] = cand;
      const val = objective(next, slots, prefs, book);
      if (val.obj <= cur.obj) { ids = next; cur = val; }
    }
    if (!best || cur.obj < best.obj) best = { ids, ...cur };
  }
  return { slots: slots.map((s, i) => ({ ...s, id: best.ids[i] })), cost: best.cost };
}

// Opciones para cambiar una comida, con la diferencia de costo
export function swapOptions(plan, index, prefs, book) {
  const ids = plan.slots.map(s => s.id);
  const base = planCost(ids, prefs, book);
  return candidatesFor(plan.slots[index].meal, prefs)
    .filter(r => r.id !== ids[index])
    .map(r => {
      const next = ids.slice();
      next[index] = r.id;
      return { r, delta: planCost(next, prefs, book) - base };
    })
    .sort((a, b) => a.delta - b.delta);
}

// Plan más barato posible (para sugerir un presupuesto mínimo)
export function minimumCost(prefs, book) {
  const p = makePlan({ ...prefs, budget: 1 }, book, 42);
  return p.error ? null : p.cost;
}

// Formato de colones
export const crc = n => '₡' + Math.round(n).toLocaleString('es-CR').replace(/\s/g, ' ');

// Cantidad legible
export function fmtQty(q, u) {
  if (u === 'un') return q < 1 ? `${Math.round(q * 4) / 4}` : `${Math.round(q * 2) / 2}`;
  if (q >= 1000) return `${(q / 1000).toFixed(q % 1000 === 0 ? 0 : 1)} ${u === 'g' ? 'kg' : 'L'}`;
  return `${Math.round(q)} ${u}`;
}
