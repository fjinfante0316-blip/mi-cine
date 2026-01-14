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

document.getElementById('searchBtn').addEventListener('click', async () => {
    const query = document.getElementById('searchInput').value;
    if (!query) return;
    const res = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${query}&language=es-ES`);
    const data = await res.json();
    document.getElementById('results').innerHTML = data.results.slice(0, 4).map(m => `
        <div class="card">
            <img src="${m.poster_path ? IMG_URL + m.poster_path : ''}">
            <h4>${m.title}</h4>
            <button onclick="addMovie(${m.id}, '${m.title.replace(/'/g, "")}', '${m.poster_path}')">Añadir</button>
        </div>
    `).join('');
});

async function addMovie(id, title, posterPath) {
    if (myMovies.find(m => m.id === id)) return alert("Ya existe");
    const status = confirm(`¿Has visto "${title}"?`) ? 'watched' : 'pending';
    const rating = status === 'watched' ? prompt("Nota (1-10):") : "N/A";

    const dRes = await fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}&language=es-ES`);
    const d = await dRes.json();
    const cRes = await fetch(`${BASE_URL}/movie/${id}/credits?api_key=${API_KEY}`);
    const c = await cRes.json();
    
    const getP = (p) => p ? IMG_URL + p : 'https://via.placeholder.com/200';
    const posterFull = IMG_URL + posterPath;

    myMovies.push({
        id, title, rating, status, poster: posterFull,
        runtime: d.runtime || 0, genre: d.genres[0]?.name || "?",
        country: d.production_countries[0]?.name || "?",
        director: { name: c.crew.find(x => x.job==='Director')?.name, photo: getP(c.crew.find(x => x.job==='Director')?.profile_path), movie: title, poster: posterFull },
        actors: c.cast.slice(0, 5).map(a => ({ name: a.name, photo: getP(a.profile_path), movie: title, poster: posterFull })),
        writers: c.crew.filter(x => x.department==='Writing').slice(0,2).map(w => ({ name: w.name, photo: getP(w.profile_path), movie: title, poster: posterFull })),
        producers: c.crew.filter(x => x.department==='Production').slice(0,2).map(p => ({ name: p.name, photo: getP(p.profile_path), movie: title, poster: posterFull }))
    });

    localStorage.setItem('myCineData', JSON.stringify(myMovies));
    renderAll();
}

function renderAll() {
    const wCont = document.getElementById('watchedMovies');
    const pCont = document.getElementById('pendingMovies');
    
    // 1. Renderizar Películas (Vistas y Pendientes)
    if (wCont && pCont) {
        wCont.innerHTML = myMovies.filter(m => m.status === 'watched').map(m => `
            <div class="card">
                <img src="${m.poster}">
                <p><strong>${m.title}</strong></p>
                <p>⭐ ${m.rating}</p>
            </div>
        `).join('');

        pCont.innerHTML = myMovies.filter(m => m.status === 'pending').map(m => `
            <div class="card">
                <img src="${m.poster}" style="filter:grayscale(1)">
                <p><strong>${m.title}</strong></p>
                <button onclick="markAsWatched(${m.id})" style="background:#28a745; color:white; border:none; padding:5px; border-radius:5px; cursor:pointer;">¡Ya la he visto!</button>
            </div>
        `).join('');
    }

    // 2. Renderizar Staff (Asegurándonos de que aplanamos las listas de todas las películas)
    // Usamos flatMap para los actores porque cada película tiene un array de 5 actores
    renderPeople('directorList', myMovies.map(m => m.director));
    renderPeople('actorList', myMovies.flatMap(m => m.actors)); 
    renderPeople('writerList', myMovies.flatMap(m => m.writers));
    renderPeople('producerList', myMovies.flatMap(m => m.producers));
}

function renderPeople(id, arr) {
    const container = document.getElementById(id);
    if (!container) return;
    container.innerHTML = arr.filter(p => p && p.name).map(p => `
        <div class="person-card">
            <img class="person-photo" src="${p.photo}">
            <strong>${p.name}</strong>
            <img class="mini-poster" src="${p.poster}" onclick="openModal('${p.poster}')">
        </div>
    `).join('');
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

function updateStatistics() {
    if (myMovies.length === 0) return;

    // 1. Cálculos básicos
    const totalMinutes = myMovies.reduce((acc, m) => acc + (m.runtime || 0), 0);
    const hours = Math.floor(totalMinutes / 60);
    document.getElementById('statHours').innerText = hours;
    
    const countriesSet = new Set(myMovies.map(m => m.country));
    document.getElementById('statCountries').innerText = countriesSet.size;

    // 2. Preparar datos para Gráfico de Géneros
    const genreData = {};
    myMovies.forEach(m => {
        genreData[m.genre] = (genreData[m.genre] || 0) + 1;
    });

    // 3. Preparar datos para Gráfico de Países
    const countryData = {};
    myMovies.forEach(m => {
        countryData[m.country] = (countryData[m.country] || 0) + 1;
    });

    // Destruir gráficos anteriores si existen para evitar errores al recargar
    if (genreChart) genreChart.destroy();
    if (countryChart) countryChart.destroy();

    // Crear Gráfico de Géneros (Doughnut)
    const ctxG = document.getElementById('genreChart').getContext('2d');
    genreChart = new Chart(ctxG, {
        type: 'doughnut',
        data: {
            labels: Object.keys(genreData),
            datasets: [{
                data: Object.values(genreData),
                backgroundColor: ['#e50914', '#b9090b', '#564d4d', '#f5f5f1', '#ff4d4d'],
                borderWidth: 0
            }]
        },
        options: {
            plugins: {
                legend: { labels: { color: 'white' } },
                title: { display: true, text: 'TUS GÉNEROS FAVORITOS', color: 'white' }
            }
        }
    });

    // Crear Gráfico de Países (Bar)
    const ctxC = document.getElementById('countryChart').getContext('2d');
    countryChart = new Chart(ctxC, {
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
                y: { beginAtZero: true, ticks: { color: 'white' } },
                x: { ticks: { color: 'white' } }
            },
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'PELÍCULAS POR PAÍS', color: 'white' }
            }
        }
    });
}

renderAll();

