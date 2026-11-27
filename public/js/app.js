import { INGREDIENTS, AISLES, DISLIKE_TAGS, ALLERGENS, APPLIANCES } from './ingredients.js';
import {
  DAYS, MEALS, RECIPE_BY_ID, portions, buildPriceBook, makePlan, swapOptions, shoppingList,
  minimumCost, crc, fmtQty, buildSlots, bestBuy,
} from './planner.js';

// ─── Estado ────────────────────────────────────────────────
const KEY = 'canasta.v1';
const STORES = [
  { id: 'walmart', name: 'Walmart', note: 'Precios en línea', on: true },
  { id: 'masxmenos', name: 'Masxmenos', note: 'Precios en línea', on: true },
  { id: 'pricesmart', name: 'PriceSmart', note: 'Próximamente', on: false },
  { id: 'automercado', name: 'Auto Mercado', note: 'Próximamente', on: false },
];
const DEFAULT_PREFS = {
  store: 'walmart', adults: 2, kids: 0, meals: ['almuerzo', 'cena'], days: DAYS.slice(0, 5),
  appliances: ['estufa', 'microondas'], allergies: [], dislikes: [], have: ['aceite', 'azucar'], budget: 0,
};

let S = loadState();
let draft = null; // preferencias en edición durante la configuración
const prices = {}; // store → datos de precios
const $app = document.getElementById('app');

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.prefs) return { checked: {}, cooked: {}, ...s };
  } catch { /* sin datos guardados */ }
  return { prefs: { ...DEFAULT_PREFS }, plan: null, checked: {}, cooked: {}, onboarded: false };
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* almacenamiento lleno o bloqueado */ } };

async function loadPrices(store) {
  if (prices[store] !== undefined) return prices[store];
  try {
    const res = await fetch(`data/prices-${store}.json`, { cache: 'no-cache' });
    prices[store] = res.ok ? await res.json() : null;
  } catch { prices[store] = null; }
  return prices[store];
}
const bookFor = store => buildPriceBook(prices[store]);

// ─── Utilidades ────────────────────────────────────────────
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const go = h => { if (location.hash === h) render(); else location.hash = h; };
const toggle = (arr, v) => (arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
const storeName = id => STORES.find(s => s.id === id)?.name || id;
const mealLabel = m => MEALS.find(x => x[0] === m)?.[1] || m;

function toast(msg, ms = 2200) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.tm);
  toast.tm = setTimeout(() => (t.hidden = true), ms);
}

function sheet(html, bind) {
  const el = document.getElementById('sheet');
  el.innerHTML = `<div class="panel"><div class="grab"></div>${html}</div>`;
  el.hidden = false;
  el.onclick = e => { if (e.target === el) closeSheet(); };
  bind?.(el);
}
function closeSheet() { const el = document.getElementById('sheet'); el.hidden = true; el.innerHTML = ''; }

// Costo aproximado de una receta (proporcional al precio por unidad del producto elegido)
function recipeCost(id, prefs, book) {
  const r = RECIPE_BY_ID[id];
  const f = portions(prefs) / 4;
  let c = 0;
  for (const [k, q] of r.ing) {
    if (prefs.have.includes(k)) continue;
    const b = bestBuy(book, k, q * f);
    c += (q * f) * (b.cand.price / b.cand.size);
  }
  return c;
}

const nav = active => `
  <nav class="nav"><div>
    <a href="#/plan" class="${active === 'plan' ? 'on' : ''}"><span>📅</span>Semana</a>
    <a href="#/lista" class="${active === 'lista' ? 'on' : ''}"><span>🛒</span>Lista</a>
    <a href="#/ajustes" class="${active === 'ajustes' ? 'on' : ''}"><span>⚙️</span>Ajustes</a>
  </div></nav>`;

// ─── Bienvenida ────────────────────────────────────────────
function viewWelcome() {
  $app.innerHTML = `
  <section class="screen">
    <div class="brand">Canasta<b>.</b></div>
    <div class="hero">
      <div class="hero-art"><span>🍚</span><span>🫘</span><span>🥑</span><span>🍌</span><span>🍗</span><span>🧀</span><span>🍅</span><span>🫓</span></div>
      <h1>Comé rico toda la semana sin pasarte del presupuesto.</h1>
      <p class="muted">Elegí tu súper, decinos cuántos comen y cuánto querés gastar. Armamos el menú, las recetas y la lista de compras con precios reales.</p>
    </div>
    <div class="footer"><button class="btn" id="start">Empezar</button></div>
  </section>`;
  document.getElementById('start').onclick = () => { draft = structuredClone(S.prefs); go('#/setup/0'); };
}

