// Global variables
let movies = [];
let ratings = [];

// Genre names in fixed order (as per the MovieLens dataset)
const GENRE_NAMES = [
    "Action", "Adventure", "Animation", "Children's", "Comedy", "Crime",
    "Documentary", "Drama", "Fantasy", "Film-Noir", "Horror", "Musical",
    "Mystery", "Romance", "Sci-Fi", "Thriller", "War", "Western"
];

// Primary function to load data
async function loadData() {
    try {
        // Fetch and parse the actual data files
        const [itemResponse, dataResponse] = await Promise.all([
            fetch('u.item'),
            fetch('u.data')
        ]);

        if (!itemResponse.ok || !dataResponse.ok) {
            throw new Error('Failed to load data files');
        }

        const itemText = await itemResponse.text();
        const dataText = await dataResponse.text();

        // Parse the data
        parseItemData(itemText);
        parseRatingData(dataText);
        
        // Update UI to show data is loaded
        if (document.getElementById('result')) {
            document.getElementById('result').textContent = `Data loaded. ${movies.length} movies available. Please select a movie.`;
            document.getElementById('result').className = "success";
        }
        
        return Promise.resolve();
    } catch (error) {
        console.error("Error loading data:", error);
        if (document.getElementById('result')) {
            document.getElementById('result').textContent = "Error loading movie data. Please make sure u.item and u.data files are in the same directory.";
            document.getElementById('result').className = "error";
        }
        return Promise.reject(error);
    }
}

// Parse movie/item data from u.item file
function parseItemData(text) {
    const lines = text.split('\n');
    
    for (const line of lines) {
        if (line.trim() === '') continue;
        
        const fields = line.split('|');
        if (fields.length < 24) continue; // Skip invalid lines
        
        const id = parseInt(fields[0]);
        const title = fields[1];
        
        // Extract genre flags (last 18 fields)
        const genreFlags = fields.slice(6, 24); // Genres are fields 6-23
        
        // Build genres array and binary vector
        const genres = [];
        const vector = [];
        
        for (let i = 0; i < GENRE_NAMES.length; i++) {
            const flag = parseInt(genreFlags[i]) || 0;
            vector.push(flag);
            
            if (flag === 1) {
                genres.push(GENRE_NAMES[i]);
            }
        }
        
        movies.push({
            id: id,
            title: title,
            genres: genres,
            vector: vector
        });
    }
}

// Parse rating data from u.data file
function parseRatingData(text) {
    const lines = text.split('\n');
    
    for (const line of lines) {
        if (line.trim() === '') continue;
        
        const fields = line.split('\t');
        if (fields.length < 4) continue; // Skip invalid lines
        
        const userId = parseInt(fields[0]);
        const itemId = parseInt(fields[1]);
        const rating = parseInt(fields[2]);
        const timestamp = parseInt(fields[3]);
        
        ratings.push({
            userId: userId,
            itemId: itemId,
            rating: rating,
            timestamp: timestamp
        });
    }
}
