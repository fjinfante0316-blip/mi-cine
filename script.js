const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8'; // <--- PEGA TU CLAVE DE TMDB AQUÍ
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w300';

let myMovies = JSON.parse(localStorage.getItem('myCineData')) || [];

// --- LÓGICA DEL MENÚ Y NAVEGACIÓN ---
function toggleMenu() {
    const menu = document.getElementById("sideMenu");
    menu.style.width = menu.style.width === "250px" ? "0" : "250px";
}

function showSection(sectionId) {
    // Ocultar todas las secciones
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    // Mostrar la elegida
    document.getElementById(sectionId).style.display = 'block';
    // Cerrar menú
    toggleMenu();
}

// --- BÚSQUEDA Y RESULTADOS ---
document.getElementById('searchBtn').addEventListener('click', async () => {
    const query = document.getElementById('searchInput').value;
    if (!query) return;
    const res = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${query}&language=es-ES`);
    const data = await res.json();
    
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = data.results.slice(0, 4).map(movie => `
        <div class="card">
            <img src="${IMG_URL + movie.poster_path}" alt="${movie.title}">
            <h4>${movie.title}</h4>
            <button onclick="addMovie(${movie.id}, '${movie.title.replace(/'/g, "")}', '${movie.poster_path}')">Añadir</button>
        </div>
    `).join('');
});

// --- AÑADIR PELÍCULA Y TODO EL REPARTO/EQUIPO ---
async function addMovie(id, title, poster) {
    if (myMovies.find(m => m.id === id)) return alert("Ya la tienes guardada");
    const rating = prompt(`¿Qué nota le das a "${title}"? (1-10)`);
    if (!rating) return;

    const res = await fetch(`${BASE_URL}/movie/${id}/credits?api_key=${API_KEY}`);
    const credits = await res.json();
    
    const getPhoto = (p) => p ? IMG_URL + p : 'https://via.placeholder.com/200x200?text=Sin+Foto';

    const movieData = {
        id, title, rating,
        poster: IMG_URL + poster,
        director: { 
            name: credits.crew.find(c => c.job === 'Director')?.name || '?', 
            photo: getPhoto(credits.crew.find(c => c.job === 'Director')?.profile_path) 
        },
        actors: credits.cast.map(a => ({ name: a.name, photo: getPhoto(a.profile_path) })),
        writers: credits.crew.filter(c => c.department === 'Writing').map(w => ({ name: w.name, photo: getPhoto(w.profile_path) })),
        producers: credits.crew.filter(c => c.department === 'Production').map(p => ({ name: p.name, photo: getPhoto(p.profile_path) }))
    };

    myMovies.push(movieData);
    localStorage.setItem('myCineData', JSON.stringify(myMovies));
    renderAll();
    alert("¡Película añadida! Revisa el menú lateral.");
}

// --- RENDERIZADO DE BIBLIOTECA ---
function renderAll() {
    // 1. Películas
    document.getElementById('myLibrary').innerHTML = myMovies.map(m => `
        <div class="card">
            <img src="${m.poster}">
            <p><strong>${m.title}</strong></p>
            <p>⭐ Nota: ${m.rating}</p>
        </div>
    `).join('');

    // 2. Directores, Actores, Guionistas y Productores
    renderPeople('directorList', myMovies.map(m => m.director), 'dir');
    renderPeople('actorList', myMovies.flatMap(m => m.actors), 'act');
    renderPeople('writerList', myMovies.flatMap(m => m.writers), 'wri');
    renderPeople('producerList', myMovies.flatMap(m => m.producers), 'pro');
}

function renderPeople(containerId, peopleArray, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Quitar duplicados por nombre
    const uniquePeople = Array.from(new Set(peopleArray.map(p => p.name)))
        .map(name => peopleArray.find(p => p.name === name));

    container.innerHTML = uniquePeople.map(p => `
        <div class="person-card" onclick="editImg('${p.name}', '${type}')">
            <img src="${p.photo}" onerror="this.src='https://via.placeholder.com/200x200?text=Sin+Foto'">
            <p>${p.name}</p>
        </div>
    `).join('');
}

// EDITAR FOTO MEDIANTE CLIC
function editImg(name, type) {
    const newUrl = prompt(`URL de la nueva foto para ${name}:`);
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

renderAll();
