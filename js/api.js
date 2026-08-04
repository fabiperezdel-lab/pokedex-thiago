// Llamadas a PokéAPI con caché local (IndexedDB) para no repetir peticiones.
const PokedexAPI = (() => {
  const BASE = 'https://pokeapi.co/api/v2';

  async function fetchJSON(url) {
    const cached = await PokedexStorage.cacheGet(url);
    if (cached) return cached;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Error al pedir ${url}: ${res.status}`);
    const data = await res.json();
    await PokedexStorage.cacheSet(url, data);
    return data;
  }

  function getPokemonList(limit = 151, offset = 0) {
    return fetchJSON(`${BASE}/pokemon?limit=${limit}&offset=${offset}`);
  }

  function getPokemonDetail(idOrName) {
    return fetchJSON(`${BASE}/pokemon/${idOrName}`);
  }

  function getSpecies(idOrName) {
    return fetchJSON(`${BASE}/pokemon-species/${idOrName}`);
  }

  function getSpanishFlavorText(species) {
    if (!species || !species.flavor_text_entries) return '';
    const entries = species.flavor_text_entries;
    const es = entries.find(e => e.language.name === 'es');
    const en = entries.find(e => e.language.name === 'en');
    const chosen = es || en;
    if (!chosen) return '';
    return chosen.flavor_text.replace(/[\f\n\r]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Trae el detalle de los primeros `limit` Pokémon, en tandas para no saturar la red.
  async function getAllPokemonDetails(limit = 1025, onProgress) {
    const list = await getPokemonList(limit, 0);
    const ids = list.results.map((_, i) => i + 1);
    const batchSize = 40;
    const details = [];
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(id => getPokemonDetail(id)));
      details.push(...batchResults);
      if (onProgress) onProgress(details.length, ids.length);
    }
    details.sort((a, b) => a.id - b.id);
    return details;
  }

  return {
    getPokemonList,
    getPokemonDetail,
    getSpecies,
    getSpanishFlavorText,
    getAllPokemonDetails,
  };
})();
