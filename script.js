const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8'; // <--- PEGA TU CLAVE DE TMDB AQUÍ
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w200'; 

let myMovies = JSON.parse(localStorage.getItem('myCineData')) || [];

document.getElementById('searchBtn').addEventListener('click', searchMovies);

// 1. BUSCAR PELÍCULAS
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

// 2. AÑADIR PELÍCULA Y EXTRAER EQUIPO AUTOMÁTICAMENTE
async function addMovie(id, title, poster) {
    if (myMovies.find(m => m.id === id)) return alert("Ya guardada");
    const rating = prompt(`Nota para "${title}" (1-10):`);
    if (!rating) return;

    const res = await fetch(`${BASE_URL}/movie/${id}/credits?api_key=${API_KEY}`);
    const credits = await res.json();
    
    const getPhoto = (path) => path ? IMG_URL + path : 'https://via.placeholder.com/200x200?text=Sin+Foto';

    // Director
    const dirObj = credits.crew.find(p => p.job === 'Director');
    const director = { name: dirObj?.name || 'Desconocido', photo: getPhoto(dirObj?.profile_path) };

    // Reparto Completo
    const actors = credits.cast.map(a => ({ name: a.name, photo: getPhoto(a.profile_path) }));

    // Guionistas (Department: Writing)
    const writers = credits.crew
        .filter(p => p.department === 'Writing')
        .map(w => ({ name: w.name, photo: getPhoto(w.profile_path) }));

    // Productores (Department: Production)
    const producers = credits.crew
        .filter(p => p.department === 'Production')
        .map(p => ({ name: p.name, photo: getPhoto(p.profile_path) }));

    myMovies.push({ id, title, poster: IMG_URL + poster, director, actors, writers, producers, userRating: rating });
    localStorage.setItem('myCineData', JSON.stringify(myMovies));
    renderAll();
}

// 3. EDITAR FOTOS HACIENDO CLIC
function editImg(name, type) {
    const newUrl = prompt(`Nueva URL de imagen para ${name}:`);
    if (!newUrl) return;

    myMovies.forEach(m => {
        if (type === 'dir' && m.director.name === name) m.director.photo = newUrl;
        if (type === 'act') m.actors.forEach(a => { if(a.name === name) a.photo = newUrl; });
        if (type === 'wri') m.writers.forEach(w => { if(w.name === name) w.photo = newUrl; });
        if (type === 'pro') m.producers.forEach(p => { if(p.name === name) p.photo = newUrl; });
    });

    localStorage.setItem('myCineData', JSON.stringify(myMovies));
    renderAll();
}

// 4. RENDERIZAR TODO
function renderAll() {
    // Películas
    document.getElementById('myLibrary').innerHTML = myMovies.map(m => `
        <div class="card">
            <img src="${m.poster}">
            <p><strong>${m.title}</strong></p>
            <p>⭐ ${m.userRating}/10</p>
        </div>
    `).join('');

    // Secciones de Personas (Usamos función genérica para no repetir código)
    renderPeople('directorList', myMovies.map(m => m.director), 'dir');
    renderPeople('actorList', myMovies.flatMap(m => m.actors), 'act');
    renderPeople('writerList', myMovies.flatMap(m => m.writers), 'wri');
    renderPeople('producerList', myMovies.flatMap(m => m.producers), 'pro');

    updateStats();
}

function renderPeople(containerId, peopleArray, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Eliminar duplicados por nombre
    const uniquePeople = Array.from(new Set(peopleArray.map(p => p.name)))
        .map(name => peopleArray.find(p => p.name === name));

    container.innerHTML = uniquePeople.map(p => `
        <div class="person-card" onclick="editImg('${p.name}', '${type}')" style="cursor:pointer">
            <img src="${p.photo}" onerror="this.src='https://via.placeholder.com/200x200?text=Sin+Foto'">
            <p>${p.name}</p>
        </div>
    `).join('');
}

function updateStats() {
    const statsDiv = document.getElementById('statsData');
    if (myMovies.length === 0) return;

    const allDirs = myMovies.map(m => m.director.name);
    const allActors = myMovies.flatMap(m => m.actors.map(a => a.name));

    statsDiv.innerHTML = `
        <p>Total películas: <strong>${myMovies.length}</strong></p>
        <p>Director favorito: <strong>${getMostFrequent(allDirs)}</strong></p>
        <p>Actor más visto: <strong>${getMostFrequent(allActors)}</strong></p>
        <button onclick="clearAll()" style="margin-top:10px; background:#444; font-size:10px">Borrar Biblioteca</button>
    `;
}

function getMostFrequent(arr) {
    if (arr.length === 0) return "-";
    return arr.sort((a,b) =>
        arr.filter(v => v===a).length - arr.filter(v => v===b).length
    ).pop();
}

function clearAll() {
    if(confirm("¿Borrar todo?")) {
        myMovies = [];
        localStorage.removeItem('myCineData');
        renderAll();
    }
}

renderAll();
