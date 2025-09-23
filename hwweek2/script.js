/**
 * script.js — UI + cosine-based recommendations over binary genre vectors.
 */

window.onload = async () => {
  await loadData();
  populateMoviesDropdown();

  const resultEl = document.getElementById('result');
  if (movies.length === 0) {
    // If parsing failed, loadData already set an error message.
    if (!resultEl.textContent || resultEl.textContent.trim() === '') {
      resultEl.textContent = 'No movies found in dataset.';
    }
  } else {
    if (!resultEl.textContent || resultEl.textContent.includes('Loading')) {
      resultEl.textContent = 'Data loaded. Please select a movie.';
    }
  }
};

/** Fill the dropdown with movie titles (sorted A→Z) */
function populateMoviesDropdown() {
  const select = document.getElementById('movie-select');
  if (!select) return;
  select.innerHTML = '';

  const sorted = [...movies].sort((a, b) =>
    a.title.toLowerCase().localeCompare(b.title.toLowerCase())
  );

  for (const m of sorted) {
    const opt = document.createElement('option');
    opt.value = String(m.id);
    opt.textContent = m.title;
    select.appendChild(opt);
  }
}

/** Cosine similarity for two equal-length numeric vectors. */
function cosineSimilarity(vecA, vecB) {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length !== vecB.length) return 0;

  let dot = 0, magA2 = 0, magB2 = 0;
  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i] || 0;
    const b = vecB[i] || 0;
    dot += a * b;
    magA2 += a * a;
    magB2 += b * b;
  }
  const magA = Math.sqrt(magA2);
  const magB = Math.sqrt(magB2);
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

/** Get top-2 recommendations for the selected movie. */
function getRecommendations() {
  const resultEl = document.getElementById('result');
  const select = document.getElementById('movie-select');

  if (!select || select.options.length === 0) {
    resultEl.textContent = 'No movies available to recommend.';
    return;
  }

  const selectedId = Number.parseInt(select.value, 10);
  if (!Number.isFinite(selectedId)) {
    resultEl.textContent = 'Please select a valid movie.';
    return;
  }

  const likedMovie = movies.find(m => m.id === selectedId);
  if (!likedMovie) {
    resultEl.textContent = 'Selected movie not found.';
    return;
  }

  const candidates = movies.filter(m => m.id !== likedMovie.id);
  const scored = candidates.map(c => ({
    ...c,
    score: cosineSimilarity(likedMovie.vector, c.vector)
  }));

  scored.sort((a, b) => b.score - a.score);
  const topTwo = scored.slice(0, 2);

  if (topTwo.length === 0) {
    resultEl.textContent = `No recommendations available for "${likedMovie.title}".`;
    return;
  }

  const recTitles = topTwo.map(m => m.title).join(', ');
  resultEl.textContent = `Because you liked "${likedMovie.title}", we recommend: ${recTitles}.`;
}

// Expose
window.getRecommendations = getRecommendations;
