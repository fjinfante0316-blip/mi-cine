const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w300';

let myMovies = JSON.parse(localStorage.getItem('myCineData')) || [];
let genreChart = null;
let ratingChart = null;

// --- NAVEGACIÓN ---
function toggleMenu() {
    const menu = document.getElementById("sideMenu");
    menu.style.width = (menu.style.width === "250px") ? "0" : "250px";
}

function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    const target = document.getElementById(id);
    if(target) target.style.display = (id === 'searchSection') ? 'flex' : 'block';
    if (id === 'stats') updateStatistics();
    const menu = document.getElementById("sideMenu");
    if (menu && menu.style.width === "250px") toggleMenu();
}

// --- BUSCADORES ---
document.getElementById('searchBtn').addEventListener('click', async () => {
    const query = document.getElementById('searchInput').value;
    if (!query) return;
    const res = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${query}&language=es-ES`);
    const data = await res.json();
    document.getElementById('results').innerHTML = data.results.slice(0, 8).map(m => `
        <div class="card">
            <img src="${m.poster_path ? IMG_URL + m.poster_path : 'https://via.placeholder.com/300x450'}">
            <h4>${m.title}</h4>
            <button onclick="addMovie(${m.id}, '${m.title.replace(/'/g, "")}', '${m.poster_path}')">Añadir</button>
        </div>
    `).join('');
});

function filterMyMovies() {
    const term = document.getElementById('internalSearch').value.toLowerCase();
    document.querySelectorAll('.movie-grid .card').forEach(card => {
        const title = card.querySelector('h4')?.innerText.toLowerCase() || "";
        card.style.display = title.includes(term) ? "flex" : "none";
    });
    document.querySelectorAll('.person-card').forEach(card => {
        const name = card.querySelector('strong')?.innerText.toLowerCase() || "";
        card.style.display = name.includes(term) ? "flex" : "none";
    });
}

// --- AÑADIR PELÍCULA ---
async function addMovie(id, title, posterPath) {
    if (myMovies.find(m => m.id === id)) return alert("Ya guardada");
    
    const nota = parseFloat(prompt(`¿Qué nota le das a "${title}"? (0-10)`, "5"));
    if (isNaN(nota) || nota < 0 || nota > 10) return alert("Pon una nota válida");

    const dRes = await fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}&language=es-ES`);
    const d = await dRes.json();
    const cRes = await fetch(`${BASE_URL}/movie/${id}/credits?api_key=${API_KEY}`);
    const c = await cRes.json();
    
    const year = d.release_date ? d.release_date.split('-')[0] : "Sin Año";
    const posterFull = IMG_URL + posterPath;

    myMovies.push({
        id, title, status: 'watched', views: 1, year: year,
        rating: nota,
        poster: posterFull,
        runtime: d.runtime || 0,
        genre: d.genres[0]?.name || "Otros",
        rawStaff: {
            director: { name: c.crew.find(x => x.job === 'Director')?.name, photo: getPhoto(c.crew.find(x => x.job === 'Director')?.profile_path), movie: title, poster: posterFull },
            actors: c.cast.slice(0, 5).map(a => ({ name: a.name, photo: getPhoto(a.profile_path), movie: title, poster: posterFull })),
            writers: c.crew.filter(x => x.department === 'Writing').slice(0, 2).map(w => ({ name: w.name, photo: getPhoto(w.profile_path), movie: title, poster: posterFull })),
            producers: c.crew.filter(x => x.department === 'Production').slice(0, 2).map(p => ({ name: p.name, photo: getPhoto(p.profile_path), movie: title, poster: posterFull }))
        }
    });

    saveAndRefresh();
}

function getPhoto(path) { return path ? IMG_URL + path : 'https://via.placeholder.com/200x200?text=Sin+Foto'; }

