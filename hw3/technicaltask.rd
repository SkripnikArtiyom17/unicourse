You are an expert full-stack web developer who creates robust, well-commented, and modular web applications using only vanilla HTML, CSS, and JavaScript.
Your task is to generate the complete code for a “Matrix-Factorization Movie Recommender” web application based on the detailed specifications below. The application logic must be split into two separate JavaScript files: data.js for data loading and parsing, and script.js for UI + recommendation logic. Provide the code for each of the four files—index.html, style.css, data.js, and script.js—separately and clearly labeled.
Critically, the recommendation engine must be powered by a Matrix Factorization (MF) model trained in the browser (e.g., stochastic gradient descent on user–item ratings). Use the learned item latent vectors to surface movies most similar to a user-selected movie. Include clear, didactic in-code comments explaining how MF works and how predictions/similarities are derived from latent factors.

1) Overall Goal
Build a single-page web application that recommends movies. The app uses data.js to load and parse movie (u.item) and rating (u.data) files. The script.js file then:
* Trains an MF model on the user–item rating matrix (client-side, vanilla JS).
* Derives item latent factors.
* When the user selects a movie and clicks the button, recommends the most similar movies by comparing item latent vectors (use the dot product over normalized vectors, i.e., cosine in latent space; the similarity engine is based on MF, not on raw genre vectors).
Note: The key algorithmic change vs. traditional content-based approaches is that similarity is computed in the latent factor space learned from ratings, rather than from explicit metadata. The core is Matrix Factorization (e.g., Funk-SVD with user/item biases trained via SGD).

2) File: index.html — Application Structure
* DOCTYPE and Language: Start with <!DOCTYPE html> and set <html lang="en">.
* Title: Use "Matrix-Factorization Movie Recommender".
* Main Heading: <h1> with "Matrix-Factorization Movie Recommender".
* Instructions: A <p> with: "Select a movie you like, and we'll recommend similar ones learned from viewing patterns."
* Training Status: Add a non-blocking status area:
    * <div id="status"></div> (show “Loading data…”, “Training epoch X/Y…”, “Model ready.”, etc.)
* Dropdown Menu: <select id="movie-select"></select> (populated dynamically).
* Button: A <button> with text "Get Recommendations" that calls getRecommendations() on click.
* Result Display Area: <div id="result-box"><p id="result"></p><ul id="recommendations"></ul></div>
* File Linking (order matters): At the end of <body>: <script src="data.js"></script>
* <script src="script.js"></script>
* 

3) File: style.css — Liquid Glass Dark UI
Create a modern glassmorphism (“liquid glass”) look with a dark-blue/blue palette.
* Page Background: Full-screen dark gradient (e.g., deep navy → rich blue).
* Main Container/Card: Centered, max-width ~900px, padding, translucent panel using background: rgba(255,255,255,0.08) + backdrop-filter: blur(16px) + subtle border and large soft shadow.
* Palette (reference):
    * Dark-blue base: #0A1F44
    * Primary blue (accents/CTA): #1E90FF
    * Muted text: #D6E4FF
* Typography: System UI or Inter/Helvetica fallback; generous line height; high contrast against dark background.
* Controls: Rounded inputs, ample padding; dropdown and button visually consistent.
* Button: Prominent primary button in blue with hover darkening and focus outline; slight glow/shadow on hover.
* Status & Result Areas: #status small and unobtrusive; #result-box uses the glass panel style; list items have subtle separators and hover highlight.
(Ensure accessibility: sufficient contrast, focus states, and readable font sizes.)

4) File: data.js — Data Handling Module (Parsing Only)
Responsible only for fetching and parsing data from local files; no ML here.
Global Structures
let movies = [];     // [{ id, title }]
let ratings = [];    // [{ userId, itemId, rating }]
// Optional: lightweight maps if useful
let itemIdToIndex = new Map(); // itemId -> 0..M-1
let userIdToIndex = new Map(); // userId -> 0..U-1
Primary Function: async function loadData()
* Use fetch() to load u.item and u.data (assume same directory as index.html).
* Wrap in try...catch. On any error, update #status with a user-friendly message.
* In the try block:
    * Fetch u.item, text(), pass to parseItemData(text).
    * Fetch u.data, text(), pass to parseRatingData(text).
* Return a Promise that resolves after both parses complete.
Parsing: parseItemData(text)
* Split text into lines; for each non-empty line:
    * Split by '|'.
    * Extract movie id (field 0) and title (field 1). Ignore genre flags (MF relies on ratings).
    * Push { id: Number(id), title } into movies.
Parsing: parseRatingData(text)
* Split text into lines; for each non-empty line:
    * Split by '\t' (tab) → [userId, itemId, rating, timestamp].
    * Push { userId: Number(userId), itemId: Number(itemId), rating: Number(rating) } into ratings.
Performance guard (important): In parseRatingData, cap to a manageable subset for browser training, e.g., the first 30,000 ratings, via a constant MAX_RATINGS = 30000. This keeps training responsive. Make the cap easy to raise/lower.
Also populate userIdToIndex and itemIdToIndex as you encounter new ids, mapping them to 0-based contiguous indices for MF matrix dimensions.

