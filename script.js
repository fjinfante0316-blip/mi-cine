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
            <button onclick="addMovieManual(${movie.id}, '${movie.title.replace(/'/g, "")}', '${movie.poster_path}')">Añadir</button>
        `;
        resultsContainer.appendChild(div);
    });
}

async function addMovieManual(id, title, poster) {
    if (myMovies.find(m => m.id === id)) return alert("Ya guardada");
    
    // 1. Pedir Nota
    const rating = prompt(`Nota para "${title}" (1-10):`);
    if (!rating) return;

    // Obtener datos automáticos de respaldo
    const res = await fetch(`${BASE_URL}/movie/${id}/credits?api_key=${API_KEY}`);
    const credits = await res.json();
    
    // 2. Director: Preguntar por URL manual
    const dirObj = credits.crew.find(p => p.job === 'Director');
    const dirName = dirObj?.name || 'Desconocido';
    const dirAutoPhoto = dirObj?.profile_path ? IMG_URL + dirObj.profile_path : 'https://via.placeholder.com/150';
    
    const dirManualPhoto = prompt(`URL de foto para el Director (${dirName}). Deja vacío para auto:`);
    const director = {
        name: dirName,
        photo: dirManualPhoto || dirAutoPhoto
    };

    // 3. Actores: Preguntar por URL manual (solo el primero para no agobiarte, o los que quieras)
    const actors = [];
    const mainActors = credits.cast.slice(0, 3);
    
    for (let a of mainActors) {
        const autoPhoto = a.profile_path ? IMG_URL + a.profile_path : 'https://via.placeholder.com/150';
        const manualPhoto = prompt(`URL de foto para ${a.name}. Deja vacío para auto:`);
        actors.push({
            name: a.name,
            photo: manualPhoto || autoPhoto
        });
    }

    myMovies.push({ id, title, poster, director, actors, userRating: rating });
    localStorage.setItem('myCineData', JSON.stringify(myMovies));
    renderAll();
}

function renderAll() {
    // Renderizado de Películas
    document.getElementById('myLibrary').innerHTML = myMovies.map(m => `
        <div class="card">
            <img src="${IMG_URL + m.poster}">
            <p><strong>${m.title}</strong></p>
            <p>⭐ ${m.userRating}/10</p>
            <button onclick="deleteMovie(${m.id})" style="background:gray; font-size:10px">Eliminar</button>
        </div>
    `).join('');

    // Renderizado de Directores
    const uniqueDirs = Array.from(new Set(myMovies.map(m => m.director.name)))
        .map(name => myMovies.find(m => m.director.name === name).director);
    
    document.getElementById('directorList').innerHTML = uniqueDirs.map(d => `
        <div class="person-card">
            <img src="${d.photo}" onerror="this.src='https://via.placeholder.com/150'" alt="${d.name}">
            <p>${d.name}</p>
        </div>
    `).join('');

    // Renderizado de Actores
    const allActors = myMovies.flatMap(m => m.actors);
    const uniqueActors = Array.from(new Set(allActors.map(a => a.name)))
        .map(name => allActors.find(a => a.name === name));

    document.getElementById('actorList').innerHTML = uniqueActors.map(a => `
        <div class="person-card">
            <img src="${a.photo}" onerror="this.src='https://via.placeholder.com/150'" alt="${a.name}">
            <p>${a.name}</p>
        </div>
    `).join('');
}

function deleteMovie(id) {
    myMovies = myMovies.filter(m => m.id !== id);
    localStorage.setItem('myCineData', JSON.stringify(myMovies));
    renderAll();
}

renderAll();
