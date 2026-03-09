const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w300';

let myMovies = JSON.parse(localStorage.getItem('myCineData')) || [];
let genreChart = null;

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
    const movieCards = document.querySelectorAll('.movie-grid .card');
    movieCards.forEach(card => {
        const title = card.querySelector('h4')?.innerText.toLowerCase() || "";
        card.style.display = title.includes(term) ? "flex" : "none";
    });
    
    const personCards = document.querySelectorAll('.person-card');
    personCards.forEach(card => {
        const name = card.querySelector('strong')?.innerText.toLowerCase() || "";
        card.style.display = name.includes(term) ? "flex" : "none";
    });
}

// --- AÑADIR PELÍCULA CON NOTA ---
async function addMovie(id, title, posterPath) {
    if (myMovies.find(m => m.id === id)) return alert("Ya guardada");
    
    const nota = parseFloat(prompt(`¿Qué nota le das a "${title}"? (0-10)`, "5"));
    if (isNaN(nota) || nota < 0 || nota > 10) return alert("Por favor, pon una nota válida del 0 al 10");
    
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
        saga: d.belongs_to_collection ? d.belongs_to_collection.name : null,
        rawStaff: {
            director: { name: c.crew.find(x => x.job === 'Director')?.name, photo: getPhoto(c.crew.find(x => x.job === 'Director')?.profile_path), movie: title, poster: posterFull },
            actors: c.cast.map(a => ({ name: a.name, photo: getPhoto(a.profile_path), movie: title, poster: posterFull })),
            writers: c.crew.filter(x => x.department === 'Writing').map(w => ({ name: w.name, photo: getPhoto(w.profile_path), movie: title, poster: posterFull })),
            producers: c.crew.filter(x => x.department === 'Production').map(p => ({ name: p.name, photo: getPhoto(p.profile_path), movie: title, poster: posterFull }))
        }
    });

    saveAndRefresh();
}

function getPhoto(path) { return path ? IMG_URL + path : 'https://via.placeholder.com/200x200?text=Sin+Foto'; }

