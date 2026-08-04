// "Mi Colección": marcar cartas propias subiendo una foto, guardada solo en el dispositivo.
const PokedexColeccion = (() => {
  const MAX_SIZE = 700; // px, para no guardar fotos gigantes en IndexedDB

  function resizeImageToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('No se pudo leer la imagen'));
        img.onload = () => {
          let { width, height } = img;
          if (width > MAX_SIZE || height > MAX_SIZE) {
            const scale = MAX_SIZE / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function saveCard(pokemon, file) {
    const photo = await resizeImageToDataURL(file);
    await PokedexStorage.addCollectionItem({
      id: pokemon.id,
      name: pokemon.name,
      photo,
      dateAdded: Date.now(),
    });
    return photo;
  }

  function renderAlbum(container, counterFillEl, counterTextEl, allPokemon, collectionMap) {
    container.innerHTML = '';
    const total = allPokemon.length;
    let collected = 0;

    allPokemon.forEach((p) => {
      const item = collectionMap.get(p.id);
      const card = document.createElement('div');

      if (item) {
        collected++;
        card.className = 'collection-card';
        card.innerHTML = `
          <div class="photo-wrap"><img class="photo" src="${item.photo}" alt="Carta de ${p.name}"></div>
          <div class="card-name">#${String(p.id).padStart(4, '0')} ${p.name}</div>
        `;
      } else {
        card.className = 'collection-card locked';
        card.innerHTML = `<div class="lock-icon">🔒</div>`;
      }
      container.appendChild(card);
    });

    if (counterFillEl) counterFillEl.style.width = `${(collected / total) * 100}%`;
    if (counterTextEl) counterTextEl.textContent = `${collected}/${total} conseguidos`;
  }

  return { saveCard, renderAlbum };
})();
