/**
 * data.js — robust loader & parser for MovieLens 100k format.
 * Exposes: movies, ratings, GENRE_NAMES, loadData()
 */

let movies = [];
let ratings = [];

/** Fixed order for 18 genres (Action … Western). */
const GENRE_NAMES = [
  "Action","Adventure","Animation","Children's","Comedy","Crime","Documentary",
  "Drama","Fantasy","Film-Noir","Horror","Musical","Mystery","Romance","Sci-Fi",
  "Thriller","War","Western"
];

/** Utility: quick check to see if a response looks like HTML (e.g., 404 page). */
function looksLikeHTML(text) {
  const head = text.slice(0, 200).toLowerCase();
  return head.includes('<!doctype') || head.includes('<html');
}

/** Load both files, parse them, and update the UI message on success/failure. */
async function loadData() {
  const resultEl = document.getElementById('result');

  // Warn if served from file:// (fetch will fail or be blocked)
  if (location.protocol === 'file:') {
    resultEl.textContent = 'Please run this via a local HTTP server (e.g., "python3 -m http.server") — fetch() is blocked on file://.';
    return;
  }

  try {
    const [itemResp, dataResp] = await Promise.all([
      fetch('./u.item', { cache: 'no-cache' }),
      fetch('./u.data', { cache: 'no-cache' })
    ]);

    if (!itemResp.ok) throw new Error(`Failed to load u.item (${itemResp.status})`);
    if (!dataResp.ok) throw new Error(`Failed to load u.data (${dataResp.status})`);

    const [itemText, dataText] = await Promise.all([itemResp.text(), dataResp.text()]);

    // Guard against servers returning HTML error pages
    if (looksLikeHTML(itemText)) throw new Error('u.item request returned HTML (likely a 404 page).');
    if (looksLikeHTML(dataText)) throw new Error('u.data request returned HTML (likely a 404 page).');

    parseItemData(itemText);
    parseRatingData(dataText);

    if (movies.length === 0) {
      resultEl.textContent =
        'Parsed 0 movies. Check that your "u.item" is MovieLens 100k format with pipe "|" delimiter and genre flags at the end.';
      return;
    }

    resultEl.textContent = `Loaded ${movies.length} movies, ${ratings.length} ratings. Please select a movie.`;
  } catch (err) {
    console.error(err);
    resultEl.textContent =
      'Error loading data. Ensure "u.item" and "u.data" are next to index.html and the app is served over HTTP.';
  }
}

/**
 * Parse u.item lines. Expected: pipe-delimited with 19 trailing genre flags:
 * [unknown, Action, Adventure, ..., Western]
 * We map the last 18 flags (Action..Western) to GENRE_NAMES.
 */
function parseItemData(text) {
  movies = [];
  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Must be the ML-100k pipe format
    if (!line.includes('|')) continue;
    const parts = line.split('|').map(s => s.trim());

    // Need at least enough fields so that the last 18 are the genre flags we care about
    if (parts.length < 20) continue;

    const id = Number.parseInt(parts[0], 10);
    if (!Number.isFinite(id)) continue;

    const title = (parts[1] || `Movie ${id}`).trim();

    // ML-100k has 19 genre flags: unknown + 18 real genres. Some dumps may have extra columns;
    // we always take the last 18 to align with GENRE_NAMES.
    const last18 = parts.slice(-18);
    if (last18.length !== 18) continue;

    const vector = last18.map(f => (String(f).trim() === '1' ? 1 : 0));
    const genres = GENRE_NAMES.filter((_, idx) => vector[idx] === 1);

    movies.push({ id, title, genres, vector });
  }
}

/** Parse u.data (tab-separated): userId \t itemId \t rating \t timestamp */
function parseRatingData(text) {
  ratings = [];
  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const parts = line.split('\t');
    if (parts.length < 4) continue;

    const userId = Number.parseInt(parts[0], 10);
    const itemId = Number.parseInt(parts[1], 10);
    const rating = Number.parseInt(parts[2], 10);
    const timestamp = Number.parseInt(parts[3], 10);

    if (!Number.isFinite(userId) || !Number.isFinite(itemId)) continue;

    ratings.push({ userId, itemId, rating, timestamp });
  }
}

// Expose globally (vanilla setup)
window.movies = movies;
window.ratings = ratings;
window.GENRE_NAMES = GENRE_NAMES;
window.loadData = loadData;
