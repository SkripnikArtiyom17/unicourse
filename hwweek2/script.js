/**
 * script.js
 * ----------
 * UI initialization and recommendation logic using Cosine Similarity
 * over binary genre vectors.
 */

// Initialize on load
window.onload = async () => {
  // Load data from data.js module
  await loadData();
  // Populate UI
  populateMoviesDropdown();

  // If nothing loaded, inform user
  const resultEl = document.getElementById('result');
  if (movies.length === 0) {
    resultEl.textContent = 'No movies found in dataset.';
  } else if (resultEl.textContent.trim() === '') {
    resultEl.textContent = 'Data loaded. Please select a movie.';
  }
};

/**
 * Populate the movie dropdown with titles from the global "movies" array.
 * Sorted alphabetically by title.
 */
function populateMoviesDropdown() {
  const select = document.getElementById('movie-select');
  if (!select) return;

  // Clear existing
  select.innerHTML = '';

  // Sort by title (case-insensitive)
  const sorted = [...movies].sort((a, b) =>
    a.title.toLowerCase().localeCompare(b.title.toLowerCase())
  );

  // Append options
  for (const m of sorted) {
    const opt = document.createElement('option');
    opt.value = String(m.id);
    opt.textContent = m.title;
    select.appendChild(opt);
  }
}

/**
 * Cosine Similarity between two equal-length numeric vectors.
 * For binary vectors, this reduces to dot / (||A|| * ||B||).
 * Returns a number in [0, 1] for non-negative vectors.
 */
function cosineSimilarity(vecA, vecB) {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length !== vecB.length) {
    return 0;
  }

  let dot = 0;
  let magA2 = 0;
  let magB2 = 0;

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

/**
 * Core recommendation flow:
 * 1) Read selection
 * 2) Find the liked movie
 * 3) Score all other movies by cosine similarity on genre vectors
 * 4) Take top 2 and display
 */
function getRecommendations() {
  const resultEl = document.getElementById('result');
  const select = document.getElementById('movie-select');

  if (!select || select.options.length === 0) {
    if (resultEl) resultEl.textContent = 'No movies available to recommend.';
    return;
  }

  const selectedVal = select.value;
  const selectedId = parseInt(selectedVal, 10);

  if (Number.isNaN(selectedId)) {
    if (resultEl) resultEl.textContent = 'Please select a valid movie.';
    return;
  }

  const likedMovie = movies.find(m => m.id === selectedId);
  if (!likedMovie) {
    if (resultEl) resultEl.textContent = 'Selected movie not found.';
    return;
  }

  // Prepare candidate pool (exclude the liked movie itself)
  const candidates = movies.filter(m => m.id !== likedMovie.id);

  // Score by cosine similarity
  const scored = candidates.map(c => ({
    ...c,
    score: cosineSimilarity(likedMovie.vector, c.vector)
  }));

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  // Pick top two
  const topTwo = scored.slice(0, 2);

  // Build message
  let message = '';
  if (topTwo.length === 0) {
    message = `No recommendations available for "${likedMovie.title}".`;
  } else {
    const recTitles = topTwo.map(m => m.title).join(', ');
    message = `Because you liked "${likedMovie.title}", we recommend: ${recTitles}.`;
  }

  if (resultEl) resultEl.textContent = message;
}

// Make function available to inline onclick
window.getRecommendations = getRecommendations;
