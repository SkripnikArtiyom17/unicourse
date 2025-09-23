You are an expert full-stack web developer who creates robust, well-commented, and modular web applications using only vanilla HTML, CSS, and JavaScript.
Your task is to generate the complete code for a "Content-Based Movie Recommender" web application based on the detailed specifications below. The application logic will be split into two separate JavaScript files: **data.js** for data loading and parsing, and **script.js** for UI and recommendation logic. Please provide the code for each of the four files—**index.html**, **style.css**, **data.js**, and **script.js**—separately and clearly labeled.

## Project Specification: Content-Based Movie Recommender (Modular, Cosine Similarity)

### 1) Overall Goal

Build a single-page web application that recommends movies. The application will use **data.js** to load and parse movie and rating data from local files (**u.item**, **u.data**). The **script.js** file will then use this parsed data to populate the UI and calculate content-based recommendations **using Cosine Similarity over binary genre vectors** when a user makes a selection.

### 2) File: index.html — Application Structure

* **DOCTYPE and Language:** Start with `<!DOCTYPE html>` and set `<html lang="en">`.
* **Title:** Use `"Content-Based Movie Recommender"`.
* **Main Heading:** Include an `<h1>` with the text `"Content-Based Movie Recommender"`.
* **Instructions:** Add a `<p>` with: `"Select a movie you like, and we'll find similar ones for you!"`
* **Dropdown Menu:** Include a `<select id="movie-select"></select>` (populated dynamically).
* **Button:** Include a `<button>` with the text `"Get Recommendations"` that calls `getRecommendations()` on click.
* **Result Display Area:** Include `<div id="result-box"><p id="result"></p></div>` for status messages and recommendations.
* **File Linking (Order matters):** At the end of the body, load `data.js` **before** `script.js`:

  ```html
  <script src="data.js"></script>
  <script src="script.js"></script>
  ```

### 3) File: style.css — Application Design

* **Layout:** Professional, modern, user-friendly; center all content in a main container.
* **Background:** Use a light neutral background (e.g., `#f4f7f6`).
* **Container:** White background, rounded corners, subtle box shadow.
* **Typography:** Clean sans-serif like Helvetica or Arial.
* **Controls:** Consistent styling for dropdown and button, with adequate padding and clear hierarchy.
* **Button:** Inviting style—distinct background (e.g., blue), white text, and hover darkening.
* **Result Area:** `#result-box` padded with a light background; `#result` bold and easy to read.

### 4) File: data.js — Data Handling Module

Responsible **only** for fetching and parsing data from local files.

**Global Variables**

* `let movies = [];`
* `let ratings = [];`
* Define a **global constant** `GENRE_NAMES` as an array of the **18** genre names (from `"Action"` to `"Western"`) in a fixed order. This order will define the **genre vector dimensions** for Cosine Similarity.

**Primary Function: `async function loadData()`**

* Use `fetch()` to load **u.item** and **u.data** (assume same directory as `index.html`).
* Implement `try...catch`. On any error, display a user-friendly message in `#result`.
* In the `try` block:

  * Fetch **u.item**, convert to text, pass to `parseItemData(text)`.
  * Fetch **u.data**, convert to text, pass to `parseRatingData(text)`.
* The function returns a Promise that resolves after both parses complete.

**Parsing Function: `parseItemData(text)`**

* Use the global `GENRE_NAMES` (length 18) to define the vector order.
* Split `text` into lines; for each non-empty line:

  * Split by `'|'`.
  * Extract **movie id** (field 0) and **title** (field 1).
  * Read the **last 18** binary flags corresponding to `GENRE_NAMES` (values `'0'`/`'1'`).
  * Build:

    * `genres`: an array of genre names where the flag is `'1'`.
    * `vector`: a **binary numeric array of length 18** aligned with `GENRE_NAMES` order (e.g., `[0,1,0,...]`).
  * Push `{ id, title, genres, vector }` into the global `movies`.

**Parsing Function: `parseRatingData(text)`**

* Split `text` into lines; for each non-empty line:

  * Split by `'\t'` (tab).
  * Create `{ userId, itemId, rating, timestamp }` and push into global `ratings`.

### 5) File: script.js — UI & Recommendation Logic (Cosine Similarity)

Depends on data loaded by `data.js`.

**Initialization**

* Use `window.onload = async () => { ... }`:

  * `await loadData();`
  * Call `populateMoviesDropdown();`
  * Set initial status in `#result`, e.g., `"Data loaded. Please select a movie."`

**UI Function: `populateMoviesDropdown()`**

* Get `#movie-select`.
* Sort `movies` alphabetically by `title`.
* Create `<option>` elements, set `value` to `movie.id`, text to `movie.title`.

**Helper: Cosine Similarity**

* Implement `function cosineSimilarity(vecA, vecB)`:

  * **Dot product:** `sum(vecA[i] * vecB[i])`.
  * **Magnitude:** `sqrt(sum(vecA[i]^2))` and `sqrt(sum(vecB[i]^2))`.
  * **Guard:** If either magnitude is 0, return `0` to avoid division by zero.
  * **Similarity:** `dot / (magA * magB)` — returns a number in `[0, 1]` for non-negative vectors.

**Core Logic: `getRecommendations()`**

1. **Get User Input:** Read selected value from `#movie-select`, convert to integer `selectedId`.
2. **Find Liked Movie:** Locate `likedMovie` in `movies` by `id === selectedId`. If not found, show an error and exit.
3. **Prepare Candidates:** `candidateMovies = movies.filter(m => m.id !== likedMovie.id)`.
4. **Calculate Scores (Cosine):**
   `scoredMovies = candidateMovies.map(c => ({ ...c, score: cosineSimilarity(likedMovie.vector, c.vector) }));`
5. **Sort by Score:** Descending by `score`.
6. **Select Top Recommendations:** `topTwo = scoredMovies.slice(0, 2)`.
7. **Display Result:**
   Set `#result` text to something like:
   `"Because you liked '${likedMovie.title}', we recommend: ${topTwo.map(m => m.title).join(', ')}."`

---

## What I changed and how

1. **Similarity Method:**

   * **Before:** Jaccard similarity over **sets of genres** (intersection / union).
   * **Now:** **Cosine Similarity** over **binary genre vectors** (`dot / (||A|| * ||B||)`).

2. **Data Representation:**

   * Added a **fixed-order `GENRE_NAMES`** array (18 genres) that defines vector dimensions.
   * Each movie now includes a **`vector`** field (length 18, 0/1) in addition to `genres` (names).

3. **Parsing Logic (`parseItemData`)**:

   * Extended parsing to produce both `genres` and a **binary `vector`** aligned with `GENRE_NAMES`.

4. **Computation Helper:**

   * Introduced a dedicated `cosineSimilarity(vecA, vecB)` function with **zero-magnitude guard** to avoid division by zero.

5. **Recommendation Step (script.js):**

   * Replaced the Jaccard calculation in Step 4 with **Cosine Similarity using the movie `vector`s**.
   * Kept sorting and slicing logic identical (top 2).

6. **Spec Wording:**

   * Updated all references from “Jaccard similarity index” to **“Cosine Similarity over binary genre vectors.”**
   * Clarified that **vector order must match `GENRE_NAMES`** to ensure correct dot products.

Everything else (file structure, UI, styling, loading order, and general flow) remains the same, ensuring a minimal, targeted change to adopt Cosine Similarity.