// ─── Configuración paso a paso ─────────────────────────────
const SETUP = [
  {
    title: '¿Dónde hacés las compras?', lead: 'Usamos los precios en línea de esa tienda.',
    body: () => `<div class="stores">${STORES.map(s => `
      <button class="store ${s.id} ${draft.store === s.id ? 'on' : ''}" data-store="${s.id}" ${s.on ? '' : 'disabled'}>
        <span class="logo">${s.name}</span><span class="note">${s.note}</span>
      </button>`).join('')}</div>`,
    bind: el => el.querySelectorAll('[data-store]').forEach(b => (b.onclick = () => { draft.store = b.dataset.store; rerenderSetup(); })),
    ok: () => !!draft.store, cta: 'Confirmar tienda',
  },
  {
    title: '¿Quiénes comen?', lead: 'Las porciones se ajustan a tu hogar automáticamente.',
    body: () => `<div class="rows">
      ${counter('adults', '🧑', 'Adultos', 'porción completa', 1)}
      ${counter('kids', '🧒', 'Niños', 'media porción', 0)}
      </div>
      <div class="callout"><span>Porciones por comida</span><span>${portions(draft)}</span></div>`,
    bind: el => el.querySelectorAll('[data-count]').forEach(b => (b.onclick = () => {
      const [k, d, min] = b.dataset.count.split(':');
      draft[k] = Math.max(Number(min), Math.min(12, draft[k] + Number(d)));
      rerenderSetup();
    })),
    ok: () => draft.adults >= 1,
  },
  {
    title: '¿Qué comidas planeamos?', lead: 'Elegí lo que querés que planifiquemos cada día.',
    body: () => `<div class="rows">${MEALS.map(([id, label, em]) => `
      <button class="row check ${draft.meals.includes(id) ? 'on' : ''}" data-meal="${id}">
        <span class="ico">${em}</span>
        <span class="txt"><b>${label}</b><small>${{ desayuno: 'rápido y repetible', almuerzo: 'el tiempo fuerte', cena: 'liviano o de sobras' }[id]}</small></span>
        <span class="tick">✓</span>
      </button>`).join('')}</div>`,
    bind: el => el.querySelectorAll('[data-meal]').forEach(b => (b.onclick = () => {
      draft.meals = MEALS.map(m => m[0]).filter(m => (m === b.dataset.meal ? !draft.meals.includes(m) : draft.meals.includes(m)));
      rerenderSetup();
    })),
    ok: () => draft.meals.length > 0,
  },
  {
    title: '¿Qué días vas a cocinar?', lead: 'Solo planificamos los días que elijás.',
    body: () => `<div class="days">${DAYS.map(d => `
      <button class="day ${draft.days.includes(d) ? 'on' : ''}" data-day="${d}">${d[0]}<span class="tick">✓</span></button>`).join('')}</div>
      <p class="muted small" style="text-align:center;margin-top:14px">${draft.days.length ? `Planificando ${draft.days.length} día${draft.days.length > 1 ? 's' : ''} por semana` : 'Elegí al menos un día'}</p>`,
    bind: el => el.querySelectorAll('[data-day]').forEach(b => (b.onclick = () => {
      draft.days = DAYS.filter(d => (d === b.dataset.day ? !draft.days.includes(d) : draft.days.includes(d)));
      rerenderSetup();
    })),
    ok: () => draft.days.length > 0,
  },
  {
    title: '¿Qué hay en tu cocina?', lead: 'Solo sugerimos recetas que podás hacer.',
    body: () => `<div class="grid2">${APPLIANCES.map(([id, label, em]) => `
      <button class="tile ${draft.appliances.includes(id) ? 'on' : ''}" data-ap="${id}"><span class="em">${em}</span>${label}</button>`).join('')}</div>`,
    bind: el => el.querySelectorAll('[data-ap]').forEach(b => (b.onclick = () => { draft.appliances = toggle(draft.appliances, b.dataset.ap); rerenderSetup(); })),
    ok: () => draft.appliances.includes('estufa'),
    hint: () => (draft.appliances.includes('estufa') ? '' : '<p class="muted small" style="text-align:center">Casi todas las recetas necesitan estufa.</p>'),
  },
  {
    title: '¿Alguna alergia?', lead: 'Tocá para excluir. Nunca aparecerán en tu plan.',
    body: () => `<div class="grid2">
      <button class="tile ${draft.allergies.length ? '' : 'on'}" data-al=""><span class="em">✅</span>Ninguna<small>sin restricciones</small></button>
      ${ALLERGENS.map(([id, label, em]) => `
      <button class="tile ${draft.allergies.includes(id) ? 'off' : ''}" data-al="${id}"><span class="em">${em}</span>${label}<small>${draft.allergies.includes(id) ? 'excluido' : 'tocá para excluir'}</small></button>`).join('')}</div>`,
    bind: el => el.querySelectorAll('[data-al]').forEach(b => (b.onclick = () => {
      draft.allergies = b.dataset.al ? toggle(draft.allergies, b.dataset.al) : [];
      rerenderSetup();
    })),
    ok: () => true,
  },
  {
    title: '¿Algo que no te guste?', lead: 'Lo dejamos fuera de todos los planes.',
    body: () => `<div class="chips">${DISLIKE_TAGS.map(([t, em]) => `
      <button class="chip ${draft.dislikes.includes(t) ? 'on' : ''}" data-dis="${t}">${em} ${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div>`,
    bind: el => el.querySelectorAll('[data-dis]').forEach(b => (b.onclick = () => { draft.dislikes = toggle(draft.dislikes, b.dataset.dis); rerenderSetup(); })),
    ok: () => true,
  },
  {
    title: '¿Qué ya tenés en casa?', lead: 'No lo incluimos en la lista ni en el costo.',
    body: () => {
      const items = Object.entries(INGREDIENTS).filter(([, i]) => i.p);
      return `<div class="grid3">${items.map(([k, i]) => `
        <button class="tile ${draft.have.includes(k) ? 'on' : ''}" data-have="${k}"><span class="em">${i.e}</span>${esc(i.n)}</button>`).join('')}</div>`;
    },
    bind: el => el.querySelectorAll('[data-have]').forEach(b => (b.onclick = () => { draft.have = toggle(draft.have, b.dataset.have); rerenderSetup(); })),
    ok: () => true, cta: () => `Continuar${draft.have.length ? ` · ${draft.have.length} seleccionados` : ''}`,
  },
  {
    title: 'Tu presupuesto semanal', lead: '',
    body: () => {
      const slots = buildSlots(draft).length;
      const min = setupMin;
      const b = draft.budget;
      const max = Math.max(150000, Math.ceil((min || 0) * 3 / 5000) * 5000);
      return `
        <p class="muted small">${draft.adults} adulto${draft.adults > 1 ? 's' : ''}${draft.kids ? ` · ${draft.kids} niño${draft.kids > 1 ? 's' : ''}` : ''} · ${draft.meals.length} comida${draft.meals.length > 1 ? 's' : ''}/día · ${portions(draft)} porciones/comida · ${storeName(draft.store)}</p>
        <div class="budget"><div class="amount" id="amt">${crc(b)}</div><span class="muted small">por semana · deslizá para ajustar</span></div>
        <input type="range" id="budget" min="5000" max="${max}" step="1000" value="${b}">
        <div class="range-labels"><span>₡5 000</span><span>${crc(max)}</span></div>
        <div id="bnote">${budgetNote(b, min)}</div>
        <div class="stats">
          <div class="stat"><b>${min ? crc(min) : '—'}</b><span>Mínimo estimado</span></div>
          <div class="stat"><b>${Math.round(slots * portions(draft))}</b><span>Porciones / semana</span></div>
        </div>`;
    },
    bind: el => {
      const r = el.querySelector('#budget');
      r.oninput = () => {
        draft.budget = Number(r.value);
        el.querySelector('#amt').textContent = crc(draft.budget);
        el.querySelector('#bnote').innerHTML = budgetNote(draft.budget, setupMin);
      };
    },
    ok: () => draft.budget >= 5000, cta: 'Crear mi plan',
    enter: async () => {
      await loadPrices(draft.store);
      setupMin = minimumCost(draft, bookFor(draft.store));
      if (!draft.budget && setupMin) draft.budget = Math.ceil(setupMin * 1.35 / 5000) * 5000;
      if (!draft.budget) draft.budget = 40000;
    },
  },
];
let setupMin = null;

function budgetNote(b, min) {
  const p = prices[draft.store];
  const real = p?.items ? Object.keys(p.items).length : 0;
  const priceInfo = real
    ? `Precios de ${storeName(draft.store)} actualizados ${new Date(p.updated).toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })}.`
    : 'Todavía no hay precios descargados: usamos precios estimados.';
  if (min && b < min) return `<div class="note-card warn">⚠️ <div>Con ${crc(b)} es difícil cubrir la semana. El plan más económico ronda ${crc(min)}; vamos a acercarnos lo más posible.<br><span class="muted small">${priceInfo}</span></div></div>`;
  if (min) return `<div class="note-card">💚 <div>Hay espacio: aproximadamente ${crc(b - min)} por encima del plan más económico, para más variedad.<br><span class="muted small">${priceInfo}</span></div></div>`;
  return `<div class="note-card">ℹ️ <div>${priceInfo}</div></div>`;
}

function counter(key, em, label, sub, min) {
  return `<div class="row"><span class="ico">${em}</span><span class="txt"><b>${label}</b><small>${sub}</small></span>
    <span class="stepper"><button data-count="${key}:-1:${min}" aria-label="menos">−</button><output>${draft[key]}</output><button class="plus" data-count="${key}:1:${min}" aria-label="más">+</button></span></div>`;
}

let setupStep = 0;
async function viewSetup(n) {
  if (!draft) draft = structuredClone(S.prefs);
  setupStep = Math.max(0, Math.min(SETUP.length - 1, n));
  const st = SETUP[setupStep];
  if (st.enter) {
    $app.innerHTML = '<section class="screen"><div class="empty">Calculando precios…</div></section>';
    await st.enter();
  }
  rerenderSetup();
}

function rerenderSetup() {
  const st = SETUP[setupStep];
  const pct = ((setupStep + 1) / (SETUP.length + 1)) * 100;
  const cta = typeof st.cta === 'function' ? st.cta() : st.cta || 'Siguiente';
  const y = window.scrollY;
  $app.innerHTML = `
  <section class="screen">
    <div class="topbar">
      <button class="back" id="back" aria-label="Atrás">‹</button>
      <div class="progress"><i style="width:${pct}%"></i></div>
    </div>
    <h1>${st.title}</h1>
    ${st.lead ? `<p class="lead">${st.lead}</p>` : '<div style="height:10px"></div>'}
    <div id="body">${st.body()}</div>
    ${st.hint ? st.hint() : ''}
    <div class="footer"><button class="btn" id="next" ${st.ok() ? '' : 'disabled'}>${cta}</button></div>
  </section>`;
  window.scrollTo(0, y);
  st.bind?.($app.querySelector('#body'));
  $app.querySelector('#back').onclick = () => (setupStep === 0 ? go(S.onboarded ? '#/ajustes' : '#/') : go(`#/setup/${setupStep - 1}`));
  $app.querySelector('#next').onclick = () => {
    if (setupStep < SETUP.length - 1) { window.scrollTo(0, 0); go(`#/setup/${setupStep + 1}`); return; }
    S.prefs = structuredClone(draft);
    draft = null;
    S.onboarded = true;
    save();
    go('#/creando');
  };
}

