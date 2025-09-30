/* script.js
 * -----------------------------------------
 * Matrix Factorization (Funk-SVD with biases) recommender, trained client-side.
 *
 * Model (learned on observed ratings only):
 *   r_hat(u,i) = mu + b_u + b_i + dot(P_u, Q_i)
 *     - mu: global mean rating
 *     - b_u, b_i: user/item bias terms capturing systematic offsets
 *     - P_u in R^K: latent factors for user u
 *     - Q_i in R^K: latent factors for item i
 *
 * Training by SGD:
 *   For each (u,i,r) in ratings:
 *     err = r - r_hat(u,i)
 *     b_u += LR * (err - REG * b_u)
 *     b_i += LR * (err - REG * b_i)
 *     For each k:
 *       p = P[u][k], q = Q[i][k]
 *       P[u][k] += LR * (err * q - REG * p)
 *       Q[i][k] += LR * (err * p - REG * q)
 *
 * Regularization (L2) penalizes large parameters to reduce overfitting.
 * After training we normalize item vectors Q_i and compute item-item similarity
 * as a cosine in latent space: sim(i,j) = dot(Q̂_i, Q̂_j) where Q̂ are unit vectors.
 * This surfaces movies that co-occur in similar user preference patterns.
 */

/*** Hyperparameters ***/
const K = 20;          // latent dimensionality
const EPOCHS = 12;     // training epochs
const LR = 0.01;       // learning rate
const REG = 0.05;      // L2 regularization strength
const SHUFFLE = true;  // shuffle rating samples each epoch
const YIELD_EVERY = 5000; // yield to UI every N SGD updates

/*** MF State (learned) ***/
let mu = 0;      // global mean
let bu = [];     // user bias [U]
let bi = [];     // item bias [I]
let P = [];      // user factors [U x K]
let Q = [];      // item factors [I x K]
let Qunit = [];  // normalized item vectors for cosine similarity [I x K]
let trainedOK = false;

// Convenience: invert item/user maps to ID arrays for lookups
let indexToItemId = [];
let indexToUserId = [];