5) File: script.js — UI & Matrix Factorization Logic
Initialization
Use:
window.onload = async () => {
  setStatus("Loading data…");
  await loadData();
  populateMoviesDropdown();
  setStatus("Training Matrix Factorization model…");
  await trainMF();      // Train with requestAnimationFrame batching to keep UI responsive
  setStatus("Model ready. Select a movie to get recommendations.");
};
UI Helpers
* function setStatus(msg) → updates #status.
* function populateMoviesDropdown():
    * Sort movies alphabetically by title.
    * Create <option> elements with value = movie.id and visible text = movie.title.
MF Model (Funk-SVD with Biases, SGD)
Implement a compact MF with user/item biases:
* Model: [ \hat{r}_{ui} = \mu + b_u + b_i + p_u \cdot q_i ] where:
    * (\mu) = global mean rating
    * (b_u) = user bias, (b_i) = item bias
    * (p_u \in \mathbb{R}^K) = user latent vector
    * (q_i \in \mathbb{R}^K) = item latent vector
* Hyperparameters (constants at top of file):
    * const K = 20; // latent dimensions
    * const EPOCHS = 12; // training epochs
    * const LR = 0.01; // learning rate
    * const REG = 0.05; // L2 regularization
    * const SHUFFLE = true; // shuffle ratings each epoch
* State (declared in script.js): let mu = 0;
* let bu = [];  // length = numUsers
* let bi = [];  // length = numItems
* let P = [];   // user factors:  numUsers x K
* let Q = [];   // item factors:  numItems x K
* 
* Training Function: async function trainMF() { ... }
    * Compute mu as the mean of all observed ratings in ratings.
    * Initialize bu, bi to zeros; initialize P and Q to small random values (e.g., Math.random()*0.1 - 0.05).
    * For each epoch (1..EPOCHS):
        * Optionally shuffle ratings.
        * Loop through ratings (u, i, r) using userIdToIndex / itemIdToIndex to map to indices.
        * Predict r_hat = mu + bu[u] + bi[i] + dot(P[u], Q[i]).
        * Error: e = r - r_hat.
        * SGD updates (with L2 regularization): bu[u] += LR * (e - REG * bu[u]);
        * bi[i] += LR * (e - REG * bi[i]);
        * // Cache old factor rows
        * for (k = 0..K-1):
        *   const p = P[u][k], q = Q[i][k];
        *   P[u][k] += LR * (e * q - REG * p);
        *   Q[i][k] += LR * (e * p - REG * q);
        * 
        * After each epoch, update #status with progress (e.g., “Epoch 5/12 complete”) and await nextAnimationFrame() to keep UI responsive.
In-code comments: Explain each step: parameter roles, why biases help, what regularization does, and why we train on observed ratings only.
Item Similarity in Latent Space
* After training, normalize each Q[i] to unit length (store a normalized copy or compute on the fly).
* Implement: function topKSimilarItems(itemId, k = 5) {
*   const i = itemIdToIndex.get(itemId);
*   if (i == null) return [];
*   // Compute cosine similarity between Q[i] and all Q[j]
*   // Skip j === i; return top-k by similarity (descending)
* }
* 
* This uses MF-learned latent factors as the basis for similarity. (This is MF-based item-item similarity, not content similarity.)
Core Logic: function getRecommendations()
1. Read selected movieId from #movie-select.
2. Find likedMovie by id. If not found, show a status error and return.
3. Compute const recs = topKSimilarItems(likedMovie.id, 5).
4. Display results in #result and <ul id="recommendations"> with movie titles (and an optional similarity score truncated to 3 decimals).
Error Handling & Fallbacks
* If training fails or dataset is empty, show a friendly message in #status and degrade gracefully (e.g., recommend a few popular titles by rating count).
Performance Notes
* Respect the MAX_RATINGS cap in data.js.
* Use small await nextAnimationFrame() yields during training loops to avoid blocking.
* Keep memory usage modest; do not retain large intermediate arrays.
No External Libraries
* Do not use external dependencies. Everything must be vanilla JS, CSS, and HTML.
Comments & Documentation
* Add concise in-code comments that:
    * Explain MF and the prediction formula.
    * Clarify how SGD updates work and why we use regularization.
    * Describe how we use item latent vectors to compute similarity for recommendations.
    * Document any assumptions (rating scale, dataset size caps).

6) What to Output
Produce four clearly labeled code blocks:
1. index.html
2. style.css
3. data.js
4. script.js
Ensure that:
* The app loads u.item and u.data from the same folder as index.html.
* On load: data is parsed → MF model is trained → dropdown is populated → status updates are shown.
* Clicking Get Recommendations produces a list of MF-based similar movies.

7) Visual & UX Requirements Recap (Liquid Glass)
* Dark gradient background (deep navy → blue).
* Translucent glass container with blur and subtle border/shine.
* High-contrast, readable text.
* Blue primary CTA with smooth hover/focus.
* Responsive, centered layout; looks great on desktop and decent on mobile.