// ─── Creando el plan ───────────────────────────────────────
async function viewCreating() {
  const steps = ['Revisando los precios de esta semana…', 'Eligiendo tus recetas…', 'Calculando la canasta…', 'Ajustando al presupuesto…', 'Terminando tu plan…'];
  const orbit = ['🥕', '🍅', '🫑', '🥑', '🍌', '🧀', '🌽', '🥦'];
  $app.innerHTML = `
  <section class="screen">
    <div class="loading">
      <div class="orbit">${orbit.map((e, i) => `<span style="--a:${i * 45}deg">${e}</span>`).join('')}<div class="core">🧺</div></div>
      <h2 id="lstat">${steps[0]}</h2>
      <ul class="steps-list">${steps.map((s, i) => `<li data-i="${i}"><span class="tick">✓</span>${s.replace('…', '')}</li>`).join('')}</ul>
    </div>
  </section>`;
  const lis = [...$app.querySelectorAll('.steps-list li')];
  const mark = i => lis.forEach((li, j) => { li.className = j < i ? 'done' : j === i ? 'now' : ''; });
  const wait = ms => new Promise(r => setTimeout(r, ms));

  mark(0); await loadPrices(S.prefs.store); await wait(500);
  mark(1); await wait(450);
  const plan = makePlan(S.prefs, bookFor(S.prefs.store));
  mark(2); await wait(450);
  mark(3); await wait(450);
  mark(4); await wait(350);
  if (plan.error) {
    toast(plan.error, 5000);
    go('#/setup/6');
    return;
  }
  S.plan = plan; S.checked = {}; S.cooked = {};
  save();
  go('#/plan');
}

