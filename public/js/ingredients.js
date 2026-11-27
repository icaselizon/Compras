// Catálogo de ingredientes.
// u: unidad base de la receta ('g' | 'ml' | 'un')
// per: gramos por unidad (para convertir entre 'un' y 'g')
// s: término de búsqueda en el catálogo de la tienda
// inc: palabras que el nombre del producto DEBE contener (sin tildes, minúsculas)
// lead: el nombre del producto debe EMPEZAR con una de estas palabras (evita 'shampoo de aguacate')
// any: al menos una de estas palabras debe aparecer
// exc: palabras que descartan el producto
// fb: [tamaño del paquete en unidad base, precio estimado ₡] — se usa si no hay precio real
// a: pasillo, al: alérgenos, t: etiquetas para "no me gusta", p: aparece en "¿qué ya tenés?"

export const AISLES = [
  'Frutas y verduras', 'Carnes y pescado', 'Lácteos y huevos', 'Panadería y tortillas',
  'Granos y pastas', 'Enlatados', 'Congelados', 'Condimentos y salsas', 'Aceites y básicos',
];

export const INGREDIENTS = {
  // Granos y pastas
  arroz:        { n: 'Arroz', e: '🍚', s: 'arroz', lead: ['arroz'], inc: ['arroz'], exc: ['frito', 'pollo', 'vinagre', 'jazmin', 'integral', 'precocido', 'galleta', 'leche', 'bebida', 'harina', 'basmati', 'cantones', 'arborio'], u: 'g', fb: [1800, 1150], a: 'Granos y pastas', p: 1 },
  frijol:       { n: 'Frijoles negros', e: '🫘', s: 'frijol negro', lead: ['frijol'], inc: ['frijol', 'negro'], exc: ['molido', 'refrito', 'lata', 'sopa', 'salsa'], u: 'g', fb: [800, 1350], a: 'Granos y pastas', t: ['frijoles'], p: 1 },
  lentejas:     { n: 'Lentejas', e: '🫘', s: 'lentejas', lead: ['lenteja'], inc: ['lenteja'], exc: ['sopa', 'lata'], u: 'g', fb: [400, 950], a: 'Granos y pastas', t: ['lentejas'], p: 1 },
  spaghetti:    { n: 'Spaghetti', e: '🍝', s: 'spaghetti', lead: ['pasta', 'spaghetti', 'spaguetti'], inc: ['spaghetti'], exc: ['salsa', 'lata', 'sazonador', 'integral'], u: 'g', fb: [400, 750], a: 'Granos y pastas', al: ['gluten'], p: 1 },
  pasta_corta:  { n: 'Pasta corta (coditos)', e: '🍝', s: 'coditos', lead: ['pasta'], inc: ['codito'], exc: ['salsa', 'integral'], u: 'g', fb: [400, 750], a: 'Granos y pastas', al: ['gluten'], p: 1 },
  avena:        { n: 'Avena en hojuelas', e: '🥣', s: 'avena', lead: ['avena'], inc: ['avena'], exc: ['bebida', 'galleta', 'leche', 'barra', 'cereal', 'proteina', 'sabor', 'molida', 'integral', 'manzana', 'fresa', 'miel', 'linaza'], u: 'g', fb: [400, 1250], a: 'Granos y pastas', al: ['gluten'], p: 1 },
  harina:       { n: 'Harina de trigo', e: '🌾', s: 'harina de trigo', lead: ['harina'], inc: ['harina', 'trigo'], exc: ['integral', 'tortilla', 'pan', 'pizza'], u: 'g', fb: [1000, 950], a: 'Granos y pastas', al: ['gluten'], p: 1 },

  // Panadería y tortillas
  pan:          { n: 'Pan cuadrado blanco', e: '🍞', s: 'pan blanco', lead: ['pan'], inc: ['pan', 'cuadrado'], exc: ['rallado', 'molido', 'harina', 'dulce', 'hamburguesa', 'hot dog', 'perro', 'integral', 'tostado', 'pita'], u: 'g', fb: [550, 1850], a: 'Panadería y tortillas', al: ['gluten'] },
  pan_hamb:     { n: 'Pan de hamburguesa', e: '🍔', s: 'pan hamburguesa', lead: ['pan'], inc: ['pan', 'hamburguesa'], exc: [], u: 'un', per: 60, fb: [8, 1600], a: 'Panadería y tortillas', al: ['gluten'] },
  tortillas:    { n: 'Tortillas de maíz', e: '🫓', s: 'tortilla maiz', lead: ['tortilla'], inc: ['tortilla'], exc: ['harina', 'chips', 'tostada', 'trigo'], u: 'un', per: 30, fb: [10, 850], a: 'Panadería y tortillas' },
  tortillas_h:  { n: 'Tortillas de harina', e: '🫓', s: 'tortilla harina', lead: ['tortilla'], inc: ['tortilla', 'harina'], exc: ['maiz', 'chips'], u: 'un', per: 40, fb: [10, 1400], a: 'Panadería y tortillas', al: ['gluten'] },

  // Lácteos y huevos
  huevos:       { n: 'Huevos', e: '🥚', s: 'huevo', lead: ['huevo'], inc: ['huevo', 'gallina'], exc: ['codorniz', 'liquido', 'omega'], u: 'un', per: 50, fb: [30, 2300], a: 'Lácteos y huevos', al: ['huevo'], t: ['huevo'], p: 1 },
  leche:        { n: 'Leche entera', e: '🥛', s: 'leche entera', lead: ['leche'], inc: ['leche'], exc: ['polvo', 'condensada', 'evaporada', 'chocolate', 'almendra', 'coco', 'soya', 'avena', 'fresa', 'formula', 'arroz', 'cabra', 'semidescremada', 'descremada'], u: 'ml', fb: [1000, 950], a: 'Lácteos y huevos', al: ['lacteos'], p: 1 },
  natilla:      { n: 'Natilla', e: '🥛', s: 'natilla', lead: ['natilla'], inc: ['natilla'], exc: ['light'], u: 'g', fb: [400, 1150], a: 'Lácteos y huevos', al: ['lacteos'], t: ['natilla'] },
  queso:        { n: 'Queso Turrialba', e: '🧀', s: 'queso turrialba', lead: ['queso'], inc: ['queso', 'turrialba'], exc: ['rallado'], u: 'g', fb: [500, 2900], a: 'Lácteos y huevos', al: ['lacteos'], t: ['queso'] },
  mozzarella:   { n: 'Queso mozzarella', e: '🧀', s: 'queso mozzarella', lead: ['queso'], inc: ['queso', 'mozzarella'], exc: ['palitos', 'bufala'], u: 'g', fb: [400, 2800], a: 'Lácteos y huevos', al: ['lacteos'], t: ['queso'] },
  mantequilla:  { n: 'Mantequilla', e: '🧈', s: 'mantequilla', lead: ['mantequilla'], inc: ['mantequilla'], exc: ['mani', 'pistacho', 'almendra', 'mara', 'clarificada', 'ghee', 'galleta', 'cacahuate'], u: 'g', fb: [250, 1850], a: 'Lácteos y huevos', al: ['lacteos'], p: 1 },
  yogurt:       { n: 'Yogurt natural', e: '🥛', s: 'yogurt natural', lead: ['yogurt'], inc: ['yogurt', 'natural'], exc: ['griego', 'bebible', 'liquido', 'light'], u: 'g', fb: [1000, 2100], a: 'Lácteos y huevos', al: ['lacteos'] },

  // Carnes y pescado
  pechuga:      { n: 'Pechuga de pollo', e: '🍗', s: 'pechuga de pollo', lead: ['pechuga'], inc: ['pechuga'], exc: ['empanizad', 'nugget', 'jamon', 'ahumad', 'pavo', 'deli', 'rebanad'], u: 'g', fb: [1000, 2250], a: 'Carnes y pescado', t: ['pollo'] },
  muslo:        { n: 'Muslo de pollo', e: '🍗', s: 'muslo de pollo', lead: ['muslo'], inc: ['muslo'], exc: ['empanizad', 'pavo'], u: 'g', fb: [1000, 1650], a: 'Carnes y pescado', t: ['pollo'] },
  carne_molida: { n: 'Carne molida de res', e: '🥩', s: 'carne molida', lead: ['carne'], inc: ['molida'], exc: ['cerdo', 'pollo', 'pavo', 'soya'], u: 'g', fb: [1000, 5300], a: 'Carnes y pescado', t: ['res'] },
  posta:        { n: 'Bistec de res', e: '🥩', s: 'bistec de res', lead: ['bistec'], inc: ['bistec', 'res'], exc: ['higado', 'cerdo', 'marinad', 'encebollad', 'criollo', 'pollo', 'sabor'], u: 'g', fb: [1000, 5700], a: 'Carnes y pescado', t: ['res'] },
  chuleta:      { n: 'Chuleta de cerdo', e: '🥩', s: 'chuleta de cerdo', lead: ['chuleta'], inc: ['chuleta'], exc: ['ahumad', 'res', 'mostaza', 'marinad', 'miel'], u: 'g', fb: [1000, 2800], a: 'Carnes y pescado', t: ['cerdo'] },
  salchichas:   { n: 'Salchichas', e: '🌭', s: 'salchicha', lead: ['salchicha'], inc: ['salchicha'], exc: ['perro', 'gato', 'mascota', 'vegan'], u: 'g', fb: [450, 1900], a: 'Carnes y pescado', t: ['embutidos'] },
  jamon:        { n: 'Jamón', e: '🥓', s: 'jamon', lead: ['jamon'], inc: ['jamon'], exc: ['pavo', 'serrano', 'pizza', 'espiral'], u: 'g', fb: [250, 1550], a: 'Carnes y pescado', t: ['embutidos', 'cerdo'] },
  tilapia:      { n: 'Filete de tilapia', e: '🐟', s: 'filete tilapia', lead: ['tilapia', 'filete'], inc: ['tilapia'], exc: ['empanizad', 'pancita', 'dorado', 'entera'], u: 'g', fb: [1000, 6200], a: 'Carnes y pescado', al: ['pescado'], t: ['pescado'] },

  // Enlatados
  atun:         { n: 'Atún en lata', e: '🐟', s: 'atun', lead: ['atun'], inc: ['atun'], exc: ['salsa', 'ensalada', 'oregano', 'galleta', 'pate', 'vegetal', 'chipotle', 'picante', 'jalapeno', 'limon'], u: 'un', per: 140, fb: [1, 1150], a: 'Enlatados', al: ['pescado'], t: ['pescado'], p: 1 },
  sardinas:     { n: 'Sardinas en salsa de tomate', e: '🐟', s: 'sardinas tomate', lead: ['sardina'], inc: ['sardina'], exc: ['picante'], u: 'un', per: 155, fb: [1, 750], a: 'Enlatados', al: ['pescado'], t: ['pescado'], p: 1 },
  salsa_tomate: { n: 'Salsa de tomate para pasta', e: '🥫', s: 'salsa para pasta', lead: ['salsa'], inc: ['salsa'], exc: ['ketchup', 'soya', 'picante', 'lizano', 'inglesa', 'bbq', 'queso'], any: ['spag', 'pasta', 'tomate', 'napol', 'pomodoro'], u: 'g', fb: [400, 1000], a: 'Enlatados', t: ['tomate'], p: 1 },

  // Congelados
  vegetales:    { n: 'Vegetales mixtos congelados', e: '🥕', s: 'vegetales mixtos', lead: ['vegetal', 'mezcla'], inc: ['vegetal'], exc: ['sopa', 'caldo', 'consome'], u: 'g', fb: [500, 1350], a: 'Congelados', p: 1 },

  // Frutas y verduras
  papa:         { n: 'Papa', e: '🥔', s: 'papa', lead: ['papa'], inc: ['papa'], exc: ['tostada', 'chips', 'frita', 'papaya', 'congelad', 'pure', 'snack', 'ondulada', 'pringles', 'hash', 'gajo'], u: 'g', fb: [1000, 650], a: 'Frutas y verduras', p: 1 },
  yuca:         { n: 'Yuca', e: '🥔', s: 'yuca', lead: ['yuca'], inc: ['yuca'], exc: ['congelad', 'frita', 'harina', 'chips', 'especie'], u: 'g', fb: [1000, 950], a: 'Frutas y verduras', t: ['yuca'] },
  zanahoria:    { n: 'Zanahoria', e: '🥕', s: 'zanahoria', lead: ['zanahoria'], inc: ['zanahoria'], exc: ['jugo', 'baby', 'rallada', 'rodaja', 'congelad'], u: 'g', fb: [1000, 720], a: 'Frutas y verduras', p: 1 },
  cebolla:      { n: 'Cebolla', e: '🧅', s: 'cebolla', lead: ['cebolla'], inc: ['cebolla'], exc: ['polvo', 'morada', 'molida', 'picada', 'escama', 'deshidratad', 'encurtid'], u: 'g', fb: [1000, 960], a: 'Frutas y verduras', t: ['cebolla'], p: 1 },
  chile:        { n: 'Chile dulce', e: '🫑', s: 'chile dulce', lead: ['chile'], inc: ['chile', 'dulce'], exc: ['salsa', 'picante', 'jalea', 'entero', 'frasco', 'roland'], u: 'un', per: 150, fb: [1, 760], a: 'Frutas y verduras', t: ['chile dulce'], p: 1 },
  tomate:       { n: 'Tomate', e: '🍅', s: 'tomate', lead: ['tomate'], inc: ['tomate'], exc: ['salsa', 'pasta', 'ketchup', 'lata', 'enlatad', 'pure', 'jugo', 'cherry', 'pelado', 'trocito', 'cubetead', 'perita', 'entero', 'cecco', 'arcor', 'cirio', 'sopa'], u: 'g', fb: [1000, 1900], a: 'Frutas y verduras', t: ['tomate'] },
  ajo:          { n: 'Ajo', e: '🧄', s: 'ajo', lead: ['ajo'], inc: ['ajo'], exc: ['polvo', 'molido', 'puro', 'picado', 'granulado', 'perejil', 'aceite'], u: 'g', per: 40, fb: [100, 700], a: 'Frutas y verduras', p: 1 },
  culantro:     { n: 'Culantro', e: '🌿', s: 'culantro', lead: ['culantro'], inc: ['culantro'], exc: ['seco', 'molido', 'castilla'], u: 'un', per: 40, fb: [1, 150], a: 'Frutas y verduras', t: ['culantro'] },
  limon:        { n: 'Limón mandarina', e: '🍋', s: 'limon', lead: ['limon'], inc: ['limon'], exc: ['jugo'], u: 'un', per: 50, fb: [8, 470], a: 'Frutas y verduras', p: 1 },
  repollo:      { n: 'Repollo', e: '🥬', s: 'repollo', lead: ['repollo'], inc: ['repollo'], exc: ['ensalada', 'morado'], u: 'un', per: 1200, fb: [1, 950], a: 'Frutas y verduras', t: ['repollo'] },
  lechuga:      { n: 'Lechuga', e: '🥬', s: 'lechuga', lead: ['lechuga'], inc: ['lechuga'], exc: ['mix', 'ensalada'], u: 'un', per: 350, fb: [1, 200], a: 'Frutas y verduras' },
  pepino:       { n: 'Pepino', e: '🥒', s: 'pepino', lead: ['pepino'], inc: ['pepino'], exc: ['encurtid', 'rodaja', 'rebanad'], u: 'un', per: 300, fb: [1, 330], a: 'Frutas y verduras', t: ['pepino'] },
  aguacate:     { n: 'Aguacate', e: '🥑', s: 'aguacate', lead: ['aguacate'], inc: ['aguacate'], exc: ['guacamole', 'aceite', 'salsa'], u: 'un', per: 220, fb: [1, 750], a: 'Frutas y verduras', t: ['aguacate'] },
  platano:      { n: 'Plátano maduro', e: '🍌', s: 'platano maduro', lead: ['platano'], inc: ['platano'], exc: ['chips', 'tostado', 'tajada', 'harina', 'patacon', 'congelad', 'verde', 'frito', 'snack'], u: 'un', per: 250, fb: [1, 330], a: 'Frutas y verduras', t: ['platano'] },
  banano:       { n: 'Banano', e: '🍌', s: 'banano', lead: ['banano'], inc: ['banano'], exc: ['chips', 'deshidratad', 'pan', 'barra', 'yogurt', 'bebida', 'papilla'], u: 'un', per: 130, fb: [8, 750], a: 'Frutas y verduras' },
  papaya:       { n: 'Papaya', e: '🍈', s: 'papaya', lead: ['papaya'], inc: ['papaya'], exc: ['jugo', 'deshidratad', 'crema', 'jabon'], u: 'g', fb: [1000, 950], a: 'Frutas y verduras' },
  chayote:      { n: 'Chayote', e: '🥒', s: 'chayote', lead: ['chayote'], inc: ['chayote'], exc: [], u: 'un', per: 350, fb: [1, 330], a: 'Frutas y verduras', t: ['chayote'] },
  elote:        { n: 'Elote', e: '🌽', s: 'elote', lead: ['elote'], inc: ['elote'], exc: ['lata', 'grano', 'baby', 'mini', 'crema', 'congelad'], u: 'un', per: 280, fb: [1, 420], a: 'Frutas y verduras', t: ['elote'] },
  vainica:      { n: 'Vainica', e: '🫛', s: 'vainica', lead: ['vainica'], inc: ['vainica'], exc: ['lata', 'congelad'], u: 'g', fb: [500, 1050], a: 'Frutas y verduras', t: ['vainica'] },

  // Condimentos y salsas
  lizano:       { n: 'Salsa Lizano', e: '🫙', s: 'salsa lizano', lead: ['salsa'], inc: ['lizano'], exc: ['picante', 'criolla', 'rosada', 'vegetales', 'tabasco', 'chilera', 'mayonesa'], u: 'ml', fb: [700, 2300], a: 'Condimentos y salsas', p: 1 },
  soya:         { n: 'Salsa de soya', e: '🫙', s: 'salsa de soya', lead: ['salsa'], inc: ['soya'], exc: ['leche', 'bebida', 'aceite', 'proteina', 'carne'], u: 'ml', fb: [150, 950], a: 'Condimentos y salsas', al: ['soya', 'gluten'], p: 1 },
  consome:      { n: 'Consomé de pollo', e: '🧂', s: 'consome de pollo', lead: ['consome'], inc: ['consome'], exc: ['res', 'camaron', 'vegetal'], u: 'g', fb: [100, 800], a: 'Condimentos y salsas', p: 1 },
  achiote:      { n: 'Achiote', e: '🧂', s: 'achiote', lead: ['achiote'], inc: ['achiote'], exc: ['arroz'], u: 'g', fb: [100, 650], a: 'Condimentos y salsas', p: 1 },
  oregano:      { n: 'Orégano', e: '🌿', s: 'oregano', lead: ['oregano'], inc: ['oregano'], exc: ['salsa', 'aceite', 'galleta'], u: 'g', fb: [15, 650], a: 'Condimentos y salsas', p: 1 },
  mayonesa:     { n: 'Mayonesa', e: '🫙', s: 'mayonesa', lead: ['mayonesa'], inc: ['mayonesa'], exc: ['lizano', 'chipotle', 'ajo', 'picante', 'light', 'vegana'], u: 'g', fb: [400, 1650], a: 'Condimentos y salsas', al: ['huevo'], p: 1 },

  // Aceites y básicos
  aceite:       { n: 'Aceite vegetal', e: '🫗', s: 'aceite vegetal', lead: ['aceite'], inc: ['aceite'], exc: ['oliva', 'motor', 'coco', 'bebe', 'cuerpo', 'spray', 'aerosol', 'ajonjoli', 'atun', 'sardina', 'cabello', 'masaje'], u: 'ml', fb: [1500, 1650], a: 'Aceites y básicos', p: 1 },
  azucar:       { n: 'Azúcar', e: '🍬', s: 'azucar', lead: ['azucar'], inc: ['azucar'], exc: ['sin azucar', 'galleta', 'glas', 'morena', 'splenda', 'sustituto', 'bebida', 'cereal', 'refresco', 'confite'], u: 'g', fb: [2000, 1850], a: 'Aceites y básicos', p: 1 },
};

