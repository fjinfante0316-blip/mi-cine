/* --- CONFIGURACIÓN API --- */
const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w300';
const IMG_BIG = 'https://image.tmdb.org/t/p/w500';

/* --- ESTADO GLOBAL --- */
let myMovies = JSON.parse(localStorage.getItem('myCineData')) || [];
let genreChart = null;
let ratingChart = null;

/* --- INICIO Y NAVEGACIÓN --- */
window.onload = function() {
    showSection('searchSection'); // Forzamos portada al inicio
    renderAll();
};

function openNav() {
    document.getElementById("mySidenav").style.width = "250px";
}

function closeNav() {
    const nav = document.getElementById("mySidenav");
    if (nav) nav.style.width = "0";
}

function showSection(id) {
    // 1. Ocultar todas las secciones con clase .active
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none'; // Refuerzo para evitar fallos de renderizado
    });

    // 2. Activar la sección elegida
    const target = document.getElementById(id);
    if (target) {
        target.classList.add('active');
        // Usamos flex para portada y stats para mantener el centrado del CSS
        target.style.display = (id === 'searchSection' || id === 'stats') ? 'flex' : 'block';
    }

    // 3. Si entramos en estadísticas, calculamos y dibujamos
    if (id === 'stats') {
        setTimeout(updateStatistics, 300);
    }

    closeNav(); 
    window.scrollTo(0,0);
}

// --- RENDERIZADO CON NUEVA ORDENACIÓN ---
function renderAll() {
    const container = document.getElementById('watchedMovies');
    if (!container) return;
    container.innerHTML = "";

    const groups = {};
    let directors = [], actors = [], writers = [], producers = [];

    // 1. Agrupar películas por año y procesar Staff
    myMovies.forEach(m => {
        const y = m.year || "Sin Año";
        if (!groups[y]) groups[y] = [];
        groups[y].push(m);

        if (m.rawStaff) {
            const s = m.rawStaff;
            const r = m.rating || 0;
            if (s.director) processStaff(directors, s.director, r);
            if (s.actors) s.actors.forEach(a => processStaff(actors, a, r));
            if (s.writers) s.writers.forEach(w => processStaff(writers, w, r));
            if (s.producers) s.producers.forEach(p => processStaff(producers, p, r));
        }
    });

    // 2. Renderizar Hemeroteca (Años descendentes)
    const sortedYears = Object.keys(groups).sort((a, b) => b - a);
    let html = '';
    sortedYears.forEach(year => {
        html += `<div class="section-title">${year}</div><div class="movie-grid">`;
        html += groups[year].map(m => movieCardTemplate(m)).join('');
        html += `</div>`;
    });
    container.innerHTML = html;

    // 3. LÓGICA DE ORDENACIÓN: Cantidad de películas (Desc) > Nota Media (Desc)
    const sortByQtyThenRating = (a, b) => {
        if (b.movies.length !== a.movies.length) {
            return b.movies.length - a.movies.length; // Primero por cantidad
        }
        return b.averageRating - a.averageRating; // Si empatan, por nota
    };

    // 4. Renderizar cada lista con el nuevo orden
    renderPeople('directorList', directors.sort(sortByQtyThenRating));
    renderPeople('actorList', actors.sort(sortByQtyThenRating));
    renderPeople('writerList', writers.sort(sortByQtyThenRating));
    renderPeople('producerList', producers.sort(sortByQtyThenRating));
}

function movieCardTemplate(m) {
    return `
        <div class="card" onclick="openMovieDetails(${m.id})">
            <img src="${m.poster}">
            <div style="padding:10px;">
                <h4>${m.title}</h4>
                <p>⭐ ${m.rating} | 👁️ ${m.views || 1}</p>
                <button class="delete-btn-new" onclick="event.stopPropagation(); deleteMovie(${m.id})">Eliminar</button>
            </div>
        </div>`;
}

function processStaff(list, person, rating) {
    if (!person || !person.name) return;
    let existing = list.find(p => p.name === person.name);
    if (existing) {
        existing.totalRating += rating;
        if (!existing.movies.find(mov => mov.title === person.movie)) {
            existing.movies.push({ title: person.movie, poster: person.poster });
            existing.averageRating = (existing.totalRating / existing.movies.length).toFixed(1);
        }
    } else {
        list.push({ 
            name: person.name, photo: person.photo, 
            totalRating: rating, averageRating: rating.toFixed(1),
            movies: [{ title: person.movie, poster: person.poster }] 
        });
    }
}

// --- ACTUALIZACIÓN DE PLANTILLA DE PERSONA ---
// Añadimos un pequeño contador visual para que veas cuántas películas tienen
function renderPeople(id, arr) {
    const container = document.getElementById(id);
    if (!container) return;
    
    container.innerHTML = arr.map(p => `
        <div class="person-card">
            <div class="person-info-block">
                <img class="person-photo" src="${p.photo}">
                <strong>${p.name}</strong>
                <div class="staff-badges" style="display:flex; flex-direction:column; gap:2px; margin-top:5px;">
                    <span style="color:var(--primary); font-weight:bold; font-size:0.75rem;">🎬 ${p.movies.length} Pelis</span>
                    <span style="color:var(--gold); font-size:0.75rem;">⭐ ${p.averageRating}</span>
                </div>
            </div>
            <div class="person-movies-block">
                ${p.movies.map(mov => `
                    <img class="mini-poster" src="${mov.poster}" 
                         title="${mov.title}" 
                         onclick="openMovieDetailsByName('${mov.title.replace(/'/g, "\\'")}')">
                `).join('')}
            </div>
        </div>
    `).join('');
}