// ─── Plan semanal ──────────────────────────────────────────
async function viewPlan() {
  if (!S.plan) return go('#/creando');
  const prefs = S.prefs;
  await loadPrices(prefs.store);
  const book = bookFor(prefs.store);
  const ids = S.plan.slots.map(s => s.id);
  const list = shoppingList(ids, prefs, book);
  const spent = list.total, budget = prefs.budget;
  const over = spent > budget;
  const buyCount = list.lines.filter(l => !l.have).length;

  const byDay = DAYS.filter(d => prefs.days.includes(d)).map(d => ({
    d, items: S.plan.slots.map((s, i) => ({ ...s, i })).filter(s => s.day === d),
  }));

  $app.innerHTML = `
  <section class="screen has-nav">
    <div class="topbar"><div class="brand">Canasta<b>.</b></div><div class="grow"></div>
      <button class="btn light" id="regen" style="width:auto;min-height:38px;padding:0 14px;font-size:14px">🔀 Nuevo menú</button></div>
    <h1>Tu semana está lista</h1>
    <div class="summary">
      <div class="spent">
        <div class="lbl">Gastás de ${crc(budget)}</div>
        <div class="big">${crc(spent)}</div>
        <div class="bar ${over ? 'over' : ''}"><i style="width:${Math.min(100, (spent / budget) * 100)}%"></i></div>
        <span class="pill ${over ? 'over' : ''}">${over ? `▲ ${crc(spent - budget)} sobre el presupuesto` : `✓ Te sobran ${crc(budget - spent)}`}</span>
      </div>
      <a class="listcard" href="#/lista" style="text-decoration:none">
        <span class="ico">🛒</span>
        <span><b>Lista de compras</b><br><small>${buyCount} productos · ${storeName(prefs.store)}</small></span>
      </a>
    </div>
    ${list.estimated ? `<div class="note-card" style="margin:-8px 0 18px">ℹ️ <div class="small">${list.estimated} producto${list.estimated > 1 ? 's' : ''} con precio estimado. Los demás son precios reales de ${storeName(prefs.store)}.</div></div>` : ''}
    ${byDay.map(({ d, items }) => `
      <div class="dayblock">
        <h3>${d}<small>${crc(items.reduce((a, s) => a + recipeCost(s.id, prefs, book), 0))} aprox.</small></h3>
        ${items.map(s => {
          const r = RECIPE_BY_ID[s.id];
          return `<div class="meal">
            <a class="thumb" href="#/receta/${s.i}" style="text-decoration:none">${S.cooked[s.i] ? '✅' : r.e}</a>
            <a class="info" href="#/receta/${s.i}" style="text-decoration:none;color:inherit">
              <div class="kind">${mealLabel(s.meal)}</div>
              <div class="name">${esc(r.n)}</div>
              <div class="meta">${r.min} min · ≈ ${crc(recipeCost(s.id, prefs, book))}</div>
            </a>
            <button class="swap" data-swap="${s.i}" aria-label="Cambiar">⇄<small>Cambiar</small></button>
          </div>`;
        }).join('')}
      </div>`).join('')}
  </section>${nav('plan')}`;

  $app.querySelector('#regen').onclick = () => {
    const p = makePlan(prefs, book);
    if (p.error) return toast(p.error, 4000);
    S.plan = p; S.checked = {}; S.cooked = {}; save(); render();
    toast('Menú nuevo listo 🍽️');
  };
  $app.querySelectorAll('[data-swap]').forEach(b => (b.onclick = () => openSwap(Number(b.dataset.swap), book)));
}