// --- RENDERIZADO POR AÑOS, SAGAS Y STAFF CON NOTA MEDIA ---
function renderAll() {
    const container = document.getElementById('watchedMovies');
    if (!container) return;
    container.innerHTML = "";

    const groups = {};
    let directors = [], actors = [], writers = [], producers = [];

    myMovies.forEach(m => {
        const y = m.year || "Sin Año";
        if (!groups[y]) groups[y] = { singles: [], sagas: {} };
        if (m.saga) {
            if (!groups[y].sagas[m.saga]) groups[y].sagas[m.saga] = [];
            groups[y].sagas[m.saga].push(m);
        } else {
            groups[y].singles.push(m);
        }

        if (m.rawStaff) {
            const s = m.rawStaff;
            const movieRating = m.rating || 0;
            if (s.director) processStaff(directors, s.director, movieRating);
            if (s.actors) s.actors.forEach(a => processStaff(actors, a, movieRating));
            if (s.writers) s.writers.forEach(w => processStaff(writers, w, movieRating));
            if (s.producers) s.producers.forEach(p => processStaff(producers, p, movieRating));
        }
    });

    const sortedYears = Object.keys(groups).sort((a, b) => b - a);
    let html = '';

    sortedYears.forEach(year => {
        html += `<div class="year-divider">${year}</div><div class="movie-grid">`;

        for (const sagaName in groups[year].sagas) {
            const p = groups[year].sagas[sagaName];
            const safeName = sagaName.replace(/\s/g, "").replace(/'/g, "");
            html += `
                <div class="card saga-card" onclick="toggleSaga('${safeName}')">
                    <div class="saga-stack">
                        <img src="${p[0].poster}">
                        <div class="movie-count-badge">${p.length}</div>
                    </div>
                    <h4>${sagaName}</h4>
                </div>
                <div id="exp-${safeName}" class="saga-expanded" style="display:none; width:100%;">
                    ${p.map(m => `
                        <div class="card" onclick="event.stopPropagation(); editRating(${m.id})">
                            <button class="delete-btn" onclick="event.stopPropagation(); deleteMovie(${m.id})">×</button>
                            <div class="view-count-badge">👁️ ${m.views || 1}</div>
                            <div class="rating-badge">⭐ ${m.rating || 0}</div>
                            <img src="${m.poster}">
                            <h4>${m.title}</h4>
                        </div>`).join('')}
                </div>`;
        }

        html += groups[year].singles.map(m => `
            <div class="card" onclick="editRating(${m.id})">
                <button class="delete-btn" onclick="event.stopPropagation(); deleteMovie(${m.id})">×</button>
                <div class="view-count-badge">👁️ ${m.views || 1}</div>
                <div class="rating-badge">⭐ ${m.rating || 0}</div>
                <img src="${m.poster}">
                <h4>${m.title}</h4>
            </div>`).join('');
        html += `</div>`;
    });
    container.innerHTML = html;

    // Ordenar Staff por nota media
    const sortByRating = (a, b) => b.averageRating - a.averageRating || b.movieCount - a.movieCount;
    renderPeople('directorList', directors.sort(sortByRating));
    renderPeople('actorList', actors.sort(sortByRating));
    renderPeople('writerList', writers.sort(sortByRating));
    renderPeople('producerList', producers.sort(sortByRating));
}

function processStaff(list, person, movieRating) {
    if (!person || !person.name) return;
    let existing = list.find(p => p.name === person.name);
    if (existing) {
        existing.totalRating += movieRating;
        existing.movieCount += 1;
        existing.averageRating = (existing.totalRating / existing.movieCount).toFixed(1);
        if (!existing.movies.find(mov => mov.title === person.movie)) {
            existing.movies.push({ title: person.movie, poster: person.poster });
        }
    } else {
        list.push({ 
            name: person.name, 
            photo: person.photo, 
            totalRating: movieRating, 
            movieCount: 1, 
            averageRating: movieRating.toFixed(1),
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
            <div class="movie-count-badge">${p.movieCount}</div>
            <img class="person-photo" src="${p.photo}">
            <strong>${p.name}</strong>
            <div class="mini-posters-container">
                ${p.movies.map(mov => `<img class="mini-poster" src="${mov.poster}" onclick="openModal('${mov.poster}')">`).join('')}
            </div>
        </div>`).join('');
}

// --- FUNCIONES AUXILIARES ---
function editRating(id) {
    const m = myMovies.find(x => x.id === id);
    if (m) {
        const nuevaNota = parseFloat(prompt(`Nueva nota y vista para "${m.title}":`, m.rating));
        if (!isNaN(nuevaNota) && nuevaNota >= 0 && nuevaNota <= 10) {
            m.rating = nuevaNota;
            m.views = (m.views || 0) + 1;
            saveAndRefresh();
        }
    }
}

function addView(id) {
    const m = myMovies.find(x => x.id === id);
    if (m) { m.views = (m.views || 0) + 1; saveAndRefresh(); }
}

function toggleSaga(id) {
    const el = document.getElementById('exp-' + id);
    el.style.display = (el.style.display === 'none') ? 'flex' : 'none';
}

function deleteMovie(id) { if(confirm("¿Eliminar?")) { myMovies = myMovies.filter(m => m.id !== id); saveAndRefresh(); } }

function saveAndRefresh() { localStorage.setItem('myCineData', JSON.stringify(myMovies)); renderAll(); }

function openModal(url) { document.getElementById("imageModal").style.display = "flex"; document.getElementById("imgFull").src = url; }

function exportData() {
    const blob = new Blob([JSON.stringify(myMovies, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `mi_cine_${new Date().toLocaleDateString()}.json`;
    a.click();
}

async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            let importedData = JSON.parse(e.target.result);
            if (confirm(`¿Importar ${importedData.length} películas? El sistema actualizará datos faltantes.`)) {
                for (let m of importedData) {
                    if (!m.year || m.year === "Sin Año") {
                        try {
                            const res = await fetch(`${BASE_URL}/movie/${m.id}?api_key=${API_KEY}&language=es-ES`);
                            const data = await res.json();
                            m.year = data.release_date ? data.release_date.split('-')[0] : "Sin Año";
                            if(!m.rating) m.rating = 0;
                        } catch (err) { console.log(err); }
                    }
                }
                myMovies = importedData;
                localStorage.setItem('myCineData', JSON.stringify(myMovies));
                renderAll();
            }
        } catch (err) { alert("Archivo no válido"); }
    };
    reader.readAsText(file);
}

function updateStatistics() {
    const mins = myMovies.reduce((acc, m) => acc + (parseInt(m.runtime) || 0) * (m.views || 1), 0);
    document.getElementById('statHours').innerText = `${Math.floor(mins / 60)}h ${mins % 60}m`;
    const data = {};
    myMovies.forEach(mov => data[mov.genre] = (data[mov.genre] || 0) + 1);
    if (genreChart) genreChart.destroy();
    const ctx = document.getElementById('genreChart');
    if (ctx) {
        genreChart = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: Object.keys(data), datasets: [{ data: Object.values(data), backgroundColor: ['#e50914', '#564d4d', '#831010', '#b9090b', '#f5f5f1'] }] }
        });
    }
}

renderAll();
