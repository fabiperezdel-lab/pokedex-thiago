// Manejo de IndexedDB: favoritos, colección de cartas y caché de la API.
const PokedexStorage = (() => {
  const DB_NAME = 'pokedexDB';
  const DB_VERSION = 1;
  let dbPromise = null;

  function init() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('favorites')) {
          db.createObjectStore('favorites', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('collection')) {
          db.createObjectStore('collection', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'url' });
        }
      };

      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });
    return dbPromise;
  }

  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ---- Favoritos ----
  async function addFavorite(pokemon) {
    const db = await init();
    const tx = db.transaction('favorites', 'readwrite');
    tx.objectStore('favorites').put(pokemon);
    return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  }

  async function removeFavorite(id) {
    const db = await init();
    const tx = db.transaction('favorites', 'readwrite');
    tx.objectStore('favorites').delete(id);
    return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  }

  async function getAllFavorites() {
    const db = await init();
    const tx = db.transaction('favorites', 'readonly');
    return requestToPromise(tx.objectStore('favorites').getAll());
  }

  // ---- Colección ----
  async function addCollectionItem(item) {
    const db = await init();
    const tx = db.transaction('collection', 'readwrite');
    tx.objectStore('collection').put(item);
    return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  }

  async function getAllCollection() {
    const db = await init();
    const tx = db.transaction('collection', 'readonly');
    return requestToPromise(tx.objectStore('collection').getAll());
  }

  // ---- Caché de API ----
  async function cacheGet(url) {
    const db = await init();
    const tx = db.transaction('cache', 'readonly');
    const result = await requestToPromise(tx.objectStore('cache').get(url));
    return result ? result.data : null;
  }

  async function cacheSet(url, data) {
    const db = await init();
    const tx = db.transaction('cache', 'readwrite');
    tx.objectStore('cache').put({ url, data });
    return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  }

  return {
    init,
    addFavorite,
    removeFavorite,
    getAllFavorites,
    addCollectionItem,
    getAllCollection,
    cacheGet,
    cacheSet,
  };
})();
