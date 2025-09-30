/* script.js
 * -----------------------------------------
 * Matrix Factorization (Funk-SVD with biases) recommender, trained client-side.
 * (unchanged MF core; additions at render layer to scale & color-code scores)
 */

const K = 20;
const EPOCHS = 12;
const LR = 0.01;
const REG = 0.05;
const SHUFFLE = true;
const YIELD_EVERY = 5000;

let mu = 0;
let bu = [];
let bi = [];
let P = [];
let Q = [];
let Qunit = [];
let trainedOK = false;

let indexToItemId = [];
let indexToUserId = [];

window.onload = async () => {
  setStatus("Loading data…");
  await loadData();
  populateMoviesDropdown();

  setStatus("Training Matrix Factorization model…");
  try {
    await trainMF();
    setStatus("Model ready. Select a movie to get recommendations.");
    trainedOK = true;
  } catch (err) {
    console.error(err);
    setStatus(`Training failed: ${err.message}`);
    trainedOK = false;
  }
};

function setStatus(msg) {
  const el = document.getElementById('status');
  if (el) el.textContent = msg;
}

function populateMoviesDropdown() {
  const sel = document.getElementById('movie-select');
  sel.innerHTML = "";

  const usable = movies.filter(m => itemIdToIndex.has(m.id));
  usable.sort((a, b) => a.title.localeCompare(b.title));

  for (const m of usable) {
    const opt = document.createElement('option');
    opt.value = String(m.id);
    opt.textContent = m.title;
    sel.appendChild(opt);
  }

  if (usable.length === 0) {
    setStatus("No movies available from the ratings subset. Increase MAX_RATINGS in data.js and reload.");
  }
}

/*** Math helpers ***/
function randSmall() { return Math.random() * 0.1 - 0.05; }
function dot(a, b) { let s = 0; for (let k = 0; k < a.length; k++) s += a[k] * b[k]; return s; }
function l2norm(v) { let s = 0; for (let k = 0; k < v.length; k++) s += v[k] * v[k]; return Math.sqrt(s); }
function fisherYatesInPlace(arr){ for (let i=arr.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [arr[i],arr[j]]=[arr[j],arr[i]];} return arr; }
function nextAnimationFrame(){ return new Promise(res=>requestAnimationFrame(res)); }

/*** Training ***/
async function trainMF() {
  const U = userIdToIndex.size;
  const I = itemIdToIndex.size;
  if (!ratings.length || U === 0 || I === 0) {
    throw new Error("Empty dataset after parsing. Check u.item / u.data and MAX_RATINGS cap.");
  }

  indexToItemId = [];
  indexToUserId = [];
  for (const [itemId, idx] of itemIdToIndex.entries()) indexToItemId[idx] = itemId;
  for (const [userId, idx] of userIdToIndex.entries()) indexToUserId[idx] = userId;

  let sum = 0;
  for (const r of ratings) sum += r.rating;
  mu = sum / ratings.length;

  bu = new Array(U).fill(0);
  bi = new Array(I).fill(0);
  P = Array.from({ length: U }, () => Array.from({ length: K }, randSmall));
  Q = Array.from({ length: I }, () => Array.from({ length: K }, randSmall));

  const triplets = ratings.map(({ userId, itemId, rating }) => ({
    u: userIdToIndex.get(userId),
    i: itemIdToIndex.get(itemId),
    r: rating
  }));

  for (let epoch = 1; epoch <= EPOCHS; epoch++) {
    if (SHUFFLE) fisherYatesInPlace(triplets);

    let sqErr = 0, count = 0, sinceYield = 0;

    for (const { u, i, r } of triplets) {
      const pu = P[u];
      const qi = Q[i];
      const r_hat = mu + bu[u] + bi[i] + dot(pu, qi);
      const e = r - r_hat;

      sqErr += e*e; count++;

      bu[u] += LR * (e - REG * bu[u]);
      bi[i] += LR * (e - REG * bi[i]);

      for (let k = 0; k < K; k++) {
        const p = pu[k], q = qi[k];
        pu[k] = p + LR * (e * q - REG * p);
        qi[k] = q + LR * (e * p - REG * q);
      }

      sinceYield++;
      if (sinceYield >= YIELD_EVERY) { sinceYield = 0; await nextAnimationFrame(); }
    }

    const rmse = Math.sqrt(sqErr / Math.max(1, count));
    setStatus(`Training epoch ${epoch}/${EPOCHS} complete — RMSE ≈ ${rmse.toFixed(4)}`);
    await nextAnimationFrame();
  }

  // Normalize item vectors for cosine similarity in latent space
  Qunit = Array.from({ length: Q.length }, (_, i) => {
    const v = Q[i];
    const n = l2norm(v);
    if (n === 0) return Array.from({ length: K }, () => 0);
    const out = new Array(K);
    for (let k = 0; k < K; k++) out[k] = v[k] / n;
    return out;
  });
}

