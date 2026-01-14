const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8'; // <--- PEGA TU CLAVE DE TMDB AQUÍ
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

let myMovies = JSON.parse(localStorage.getItem('myCineData')) || [];

document.getElementById('searchBtn').addEventListener('click', searchMovies);

async function searchMovies() {
    const query = document.getElementById('searchInput').value;
    if (!query) return;
    const res = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${query}&language=es-ES`);
    const data = await res.json();
    displayResults(data.results);
}

function displayResults(movies) {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '';
    movies.slice(0, 4).forEach(movie => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <img src="${IMG_URL + movie.poster_path}" alt="${movie.title}">
            <h4>${movie.title}</h4>
            <button onclick="addMovieWithRating(${movie.id}, '${movie.title.replace(/'/g, "")}', '${movie.poster_path}')">Añadir</button>
        `;
        resultsContainer.appendChild(div);
    });
}

async function addMovieWithRating(id, title, poster) {
    if (myMovies.find(m => m.id === id)) return alert("Ya guardada");
    const rating = prompt(`Nota para "${title}" (1-10):`);
    if (!rating) return;

    const res = await fetch(`${BASE_URL}/movie/${id}/credits?api_key=${API_KEY}`);
    const credits = await res.json();
    const director = credits.crew.find(p => p.job === 'Director')?.name || 'Desconocido';
    const actors = credits.cast.slice(0, 3).map(a => a.name);

    myMovies.push({ id, title, poster, director, actors, userRating: rating });
    localStorage.setItem('myCineData', JSON.stringify(myMovies));
    renderAll();
}

function renderAll() {
    // 1. Renderizar Películas
    document.getElementById('myLibrary').innerHTML = myMovies.map(m => `
        <div class="card">
            <img src="${IMG_URL + m.poster}">
            <p><strong>${m.title}</strong></p>
            <p>⭐ ${m.userRating}/10</p>
        </div>
    `).join('');

    // 2. Extraer y Renderizar Directores (sin repetir)
    const directors = [...new Set(myMovies.map(m => m.director))];
    document.getElementById('directorList').innerHTML = directors.map(d => `
        <span class="pills">🎬 ${d}</span>
    `).join('');

    // 3. Extraer y Renderizar Actores (sin repetir)
    const actors = [...new Set(myMovies.flatMap(m => m.actors))];
    document.getElementById('actorList').innerHTML = actors.map(a => `
        <span class="pills">👤 ${a}</span>
    `).join('');

    // 4. Estadísticas
    updateStats();
}

function updateStats() {
    if (myMovies.length === 0) return;
    const statsDiv = document.getElementById('statsData');
    const allDirs = myMovies.map(m => m.director);
    const allActors = myMovies.flatMap(m => m.actors);

    statsDiv.innerHTML = `
        <p>Total películas: <strong>${myMovies.length}</strong></p>
        <p>Director favorito: <strong>${getMostFrequent(allDirs)}</strong></p>
        <p>Actor más visto: <strong>${getMostFrequent(allActors)}</strong></p>
    `;
}

function getMostFrequent(arr) {
    return arr.sort((a,b) =>
        arr.filter(v => v===a).length - arr.filter(v => v===b).length
    ).pop();
}

renderAll();
