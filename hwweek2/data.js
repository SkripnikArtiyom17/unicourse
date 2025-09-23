/* data.js
   Purpose: Fetch and parse MovieLens data files (u.item, u.data).
   Exposes:
     - global arrays: movies, ratings
     - async function loadData()
     - helper: getMovieById(id), getRatingsCount(itemId)
*/

let movies = [];   // [{ id:Number, title:String, genres:[String], vector:[0/1 x 18] }]
let ratings = [];  // [{ userId:Number, itemId:Number, rating:Number, timestamp:Number }]

// Internal aggregate map for rating counts per item
const _ratingCounts = new Map();

/**
 * Genres as 18-D vector (exclude "unknown"). Order matters and must match vector order.
 * The original MovieLens 100k u.item has 19 genre flags: [unknown, Action, Adventure, ... , Western]
 * We intentionally skip "unknown" and use only the last 18 flags in this order:
 */
const GENRES_18 = [
  "Action", "Adventure", "Animation", "Children's", "Comedy", "Crime",
  "Documentary", "Drama", "Fantasy", "Film-Noir", "Horror", "Musical",
  "Mystery", "Romance", "Sci-Fi", "Thriller", "War", "Western"
];

/**
 * Load both data files. On failure, writes a friendly message into #result.
 */
async function loadData() {
  try {
    const [itemsResp, ratingsResp] = await Promise.all([
      fetch('u.item'),
      fetch('u.data')
    ]);

    if (!itemsResp.ok) throw new Error(`Failed to load u.item (${itemsResp.status})`);
    if (!ratingsResp.ok) throw new Error(`Failed to load u.data (${ratingsResp.status})`);

    const itemsText = await itemsResp.text();
    const ratingsText = await ratingsResp.text();

    parseItemData(itemsText);
    parseRatingData(ratingsText);
  } catch (err) {
    console.error('[loadData] Error:', err);
    const resultEl = document.getElementById('result');
    if (resultEl) {
      resultEl.textContent = `Could not load data files. ${err.message}. Ensure "u.item" and "u.data" are present and served from the same folder.`;
    }
    // Re-throw so callers can handle if needed.
    throw err;
  }
}

/**
 * Parse u.item content.
 * Each line: movie id | movie title | release date | video release date | IMDb URL | 19 genre flags
 * We take only the last 18 flags (skip "unknown") and map to GENRES_18.
 */
function parseItemData(text) {
  movies = [];

  const lines = text.split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Split by '|'. The last 19 fields are genre flags; we use last 18.
    const parts = line.split('|');
    if (parts.length < 19) continue; // malformed

    const id = Number(parts[0]);
    const title = parts[1] || `Movie ${id}`;

    // Extract the final 18 flags (skip the 'unknown' flag).
    const flags18 = parts.slice(-18).map(v => Number(v));

    // Build genres list and vector
    const genres = [];
    const vector = new Array(18);
    for (let i = 0; i < 18; i++) {
      const flag = flags18[i] === 1 ? 1 : 0;
      vector[i] = flag;
      if (flag === 1) genres.push(GENRES_18[i]);
    }

    movies.push({ id, title, genres, vector });
  }
}

/**
 * Parse u.data content.
 * Each line: user id \t item id \t rating \t timestamp
 * Also builds _ratingCounts per item id (for optional tie-breakers).
 */
function parseRatingData(text) {
  ratings = [];
  _ratingCounts.clear();

  const lines = text.split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const parts = line.split('\t');
    if (parts.length < 4) continue;

    const userId = Number(parts[0]);
    const itemId = Number(parts[1]);
    const rating = Number(parts[2]);
    const timestamp = Number(parts[3]);

    ratings.push({ userId, itemId, rating, timestamp });

    // Aggregate count
    _ratingCounts.set(itemId, (_ratingCounts.get(itemId) || 0) + 1);
  }
}

/** Helper: find a movie by id. */
function getMovieById(id) {
  return movies.find(m => m.id === id) || null;
}

/** Helper: get number of ratings for a specific item id. */
function getRatingsCount(itemId) {
  return _ratingCounts.get(itemId) || 0;
}