// Etiquetas que el usuario puede marcar como "no me gusta"
export const DISLIKE_TAGS = [
  ['pollo', '🍗'], ['res', '🥩'], ['cerdo', '🥓'], ['pescado', '🐟'], ['embutidos', '🌭'], ['huevo', '🥚'],
  ['frijoles', '🫘'], ['lentejas', '🫘'], ['queso', '🧀'], ['natilla', '🥛'], ['cebolla', '🧅'], ['chile dulce', '🫑'],
  ['tomate', '🍅'], ['culantro', '🌿'], ['chayote', '🥒'], ['vainica', '🫛'], ['yuca', '🥔'], ['platano', '🍌'],
  ['aguacate', '🥑'], ['pepino', '🥒'], ['repollo', '🥬'], ['elote', '🌽'],
];

export const ALLERGENS = [
  ['gluten', 'Gluten (trigo)', '🌾'], ['lacteos', 'Lácteos', '🥛'], ['huevo', 'Huevo', '🥚'],
  ['pescado', 'Pescado', '🐟'], ['soya', 'Soya', '🫘'],
];

export const APPLIANCES = [
  ['estufa', 'Estufa', '🔥'], ['horno', 'Horno', '♨️'], ['freidora', 'Freidora de aire', '💨'], ['microondas', 'Microondas', '📦'],
];

export function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