/*** Similarity & Recommendations ***/
function topKSimilarItems(itemId, k = 5) {
  const i = itemIdToIndex.get(itemId);
  if (i == null || !Qunit.length) return [];

  const qi = Qunit[i];
  const sims = [];
  for (let j = 0; j < Qunit.length; j++) {
    if (j === i) continue;
    const s = dot(qi, Qunit[j]); // cosine
    sims.push({ j, sim: s });
  }

  sims.sort((a, b) => b.sim - a.sim);
  return sims.slice(0, k).map(({ j, sim }) => {
    const id = indexToItemId[j];
    return { itemId: id, title: getMovieTitleById(id) || `Item ${id}`, sim };
  });
}

function getMovieTitleById(id) {
  for (const m of movies) if (m.id === id) return m.title;
  return null;
}

/*** Score styling utilities (NEW) ***/
/* Map cosine similarity [-1,1] → [0,1] then color from red(0)→green(1) and scale size */
function styleScoreElement(el, sim) {
  // Normalize: allow for negatives; clamp to [0,1]
  const norm = Math.max(0, Math.min(1, (sim + 1) / 2));
  // Hue 0 (red) → 120 (green)
  const hue = 120 * norm;
  // Scale font size from ~0.9rem to ~1.8rem
  const sizeRem = 0.9 + norm * 0.9;

  el.style.color = `hsl(${hue.toFixed(1)}, 90%, 60%)`;
  el.style.fontWeight = '800';
  el.style.fontSize = `${sizeRem.toFixed(2)}rem`;
  el.style.filter = `drop-shadow(0 0 6px hsla(${hue.toFixed(1)}, 90%, 60%, 0.25))`;
  el.title = `Similarity: ${sim.toFixed(3)} (0=red, 1=green)`;
}

/* One-time legend under the results to show the palette */
function ensureLegend() {
  if (document.getElementById('legend')) return;
  const box = document.getElementById('result-box');
  if (!box) return;

  const legend = document.createElement('div');
  legend.id = 'legend';

  const labelLow = document.createElement('span');
  labelLow.textContent = 'Low';

  const bar = document.createElement('div');
  bar.className = 'bar';
  bar.setAttribute('aria-hidden', 'true');

  const labelHigh = document.createElement('span');
  labelHigh.textContent = 'High';

  legend.appendChild(labelLow);
  legend.appendChild(bar);
  legend.appendChild(labelHigh);

  box.appendChild(legend);
}

/*** Result rendering ***/
function clearResults() {
  const ul = document.getElementById('recommendations');
  const p = document.getElementById('result');
  if (ul) ul.innerHTML = "";
  if (p) p.textContent = "";
  const legend = document.getElementById('legend');
  if (legend) legend.remove(); // re-add each time for clarity
}

function renderRecommendations(baseTitle, recs) {
  const ul = document.getElementById('recommendations');
  const p = document.getElementById('result');
  clearResults();

  if (!recs.length) {
    if (p) p.textContent = "No recommendations available for this title (insufficient training data).";
    return;
  }

  if (p) p.textContent = `Movies similar to “${baseTitle}” (MF latent-space cosine):`;

  // Add the palette legend (red→yellow→green)
  ensureLegend();

  for (const { title, sim } of recs) {
    const li = document.createElement('li');
    const spanTitle = document.createElement('span');
    const spanScore = document.createElement('span');
    spanTitle.textContent = title;
    spanScore.textContent = sim.toFixed(3);
    spanScore.className = 'badge'; // base pill styling
    styleScoreElement(spanScore, sim); // <-- color & size based on similarity
    li.appendChild(spanTitle);
    li.appendChild(spanScore);
    ul.appendChild(li);
  }
}

/*** Public action ***/
async function getRecommendations() {
  const sel = document.getElementById('movie-select');
  if (!sel || sel.options.length === 0) {
    setStatus("No movies loaded. Check data files.");
    return;
  }
  const movieId = Number(sel.value);
  const title = getMovieTitleById(movieId) || "(unknown)";

  if (!trainedOK) {
    const fallback = popularFallback(movieId, 5);
    renderRecommendations(title, fallback);
    return;
  }

  const recs = topKSimilarItems(movieId, 5);
  renderRecommendations(title, recs);
}

/*** Popularity fallback ***/
function popularFallback(excludeItemId, k = 5) {
  const counts = new Map();
  for (const r of ratings) counts.set(r.itemId, (counts.get(r.itemId) || 0) + 1);
  const arr = [];
  for (const [id, c] of counts.entries()) { if (id !== excludeItemId) arr.push({ id, c }); }
  arr.sort((a, b) => b.c - a.c);
  const top = arr.slice(0, k).map(({ id }) => ({
    itemId: id,
    title: getMovieTitleById(id) || `Item ${id}`,
    sim: 0 // fallback, shows as red/small
  }));
  setStatus("Showing popularity-based fallback (model unavailable).");
  return top;
}

/* — Didactic Notes —
 * Scores are cosine similarities in MF latent space. We map [-1,1] to [0,1] before styling:
 * norm = (sim + 1) / 2, clamped. Then we color with hsl(hue, 90%, 60%) where hue ∈ [0,120].
 * Simultaneously we scale font size so higher similarity looks visually stronger.
 */
