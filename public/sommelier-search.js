/* Local, deterministic wine search. Uses only fields present in the imported catalog. */
(function (root) {
  const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').replace(/[^a-z0-9$.,]+/g, ' ').trim();
  const countryAliases = {uruguay:['uruguay','uruguai','uruguayo','uruguaya','uruguayos','uruguayas'], espana:['espana','espanha','spain','espanol','espanola','espanoles','espanolas'], francia:['francia','franca','frances','francesa'], portugal:['portugal','portugues','portuguesa'], chile:['chile','chileno','chilena'], argentina:['argentina','argentino','argentina'], italia:['italia','italiano','italiana'], 'estados unidos':['estados unidos','usa','eeuu','americano','americana']};
  const typeAliases = {tinto:['tinto','tintos','red','reds'], blanco:['blanco','blancos','white','branco','brancos'], rosado:['rosado','rosados','rose','roses'], espumante:['espumante','espumosos','espumoso','sparkling','champagne','prosecco'], dulce:['dulce','dulces','sweet','sobremesa','postre']};
  const grapes = ['tannat','tempranillo','garnacha','verdejo','glera','pinot noir','touriga franca','touriga nacional','cabernet sauvignon','syrah','marsanne','merlot','sauvignon blanc','chardonnay','carmenere','blend','cabernet franc','pais','malbec','albarino','riesling','gewurztraminer','pinot gris','sangiovese','moscatel','viognier','corvina','nebbiolo','shiraz'];
  const readPrice = text => {
    const clean = text.replace(/\b(\d{1,3})\.(\d{3}),([0-9]{1,2})\b/g, '$1$2.$3').replace(/\b(\d{1,3})\.(\d{3})\b/g, '$1$2').replace(/\b(\d{1,3}),(\d{3})\b/g, '$1$2').replace(/,(\d{1,2})\b/g, '.$1');
    return [...clean.matchAll(/\d+(?:\.\d{1,2})?/g)].map(m => Number(m[0])).filter(Number.isFinite);
  };
  function parse(query, catalog = [], context = {}) {
    const raw = String(query || ''), q = normalize(raw), filters = { ...(context.filters || {}) };
    delete filters.sort; delete filters.extreme; delete filters.limit;
    if (!/\b(?:parecido|parecidos|similar|similares|similaridade)\b/.test(q)) delete filters.needsReference;
    let min = filters.min ?? null, max = filters.max ?? null, minExclusive = !!filters.minExclusive, maxExclusive = !!filters.maxExclusive;
    let sort = null, extreme = null;
    const priceMatch = raw.match(/(?:entre|between|de|from)\s*(?:us\$?|usd|\$)?\s*([\d.,]+)\s*(?:y|e|a|and|to|-)\s*(?:us\$?|usd|\$)?\s*([\d.,]+)/i);
    if (priceMatch) { const pair = readPrice(`${priceMatch[1]} ${priceMatch[2]}`); if (pair.length >= 2) { min = Math.min(...pair); max = Math.max(...pair); minExclusive = maxExclusive = false; } }
    else {
      const amount = /(?:menos\s+de|less\s+than|under|abaixo\s+de)\s*(?:us\$?|usd|\$)?\s*([\d.,]+)|(?:hasta|hasta\s+un|ate|até|up\s+to|no\s+more\s+than)\s*(?:us\$?|usd|\$)?\s*([\d.,]+)/i.exec(raw);
      if (amount) { const n = readPrice(amount[1] || amount[2])[0]; if (Number.isFinite(n)) { max = n; maxExclusive = !!amount[1]; } }
      else if (/\b(?:mas caro|mais caro|most expensive|el mas costoso)\b/.test(q)) { sort = 'desc'; extreme = 'desc'; }
      else if (/\b(?:mas barato|mais barato|cheapest|el mas economico)\b/.test(q)) { sort = 'asc'; extreme = 'asc'; }
      else if (/\b(?:economico|economica|economicos|economicas|cheaper)\b/.test(q)) sort = 'asc';
    }
    if (min != null) filters.min = min; if (max != null) filters.max = max;
    if (min != null) filters.minExclusive = minExclusive; if (max != null) filters.maxExclusive = maxExclusive;
    if (sort) filters.sort = sort;
    if (extreme) filters.extreme = extreme;
    const limit = /\b(\d+)\s+(?:opciones|vinos|opcoes|vinhos)\b/.exec(q);
    if (limit) filters.limit = Math.max(1, Math.min(8, Number(limit[1])));
    for (const [canonical, aliases] of Object.entries(typeAliases)) if (aliases.some(a => q.includes(normalize(a)))) filters.type = canonical;
    for (const [canonical, aliases] of Object.entries(countryAliases)) if (aliases.some(a => q.includes(normalize(a)))) filters.country = canonical;
    const grapeList = [...new Set([...grapes, ...catalog.flatMap(w => String(w.grape || '').split(/[,;|+&/]+/))].map(normalize).filter(g => g.length > 2))].sort((a,b)=>b.length-a.length);
    for (const grape of grapeList) if (q.includes(grape)) { filters.grape = grape; break; }
    const producers = [...new Set(catalog.map(w => w.producer).filter(Boolean))].sort((a,b)=>String(b).length-String(a).length);
    for (const producer of producers) if (q.includes(normalize(producer))) filters.producer = normalize(producer);
    const countries = [...new Set(catalog.map(w => w.country).filter(Boolean))];
    for (const country of countries) { const n = normalize(country), aliases = countryAliases[n] || Object.values(countryAliases).find(list => list.includes(n)) || []; if (q.includes(n) || aliases.some(a => q.includes(normalize(a)))) filters.country = n; }
    if (/\b(?:asado|churrasco|barbecue|parrilla)\b/.test(q)) filters.type = 'tinto';
    if (/\b(?:pasta|pastas|queso|queijos|pescado|peixe|carne|carnes)\b/.test(q)) filters.food = true;
    if (/\b(?:parecido|parecidos|similar|similares|similaridade)\b/.test(q) && context.reference) {
      filters.similar = true;
      filters.referencePrice = typeof context.reference.price === 'number' ? context.reference.price : null;
      filters.referenceGrape = normalize(context.reference.grape);
      filters.referenceType = normalize(context.reference.type);
      filters.referenceProducer = normalize(context.reference.producer);
      if (/\b(?:otra bodega|otro productor|different winery|outra vinicola)\b/.test(q)) filters.otherProducer = true;
    } else if (/\b(?:parecido|parecidos|similar|similares|similaridade)\b/.test(q)) filters.needsReference = true;
    if (/\b(?:regalo|regalar|presente|presentear)\b/.test(q) && !sort) sort = 'desc';
    if (sort) { filters.sort = sort; delete filters.food; }
    const searchable = q.replace(/\b(?:menos de|hasta|ate|under|up to|between|entre|de|from|and|to|y|e|dolares|dolar|usd|us|asado|churrasco|barbecue|parrilla|pasta|pastas|queso|queijos|pescado|peixe|regalo|regalar|presente|presentear)\b/g, ' ').replace(/\d+(?:[.,]\d+)?/g, ' ').trim();
    const words = searchable.split(/\s+/).map(w=>w.replace(/[^a-z0-9]/g,'')).filter(w => w.length > 2 && !['vino','vinos','vinho','vinhos','quiero','busco','para','recomienda','recomendame','recomendas','mostrame','mostre','muestra','dame','por','con','algo','mas','mais','un','una','el','la','los','las','del','solo','solamente','apenas','me','uno','que','cual','tinto','tintos','blanco','blancos','branco','brancos','rosado','rosados','espumante','espumoso','espumosos','dulce','dulces','caro','cara','barato','barata','economico','economica','economicos','economicas','expensive','cheapest','cheaper','costoso','costosa','costosos','costosas','uruguayo','uruguaya','uruguayos','uruguayas','espanol','espanola','espanoles','espanolas','frances','francesa','portugues','portuguesa','chileno','chilena','argentino','argentina','italiano','italiana','opcion','opciones','parecido','parecidos','similar','similares','similaridade','este','esta','esto','otro','otra','otros','otras','bodega','productor','vinicola','pero','disponible','disponibles','available','red','reds','white','rose'].includes(w));
    return {filters, words, sort: filters.sort || null, extreme:filters.extreme||null, limit:filters.limit||8, normalized:q};
  }
  const price = w => typeof w.price === 'number' && Number.isFinite(w.price) ? w.price : null;
  function search(query, catalog, context = {}) {
    const parsed = parse(query, catalog, context), f = parsed.filters;
    let wines = catalog.filter(w => {
      if (f.needsReference) return false;
      if (f.type && normalize(w.type) !== normalize(f.type)) return false;
      if (f.country && normalize(w.country) !== f.country) return false;
      if (f.grape && !String(w.grape || '').split(/[,;|+&/]+/).some(g => normalize(g) === f.grape)) return false;
      if (f.producer && normalize(w.producer) !== f.producer) return false;
      if (f.food && !/\b(?:asado|churrasco|parrilla|pasta|pastas|queso|queijos|pescado|peixe|carne|maridaje)\b/i.test(String(w.description || ''))) return false;
      const p = price(w);
      if (f.similar && (f.referencePrice == null || p == null || p >= f.referencePrice || !((f.referenceGrape && String(w.grape||'').split(/[,;|+&/]+/).some(g => normalize(g) === f.referenceGrape)) || (f.referenceType && normalize(w.type) === f.referenceType)) || (f.otherProducer && f.referenceProducer && normalize(w.producer) === f.referenceProducer))) return false;
      if ((f.min != null || f.max != null) && p == null) return false;
      if (f.min != null && (f.minExclusive ? p <= f.min : p < f.min)) return false;
      if (f.max != null && (f.maxExclusive ? p >= f.max : p > f.max)) return false;
      if (parsed.words.length) {
        const haystack = normalize([w.name,w.producer,w.country,w.region,w.grape,w.type,w.description].filter(Boolean).join(' '));
        if (!parsed.words.some(word => haystack.includes(word) || (word.length >= 5 && haystack.split(' ').some(t => t.startsWith(word.slice(0, Math.max(4, word.length-1))))))) return false;
      }
      return true;
    });
    if (parsed.sort) {
      wines = wines.filter(w => price(w) != null).sort((a,b) => parsed.sort === 'desc' ? price(b)-price(a) : price(a)-price(b));
      if(parsed.extreme){const extremePrice=wines[0]&&price(wines[0]);wines=wines.filter(w=>price(w)===extremePrice)}
    }
    else wines.sort((a,b) => Number(price(b)!=null)-Number(price(a)!=null) || (price(a) ?? Infinity)-(price(b) ?? Infinity) || String(a.name).localeCompare(String(b.name)));
    const limited = wines.slice(0, parsed.limit);
    const hasBudget = f.min != null || f.max != null;
    let intro = '';
    if (!limited.length) {
      const missingStyle = /\b(?:suave|suaves|soft|smooth|intenso|intensa|frutal|frutales|afrutado|afrutados|seco|seca|dry|asado|churrasco|barbecue|parrilla|pastas?|pasta|queso|queijos|pescado|peixe|carne|carnes)\b/.test(parsed.normalized);
      intro = /\b(?:parecido|parecidos|similar|similares)\b/.test(parsed.normalized) ? 'Para buscar un vino parecido, primero elegí una botella del catálogo y usá su ficha.' : missingStyle ? 'El catálogo no incluye información suficiente para verificar ese perfil o maridaje. Probá con tipo, uva, país o presupuesto.' : 'No encontramos vinos que coincidan. Probá quitar un filtro o ampliar el presupuesto.';
    } else if (f.similar) intro = `Opciones de precio inferior a la botella de referencia, con coincidencia en uva o estilo. El catálogo no confirma stock actual.`;
    else if (f.sort === 'desc' && /\b(?:regalo|regalar|presente|presentear)\b/.test(parsed.normalized)) intro = 'Te muestro opciones de mayor precio como ideas para regalo; el catálogo no las clasifica específicamente como vinos para regalar.';
    else if (f.sort === 'desc') intro = `Estos son los vinos de mayor precio registrado (${moneyLabel(price(limited[0]))}). El catálogo no confirma stock actual.`;
    else if (f.sort === 'asc') intro = `Estos son los vinos con menor precio registrado (${moneyLabel(price(limited[0]))}). El catálogo no confirma stock actual.`;
    else if (/\b(?:asado|churrasco|barbecue|parrilla)\b/.test(parsed.normalized)) intro = `Te muestro vinos tintos${hasBudget?' dentro del presupuesto indicado':''} como punto de partida para un asado; el catálogo no publica maridajes. Consultá en tienda la disponibilidad.`;
    else if (hasBudget) intro = `Encontré ${wines.length} opción${wines.length===1?'':'es'} con precio dentro del rango indicado. El catálogo no confirma stock actual.`;
    else if (f.food) intro = `Encontré ${wines.length} vino${wines.length===1?'':'s'} con maridaje descrito en el catálogo.`;
    else if (f.type || f.grape || f.country || f.producer) intro = `Encontré ${wines.length} vino${wines.length===1?'':'s'} con esos datos en el catálogo. Consultá en tienda la disponibilidad actual.`;
    else intro = 'Buscá por nombre, uva, estilo, país o presupuesto.';
    return {wines:limited, total:wines.length, parsed, intro};
  }
  function moneyLabel(n) { return `USD ${Number(n).toFixed(2).replace(/\.00$/,'')}`; }
  const faqs = [
    ['¿Qué vino recomiendas para un asado?','Tinto asado'],
    ['¿Qué vino puedo comprar por menos de US$ 30?','menos de USD 30'],
    ['¿Cuál es el vino más caro?','el más caro'],
    ['¿Cuál es el vino más económico?','el más barato'],
    ['¿Qué vino recomiendas para regalar?','para regalar'],
    ['¿Qué vino combina con pastas?','vino para pastas'],
    ['¿Qué vinos uruguayos tienen en el catálogo?','vinos uruguayos'],
    ['¿Qué vinos tintos me recomiendas?','vinos tintos'],
    ['¿Qué vino suave me recomiendas?','vino suave'],
    ['¿Cómo encuentro un vino parecido a otro?','vinos parecidos']
  ];
  const api = {normalize, parse, search, faqs};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SommelierSearch = api;
})(typeof window !== 'undefined' ? window : globalThis);