/*** UI bootstrapping ***/
window.onload = async () => {
  setStatus("Loading data…");
  await loadData();

  // Populate dropdown only with items we actually have factors for (present in ratings subset)
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

/*** UI helpers ***/
function setStatus(msg) {
  const el = document.getElementById('status');
  if (el) el.textContent = msg;
}

function populateMoviesDropdown() {
  const sel = document.getElementById('movie-select');
  sel.innerHTML = "";

  // Only include movies present in itemIdToIndex (trained items)
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
function randSmall() {
  return Math.random() * 0.1 - 0.05; // small symmetric
}

function dot(a, b) {
  let s = 0;
  for (let k = 0; k < a.length; k++) s += a[k] * b[k];
  return s;
}

function l2norm(v) {
  let s = 0;
  for (let k = 0; k < v.length; k++) s += v[k] * v[k];
  return Math.sqrt(s);
}

function cloneVec(v) {
  const out = new Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i];
  return out;
}

function fisherYatesInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function nextAnimationFrame() {
  return new Promise(resolve => requestAnimationFrame(resolve));
}

/*** Training ***/
async function trainMF() {
  const U = userIdToIndex.size;
  const I = itemIdToIndex.size;

  if (!ratings.length || U === 0 || I === 0) {
    throw new Error("Empty dataset after parsing. Check u.item / u.data and MAX_RATINGS cap.");
  }

  // Build inverse index maps
  indexToItemId = [];
  indexToUserId = [];
  for (const [itemId, idx] of itemIdToIndex.entries()) indexToItemId[idx] = itemId;
  for (const [userId, idx] of userIdToIndex.entries()) indexToUserId[idx] = userId;

  // Compute global mean (mu) from observed ratings
  let sum = 0;
  for (const r of ratings) sum += r.rating;
  mu = sum / ratings.length;

  // Initialize parameters
  bu = new Array(U).fill(0);
  bi = new Array(I).fill(0);
  P = Array.from({ length: U }, () => Array.from({ length: K }, randSmall));
  Q = Array.from({ length: I }, () => Array.from({ length: K }, randSmall));

  // Create a fast index-triplet list (uIdx, iIdx, r)
  const triplets = ratings.map(({ userId, itemId, rating }) => ({
    u: userIdToIndex.get(userId),
    i: itemIdToIndex.get(itemId),
    r: rating
  }));

  // SGD training loop with UI yielding
  for (let epoch = 1; epoch <= EPOCHS; epoch++) {
    if (SHUFFLE) fisherYatesInPlace(triplets);

    let sqErr = 0;
    let count = 0;
    let sinceYield = 0;

    for (const { u, i, r } of triplets) {
      // Predict r_hat(u,i) = mu + b_u + b_i + P_u · Q_i
      const pu = P[u];
      const qi = Q[i];
      const r_hat = mu + bu[u] + bi[i] + dot(pu, qi);
      const e = r - r_hat;

      // Accumulate error metrics for visibility
      sqErr += e * e;
      count++;

      // Bias updates (L2 regularization)
      bu[u] += LR * (e - REG * bu[u]);
      bi[i] += LR * (e - REG * bi[i]);

      // Latent factors update
      for (let k = 0; k < K; k++) {
        const p = pu[k];
        const q = qi[k];
        pu[k] = p + LR * (e * q - REG * p);
        qi[k] = q + LR * (e * p - REG * q);
      }

      // Yield periodically to keep the UI responsive
      sinceYield++;
      if (sinceYield >= YIELD_EVERY) {
        sinceYield = 0;
        await nextAnimationFrame();
      }
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
// Returns array of { itemId, title, sim } (top-k similar items by cosine in latent space)
function topKSimilarItems(itemId, k = 5) {
  const i = itemIdToIndex.get(itemId);
  if (i == null || !Qunit.length) return [];

  const qi = Qunit[i];
  const sims = [];

  for (let j = 0; j < Qunit.length; j++) {
    if (j === i) continue;
    const qj = Qunit[j];
    const s = dot(qi, qj); // already cosine since both are unit vectors
    sims.push({ j, sim: s });
  }

  sims.sort((a, b) => b.sim - a.sim);
  const top = sims.slice(0, k).map(({ j, sim }) => {
    const id = indexToItemId[j];
    return {
      itemId: id,
      title: getMovieTitleById(id) || `Item ${id}`,
      sim
    };
  });
  return top;
}

function getMovieTitleById(id) {
  // movies[] is small; linear search is fine. If desired, build a Map once.
  for (const m of movies) if (m.id === id) return m.title;
  return null;
}

/*** Result rendering ***/
function clearResults() {
  const ul = document.getElementById('recommendations');
  const p = document.getElementById('result');
  if (ul) ul.innerHTML = "";
  if (p) p.textContent = "";
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

  for (const { title, sim } of recs) {
    const li = document.createElement('li');
    const spanTitle = document.createElement('span');
    const spanScore = document.createElement('span');
    spanTitle.textContent = title;
    spanScore.textContent = sim.toFixed(3);
    spanScore.className = 'badge';
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
    // Graceful fallback: popular movies by frequency in ratings
    const fallback = popularFallback(movieId, 5);
    renderRecommendations(title, fallback);
    return;
  }

  const recs = topKSimilarItems(movieId, 5);
  renderRecommendations(title, recs);
}

/*** Popularity fallback (in case of training failure) ***/
function popularFallback(excludeItemId, k = 5) {
  const counts = new Map();
  for (const r of ratings) {
    counts.set(r.itemId, (counts.get(r.itemId) || 0) + 1);
  }
  const arr = [];
  for (const [id, c] of counts.entries()) {
    if (id === excludeItemId) continue;
    arr.push({ id, c });
  }
  arr.sort((a, b) => b.c - a.c);
  const top = arr.slice(0, k).map(({ id }) => ({
    itemId: id,
    title: getMovieTitleById(id) || `Item ${id}`,
    // Neutral placeholder similarity for display in fallback
    sim: 0
  }));
  setStatus("Showing popularity-based fallback (model unavailable).");
  return top;
}

/*
 * — Didactic Notes —
 *
 * 1) Why biases?
 *    Some users systematically rate higher/lower (b_u), and some movies are broadly liked/disliked (b_i).
 *    Adding biases explains this global structure, allowing P·Q to focus on interaction patterns.
 *
 * 2) Why regularization (REG)?
 *    It discourages overly large parameters which could overfit to noise, improving generalization.
 *
 * 3) Why cosine of latent vectors for similarity?
 *    Items with similar Q_i directions are consumed by similar users even if they differ by explicit metadata
 *    (genres, year, etc.). Cosine normalizes away magnitude and focuses on orientation (taste pattern).
 *
 * 4) Observed-only training:
 *    We only update on existing (u,i) pairs; unobserved entries are not assumed to be negative.
 *
 * 5) Performance:
 *    We cap ratings in data.js (MAX_RATINGS) and yield to the UI during SGD to keep the page responsive.
 */
