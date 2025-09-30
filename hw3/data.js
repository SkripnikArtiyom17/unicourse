/* data.js
 * ----------------------------
 * Parsing-only module. Loads MovieLens files from the same folder:
 *  - u.item  -> movie metadata (we only need {id, title})
 *  - u.data  -> ratings [userId, itemId, rating, timestamp]
 *
 * Exposes globals consumed by script.js:
 *   movies: [{ id, title }]
 *   ratings: [{ userId, itemId, rating }]
 *   itemIdToIndex: Map(itemId -> 0..M-1)  // contiguous item indices for MF
 *   userIdToIndex: Map(userId -> 0..U-1)  // contiguous user indices for MF
 *   loadData(): Promise<void>
 */

let movies = [];
let ratings = [];
let itemIdToIndex = new Map();
let userIdToIndex = new Map();

const MAX_RATINGS = 30000; // Performance guard for in-browser MF training

function updateStatusLocal(msg) {
  const el = document.getElementById('status');
  if (el) el.textContent = msg;
}

async function loadData() {
  try {
    // Load items
    const itemResp = await fetch('u.item');
    if (!itemResp.ok) throw new Error(`Failed to load u.item (${itemResp.status})`);
    const itemText = await itemResp.text();
    parseItemData(itemText);

    // Load ratings
    const dataResp = await fetch('u.data');
    if (!dataResp.ok) throw new Error(`Failed to load u.data (${dataResp.status})`);
    const dataText = await dataResp.text();
    parseRatingData(dataText);
  } catch (err) {
    console.error(err);
    updateStatusLocal(`Error loading data: ${err.message}. Make sure u.item and u.data are in the same folder as index.html.`);
  }
}

function parseItemData(text) {
  movies.length = 0;
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split('|');
    // MovieLens 100k: id|title|release date|video date|IMDb URL|genres...
    const id = Number(parts[0]);
    const title = (parts[1] || '').trim();
    if (!Number.isFinite(id) || !title) continue;
    movies.push({ id, title });
  }
}

function parseRatingData(text) {
  ratings.length = 0;
  itemIdToIndex = new Map();
  userIdToIndex = new Map();

  const lines = text.split(/\r?\n/);
  let nextUserIdx = 0;
  let nextItemIdx = 0;

  for (const line of lines) {
    if (ratings.length >= MAX_RATINGS) break;
    if (!line.trim()) continue;

    const parts = line.split('\t');
    if (parts.length < 3) continue;

    const userId = Number(parts[0]);
    const itemId = Number(parts[1]);
    const rating = Number(parts[2]);

    if (!Number.isFinite(userId) || !Number.isFinite(itemId) || !Number.isFinite(rating)) continue;

    if (!userIdToIndex.has(userId)) userIdToIndex.set(userId, nextUserIdx++);
    if (!itemIdToIndex.has(itemId)) itemIdToIndex.set(itemId, nextItemIdx++);

    ratings.push({ userId, itemId, rating });
  }
}
