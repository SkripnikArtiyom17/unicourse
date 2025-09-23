/**
 * data.js
 * ----------
 * Responsible for loading and parsing raw data files (u.item, u.data).
 * Exposes global variables: movies, ratings, GENRE_NAMES, and the async function loadData().
 *
 * Parsing notes:
 * - u.item has many fields separated by '|'. The last genre flags include "unknown" first in ML-100k.
 *   Per specification, we ONLY use the last 18 flags corresponding to the genres from "Action" to "Western".
 * - u.data is tab-separated: userId \t itemId \t rating \t timestamp
 */

// Global state (intentionally on window/global scope for simplicity in a vanilla setup)
let movies = [];
let ratings = [];

/**
 * Fixed order for 18 genres (defines vector dimensions for cosine similarity).
 * IMPORTANT: This excludes "unknown" by design and must align with the last 18 flags in u.item lines.
 */
const GENRE_NAMES = [
  "Action",
  "Adventure",
  "Animation",
  "Children's",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Fantasy",
  "Film-Noir",
  "Horror",
  "Musical",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Thriller",
  "War",
  "Western"
];

/**
 * Load both files and parse them.
 * On any error, sets a user-friendly message in #result.
 */
async function loadData() {
  const resultEl = document.getElementById('result');

  try {
    // Fetch and parse u.item
    const itemResp = await fetch('u.item');
    if (!itemResp.ok) throw new Error(`Failed to load u.item (${itemResp.status})`);
    const itemText = await itemResp.text();
    parseItemData(itemText);

    // Fetch and parse u.data
    const dataResp = await fetch('u.data');
    if (!dataResp.ok) throw new Error(`Failed to load u.data (${dataResp.status})`);
    const dataText = await dataResp.text();
    parseRatingData(dataText);

    if (resultEl) {
      resultEl.textContent = 'Data loaded. Please select a movie.';
    }
  } catch (err) {
    console.error(err);
    if (resultEl) {
      resultEl.textContent =
        'Error loading data. Please ensure "u.item" and "u.data" are in the same directory as this page and served over HTTP (not file://).';
    }
  }
}

/**
 * Parse u.item content.
 * For each line:
 *  - Split by '|'
 *  - Extract id (index 0), title (index 1)
 *  - Read the LAST 18 flags (to align with GENRE_NAMES order: Action..Western)
 *  - Build genres[] and vector[] accordingly
 */
function parseItemData(text) {
  movies = []; // reset if reloaded
  const lines = text.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const parts = line.split('|');
    if (parts.length < 20) continue; // not enough fields (safety)

    // Extract id and title
    const id = parseInt(parts[0], 10);
    const title = parts[1] ? parts[1].trim() : `Movie ${id}`;

    // The last 18 flags correspond to Action..Western
    const genreFlags = parts.slice(-18);
    if (genreFlags.length !== 18) continue; // safety

    const vector = genreFlags.map(f => (f === '1' ? 1 : 0));
    const genres = GENRE_NAMES.filter((_, idx) => vector[idx] === 1);

    movies.push({ id, title, genres, vector });
  }
}

/**
 * Parse u.data content (tab-separated).
 * userId \t itemId \t rating \t timestamp
 */
function parseRatingData(text) {
  ratings = []; // reset if reloaded
  const lines = text.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const parts = line.split('\t');
    if (parts.length < 4) continue;

    const userId = parseInt(parts[0], 10);
    const itemId = parseInt(parts[1], 10);
    const rating = parseInt(parts[2], 10);
    const timestamp = parseInt(parts[3], 10);

    ratings.push({ userId, itemId, rating, timestamp });
  }
}
