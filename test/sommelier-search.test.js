const test = require('node:test');
const assert = require('node:assert/strict');
const wines = require('../data/catalog.json');
const search = require('../public/sommelier-search.js');

test('uses the complete local catalog and searches exact or partial names', () => {
  assert.equal(wines.length, 633);
  const exact = search.search('H. STAGNARI TANNAT VIEJO', wines);
  assert.ok(exact.wines.some(w => w.id === 'excel-1'));
  assert.ok(search.search('STAGNARI', wines).total > 0);
});

test('distinguishes a strict price ceiling from an inclusive ceiling', () => {
  const less = search.search('menos de USD 18', wines);
  const upto = search.search('hasta USD 18', wines);
  assert.ok(less.wines.length && upto.wines.length);
  assert.ok(less.wines.every(w => typeof w.price === 'number' && w.price < 18));
  assert.ok(upto.wines.every(w => typeof w.price === 'number' && w.price <= 18));
  assert.ok(upto.total >= less.total);
  assert.equal(search.search('entre 15 y 25 dólares', wines).wines.every(w => w.price >= 15 && w.price <= 25), true);
});

test('understands Spanish, Brazilian Portuguese, grapes, countries and styles', () => {
  for (const [query, predicate] of [
    ['Tannat uruguayo hasta USD 30', w => /tannat/i.test(w.grape||'') && /uruguai/i.test(w.country||'') && w.price <= 30],
    ['Vinhos brancos até 20 dólares', w => w.type === 'Blanco' && w.price <= 20],
    ['Quiero un Tannat de Uruguay', w => /tannat/i.test(w.grape||'') && /uruguai/i.test(w.country||'')]
  ]) {
    const result = search.search(query, wines);
    assert.ok(result.total > 0, `${query} should find catalog results`);
    assert.ok(result.wines.every(predicate), `${query} should apply every extracted constraint`);
  }
});

test('price rankings skip missing prices and return the true catalog extrema', () => {
  const priced = wines.filter(w => typeof w.price === 'number');
  const highest = Math.max(...priced.map(w => w.price));
  const lowest = Math.min(...priced.map(w => w.price));
  const expensive = search.search('¿Cuál es el vino más caro?', wines);
  const expensiveAvailable = search.search('¿Cuál es el vino más caro disponible?', wines);
  const cheapest = search.search('¿Cuál es el vino más barato?', wines);
  assert.ok(expensive.total > 0 && expensive.wines.every(w => w.price === highest));
  assert.ok(expensiveAvailable.wines.every(w => w.price === highest));
  assert.ok(cheapest.total > 0 && cheapest.wines.every(w => w.price === lowest));
  assert.equal(search.search('menos de USD 10000', wines).total, priced.length);
  assert.equal(search.search('hasta US$ 1.300', wines).total, priced.length);
  const threeBudget = search.search('3 opciones económicas para regalar', wines);
  assert.equal(threeBudget.wines.length, 3);
  assert.ok(threeBudget.wines.every(w => typeof w.price === 'number'));
});

test('FAQs run the real catalog search and never claim current stock', () => {
  assert.equal(search.faqs.length, 10);
  for (const [,query] of search.faqs) {
    const result = search.search(query, wines);
    assert.ok(Array.isArray(result.wines));
    assert.ok(result.total >= result.wines.length);
  }
  assert.match(search.search('vinos uruguayos', wines).intro, /disponibilidad actual/i);
  assert.match(search.search('vino suave', wines).intro, /no incluye información suficiente/i);
  assert.match(search.search('vino para pastas', wines).intro, /no incluye información suficiente/i);
  assert.match(search.search('un vino para acompañar carne', wines).intro, /no incluye información suficiente/i);
  assert.match(search.search('una palabra inexistente xyzqv', wines).intro, /No encontramos/i);
});

test('similar wine action returns cheaper wines sharing recorded grape or style', () => {
  const reference = wines.find(w => w.grape && w.type && typeof w.price === 'number');
  const result = search.search('vino parecido más barato', wines, {reference});
  assert.ok(result.wines.length > 0);
  assert.ok(result.wines.every(w => w.price < reference.price && (w.grape === reference.grape || w.type === reference.type)));
  assert.ok(search.search('algo parecido a este vino, pero más económico', wines, {reference}).total > 0);
  assert.match(search.search('vinos parecidos', wines).intro, /primero elegí una botella/i);
});

test('follow-up queries keep relevant prior filters', () => {
  const first = search.search('tinto hasta USD 30', wines);
  const next = search.search('solo uruguayos', wines, {filters:first.parsed.filters});
  assert.ok(next.total > 0);
  assert.ok(next.wines.every(w => w.type === 'Tinto' && /uruguai/i.test(w.country||'') && w.price <= 30));
});
