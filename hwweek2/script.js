// Initialize the application when the window loads
window.onload = async () => {
    try {
        // Show loading message
        document.getElementById('result').textContent = "Loading movie data...";
        document.getElementById('result').className = "loading";
        
        // Disable the button until data is loaded
        document.getElementById('recommend-btn').disabled = true;
        
        // Load data
        await loadData();
        
        // Populate the dropdown
        populateMoviesDropdown();
        
        // Enable the button
        document.getElementById('recommend-btn').disabled = false;
        
        // Set up event listener for the button
        document.getElementById('recommend-btn').addEventListener('click', getRecommendations);
        
    } catch (error) {
        console.error("Initialization error:", error);
        document.getElementById('result').textContent = "Error initializing application. Please refresh the page.";
        document.getElementById('result').className = "error";
    }
};

// Populate the movies dropdown
function populateMoviesDropdown() {
    const movieSelect = document.getElementById('movie-select');
    
    // Clear existing options except the first one
    while (movieSelect.options.length > 1) {
        movieSelect.remove(1);
    }
    
    // Sort movies alphabetically by title
    const sortedMovies = [...movies].sort((a, b) => a.title.localeCompare(b.title));
    
    // Add movies to dropdown
    sortedMovies.forEach(movie => {
        const option = document.createElement('option');
        option.value = movie.id;
        option.textContent = movie.title;
        movieSelect.appendChild(option);
    });
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(vecA, vecB) {
    // Calculate dot product
    let dotProduct = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
    }
    
    // Calculate magnitudes
    let magnitudeA = 0;
    let magnitudeB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
        magnitudeA += vecA[i] * vecA[i];
        magnitudeB += vecB[i] * vecB[i];
    }
    
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);
    
    // Avoid division by zero
    if (magnitudeA === 0 || magnitudeB === 0) {
        return 0;
    }
    
    // Return cosine similarity
    return dotProduct / (magnitudeA * magnitudeB);
}

// Main recommendation function
function getRecommendations() {
    const movieSelect = document.getElementById('movie-select');
    const selectedId = parseInt(movieSelect.value);
    
    // Validate selection
    if (isNaN(selectedId)) {
        document.getElementById('result').textContent = "Please select a movie first.";
        document.getElementById('result').className = "error";
        return;
    }
    
    // Find the selected movie
    const likedMovie = movies.find(m => m.id === selectedId);
    
    if (!likedMovie) {
        document.getElementById('result').textContent = "Selected movie not found in database.";
        document.getElementById('result').className = "error";
        return;
    }
    
    // Show loading message
    document.getElementById('result').textContent = "Finding recommendations...";
    document.getElementById('result').className = "loading";
    
    // Calculate recommendations (with a small delay to show loading state)
    setTimeout(() => {
        // Filter out the selected movie
        const candidateMovies = movies.filter(m => m.id !== likedMovie.id);
        
        // Calculate similarity scores
        const scoredMovies = candidateMovies.map(movie => ({
            ...movie,
            score: cosineSimilarity(likedMovie.vector, movie.vector)
        }));
        
        // Sort by score (descending)
        scoredMovies.sort((a, b) => b.score - a.score);
        
        // Get top recommendations
        const topTwo = scoredMovies.slice(0, 2);
        
        // Display results
        displayRecommendations(likedMovie, topTwo);
    }, 500);
}

// Display recommendations in the UI
function displayRecommendations(likedMovie, recommendations) {
    const resultElement = document.getElementById('result');
    
    if (recommendations.length === 0) {
        resultElement.textContent = "No recommendations found.";
        resultElement.className = "error";
        return;
    }
    
    // Create the main message
    let html = `<p class="success">Because you liked <strong>"${likedMovie.title}"</strong>, we recommend:</p>`;
    html += '<div class="movie-list">';
    
    // Add each recommendation
    recommendations.forEach(movie => {
        html += `
        <div class="movie-item">
            <div class="movie-title">${movie.title}</div>
            <div class="movie-genres">Genres: ${movie.genres.join(', ')}</div>
            <div class="similarity-score">Similarity: ${(movie.score * 100).toFixed(1)}%</div>
        </div>`;
    });
    
    html += '</div>';
    
    resultElement.innerHTML = html;
    resultElement.className = "success";
}