/* --- ESTADÍSTICAS (CORREGIDAS) --- */
function updateStatistics() {
    if (!myMovies.length) return;

    // 1. Cálculos base
    const totalMinutes = myMovies.reduce((acc, m) => acc + (parseInt(m.runtime) || 0), 0);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    document.getElementById('statTotal').innerText = myMovies.length;
    document.getElementById('statHours').innerText = `${hours}h ${mins}m`;

    // 2. Gráfico de Géneros
    const genMap = {};
    myMovies.forEach(m => genMap[m.genre] = (genMap[m.genre] || 0) + 1);

    const ctxGen = document.getElementById('genreChart');
    if (genreChart) genreChart.destroy();
    genreChart = new Chart(ctxGen, {
        type: 'doughnut',
        data: {
            labels: Object.keys(genMap),
            datasets: [{ data: Object.values(genMap), backgroundColor: ['#e50914', '#ffffff', '#818181', '#ffcc00', '#444'] }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: 'white' } } } }
    });

    // 3. Gráfico de Evolución
    const sorted = [...myMovies].sort((a, b) => parseInt(a.year) - parseInt(b.year));
    const ctxRate = document.getElementById('ratingChart');
    if (ratingChart) ratingChart.destroy();
    ratingChart = new Chart(ctxRate, {
        type: 'line',
        data: {
            labels: sorted.map(m => m.title.substring(0, 8)),
            datasets: [{ label: 'Nota', data: sorted.map(m => m.rating), borderColor: '#e50914', fill: true, backgroundColor: 'rgba(229, 9, 20, 0.2)' }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 10, ticks: { color: 'white' } }, x: { ticks: { display: false } } } }
    });
}

/* --- BUSCAR Y GUARDAR --- */
async function searchMovie() {
    const query = document.getElementById('searchInput').value;
    const results = document.getElementById('results');
    if (!query) return;

    results.innerHTML = '<p>Buscando...</p>';
    const resp = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${query}&language=es-ES`);
    const data = await resp.json();

    results.innerHTML = data.results.slice(0, 8).map(m => `
        <div class="card">
            <img src="${m.poster_path ? IMG_URL + m.poster_path : 'https://via.placeholder.com/300x450'}">
            <div style="padding:10px;">
                <h4>${m.title}</h4>
                <button onclick="addMovie(${m.id}, '${m.title.replace(/'/g, "")}', '${m.poster_path}')">Añadir</button>
            </div>
        </div>
    `).join('');
}

async function addMovie(id, title, posterPath) {
    if (myMovies.find(m => m.id === id)) return alert("Ya está en tu cine");
    
    const nota = parseFloat(prompt(`¿Nota para "${title}"? (0-10)`, "5"));
    if (isNaN(nota) || nota < 0 || nota > 10) return alert("Nota no válida");

    // Consultas a la API
    const d = await (await fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}&language=es-ES`)).json();
    const c = await (await fetch(`${BASE_URL}/movie/${id}/credits?api_key=${API_KEY}`)).json();
    
    const year = d.release_date ? d.release_date.split('-')[0] : "----";
    const getSPhoto = (path) => path ? IMG_BIG + path : 'https://via.placeholder.com/500x500?text=Sin+Foto';
    const posterFull = IMG_URL + posterPath;

    myMovies.push({
        id, title, year, rating: nota, runtime: d.runtime, genre: d.genres[0]?.name || "Otros",
        poster: posterFull,
        rawStaff: {
            director: { 
                name: c.crew.find(x => x.job === 'Director')?.name, 
                photo: getSPhoto(c.crew.find(x => x.job === 'Director')?.profile_path), 
                movie: title, poster: posterFull 
            },
            // SIN LÍMITE: Tomamos todo el cast disponible
            actors: c.cast.map(a => ({ 
                name: a.name, photo: getSPhoto(a.profile_path), movie: title, poster: posterFull 
            })),
            // GUIONISTAS: Filtrados por departamento Writing
            writers: c.crew.filter(x => x.department === 'Writing').map(w => ({ 
                name: w.name, photo: getSPhoto(w.profile_path), movie: title, poster: posterFull 
            })),
            // PRODUCTORES: Filtrados por departamento Production
            producers: c.crew.filter(x => x.department === 'Production').map(p => ({ 
                name: p.name, photo: getSPhoto(p.profile_path), movie: title, poster: posterFull 
            }))
        }
    });

    saveAndRefresh();
}

/* --- UTILIDADES --- */
function saveAndRefresh() { 
    localStorage.setItem('myCineData', JSON.stringify(myMovies)); 
    renderAll(); 
}

function deleteMovie(id) { 
    if(confirm("¿Eliminar película?")) { 
        myMovies = myMovies.filter(m => m.id !== id); 
        saveAndRefresh(); 
    } 
}

function openMovieDetailsByName(title) {
    const movie = myMovies.find(m => m.title === title);
    if (movie) openMovieDetails(movie.id);
}

/* --- MODAL DETALLES --- */
async function openMovieDetails(movieId) {
    const movie = myMovies.find(m => m.id === movieId);
    if (!movie) return;

    document.getElementById('detailPoster').src = movie.poster;
    document.getElementById('detailTitle').innerText = movie.title;
    document.getElementById('detailRating').innerText = `⭐ ${movie.rating}/10`;

    const res = await fetch(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=es-ES`);
    const data = await res.json();
    document.getElementById('detailOverview').innerText = data.overview || "Sin sinopsis.";

    document.getElementById('movieModal').style.display = 'flex';
}

function closeMovieDetails() {
    document.getElementById('movieModal').style.display = 'none';
}
