// Lógica principal: navegación entre pestañas, grid, búsqueda/filtro, detalle, favoritos.
(() => {
  const TYPE_ES = {
    normal: 'Normal', fire: 'Fuego', water: 'Agua', electric: 'Eléctrico',
    grass: 'Planta', ice: 'Hielo', fighting: 'Lucha', poison: 'Veneno',
    ground: 'Tierra', flying: 'Volador', psychic: 'Psíquico', bug: 'Bicho',
    rock: 'Roca', ghost: 'Fantasma', dragon: 'Dragón', dark: 'Siniestro',
    steel: 'Acero', fairy: 'Hada',
  };

  const STAT_ES = {
    hp: 'PS', attack: 'Ataque', defense: 'Defensa',
    'special-attack': 'At. Esp.', 'special-defense': 'Def. Esp.', speed: 'Velocidad',
  };

  const state = {
    allPokemon: [],
    favorites: new Map(),
    collection: new Map(),
    currentDetail: null,
  };

  // ---- Refs DOM ----
  const $ = (id) => document.getElementById(id);
  const loadingEl = $('loading');
  const loadingText = $('loading-text');
  const pokedexGrid = $('pokedex-grid');
  const pokedexEmpty = $('pokedex-empty');
  const favoritosGrid = $('favoritos-grid');
  const favoritosEmpty = $('favoritos-empty');
  const coleccionGrid = $('coleccion-grid');
  const counterFill = $('counter-bar-fill');
  const counterText = $('collection-counter-text');
  const searchInput = $('search-input');
  const typeFilter = $('type-filter');
  const photoInput = $('photo-input');
  const cryAudio = $('cry-audio');

  const modal = $('detail-modal');
  const modalClose = $('modal-close');
  const detailNumber = $('detail-number');
  const detailName = $('detail-name');
  const detailTypes = $('detail-types');
  const detailImage = $('detail-image');
  const detailSoundBtn = $('detail-sound-btn');
  const detailDescription = $('detail-description');
  const detailStats = $('detail-stats');
  const detailFavBtn = $('detail-fav-btn');
  const detailCollectBtn = $('detail-collect-btn');

  function capitalize(str) {
    return str.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function typeBadge(typeName) {
    const label = TYPE_ES[typeName] || capitalize(typeName);
    return `<span class="card-type-badge type-${typeName}">${label}</span>`;
  }

  // ---- Navegación entre pestañas ----
  function switchTab(tabName) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    $(`tab-${tabName}`).classList.add('active');
    document.querySelector(`.nav-btn[data-tab="${tabName}"]`).classList.add('active');

    if (tabName === 'favoritos') renderFavoritesGrid();
    if (tabName === 'coleccion') renderCollectionAlbum();
    if (tabName === 'quiz') PokedexQuiz.nextRound();
  }

  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // ---- Tarjetas ----
  function createCard(p) {
    const card = document.createElement('div');
    const mainType = p.types[0].type.name;
    card.className = `poke-card type-${mainType}`;
    card.dataset.id = p.id;

    const img = p.sprites?.other?.['official-artwork']?.front_default || p.sprites?.front_default || '';
    const isFav = state.favorites.has(p.id);
    const isCollected = state.collection.has(p.id);

    card.innerHTML = `
      ${isFav ? '<span class="card-badge-icon">❤️</span>' : ''}
      <p class="card-number">#${String(p.id).padStart(4, '0')}</p>
      <img src="${img}" alt="${p.name}" loading="lazy">
      <p class="card-name">${p.name}</p>
      <div class="card-types">${p.types.map(t => typeBadge(t.type.name)).join('')}</div>
      ${isCollected ? '<span class="card-badge-icon" style="left:auto;right:8px;">🎴</span>' : ''}
    `;
    card.addEventListener('click', () => openDetail(p));
    return card;
  }

  function renderGrid(container, list, emptyEl) {
    container.innerHTML = '';
    if (list.length === 0) {
      if (emptyEl) emptyEl.classList.remove('hidden');
      return;
    }
    if (emptyEl) emptyEl.classList.add('hidden');
    const fragment = document.createDocumentFragment();
    list.forEach(p => fragment.appendChild(createCard(p)));
    container.appendChild(fragment);
  }

  function applyFilters() {
    const q = searchInput.value.trim().toLowerCase();
    const type = typeFilter.value;
    const filtered = state.allPokemon.filter((p) => {
      const matchesQuery = !q || p.name.includes(q) || String(p.id) === q || String(p.id).padStart(4, '0') === q;
      const matchesType = !type || p.types.some(t => t.type.name === type);
      return matchesQuery && matchesType;
    });
    renderGrid(pokedexGrid, filtered, pokedexEmpty);
  }

  function renderFavoritesGrid() {
    renderGrid(favoritosGrid, [...state.favorites.values()], favoritosEmpty);
  }

  function renderCollectionAlbum() {
    PokedexColeccion.renderAlbum(coleccionGrid, counterFill, counterText, state.allPokemon, state.collection);
  }

  function populateTypeFilter() {
    const types = new Set();
    state.allPokemon.forEach(p => p.types.forEach(t => types.add(t.type.name)));
    [...types].sort().forEach((t) => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = TYPE_ES[t] || capitalize(t);
      typeFilter.appendChild(opt);
    });
  }

  // ---- Detalle ----
  async function openDetail(p) {
    state.currentDetail = p;
    detailNumber.textContent = `#${String(p.id).padStart(4, '0')}`;
    detailName.textContent = p.name;
    detailTypes.innerHTML = p.types.map(t => typeBadge(t.type.name)).join('');
    detailImage.src = p.sprites?.other?.['official-artwork']?.front_default || p.sprites?.front_default || '';
    detailDescription.textContent = 'Cargando descripción...';

    const maxStat = 180;
    detailStats.innerHTML = p.stats.map((s) => {
      const pct = Math.min(100, Math.round((s.base_stat / maxStat) * 100));
      const label = STAT_ES[s.stat.name] || capitalize(s.stat.name);
      return `
        <div class="stat-row">
          <span>${label}</span>
          <span class="stat-bar-bg"><span class="stat-bar-fill" style="width:${pct}%"></span></span>
          <span>${s.base_stat}</span>
        </div>`;
    }).join('');

    updateDetailButtons();
    modal.classList.remove('hidden');

    try {
      const species = await PokedexAPI.getSpecies(p.id);
      detailDescription.textContent = PokedexAPI.getSpanishFlavorText(species) || 'Sin descripción disponible.';
    } catch {
      detailDescription.textContent = 'No se pudo cargar la descripción.';
    }
  }

  function updateDetailButtons() {
    const p = state.currentDetail;
    const isFav = state.favorites.has(p.id);
    detailFavBtn.textContent = isFav ? '❤️ Favorito' : '🤍 Favorito';
    detailFavBtn.classList.toggle('is-active', isFav);

    const isCollected = state.collection.has(p.id);
    detailCollectBtn.textContent = isCollected ? '🎴 ¡Ya la tengo!' : '🎴 Tengo esta carta';
    detailCollectBtn.classList.toggle('is-active', isCollected);
  }

  function closeDetail() {
    modal.classList.add('hidden');
  }

  modalClose.addEventListener('click', closeDetail);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeDetail(); });

  detailSoundBtn.addEventListener('click', () => {
    const p = state.currentDetail;
    if (p?.cries?.latest) {
      cryAudio.src = p.cries.latest;
      cryAudio.play().catch(() => {});
    }
  });

  detailFavBtn.addEventListener('click', async () => {
    const p = state.currentDetail;
    if (state.favorites.has(p.id)) {
      state.favorites.delete(p.id);
      await PokedexStorage.removeFavorite(p.id);
    } else {
      state.favorites.set(p.id, p);
      await PokedexStorage.addFavorite(p);
    }
    updateDetailButtons();
    applyFilters();
  });

  detailCollectBtn.addEventListener('click', () => {
    photoInput.click();
  });

  photoInput.addEventListener('change', async () => {
    const file = photoInput.files[0];
    const p = state.currentDetail;
    if (!file || !p) return;
    detailCollectBtn.textContent = '⏳ Guardando...';
    try {
      const photo = await PokedexColeccion.saveCard(p, file);
      state.collection.set(p.id, { id: p.id, name: p.name, photo });
      updateDetailButtons();
      applyFilters();
    } finally {
      photoInput.value = '';
    }
  });

  // ---- Búsqueda / filtro ----
  searchInput.addEventListener('input', applyFilters);
  typeFilter.addEventListener('change', applyFilters);

  // ---- Inicialización ----
  async function init() {
    await PokedexStorage.init();

    const [favorites, collection] = await Promise.all([
      PokedexStorage.getAllFavorites(),
      PokedexStorage.getAllCollection(),
    ]);
    favorites.forEach(f => state.favorites.set(f.id, f));
    collection.forEach(c => state.collection.set(c.id, c));

    try {
      state.allPokemon = await PokedexAPI.getAllPokemonDetails(1025, (loaded, total) => {
        loadingText.textContent = `Cargando Pokémon... ${loaded}/${total}`;
      });
    } catch (err) {
      loadingText.textContent = 'No se pudo conectar con la Pokédex. Revisá tu conexión a internet e intentá de nuevo.';
      return;
    }

    loadingEl.classList.add('hidden');
    populateTypeFilter();
    applyFilters();

    PokedexQuiz.init({
      image: $('quiz-image'),
      optionsContainer: $('quiz-options'),
      feedback: $('quiz-feedback'),
      nextBtn: $('quiz-next-btn'),
      scoreEl: $('quiz-score'),
      audio: cryAudio,
    });
    PokedexQuiz.setPool(state.allPokemon);
  }

  init();
})();
