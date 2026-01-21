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
    if (menu.style.width === "250px") toggleMenu();
}

// --- BUSCADOR PRINCIPAL ---
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

// --- AÑADIR PELÍCULA (CON SAGAS) ---
async function addMovie(id, title, posterPath) {
    if (myMovies.find(m => m.id === id)) return alert("Ya guardada");
    
    const dRes = await fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}&language=es-ES`);
    const d = await dRes.json();
    const cRes = await fetch(`${BASE_URL}/movie/${id}/credits?api_key=${API_KEY}`);
    const c = await cRes.json();
    
    const status = confirm(`¿Has visto "${title}"?`) ? 'watched' : 'pending';
    const rating = status === 'watched' ? (prompt("Nota (1-10):") || "N/A") : "N/A";
    const saga = d.belongs_to_collection ? d.belongs_to_collection.name : null;

    const getP = (p) => p ? IMG_URL + p : 'https://via.placeholder.com/200x200?text=Sin+Foto';
    const posterFull = IMG_URL + posterPath;

    myMovies.push({
        id, title, rating, status, poster: posterFull,
        runtime: d.runtime || 0,
        genre: d.genres[0]?.name || "Otros",
        saga: saga,
        rawStaff: {
            director: { name: c.crew.find(x => x.job === 'Director')?.name, photo: getP(c.crew.find(x => x.job === 'Director')?.profile_path), movie: title, poster: posterFull },
            actors: c.cast.slice(0, 5).map(a => ({ name: a.name, photo: getP(a.profile_path), movie: title, poster: posterFull })),
            writers: c.crew.filter(x => x.department === 'Writing').slice(0, 2).map(w => ({ name: w.name, photo: getP(w.profile_path), movie: title, poster: posterFull })),
            producers: c.crew.filter(x => x.department === 'Production').slice(0, 2).map(p => ({ name: p.name, photo: getP(p.profile_path), movie: title, poster: posterFull }))
        }
    });

    localStorage.setItem('myCineData', JSON.stringify(myMovies));
    renderAll();
}

// --- PROCESAR STAFF (PARA AGRUPAR) ---
function processStaff(list, person) {
    if (!person || !person.name) return;
    let existing = list.find(p => p.name === person.name);
    if (existing) {
        if (!existing.movies.find(m => m.poster === person.poster)) {
            existing.movies.push({ title: person.movie, poster: person.poster });
        }
    } else {
        list.push({
            name: person.name,
            photo: person.photo,
            movies: [{ title: person.movie, poster: person.poster }]
        });
    }
}

// --- RENDERIZADO GENERAL ---
function renderAll() {
    renderMoviesGrouped(myMovies.filter(m => m.status === 'watched'), 'watchedMovies');
    renderMoviesGrouped(myMovies.filter(m => m.status === 'pending'), 'pendingMovies');

    let directors = [], actors = [], writers = [], producers = [];

    myMovies.forEach(m => {
        const s = m.rawStaff || { director: m.director, actors: m.actors || [], writers: m.writers || [], producers: m.producers || [] };
        if (s.director) processStaff(directors, s.director);
        if (s.actors) s.actors.forEach(a => processStaff(actors, a));
        if (s.writers) s.writers.forEach(w => processStaff(writers, w));
        if (s.producers) s.producers.forEach(p => processStaff(producers, p));
    });

    // Ordenar por quien tiene más películas
    const sortByCount = (a, b) => b.movies.length - a.movies.length;
    directors.sort(sortByCount);
    actors.sort(sortByCount);
    writers.sort(sortByCount);
    producers.sort(sortByCount);

    renderPeople('directorList', directors);
    renderPeople('actorList', actors);
    renderPeople('writerList', writers);
    renderPeople('producerList', producers);
}

// --- RENDERIZAR PELÍCULAS CON SAGAS ---
function renderMoviesGrouped(movieList, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const sagas = {};
    const singles = [];

    movieList.forEach(m => {
        if (m.saga) {
            if (!sagas[m.saga]) sagas[m.saga] = [];
            sagas[m.saga].push(m);
        } else {
            singles.push(m);
        }
    });

    let html = '';
    // Dibujar Sagas
    for (const name in sagas) {
        const p = sagas[name];
        const safeName = name.replace(/\s/g, "").replace(/'/g, "");
        html += `
            <div class="card" onclick="document.getElementById('exp-${safeName}').style.display = (document.getElementById('exp-${safeName}').style.display==='none'?'flex':'none')">
                <div class="saga-stack">
                    <img src="${p[0].poster}">
                    <div class="movie-count-badge">${p.length}</div>
                </div>
                <h4>${name}</h4>
            </div>
            <div id="exp-${safeName}" class="saga-expanded" style="display:none; width:100%;">
                ${p.map(m => `<div class="card"><button class="delete-btn" onclick="deleteMovie(${m.id})">×</button><img src="${m.poster}"><p>⭐ ${m.rating}</p></div>`).join('')}
            </div>
        `;
    }
    // Dibujar Sueltas
    html += singles.map(m => `
        <div class="card">
            <button class="delete-btn" onclick="deleteMovie(${m.id})">×</button>
            <img src="${m.poster}" ${m.status==='pending'?'style="filter:grayscale(1)"':''}>
            <p>${m.status === 'watched' ? '⭐ ' + m.rating : `<button onclick="markAsWatched(${m.id})">¡Vista!</button>`}</p>
        </div>
    `).join('');

    container.innerHTML = html;
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
        </div>
    `).join('');
}

