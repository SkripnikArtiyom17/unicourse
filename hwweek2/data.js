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
        // In a real implementation, we would fetch from actual files
        // For this demo, we'll use mock data that simulates the structure
        
        // Mock u.item data (movie information)
        const mockItemData = `1|Toy Story (1995)|01-Jan-1995||http://us.imdb.com/M/title-exact?Toy%20Story%20(1995)|0|0|0|1|1|1|0|0|0|0|0|0|0|0|0|0|0|0|0
2|GoldenEye (1995)|01-Jan-1995||http://us.imdb.com/M/title-exact?GoldenEye%20(1995)|0|1|0|0|0|0|0|0|0|0|0|0|0|0|1|0|1|0
3|Four Rooms (1995)|01-Jan-1995||http://us.imdb.com/M/title-exact?Four%20Rooms%20(1995)|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0
4|Get Shorty (1995)|01-Jan-1995||http://us.imdb.com/M/title-exact?Get%20Shorty%20(1995)|0|1|0|0|1|0|0|0|0|0|0|0|0|0|0|0|0|0
5|Copycat (1995)|01-Jan-1995||http://us.imdb.com/M/title-exact?Copycat%20(1995)|0|0|0|0|0|1|0|1|0|0|0|0|0|0|0|1|0|0
6|Shanghai Triad (1995)|01-Jan-1995||http://us.imdb.com/M/title-exact?Shanghai%20Triad%20(1995)|0|0|0|0|0|0|0|1|0|0|0|0|0|0|0|0|0|0
7|Twelve Monkeys (1995)|01-Jan-1995||http://us.imdb.com/M/title-exact?Twelve%20Monkeys%20(1995)|0|0|0|0|0|0|0|1|0|0|0|0|0|1|0|0|0|0
8|Babe (1995)|01-Jan-1995||http://us.imdb.com/M/title-exact?Babe%20(1995)|0|0|0|1|1|0|0|1|0|0|0|0|0|0|0|0|0|0
9|Dead Man Walking (1995)|01-Jan-1995||http://us.imdb.com/M/title-exact?Dead%20Man%20Walking%20(1995)|0|0|0|0|0|0|0|1|0|0|0|0|0|0|0|0|0|0
10|Richard III (1995)|01-Jan-1995||http://us.imdb.com/M/title-exact?Richard%20III%20(1995)|0|0|0|0|0|0|0|1|0|0|0|0|0|0|0|0|1|0`;

        // Mock u.data (ratings data)
        const mockRatingData = `196\t242\t3\t881250949
186\t302\t3\t891717742
22\t377\t1\t878887116
244\t51\t2\t880606923
166\t346\t1\t886397596
298\t474\t4\t884182806
115\t265\t2\t881171488
253\t465\t5\t891628467
305\t451\t3\t886324817
6\t86\t3\t883603013`;

        // Parse the mock data
        parseItemData(mockItemData);
        parseRatingData(mockRatingData);
        
        // Update UI to show data is loaded
        if (document.getElementById('result')) {
            document.getElementById('result').textContent = "Data loaded. Please select a movie.";
            document.getElementById('result').className = "success";
        }
        
        return Promise.resolve();
    } catch (error) {
        console.error("Error loading data:", error);
        if (document.getElementById('result')) {
            document.getElementById('result').textContent = "Error loading movie data. Please refresh the page.";
            document.getElementById('result').className = "error";
        }
        return Promise.reject(error);
    }
}

// Parse movie/item data
function parseItemData(text) {
    const lines = text.split('\n');
    
    for (const line of lines) {
        if (line.trim() === '') continue;
        
        const fields = line.split('|');
        const id = parseInt(fields[0]);
        const title = fields[1];
        
        // Extract genre flags (last 18 fields)
        const genreFlags = fields.slice(5, 23); // Adjust indices based on actual data structure
        
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

// Parse rating data
function parseRatingData(text) {
    const lines = text.split('\n');
    
    for (const line of lines) {
        if (line.trim() === '') continue;
        
        const fields = line.split('\t');
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
