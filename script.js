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
            <button onclick="saveMovie(${movie.id}, '${movie.title.replace(/'/g, "")}', '${movie.poster_path}')">Añadir</button>
        `;
        resultsContainer.appendChild(div);
    });
}

async function saveMovie(id, title, poster) {
    if (myMovies.find(m => m.id === id)) return alert("Ya la tienes guardada");

    const res = await fetch(`${BASE_URL}/movie/${id}/credits?api_key=${API_KEY}`);
    const credits = await res.json();
    
    const director = credits.crew.find(p => p.job === 'Director')?.name || 'Desconocido';
    const actors = credits.cast.slice(0, 3).map(a => a.name);

    myMovies.push({ id, title, poster, director, actors });
    localStorage.setItem('myCineData', JSON.stringify(myMovies));
    renderAll();
}

function renderAll() {
    document.getElementById('myLibrary').innerHTML = myMovies.map(m => `
        <div class="card">
            <img src="${IMG_URL + m.poster}">
            <p>${m.title}</p>
        </div>
    `).join('');

    const statsDiv = document.getElementById('statsData');
    if (myMovies.length === 0) return;

    const directors = myMovies.map(m => m.director);
    const actors = myMovies.flatMap(m => m.actors);

    statsDiv.innerHTML = `
        <p>🎬 Total: <strong>${myMovies.length}</strong> películas</p>
        <p>🎥 Director favorito: <strong>${getMostFrequent(directors)}</strong></p>
        <p>🌟 Actor más visto: <strong>${getMostFrequent(actors)}</strong></p>
    `;
}

function getMostFrequent(arr) {
    return arr.sort((a,b) =>
        arr.filter(v => v===a).length - arr.filter(v => v===b).length
    ).pop();
}

renderAll(); // Carga inicial
