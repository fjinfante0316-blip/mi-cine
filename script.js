const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w300';

let myMovies = JSON.parse(localStorage.getItem('myCineData')) || [];
let genreChart = null;

function toggleMenu() {
    const menu = document.getElementById("sideMenu");
    menu.style.width = (menu.style.width === "250px") ? "0" : "250px";
}

function showSection(id) {
    // Ocultamos todas
    document.querySelectorAll('.content-section').forEach(s => {
        s.style.display = 'none';
    });

    const target = document.getElementById(id);
    if (target) {
        // Si es la sección de búsqueda, usamos flex para que el CSS de centrado funcione
        if (id === 'searchSection') {
            target.style.display = 'flex';
        } else {
            target.style.display = 'block';
        }
    }

    if (id === 'stats') updateStatistics();
    
    // Si el menú está abierto, lo cerramos
    const menu = document.getElementById("sideMenu");
    if (menu.style.width === "250px") {
        toggleMenu();
    }
}

function menuVisible() { return document.getElementById("sideMenu").style.width === "250px"; }

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

// Función para procesar el staff sin duplicados
function processStaff(currentStaff, newItems) {
    newItems.forEach(newItem => {
        // Buscamos si el artista ya existe por su nombre
        let existing = currentStaff.find(s => s.name === newItem.name);
        if (existing) {
            // Si existe y la película no está en su lista, la añadimos
            if (!existing.movies.some(m => m.poster === newItem.poster)) {
                existing.movies.push({ title: newItem.movie, poster: newItem.poster });
            }
        } else {
            // Si no existe, lo creamos con su primera película
            currentStaff.push({
                name: newItem.name,
                photo: newItem.photo,
                movies: [{ title: newItem.movie, poster: newItem.poster }]
            });
        }
    });
}