function openSwap(i, book) {
  const prefs = S.prefs;
  const cur = RECIPE_BY_ID[S.plan.slots[i].id];
  const opts = swapOptions(S.plan, i, prefs, book);
  sheet(`
    <h2>Cambiar ${mealLabel(S.plan.slots[i].meal).toLowerCase()} del ${S.plan.slots[i].day.toLowerCase()}</h2>
    <p class="muted small" style="margin:4px 0 14px">Ahora: ${esc(cur.n)}. El monto muestra cuánto cambia tu compra total.</p>
    ${opts.length ? opts.map(o => `
      <button class="opt" data-pick="${o.r.id}">
        <span class="em">${o.r.e}</span>
        <span><b>${esc(o.r.n)}</b><br><span class="muted small">${o.r.min} min · ${o.r.tag}</span></span>
        <span class="d ${o.delta < 0 ? 'cheaper' : o.delta > 0 ? 'pricier' : ''}">${o.delta === 0 ? '±₡0' : (o.delta > 0 ? '+' : '−') + crc(Math.abs(o.delta))}</span>
      </button>`).join('') : '<p class="empty">No hay otras recetas que cumplan tus preferencias.</p>'}
  `, el => el.querySelectorAll('[data-pick]').forEach(b => (b.onclick = () => {
    S.plan.slots[i].id = b.dataset.pick;
    delete S.cooked[i];
    save(); closeSheet(); render();
    toast('Comida cambiada');
  })));
}