// --- RENDERIZADO POR AÑOS (INDIVIDUAL) ---
function renderAll() {
    const container = document.getElementById('watchedMovies');
    if (!container) return;
    container.innerHTML = "";

    const groups = {};
    let directors = [], actors = [], writers = [], producers = [];

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

    const sortedYears = Object.keys(groups).sort((a, b) => b - a);
    let html = '';

    sortedYears.forEach(year => {
        html += `<div class="year-divider">${year}</div><div class="movie-grid">`;
        html += groups[year].map(m => movieCardTemplate(m)).join('');
        html += `</div>`;
    });
    container.innerHTML = html;

    const sortByRating = (a, b) => b.averageRating - a.averageRating || b.movies.length - a.movies.length;
    renderPeople('directorList', directors.sort(sortByRating));
    renderPeople('actorList', actors.sort(sortByRating));
    renderPeople('writerList', writers.sort(sortByRating));
    renderPeople('producerList', producers.sort(sortByRating));
}

function movieCardTemplate(m) {
    return `
        <div class="card" onclick="openMovieDetails(${m.id})">
            <button class="delete-btn" onclick="event.stopPropagation(); deleteMovie(${m.id})">×</button>
            <div class="view-count-badge">👁️ ${m.views || 1}</div>
            <div class="rating-badge">⭐ ${m.rating || 0}</div>
            <img src="${m.poster}">
            <h4>${m.title}</h4>
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

function renderPeople(id, arr) {
    const container = document.getElementById(id);
    if (!container) return;
    container.innerHTML = arr.slice(0, 50).map(p => `
        <div class="person-card">
            <div class="rating-badge">⭐ ${p.averageRating}</div>
            <div class="movie-count-badge">${p.movies.length}</div>
            <img class="person-photo" src="${p.photo}" onclick="showStaffTimeline('${p.name}')" style="cursor:pointer">
            <strong onclick="showStaffTimeline('${p.name}')" style="cursor:pointer">${p.name}</strong>
            <div class="mini-posters-container">
                ${p.movies.map(mov => `<img class="mini-poster" src="${mov.poster}" onclick="openModal('${mov.poster}')">`).join('')}
            </div>
        </div>`).join('');
}

function editRating(id) {
    const m = myMovies.find(x => x.id === id);
    if (m) {
        const nuevaNota = parseFloat(prompt(`Nueva nota para "${m.title}" (actual: ${m.rating}):`, m.rating));
        if (!isNaN(nuevaNota) && nuevaNota >= 0 && nuevaNota <= 10) {
            m.rating = nuevaNota;
            m.views = (m.views || 0) + 1;
            saveAndRefresh();
        }
    }
}

function saveAndRefresh() { localStorage.setItem('myCineData', JSON.stringify(myMovies)); renderAll(); }
function openModal(url) { document.getElementById("imageModal").style.display = "flex"; document.getElementById("imgFull").src = url; }
function deleteMovie(id) { if(confirm("¿Eliminar?")) { myMovies = myMovies.filter(m => m.id !== id); saveAndRefresh(); } }

function updateStatistics() {
    const mins = myMovies.reduce((acc, m) => acc + (parseInt(m.runtime) || 0) * (m.views || 1), 0);
    document.getElementById('statHours').innerText = `${Math.floor(mins / 60)}h ${mins % 60}m`;
    
    const genData = {};
    myMovies.forEach(mov => genData[mov.genre] = (genData[mov.genre] || 0) + 1);
    if (genreChart) genreChart.destroy();
    genreChart = new Chart(document.getElementById('genreChart'), {
        type: 'doughnut',
        data: { labels: Object.keys(genData), datasets: [{ data: Object.values(genData), backgroundColor: ['#e50914', '#564d4d', '#831010', '#b9090b', '#f5f5f1'] }] }
    });

    const yearRatings = {};
    myMovies.forEach(m => {
        if (m.year && m.year !== "Sin Año") {
            if (!yearRatings[m.year]) yearRatings[m.year] = { total: 0, count: 0 };
            yearRatings[m.year].total += (m.rating || 0);
            yearRatings[m.year].count += 1;
        }
    });
    const sortedY = Object.keys(yearRatings).sort();
    const avgS = sortedY.map(y => (yearRatings[y].total / yearRatings[y].count).toFixed(1));

    if (ratingChart) ratingChart.destroy();
    ratingChart = new Chart(document.getElementById('ratingHistoryChart'), {
        type: 'line',
        data: { 
            labels: sortedY, 
            datasets: [{ label: 'Nota Media', data: avgS, borderColor: '#e50914', tension: 0.3, fill: true, backgroundColor: 'rgba(229, 9, 20, 0.1)' }] 
        },
        options: { scales: { y: { min: 0, max: 10 } } }
    });
}

function exportData() {
    const blob = new Blob([JSON.stringify(myMovies, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `mi_cine_${new Date().toLocaleDateString()}.json`;
    a.click();
}

async function importData(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
        let imported = JSON.parse(e.target.result);
        myMovies = imported;
        saveAndRefresh();
    };
    reader.readAsText(file);
}

function showStaffTimeline(name) {
    // 1. Filtrar y ordenar películas (igual que antes)
    const staffMovies = myMovies.filter(m => {
        const s = m.rawStaff;
        return s.director?.name === name || 
               s.actors?.some(a => a.name === name) ||
               s.writers?.some(w => w.name === name) ||
               s.producers?.some(p => p.name === name);
    });
    staffMovies.sort((a, b) => parseInt(a.year) - parseInt(b.year));

    // 2. Crear el contenedor si no existe
    let timelineOverlay = document.getElementById('timelineOverlay');
    if (!timelineOverlay) {
        timelineOverlay = document.createElement('div');
        timelineOverlay.id = 'timelineOverlay';
        document.body.appendChild(timelineOverlay);
    }

    // 3. Insertar contenido con el BOTÓN DE VOLVER
    timelineOverlay.innerHTML = `
        <div class="timeline-header">
            <button class="back-btn" onclick="closeTimeline()">← Volver al Staff</button>
            <h2 class="timeline-title">Evolución: ${name}</h2>
        </div>
        <div class="timeline-track">
            ${staffMovies.map(m => `
                <div class="timeline-item">
                    <div class="timeline-year">${m.year}</div>
                    <div class="timeline-dot"></div>
                    <div class="card timeline-card">
                        <div class="rating-badge">⭐ ${m.rating}</div>
                        <img src="${m.poster}">
                        <h4>${m.title}</h4>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    timelineOverlay.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Bloquea el scroll del fondo
}

// Función para cerrar y volver
function closeTimeline() {
    document.getElementById('timelineOverlay').style.display = 'none';
    document.body.style.overflow = 'auto'; // Devuelve el scroll
}

async function openMovieDetails(movieId) {
    const modal = document.getElementById('movieModal');
    const movie = myMovies.find(m => m.id === movieId);
    if (!movie) return;

    // 1. Pedir datos extras a la API (Sinopsis y Watch Providers)
    const res = await fetch(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=es-ES&append_to_response=watch/providers`);
    const data = await res.json();

    // 2. Rellenar el modal
    document.getElementById('detailPoster').src = movie.poster;
    document.getElementById('detailTitle').innerText = movie.title;
    document.getElementById('detailYear').innerText = movie.year;
    document.getElementById('detailRating').innerText = `⭐ ${movie.rating}/10`;
    document.getElementById('detailOverview').innerText = data.overview || "No hay sinopsis disponible.";

    // 3. Procesar proveedores (ES = España)
    const providersDiv = document.getElementById('detailProviders');
    providersDiv.innerHTML = "";
    const providers = data['watch/providers']?.results?.ES?.flatrate; // Buscamos plataformas de suscripción

    if (providers && providers.length > 0) {
        providersDiv.innerHTML = providers.map(p => `
            <div class="provider-item">
                <img src="https://image.tmdb.org/t/p/original${p.logo_path}" title="${p.provider_name}">
            </div>
        `).join('');
    } else {
        providersDiv.innerText = "No disponible en plataformas de suscripción actualmente.";
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeMovieDetails() {
    document.getElementById('movieModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

renderAll();
