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
            <button onclick="addMovieWithRating(${movie.id}, '${movie.title.replace(/'/g, "")}', '${movie.poster_path}')">Añadir a mi lista</button>
        `;
        resultsContainer.appendChild(div);
    });
}

async function addMovieWithRating(id, title, poster) {
    if (myMovies.find(m => m.id === id)) return alert("Ya la tienes guardada");

    // 1. Tú solo pones la nota cuando te lo pregunte el navegador
    const rating = prompt(`¿Qué nota le das a "${title}"? (1-10)`);
    if (rating === null || rating === "") return; 

    // 2. El sistema busca AUTOMÁTICAMENTE director y actores en TMDB
    const res = await fetch(`${BASE_URL}/movie/${id}/credits?api_key=${API_KEY}`);
    const credits = await res.json();
    
    const director = credits.crew.find(p => p.job === 'Director')?.name || 'Desconocido';
    const actors = credits.cast.slice(0, 3).map(a => a.name);

    // 3. Guarda todo y actualiza las estadísticas
    myMovies.push({ id, title, poster, director, actors, userRating: rating });
    localStorage.setItem('myCineData', JSON.stringify(myMovies));
    renderAll();
}

function renderAll() {
    document.getElementById('myLibrary').innerHTML = myMovies.map(m => `
        <div class="card">
            <img src="${IMG_URL + m.poster}">
            <p><strong>${m.title}</strong></p>
            <p>⭐ Nota: ${m.userRating}</p>
        </div>
    `).join('');

    const statsDiv = document.getElementById('statsData');
    if (myMovies.length === 0) return;

    const directors = myMovies.map(m => m.director);
    const actors = myMovies.flatMap(m => m.actors);

    statsDiv.innerHTML = `
        <p>🎬 Total en biblioteca: <strong>${myMovies.length}</strong></p>
        <p>🎥 Director más visto: <strong>${getMostFrequent(directors)}</strong></p>
        <p>🌟 Actor favorito: <strong>${getMostFrequent(actors)}</strong></p>
    `;
}

function getMostFrequent(arr) {
    return arr.sort((a,b) =>
        arr.filter(v => v===a).length - arr.filter(v => v===b).length
    ).pop();
}

renderAll();

renderAll(); // Carga inicial
