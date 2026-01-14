const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8'; // <--- PEGA TU CLAVE DE TMDB AQUÍ
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w300';

let myMovies = JSON.parse(localStorage.getItem('myCineData')) || [];
let genreChart = null, countryChart = null;

function toggleMenu() {
    const menu = document.getElementById("sideMenu");
    menu.style.width = (menu.style.width === "250px") ? "0" : "250px";
}

function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    if (id === 'stats') updateStatistics();
    toggleMenu();
}

// BÚSQUEDA
document.getElementById('searchBtn').addEventListener('click', async () => {
    const query = document.getElementById('searchInput').value;
    if (!query) return;
    const res = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${query}&language=es-ES`);
    const data = await res.json();
    document.getElementById('results').innerHTML = data.results.slice(0, 4).map(m => `
        <div class="card">
            <img src="${m.poster_path ? IMG_URL + m.poster_path : 'https://via.placeholder.com/300x450'}">
            <h4>${m.title}</h4>
            <button onclick="addMovie(${m.id}, '${m.title.replace(/'/g, "")}', '${m.poster_path}')">Añadir</button>
        </div>
    `).join('');
});

// AÑADIR PELÍCULA (CORREGIDO PARA GUARDAR STAFF)
async function addMovie(id, title, posterPath) {
    if (myMovies.find(m => m.id === id)) return alert("Ya guardada");
    
    const status = confirm(`¿Has visto "${title}"?`) ? 'watched' : 'pending';
    const rating = status === 'watched' ? prompt("Nota (1-10):") : "N/A";

    const dRes = await fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}&language=es-ES`);
    const d = await dRes.json();
    const cRes = await fetch(`${BASE_URL}/movie/${id}/credits?api_key=${API_KEY}`);
    const credits = await cRes.json();
    
    const getPhoto = (p) => p ? IMG_URL + p : 'https://via.placeholder.com/200x300?text=Sin+Foto';
    const posterFull = IMG_URL + posterPath;

    myMovies.push({
        id, title, rating, status, poster: posterFull,
        runtime: d.runtime || 0,
        genre: d.genres[0]?.name || "Desconocido",
        country: d.production_countries[0]?.name || "Desconocido",
        director: { 
            name: credits.crew.find(c => c.job === 'Director')?.name || '?', 
            photo: getPhoto(credits.crew.find(c => c.job === 'Director')?.profile_path),
            movie: title, poster: posterFull 
        },
        actors: credits.cast.slice(0, 5).map(a => ({ 
            name: a.name, photo: getPhoto(a.profile_path), movie: title, poster: posterFull 
        })),
        writers: credits.crew.filter(c => c.department === 'Writing').slice(0, 2).map(w => ({ 
            name: w.name, photo: getPhoto(w.profile_path), movie: title, poster: posterFull 
        })),
        producers: credits.crew.filter(c => c.department === 'Production').slice(0, 2).map(p => ({ 
            name: p.name, photo: getPhoto(p.profile_path), movie: title, poster: posterFull 
        }))
    });

    localStorage.setItem('myCineData', JSON.stringify(myMovies));
    renderAll();
    alert("¡Añadida!");
}

// RENDERIZAR TODO (CORREGIDO)
function renderAll() {
    const wCont = document.getElementById('watchedMovies');
    const pCont = document.getElementById('pendingMovies');
    if (!wCont || !pCont) return;

    wCont.innerHTML = myMovies.filter(m => m.status === 'watched').map(m => `
        <div class="card"><img src="${m.poster}"><p><strong>${m.title}</strong></p><p>⭐ ${m.rating}</p></div>
    `).join('');

    pCont.innerHTML = myMovies.filter(m => m.status === 'pending').map(m => `
        <div class="card"><img src="${m.poster}" style="filter:grayscale(1)"><p>${m.title}</p><button onclick="markAsWatched(${m.id})">Visto</button></div>
    `).join('');

    renderPeople('directorList', myMovies.map(m => m.director));
    renderPeople('actorList', myMovies.flatMap(m => m.actors));
    renderPeople('writerList', myMovies.flatMap(m => m.writers));
    renderPeople('producerList', myMovies.flatMap(m => m.producers));
}

function renderPeople(id, arr) {
    const container = document.getElementById(id);
    if (!container) return;
    const valid = arr.filter(p => p && p.name);
    container.innerHTML = valid.length ? valid.map(p => `
        <div class="person-card">
            <img class="person-photo" src="${p.photo}">
            <strong>${p.name}</strong>
            <img class="mini-poster" src="${p.poster}" onclick="openModal('${p.poster}')">
        </div>
    `).join('') : '<p>No hay datos.</p>';
}

function openModal(url) {
    document.getElementById("imageModal").style.display = "flex";
    document.getElementById("imgFull").src = url;
}

function markAsWatched(id) {
    const m = myMovies.find(x => x.id === id);
    m.status = 'watched';
    m.rating = prompt("Nota:");
    localStorage.setItem('myCineData', JSON.stringify(myMovies));
    renderAll();
}

// ESTADÍSTICAS (CORREGIDO)
function updateStatistics() {
    const totalMins = myMovies.reduce((acc, m) => acc + (m.runtime || 0), 0);
    document.getElementById('statHours').innerText = Math.floor(totalMins / 60);
    document.getElementById('statCountries').innerText = new Set(myMovies.map(m => m.country)).size;

    const genreData = {};
    myMovies.forEach(m => genreData[m.genre] = (genreData[m.genre] || 0) + 1);

    if (genreChart) genreChart.destroy();
    const ctx = document.getElementById('genreChart').getContext('2d');
    genreChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(genreData),
            datasets: [{ data: Object.values(genreData), backgroundColor: ['#e50914', '#564d4d', '#b9090b', '#f5f5f1'] }]
        },
        options: { plugins: { legend: { labels: { color: 'white' } } } }
    });
}

renderAll();
