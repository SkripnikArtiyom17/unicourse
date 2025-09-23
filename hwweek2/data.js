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
        console.log("Starting to load data files...");
        
        // Fetch the actual data files
        const itemResponse = await fetch('u.item');
        const dataResponse = await fetch('u.data');

        if (!itemResponse.ok) {
            throw new Error(`Failed to load u.item: ${itemResponse.status}`);
        }
        if (!dataResponse.ok) {
            throw new Error(`Failed to load u.data: ${dataResponse.status}`);
        }

        const itemText = await itemResponse.text();
        const dataText = await dataResponse.text();

        console.log("Files loaded successfully");
        console.log("u.item length:", itemText.length);
        console.log("u.data length:", dataText.length);

        // Clear previous data
        movies = [];
        ratings = [];

        // Parse the data
        parseItemData(itemText);
        parseRatingData(dataText);
        
        console.log(`Parsed ${movies.length} movies and ${ratings.length} ratings`);
        
        // Update UI to show data is loaded
        if (document.getElementById('result')) {
            document.getElementById('result').textContent = `Data loaded. ${movies.length} movies available. Please select a movie.`;
            document.getElementById('result').className = "success";
        }
        
        return Promise.resolve();
    } catch (error) {
        console.error("Error loading data:", error);
        if (document.getElementById('result')) {
            document.getElementById('result').textContent = `Error loading movie data: ${error.message}. Please make sure u.item and u.data files are in the same directory.`;
            document.getElementById('result').className = "error";
        }
        return Promise.reject(error);
    }
}

// Parse movie/item data from u.item file
function parseItemData(text) {
    const lines = text.split('\n');
    console.log(`Found ${lines.length} lines in u.item`);
    
    let parsedCount = 0;
    
    for (const line of lines) {
        if (line.trim() === '') continue;
        
        const fields = line.split('|');
        
        // The u.item file should have 24 fields (movie id, title, release date, etc. + 18 genres)
        if (fields.length < 24) {
            console.warn('Skipping line with insufficient fields:', line);
            continue;
        }
        
        const id = parseInt(fields[0]);
        if (isNaN(id)) {
            console.warn('Skipping line with invalid ID:', line);
            continue;
        }
        
        const title = fields[1];
        
        // Extract genre flags (fields 6-23 are the 18 genre flags)
        const genreFlags = fields.slice(6, 24);
        
        // Build genres array and binary vector
        const genres = [];
        const vector = [];
        
        for (let i = 0; i < GENRE_NAMES.length && i < genreFlags.length; i++) {
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
        
        parsedCount++;
    }
    
    console.log(`Successfully parsed ${parsedCount} movies`);
}

// Parse rating data from u.data file
function parseRatingData(text) {
    const lines = text.split('\n');
    console.log(`Found ${lines.length} lines in u.data`);
    
    let parsedCount = 0;
    
    for (const line of lines) {
        if (line.trim() === '') continue;
        
        const fields = line.split('\t');
        if (fields.length < 4) continue;
        
        const userId = parseInt(fields[0]);
        const itemId = parseInt(fields[1]);
        const rating = parseInt(fields[2]);
        const timestamp = parseInt(fields[3]);
        
        if (isNaN(userId) || isNaN(itemId) || isNaN(rating)) {
            continue;
        }
        
        ratings.push({
            userId: userId,
            itemId: itemId,
            rating: rating,
            timestamp: timestamp
        });
        
        parsedCount++;
    }
    
    console.log(`Successfully parsed ${parsedCount} ratings`);
}
