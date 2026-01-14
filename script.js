const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8'; // <--- PEGA TU CLAVE DE TMDB AQUÍ
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w300';

let myMovies = JSON.parse(localStorage.getItem('myCineData')) || [];
let genreChart = null;
let countryChart = null;

// --- 1. NAVEGACIÓN Y MENÚ ---
function toggleMenu() {
    const menu = document.getElementById("sideMenu");
    menu.style.width = (menu.style.width === "250px") ? "0" : "250px";
}

function showSection(sectionId) {
    // Ocultar todas las secciones
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    
    // Mostrar la sección seleccionada
    const target = document.getElementById(sectionId);
    if (target) target.style.display = 'block';

    // Si es la sección de estadísticas, refrescar gráficos
    if (sectionId === 'stats') {
        updateStatistics();
    }

    toggleMenu();
}

// --- 2. BÚSQUEDA DE PELÍCULAS ---
document.getElementById('searchBtn').addEventListener('click', async () => {
    const query = document.getElementById('searchInput').value;
    if (!query) return;

    const res = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${query}&language=es-ES`);
    const data = await res.json();
    
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = data.results.slice(0, 4).map(movie => `
        <div class="card">
            <img src="${movie.poster_path ? IMG_URL + movie.poster_path : 'https://via.placeholder.com/300x450?text=Sin+Póster'}">
            <h4>${movie.title}</h4>
            <button onclick="addMovie(${movie.id}, '${movie.title.replace(/'/g, "")}', '${movie.poster_path}')">Añadir</button>
        </div>
    `).join('');
});

// --- 3. AÑADIR PELÍCULA CON DATOS EXTRA (DURACIÓN, PAÍS, GÉNERO) ---
async function addMovie(id, title, poster) {
    if (myMovies.find(m => m.id === id)) return alert("Ya está en tu biblioteca");
    
    const rating = prompt(`¿Qué nota le das a "${title}"? (1-10)`);
    if (!rating) return;

    // Obtener detalles (duración, géneros, países)
    const dRes = await fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}&language=es-ES`);
    const d = await dRes.json();

    // Obtener créditos (reparto limitado a 5, director, etc.)
    const cRes = await fetch(`${BASE_URL}/movie/${id}/credits?api_key=${API_KEY}`);
    const credits = await cRes.json();
    
    const getPhoto = (p) => p ? IMG_URL + p : 'https://via.placeholder.com/200x200?text=Sin+Foto';

    const movieData = {
        id, 
        title, 
        rating,
        poster: IMG_URL + poster,
        runtime: d.runtime || 0,
        genres: d.genres.map(g => g.name),
        countries: d.production_countries.map(c => c.name),
        director: { 
            name: credits.crew.find(c => c.job === 'Director')?.name || 'Desconocido', 
            photo: getPhoto(credits.crew.find(c => c.job === 'Director')?.profile_path) 
        },
        actors: credits.cast.slice(0, 5).map(a => ({ name: a.name, photo: getPhoto(a.profile_path) })),
        writers: credits.crew.filter(c => c.department === 'Writing').slice(0, 2).map(w => ({ name: w.name, photo: getPhoto(w.profile_path) })),
        producers: credits.crew.filter(c => c.department === 'Production').slice(0, 2).map(p => ({ name: p.name, photo: getPhoto(p.profile_path) }))
    };

    myMovies.push(movieData);
    localStorage.setItem('myCineData', JSON.stringify(myMovies));
    renderAll();
    alert("¡Película añadida con éxito!");
}

// --- 4. LÓGICA DE ESTADÍSTICAS Y GRÁFICOS ---
function updateStatistics() {
    if (myMovies.length === 0) return;

    // Horas y Países (Texto)
    const totalMinutes = myMovies.reduce((acc, m) => acc + (m.runtime || 0), 0);
    document.getElementById('statHours').innerText = Math.floor(totalMinutes / 60);

    const countriesSet = new Set(myMovies.flatMap(m => m.countries || []));
    document.getElementById('statCountries').innerText = countriesSet.size;

    // Gráfico de Géneros
    const genreData = {};
    myMovies.flatMap(m => m.genres || []).forEach(g => genreData[g] = (genreData[g] || 0) + 1);

    if (genreChart) genreChart.destroy();
    genreChart = new Chart(document.getElementById('genreChart'), {
        type: 'polarArea',
        data: {
            labels: Object.keys(genreData),
            datasets: [{
                data: Object.values(genreData),
                backgroundColor: ['#e50914', '#b9090b', '#333', '#f5f5f1', '#831010'],
                borderWidth: 0
            }]
        },
        options: {
            plugins: { legend: { position: 'bottom', labels: { color: 'white' } } },
            scales: { r: { grid: { color: '#444' }, ticks: { display: false } } }
        }
    });

    // Gráfico de Países
    const countryData = {};
    myMovies.flatMap(m => m.countries || []).forEach(c => countryData[c] = (countryData[c] || 0) + 1);

    if (countryChart) countryChart.destroy();
    countryChart = new Chart(document.getElementById('countryChart'), {
        type: 'bar',
        data: {
            labels: Object.keys(countryData),
            datasets: [{
                label: 'Películas',
                data: Object.values(countryData),
                backgroundColor: '#e50914'
            }]
        },
        options: {
            scales: {
                y: { ticks: { color: 'white' }, grid: { color: '#333' } },
                x: { ticks: { color: 'white' }, grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// --- 5. RENDERIZADO GENERAL ---
function renderAll() {
    // Películas
    const libContainer = document.getElementById('myLibrary');
    if (libContainer) {
        libContainer.innerHTML = myMovies.map(m => `
            <div class="card">
                <img src="${m.poster}">
                <p><strong>${m.title}</strong></p>
                <p>⭐ Nota: ${m.rating}</p>
            </div>
        `).join('');
    }

    // Listas de Personas
    renderPeople('directorList', myMovies.map(m => m.director), 'dir');
    renderPeople('actorList', myMovies.flatMap(m => m.actors), 'act');
    renderPeople('writerList', myMovies.flatMap(m => m.writers), 'wri');
    renderPeople('producerList', myMovies.flatMap(m => m.producers), 'pro');
}

function renderPeople(containerId, peopleArray, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const uniquePeople = Array.from(new Set(peopleArray.map(p => p.name)))
        .map(name => peopleArray.find(p => p.name === name));

    container.innerHTML = uniquePeople.map(p => `
        <div class="person-card" onclick="editImg('${p.name}', '${type}')">
            <img src="${p.photo}" onerror="this.src='https://via.placeholder.com/200x200?text=Sin+Foto'">
            <p>${p.name}</p>
        </div>
    `).join('');
}

// Editar imagen manualmente
function editImg(name, type) {
    const newUrl = prompt(`Introduce la URL de la nueva foto para ${name}:`);
    if (!newUrl) return;

    myMovies.forEach(m => {
        if (type === 'dir' && m.director.name === name) m.director.photo = newUrl;
        if (type === 'act') m.actors.forEach(a => { if(a.name === name) a.photo = newUrl; });
        if (type === 'wri') m.writers.forEach(w => { if(w.name === name) w.photo = newUrl; });
        if (type === 'pro') m.producers.forEach(p => { if(p.name === name) p.photo = newUrl; });
    });

    localStorage.setItem('myCineData', JSON.stringify(myMovies));
    renderAll();
    if(document.getElementById('stats').style.display === 'block') updateStatistics();
}

// Inicializar
renderAll();
