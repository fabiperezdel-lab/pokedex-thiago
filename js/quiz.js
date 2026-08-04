// Mini-juego "¿Quién es ese Pokémon?": silueta + 4 opciones.
const PokedexQuiz = (() => {
  let pool = [];
  let current = null;
  let score = { correct: 0, total: 0 };
  let answered = false;

  let els = {};

  function init(elements) {
    els = elements;
    els.nextBtn.addEventListener('click', () => nextRound());
  }

  function setPool(allPokemon) {
    pool = allPokemon.filter(p => p.sprites?.other?.['official-artwork']?.front_default);
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickOptions(correctPokemon) {
    const others = pool.filter(p => p.id !== correctPokemon.id);
    const wrongChoices = shuffle(others).slice(0, 3);
    return shuffle([correctPokemon, ...wrongChoices]);
  }

  function nextRound() {
    if (pool.length < 4) return;
    answered = false;
    current = pool[Math.floor(Math.random() * pool.length)];
    const options = pickOptions(current);

    const artUrl = current.sprites.other['official-artwork'].front_default;
    els.image.src = artUrl;
    els.image.classList.remove('revealed');
    els.image.classList.add('silhouette');

    els.optionsContainer.innerHTML = '';
    options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option-btn';
      btn.textContent = opt.name;
      btn.dataset.id = opt.id;
      btn.addEventListener('click', () => handleAnswer(btn, opt));
      els.optionsContainer.appendChild(btn);
    });

    els.feedback.textContent = '';
    els.nextBtn.classList.add('hidden');
    updateScore();
  }

  function handleAnswer(btn, chosenPokemon) {
    if (answered) return;
    answered = true;
    score.total++;

    const isCorrect = chosenPokemon.id === current.id;
    if (isCorrect) score.correct++;

    els.image.classList.remove('silhouette');
    els.image.classList.add('revealed');

    const allBtns = [...els.optionsContainer.querySelectorAll('.quiz-option-btn')];
    allBtns.forEach((b) => {
      b.disabled = true;
      if (Number(b.dataset.id) === current.id) b.classList.add('correct');
      else if (b === btn) b.classList.add('wrong');
    });

    els.feedback.textContent = isCorrect ? '¡Correcto! 🎉' : `Era ${current.name} 😅`;

    if (current.cries?.latest) {
      els.audio.src = current.cries.latest;
      els.audio.play().catch(() => {});
    }

    els.nextBtn.classList.remove('hidden');
    updateScore();
  }

  function updateScore() {
    els.scoreEl.textContent = `Aciertos: ${score.correct} / ${score.total}`;
  }

  return { init, setPool, nextRound };
})();