// --- FILTRAR STAFF ---
function filterStaff(listId, query) {
    const container = document.getElementById(listId);
    const cards = container.getElementsByClassName('person-card');
    const term = query.toLowerCase();
    Array.from(cards).forEach(card => {
        const name = card.querySelector('strong').innerText.toLowerCase();
        card.style.display = name.includes(term) ? "flex" : "none";
    });
}

// --- ESTADÍSTICAS ---
function updateStatistics() {
    const mins = myMovies.reduce((acc, m) => acc + (parseInt(m.runtime) || 0), 0);
    document.getElementById('statHours').innerText = `${Math.floor(mins / 60)}h ${mins % 60}m`;
    
    const data = {};
    myMovies.forEach(mov => data[mov.genre] = (data[mov.genre] || 0) + 1);
    
    const hues = [0, 200, 50, 120, 280, 30, 180, 330, 240, 90];
    const colors = Object.keys(data).map((_, i) => `hsla(${hues[i % hues.length]}, 70%, 50%, 0.8)`);

    if (genreChart) genreChart.destroy();
    genreChart = new Chart(document.getElementById('genreChart'), {
        type: 'doughnut',
        data: { labels: Object.keys(data), datasets: [{ data: Object.values(data), backgroundColor: colors, borderColor: '#141414', borderWidth: 2 }] },
        options: { plugins: { legend: { labels: { color: 'white' }, position: 'bottom' } } }
    });
}

// --- EDITAR FOTO ---
function editPersonPhoto(name) {
    const url = prompt(`URL de foto para ${name}:`);
    if (!url) return;
    myMovies.forEach(m => {
        const s = m.rawStaff;
        if (s) {
            if (s.director && s.director.name === name) s.director.photo = url;
            s.actors?.forEach(a => { if (a.name === name) a.photo = url; });
            s.writers?.forEach(w => { if (w.name === name) w.photo = url; });
            s.producers?.forEach(p => { if (p.name === name) p.photo = url; });
        }
    });
    localStorage.setItem('myCineData', JSON.stringify(myMovies));
    renderAll();
}

// --- UTILIDADES ---
function deleteMovie(id) { if(confirm("¿Borrar?")) { myMovies = myMovies.filter(m => m.id !== id); localStorage.setItem('myCineData', JSON.stringify(myMovies)); renderAll(); } }
function markAsWatched(id) { const m = myMovies.find(x => x.id === id); m.status = 'watched'; m.rating = prompt("Nota:"); localStorage.setItem('myCineData', JSON.stringify(myMovies)); renderAll(); }
function openModal(url) { document.getElementById("imageModal").style.display = "flex"; document.getElementById("imgFull").src = url; }
function exportData() { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(myMovies)], {type: "application/json"})); a.download = "mi_cine.json"; a.click(); }
function importData(e) { const reader = new FileReader(); reader.onload = (event) => { myMovies = JSON.parse(event.target.result); localStorage.setItem('myCineData', JSON.stringify(myMovies)); location.reload(); }; reader.readAsText(e.target.files[0]); }

renderAll();
