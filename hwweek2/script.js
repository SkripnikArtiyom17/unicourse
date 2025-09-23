/* script.js
   Purpose: Initialize UI, populate dropdown, compute recommendations using Cosine Similarity.
*/

/**
 * Cosine Similarity definition (use exactly):
 * For two vectors A and B,
 * cosine = dot(A, B) / (||A|| * ||B||); if either norm is 0, treat similarity as 0.
 *
 * Here aVec and bVec are 18-dimensional binary genre vectors.
 */
function cosineSimilarity(aVec, bVec) {
  let dot = 0, a2 = 0, b2 = 0;
  for (let i = 0; i < aVec.length; i++) {
    const a = aVec[i], b = bVec[i];
    dot += a * b;
    a2 += a * a;
    b2 += b * b;
  }
  const denom = Math.sqrt(a2) * Math.sqrt(b2);
  return denom === 0 ? 0 : dot / denom;
}

/* ======= UI Helpers ======= */
function showSpinner(on) {
  const sp = document.getElementById('spinner');
  if (!sp) return;
  sp.classList.toggle('show', !!on);
}

function setResult(message) {
  const el = document.getElementById('result');
  if (el) el.textContent = message;
}

/* ======= Populate dropdown ======= */
function populateMoviesDropdown() {
  const select = document.getElementById('movie-select');
  if (!select) return;
  select.innerHTML = '';

  // Placeholder option
  const ph = document.createElement('option');
  ph.value = '';
  ph.textContent = '— Choose a movie —';
  ph.disabled = true;
  ph.selected = true;
  select.appendChild(ph);

  // Sort movies alphabetically by title
  const sorted = [...movies].sort((a, b) => a.title.localeCompare(b.title));
  for (const m of sorted) {
    const opt = document.createElement('option');
    opt.value = String(m.id);
    opt.textContent = m.title;
    select.appendChild(opt);
  }
}

/* ======= Core: Recommendations ======= */
async function getRecommendations() {
  try {
    showSpinner(true);

    const select = document.getElementById('movie-select');
    const value = select ? select.value : '';
    if (!value) {
      setResult('Please choose a movie first.');
      return;
    }

    const likedId = Number(value);
    const likedMovie = getMovieById(likedId);
    if (!likedMovie) {
      setResult('Could not find the selected movie. Please try another.');
      return;
    }

    const likedVec = likedMovie.vector;

    // Candidates: all other movies
    const candidates = movies.filter(m => m.id !== likedMovie.id);

    // Score by cosine similarity
    const scored = candidates.map(m => ({
      ...m,
      score: cosineSimilarity(likedVec, m.vector),
      ratingCount: getRatingsCount(m.id)
    }));

    // Sort by score desc, then rating count desc (tie-breaker)
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.ratingCount - a.ratingCount;
    });

    // Top N recommendations (spec: top 2)
    const top = scored.slice(0, 2);

    if (top.length === 0 || top.every(x => x.score === 0)) {
      setResult(`Because you liked "${likedMovie.title}", we couldn't find similar movies by genre.`);
      return;
    }

    const lines = top.map(t => `${t.title} (${t.score.toFixed(2)})`);
    setResult(`Because you liked "${likedMovie.title}", we recommend: ${lines.join(', ')}`);
  } catch (err) {
    console.error('[getRecommendations] Error:', err);
    setResult('An unexpected error occurred while computing recommendations. See console for details.');
  } finally {
    showSpinner(false);
  }
}

/* ======= Initialization ======= */
window.addEventListener('load', async () => {
  showSpinner(true);
  try {
    await loadData();
    populateMoviesDropdown();
    setResult('Data loaded. Please select a movie.');
  } catch (e) {
    // loadData already showed a friendly error; keep spinner off.
  } finally {
    showSpinner(false);
  }
});
