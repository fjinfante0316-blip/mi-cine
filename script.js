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
    const cards = document.querySelectorAll('.movie-grid .card');
    cards.forEach(card => {
        const title = card.querySelector('h4')?.innerText.toLowerCase() || "";
        card.style.display = title.includes(term) ? "flex" : "none";
    });
}

// --- AÑADIR PELÍCULA ---
async function addMovie(id, title, posterPath) {
    if (myMovies.find(m => m.id === id)) return alert("Ya guardada");
    
    const dRes = await fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}&language=es-ES`);
    const d = await dRes.json();
    const cRes = await fetch(`${BASE_URL}/movie/${id}/credits?api_key=${API_KEY}`);
    const c = await cRes.json();
    
    const year = d.release_date ? d.release_date.split('-')[0] : "Sin Año";
    const posterFull = IMG_URL + posterPath;

    myMovies.push({
        id, title, status: 'watched', views: 1, year: year,
        poster: posterFull,
        runtime: d.runtime || 0,
        genre: d.genres[0]?.name || "Otros",
        saga: d.belongs_to_collection ? d.belongs_to_collection.name : null,
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

// --- RENDERIZADO POR AÑOS, SAGAS Y STAFF ---
function renderAll() {
    const container = document.getElementById('watchedMovies');
    if (!container) return;
    container.innerHTML = "";

    // 1. Agrupar por año y saga
    const groups = {};
    let directors = [], actors = [], writers = [], producers = [];

    myMovies.forEach(m => {
        // Lógica de Años
        const y = m.year || "Sin Año";
        if (!groups[y]) groups[y] = { singles: [], sagas: {} };
        if (m.saga) {
            if (!groups[y].sagas[m.saga]) groups[y].sagas[m.saga] = [];
            groups[y].sagas[m.saga].push(m);
        } else {
            groups[y].singles.push(m);
        }

        // Lógica de Staff (Contadores)
        if (m.rawStaff) {
            const s = m.rawStaff;
            if (s.director) processStaff(directors, s.director);
            if (s.actors) s.actors.forEach(a => processStaff(actors, a));
            if (s.writers) s.writers.forEach(w => processStaff(writers, w));
            if (s.producers) s.producers.forEach(p => processStaff(producers, p));
        }
    });

    // 2. Dibujar Películas por Año
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
                        <div class="card" onclick="event.stopPropagation(); addView(${m.id})">
                            <button class="delete-btn" onclick="event.stopPropagation(); deleteMovie(${m.id})">×</button>
                            <img src="${m.poster}">
                            <div class="view-count-badge">👁️ ${m.views || 1}</div>
                            <h4>${m.title}</h4>
                        </div>`).join('')}
                </div>`;
        }

        html += groups[year].singles.map(m => `
            <div class="card" onclick="addView(${m.id})">
                <button class="delete-btn" onclick="event.stopPropagation(); deleteMovie(${m.id})">×</button>
                <img src="${m.poster}">
                <div class="view-count-badge">👁️ ${m.views || 1}</div>
                <h4>${m.title}</h4>
            </div>`).join('');
        html += `</div>`;
    });
    container.innerHTML = html;

    // 3. Dibujar Staff con contadores
    const sortByCount = (a, b) => b.movies.length - a.movies.length;
    renderPeople('directorList', directors.sort(sortByCount));
    renderPeople('actorList', actors.sort(sortByCount));
    renderPeople('writerList', writers.sort(sortByCount));
    renderPeople('producerList', producers.sort(sortByCount));
}

function processStaff(list, person) {
    if (!person || !person.name) return;
    let existing = list.find(p => p.name === person.name);
    if (existing) {
        if (!existing.movies.find(mov => mov.title === person.movie)) {
            existing.movies.push({ title: person.movie, poster: person.poster });
        }
    } else {
        list.push({ name: person.name, photo: person.photo, movies: [{ title: person.movie, poster: person.poster }] });
    }
}

function renderPeople(id, arr) {
    const container = document.getElementById(id);
    if (!container) return;
    container.innerHTML = arr.map(p => `
        <div class="person-card">
            <div class="movie-count-badge">${p.movies.length}</div>
            <img class="person-photo" src="${p.photo}" onclick="editPersonPhoto('${p.name.replace(/'/g, "")}')">
            <strong>${p.name}</strong>
            <div class="mini-posters-container">
                ${p.movies.map(mov => `<img class="mini-poster" src="${mov.poster}" onclick="openModal('${mov.poster}')">`).join('')}
            </div>
        </div>`).join('');
}

// --- FUNCIONES AUXILIARES ---
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

function importData(event) {
    const reader = new FileReader();
    reader.onload = (e) => {
        myMovies = JSON.parse(e.target.result);
        saveAndRefresh();
        location.reload();
    };
    reader.readAsText(event.target.files[0]);
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

async function patchYears() {
    console.log("Iniciando actualización de años...");
    for (let m of myMovies) {
        if (!m.year || m.year === "Sin Año" || m.year === "Desconocido") {
            try {
                const res = await fetch(`${BASE_URL}/movie/${m.id}?api_key=${API_KEY}&language=es-ES`);
                const data = await res.json();
                if (data.release_date) {
                    m.year = data.release_date.split('-')[0];
                    console.log(`Año encontrado para ${m.title}: ${m.year}`);
                }
            } catch (error) {
                console.error(`Error con ${m.title}:`, error);
            }
        }
    }
    localStorage.setItem('myCineData', JSON.stringify(myMovies));
    renderAll();
    alert("¡Años actualizados correctamente!");
}

renderAll();