async function addMovie(id, title, posterPath) {
    if (myMovies.find(m => m.id === id)) return alert("Ya guardada");
    
    const status = confirm(`¿Has visto "${title}"?`) ? 'watched' : 'pending';
    const rating = status === 'watched' ? (prompt("Nota (1-10):") || "N/A") : "N/A";

    const dRes = await fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}&language=es-ES`);
    const d = await dRes.json();
    const cRes = await fetch(`${BASE_URL}/movie/${id}/credits?api_key=${API_KEY}`);
    const c = await cRes.json();
    
    const getP = (p) => p ? IMG_URL + p : 'https://via.placeholder.com/200x200?text=Sin+Foto';
    const posterFull = IMG_URL + posterPath;

    // Estructura de la película
    const movieData = {
        id, title, rating, status, poster: posterFull,
        runtime: d.runtime || 0,
        genre: d.genres[0]?.name || "Otros",
        // Guardamos el staff bruto de esta película
        rawStaff: {
            director: { name: c.crew.find(x => x.job === 'Director')?.name, photo: getP(c.crew.find(x => x.job === 'Director')?.profile_path), movie: title, poster: posterFull },
            actors: c.cast.slice(0, 5).map(a => ({ name: a.name, photo: getP(a.profile_path), movie: title, poster: posterFull })),
            writers: c.crew.filter(x => x.department === 'Writing').slice(0, 2).map(w => ({ name: w.name, photo: getP(w.profile_path), movie: title, poster: posterFull })),
            producers: c.crew.filter(x => x.department === 'Production').slice(0, 2).map(p => ({ name: p.name, photo: getP(p.profile_path), movie: title, poster: posterFull }))
        }
    };

    myMovies.push(movieData);
    localStorage.setItem('myCineData', JSON.stringify(myMovies));
    renderAll();
}

function renderAll() {
    const wCont = document.getElementById('watchedMovies');
    const pCont = document.getElementById('pendingMovies');
    if (!wCont) return;

    wCont.innerHTML = myMovies.filter(m => m.status === 'watched').map(m => `
        <div class="card"><button class="delete-btn" onclick="deleteMovie(${m.id})">×</button><img src="${m.poster}"><p>⭐ ${m.rating}</p></div>
    `).join('');

    pCont.innerHTML = myMovies.filter(m => m.status === 'pending').map(m => `
        <div class="card"><button class="delete-btn" onclick="deleteMovie(${m.id})">×</button><img src="${m.poster}" style="filter:grayscale(1)"><button onclick="markAsWatched(${m.id})">¡Vista!</button></div>
    `).join('');

    // Procesar listas únicas para el Staff
    let directors = [], actors = [], writers = [], producers = [];

    myMovies.forEach(m => {
        if (m.rawStaff.director.name) processStaff(directors, [m.rawStaff.director]);
        processStaff(actors, m.rawStaff.actors);
        processStaff(writers, m.rawStaff.writers);
        processStaff(producers, m.rawStaff.producers);
    });

    renderPeople('directorList', directors);
    renderPeople('actorList', actors);
    renderPeople('writerList', writers);
    renderPeople('producerList', producers);
}

function renderPeople(id, arr) {
    const container = document.getElementById(id);
    if (!container) return;
    
    container.innerHTML = arr.map(p => `
        <div class="person-card">
            <img class="person-photo" src="${p.photo}" onclick="editPersonPhoto('${p.name}')">
            <strong>${p.name}</strong>
            <div class="mini-posters-container">
                ${p.movies.map(m => `
                    <img class="mini-poster" src="${m.poster}" title="${m.title}" onclick="openModal('${m.poster}')">
                `).join('')}
            </div>
        </div>
    `).join('');
}

function updateStatistics() {
    const mins = myMovies.reduce((acc, m) => acc + (parseInt(m.runtime) || 0), 0);
    document.getElementById('statHours').innerText = `${Math.floor(mins / 60)}h ${mins % 60}m`;
    const data = {};
    myMovies.forEach(m => data[m.genre] = (data[m.genre] || 0) + 1);
    if (genreChart) genreChart.destroy();
    genreChart = new Chart(document.getElementById('genreChart'), {
        type: 'doughnut',
        data: { labels: Object.keys(data), datasets: [{ data: Object.values(data), backgroundColor: ['#e50914','#444','#888','#b9090b','#fff'] }] },
        options: { plugins: { legend: { labels: { color: 'white' }, position: 'bottom' } } }
    });
}

function exportData() {
    const blob = new Blob([JSON.stringify(myMovies)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "mi_cine.json"; a.click();
}

function importData(e) {
    const reader = new FileReader();
    reader.onload = (event) => {
        myMovies = JSON.parse(event.target.result);
        localStorage.setItem('myCineData', JSON.stringify(myMovies));
        location.reload();
    };
    reader.readAsText(e.target.files[0]);
}

function editPersonPhoto(name) {
    const url = prompt(`URL de foto para ${name}:`);
    if (url) {
        myMovies.forEach(m => {
            if (m.director && m.director.name === name) m.director.photo = url;
            m.actors.forEach(a => { if (a.name === name) a.photo = url; });
            m.writers.forEach(w => { if (w.name === name) w.photo = url; });
            m.producers.forEach(p => { if (p.name === name) p.photo = url; });
        });
        localStorage.setItem('myCineData', JSON.stringify(myMovies));
        renderAll();
    }
}

function deleteMovie(id) { if(confirm("¿Borrar?")) { myMovies = myMovies.filter(m => m.id !== id); localStorage.setItem('myCineData', JSON.stringify(myMovies)); renderAll(); } }
function markAsWatched(id) { const m = myMovies.find(x => x.id === id); m.status = 'watched'; m.rating = prompt("Nota:"); localStorage.setItem('myCineData', JSON.stringify(myMovies)); renderAll(); }
function openModal(url) { document.getElementById("imageModal").style.display = "flex"; document.getElementById("imgFull").src = url; }

renderAll();
