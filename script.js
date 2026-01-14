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
            <button onclick="addMovie(${movie.id}, '${movie.title.replace(/'/g, "")}', '${movie.poster_path}')">Añadir</button>
        `;
        resultsContainer.appendChild(div);
    });
}

async function addMovie(id, title, poster) {
    if (myMovies.find(m => m.id === id)) return alert("Ya guardada");
    const rating = prompt(`Nota para "${title}" (1-10):`);
    if (!rating) return;

    const res = await fetch(`${BASE_URL}/movie/${id}/credits?api_key=${API_KEY}`);
    const credits = await res.json();
    
    const dirObj = credits.crew.find(p => p.job === 'Director');
    const director = {
        name: dirObj?.name || 'Desconocido',
        photo: dirObj?.profile_path ? IMG_URL + dirObj.profile_path : 'https://via.placeholder.com/150'
    };

    const actors = credits.cast.slice(0, 3).map(a => ({
        name: a.name,
        photo: a.profile_path ? IMG_URL + a.profile_path : 'https://via.placeholder.com/150'
    }));

    myMovies.push({ id, title, poster, director, actors, userRating: rating });
    localStorage.setItem('myCineData', JSON.stringify(myMovies));
    renderAll();
}

// NUEVA FUNCIÓN: Cambiar foto al hacer clic
function changePhoto(name, type) {
    const newUrl = prompt(`Introduce la URL de la nueva foto para: ${name}`);
    if (!newUrl) return;

    myMovies.forEach(movie => {
        // Si es director y coincide el nombre, actualizamos
        if (type === 'dir' && movie.director.name === name) {
            movie.director.photo = newUrl;
        }
        // Si es actor, buscamos en su lista de actores
        if (type === 'act') {
            movie.actors.forEach(actor => {
                if (actor.name === name) actor.photo = newUrl;
            });
        }
    });

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
        </div>
    `).join('');

    // Renderizado de Directores (con click para editar)
    const uniqueDirs = Array.from(new Set(myMovies.map(m => m.director.name)))
        .map(name => myMovies.find(m => m.director.name === name).director);
    
    document.getElementById('directorList').innerHTML = uniqueDirs.map(d => `
        <div class="person-card" onclick="changePhoto('${d.name}', 'dir')" style="cursor:pointer">
            <img src="${d.photo}" onerror="this.src='https://via.placeholder.com/150'" title="Haz clic para cambiar foto">
            <p>${d.name}</p>
        </div>
    `).join('');

    // Renderizado de Actores (con click para editar)
    const allActors = myMovies.flatMap(m => m.actors);
    const uniqueActors = Array.from(new Set(allActors.map(a => a.name)))
        .map(name => allActors.find(a => a.name === name));

    document.getElementById('actorList').innerHTML = uniqueActors.map(a => `
        <div class="person-card" onclick="changePhoto('${a.name}', 'act')" style="cursor:pointer">
            <img src="${a.photo}" onerror="this.src='https://via.placeholder.com/150'" title="Haz clic para cambiar foto">
            <p>${a.name}</p>
        </div>
    `).join('');
}

renderAll();