// ─── Lista de compras ──────────────────────────────────────
async function viewList() {
  if (!S.plan) return go('#/creando');
  const prefs = S.prefs;
  await loadPrices(prefs.store);
  const book = bookFor(prefs.store);
  const { lines, total } = shoppingList(S.plan.slots.map(s => s.id), prefs, book);
  const buy = lines.filter(l => !l.have);
  const have = lines.filter(l => l.have);
  const left = buy.filter(l => !S.checked[l.k]).reduce((a, l) => a + l.cost, 0);
  const groups = AISLES.map(a => ({ a, items: buy.filter(l => l.ing.a === a).sort((x, y) => x.ing.n.localeCompare(y.ing.n)) })).filter(g => g.items.length);
  const updated = prices[prefs.store]?.updated;

  $app.innerHTML = `
  <section class="screen has-nav">
    <div class="listhead">
      <div><h1>Lista de compras</h1>
        <p class="muted small" style="margin:4px 0 0">${buy.length} productos · ${storeName(prefs.store)}${updated ? ` · precios del ${new Date(updated).toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })}` : ''}</p></div>
      <button class="back" id="share" aria-label="Compartir">⤴︎</button>
    </div>
    ${groups.map(g => `
      <div class="aisle">${g.a}</div>
      ${g.items.map(l => {
        const c = l.cand;
        const packTxt = c.byWeight ? `${fmtQty(l.packs * c.size, l.ing.u)}` : `${l.packs} × ${esc(c.name.replace(/\s*\(precio estimado\)/, ''))}`;
        return `<div class="item ${S.checked[l.k] ? 'done' : ''}" data-k="${l.k}">
          <span class="tick">✓</span>
          <span class="pic" ${c.img ? `style="background-image:url('${esc(c.img)}')"` : ''}>${c.img ? '' : l.ing.e}</span>
          <span class="pinfo">
            <div class="pname">${esc(l.ing.n)} ${c.est ? '<span class="badge">estimado</span>' : ''}${c.list > c.price ? '<span class="badge sale">oferta</span>' : ''}</div>
            <div class="pmeta">Necesitás ${fmtQty(l.qty, l.ing.u)}${l.ing.u === 'un' ? ' u.' : ''} · ${c.est ? `paquete de ${fmtQty(c.size, l.ing.u)}` : packTxt}</div>
            ${c.url ? `<a class="small" href="${esc(c.url)}" target="_blank" rel="noopener" data-noop>Ver en ${storeName(prefs.store)} ›</a>` : ''}
          </span>
          <span class="price">${crc(l.cost)}${!c.byWeight && l.packs > 1 ? `<small>${crc(c.price)} c/u</small>` : ''}</span>
        </div>`;
      }).join('')}`).join('')}
    ${have.length ? `<div class="aisle">Ya lo tenés en casa</div><div class="chips">${have.map(l => `<span class="chip">${l.ing.e} ${esc(l.ing.n)}</span>`).join('')}</div>` : ''}
    <div class="totalbar"><span>Total</span><span>${crc(total)}</span></div>
    ${left < total ? `<p class="muted small" style="text-align:center;margin-top:8px">Falta por comprar: ${crc(left)}</p>` : ''}
    <button class="btn ghost" id="uncheck" style="margin-top:6px">Desmarcar todo</button>
  </section>${nav('lista')}`;

  $app.querySelectorAll('.item').forEach(el => (el.onclick = e => {
    if (e.target.closest('[data-noop]')) return;
    const k = el.dataset.k;
    S.checked[k] = !S.checked[k];
    save(); render();
  }));
  $app.querySelector('#uncheck').onclick = () => { S.checked = {}; save(); render(); };
  $app.querySelector('#share').onclick = async () => {
    const text = `🛒 Lista de compras (${storeName(prefs.store)})\n\n` +
      groups.map(g => `${g.a}\n` + g.items.map(l => `${S.checked[l.k] ? '✔' : '☐'} ${l.ing.n} — ${l.cand.byWeight ? fmtQty(l.packs * l.cand.size, l.ing.u) : `${l.packs} × ${l.cand.name.replace(/\s*\(precio estimado\)/, '')}`} (${crc(l.cost)})`).join('\n')).join('\n\n') +
      `\n\nTotal: ${crc(total)}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Lista de compras', text });
      else { await navigator.clipboard.writeText(text); toast('Lista copiada'); }
    } catch { /* el usuario canceló */ }
  };
}

// ─── Receta ────────────────────────────────────────────────
const recipeUI = { tab: 'ing', servings: null, done: {}, slot: null };
function viewRecipe(i) {
  const slot = S.plan?.slots[i];
  if (!slot) return go('#/plan');
  const r = RECIPE_BY_ID[slot.id];
  if (recipeUI.slot !== `${i}:${slot.id}`) Object.assign(recipeUI, { tab: 'ing', servings: Math.ceil(portions(S.prefs)), done: {}, slot: `${i}:${slot.id}` });
  const f = recipeUI.servings / 4;
  const al = [...new Set(r.ing.flatMap(([k]) => INGREDIENTS[k].al || []))];

  $app.innerHTML = `
  <section class="screen">
    <div class="rhero">
      <div class="topbar"><button class="back" id="back" aria-label="Atrás">‹</button><div class="grow"></div>
        <span class="muted small">${slot.day} · ${mealLabel(slot.meal)}</span></div>
      <div class="bigem">${r.e}</div>
      <h1>${esc(r.n)}</h1>
      <div class="tags"><span class="tag">⏱ ${r.min} min</span><span class="tag">${esc(r.tag)}</span>${r.ap.map(a => `<span class="tag">${APPLIANCES.find(x => x[0] === a)?.[2] || ''} ${APPLIANCES.find(x => x[0] === a)?.[1] || a}</span>`).join('')}${al.length ? `<span class="tag">Contiene: ${al.join(', ')}</span>` : ''}</div>
    </div>
    <div class="tabs"><button data-tab="ing" class="${recipeUI.tab === 'ing' ? 'on' : ''}">Ingredientes</button><button data-tab="steps" class="${recipeUI.tab === 'steps' ? 'on' : ''}">Preparación</button></div>
    ${recipeUI.tab === 'ing' ? `
      <div class="row" style="margin-bottom:8px"><span class="txt"><b>Porciones</b><small>ajusta las cantidades</small></span>
        <span class="stepper"><button data-sv="-1">−</button><output>${recipeUI.servings}</output><button class="plus" data-sv="1">+</button></span></div>
      ${r.ing.map(([k, q]) => {
        const ing = INGREDIENTS[k];
        return `<div class="ing-row"><span class="em">${ing.e}</span><span>${esc(ing.n)}${S.prefs.have.includes(k) ? ' <span class="muted small">(en casa)</span>' : ''}</span><span class="q">${fmtQty(q * f, ing.u)}${ing.u === 'un' ? (q * f === 1 ? ' unidad' : ' unidades') : ''}</span></div>`;
      }).join('')}
      <p class="muted small" style="margin-top:10px">Sal y pimienta al gusto.</p>` : `
      <ol class="steps">${r.steps.map((s, j) => `<li class="${recipeUI.done[j] ? 'done' : ''}" data-step="${j}">${esc(s)}</li>`).join('')}</ol>
      <p class="muted small">Tocá un paso para marcarlo como hecho.</p>`}
    <div class="footer"><button class="btn ${S.cooked[i] ? 'light' : ''}" id="cooked">${S.cooked[i] ? '✓ Cocinado' : 'Marcar como cocinado'}</button></div>
  </section>`;

  $app.querySelector('#back').onclick = () => (history.length > 1 ? history.back() : go('#/plan'));
  $app.querySelectorAll('[data-tab]').forEach(b => (b.onclick = () => { recipeUI.tab = b.dataset.tab; render(); }));
  $app.querySelectorAll('[data-sv]').forEach(b => (b.onclick = () => { recipeUI.servings = Math.max(1, Math.min(20, recipeUI.servings + Number(b.dataset.sv))); render(); }));
  $app.querySelectorAll('[data-step]').forEach(li => (li.onclick = () => { recipeUI.done[li.dataset.step] = !recipeUI.done[li.dataset.step]; render(); }));
  $app.querySelector('#cooked').onclick = () => { S.cooked[i] = !S.cooked[i]; save(); render(); };
}

// ─── Ajustes ───────────────────────────────────────────────
async function viewSettings() {
  const p = S.prefs;
  const data = await loadPrices(p.store);
  const real = data?.items ? Object.keys(data.items).length : 0;
  const totalIng = Object.keys(INGREDIENTS).length;
  $app.innerHTML = `
  <section class="screen has-nav settings">
    <h1 style="margin-bottom:16px">Ajustes</h1>
    <button class="row" id="edit"><span class="ico">📝</span><span class="txt"><b>Editar preferencias</b><small>${storeName(p.store)} · ${p.adults} adulto${p.adults > 1 ? 's' : ''}${p.kids ? `, ${p.kids} niño${p.kids > 1 ? 's' : ''}` : ''} · ${crc(p.budget)}/semana</small></span><span class="go">›</span></button>
    <div class="row"><span class="ico">🏷️</span><span class="txt"><b>Precios de ${storeName(p.store)}</b><small>${real ? `${real} de ${totalIng} ingredientes con precio real · ${new Date(data.updated).toLocaleString('es-CR', { dateStyle: 'medium', timeStyle: 'short' })}` : 'Sin descargar: se usan precios estimados'}</small></span></div>
    <button class="row" id="sync"><span class="ico">🔄</span><span class="txt"><b>Actualizar precios ahora</b><small>Descarga los precios del catálogo en línea (≈ 1 min)</small></span><span class="go">›</span></button>
    <button class="row" id="reset"><span class="ico">🗑️</span><span class="txt"><b>Borrar datos de la app</b><small>Empieza de cero en este teléfono</small></span><span class="go">›</span></button>
    <p class="muted small" style="margin-top:18px">Los precios vienen de la tienda en línea y pueden variar un poco en la tienda física. Los paquetes se cuentan completos, como los vas a comprar.</p>
  </section>${nav('ajustes')}`;

  $app.querySelector('#edit').onclick = () => { draft = structuredClone(S.prefs); go('#/setup/0'); };
  $app.querySelector('#reset').onclick = () => {
    if (!confirm('¿Borrar tu plan y preferencias de este teléfono?')) return;
    localStorage.removeItem(KEY); S = loadState(); go('#/');
  };
  $app.querySelector('#sync').onclick = async () => {
    toast('Actualizando precios… puede tardar un minuto', 60000);
    try {
      const res = await fetch(`api/sync?store=${p.store}`, { method: 'POST' });
      if (!res.ok) throw new Error();
      delete prices[p.store];
      toast('Precios actualizados ✔');
      render();
    } catch {
      toast('No se pudo actualizar desde aquí. Los precios se actualizan solos cada día en el servidor.', 4500);
    }
  };
}

// ─── Router ────────────────────────────────────────────────
function render() {
  closeSheet();
  const h = location.hash.replace(/^#\/?/, '');
  const [route, arg] = h.split('/');
  if (!S.onboarded && !['setup', 'creando'].includes(route)) return viewWelcome();
  switch (route) {
    case 'setup': return viewSetup(Number(arg) || 0);
    case 'creando': return viewCreating();
    case 'lista': return viewList();
    case 'receta': return viewRecipe(Number(arg));
    case 'ajustes': return viewSettings();
    case 'plan': return viewPlan();
    default: return S.onboarded ? go('#/plan') : viewWelcome();
  }
}

window.addEventListener('hashchange', () => { window.scrollTo(0, 0); render(); });
render();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => { /* sin HTTPS no hay modo sin conexión */ });
}
