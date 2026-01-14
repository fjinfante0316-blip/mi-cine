const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8'; // <--- PEGA TU CLAVE DE TMDB AQUÍ
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w300';

let myMovies = JSON.parse(localStorage.getItem('myCineData')) || [];
let genreChart = null;
let countryChart = null;

function toggleMenu() {
    const menu = document.getElementById("sideMenu");
    menu.style.width = (menu.style.width === "250px") ? "0" : "250px";
}

// CAMBIO CLAVE: Cargar estadísticas al mostrar la sección
function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    document.getElementById(sectionId).style.display = 'block';
    
    if (sectionId === 'stats') {
        updateStatistics();
    }
    toggleMenu();
}

document.getElementById('searchBtn').addEventListener('click', async () => {
    const query = document.getElementById('searchInput').value;
    if (!query) return;
    const res = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${query}&language=es-ES`);
    const data = await res.json();
    document.getElementById('results').innerHTML = data.results.slice(0, 4).map(movie => `
        <div class="card">
            <img src="${IMG_URL + movie.poster_path}">
            <h4>${movie.title}</h4>
            <button onclick="addMovie(${movie.id}, '${movie.title.replace(/'/g, "")}', '${movie.poster_path}')">Añadir</button>
        </div>
    `).join('');
});

async function addMovie(id, title, poster) {
    if (myMovies.find(m => m.id === id)) return alert("Ya guardada");
    const rating = prompt(`Nota (1-10):`);
    if (!rating) return;

    const dRes = await fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}&language=es-ES`);
    const d = await dRes.json();
    const cRes = await fetch(`${BASE_URL}/movie/${id}/credits?api_key=${API_KEY}`);
    const credits = await cRes.json();
    
    const getPhoto = (p) => p ? IMG_URL + p : 'https://via.placeholder.com/200';

    myMovies.push({
        id, title, rating, poster: IMG_URL + poster,
        runtime: d.runtime || 0,
        genres: d.genres.map(g => g.name),
        countries: d.production_countries.map(c => c.name),
        director: { name: credits.crew.find(c => c.job === 'Director')?.name || '?', photo: getPhoto(credits.crew.find(c => c.job === 'Director')?.profile_path) },
        actors: credits.cast.slice(0, 5).map(a => ({ name: a.name, photo: getPhoto(a.profile_path) })),
        writers: credits.crew.filter(c => c.department === 'Writing').slice(0, 2).map(w => ({ name: w.name, photo: getPhoto(w.profile_path) })),
        producers: credits.crew.filter(c => c.department === 'Production').slice(0, 2).map(p => ({ name: p.name, photo: getPhoto(p.profile_path) }))
    });

    localStorage.setItem('myCineData', JSON.stringify(myMovies));
    renderAll();
    alert("¡Añadida!");
}

function updateStatistics() {
    if (myMovies.length === 0) return;

    const totalMinutes = myMovies.reduce((acc, m) => acc + (m.runtime || 0), 0);
    document.getElementById('statHours').innerText = Math.floor(totalMinutes / 60);
    
    const countriesSet = new Set(myMovies.flatMap(m => m.countries || []));
    document.getElementById('statCountries').innerText = countriesSet.size;

    const genreData = {};
    myMovies.flatMap(m => m.genres || []).forEach(g => genreData[g] = (genreData[g] || 0) + 1);

    const countryData = {};
    myMovies.flatMap(m => m.countries || []).forEach(c => countryData[c] = (countryData[c] || 0) + 1);

    // Gráfico de Géneros
    if (genreChart) genreChart.destroy();
    genreChart = new Chart(document.getElementById('genreChart'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(genreData),
            datasets: [{ data: Object.values(genreData), backgroundColor: ['#e50914', '#b9090b', '#564d4d', '#f5f5f1', '#ff0000'] }]
        },
        options: { plugins: { legend: { labels: { color: 'white' } }, title: { display: true, text: 'GÉNEROS', color: 'white' } } }
    });

    // Gráfico de Países
    if (countryChart) countryChart.destroy();
    countryChart = new Chart(document.getElementById('countryChart'), {
        type: 'bar',
        data: {
            labels: Object.keys(countryData),
            datasets: [{ label: 'Películas', data: Object.values(countryData), backgroundColor: '#e50914' }]
        },
        options: { 
            scales: { y: { ticks: { color: 'white' } }, x: { ticks: { color: 'white' } } },
            plugins: { legend: { display: false }, title: { display: true, text: 'PAÍSES', color: 'white' } }
        }
    });
}

function renderAll() {
    document.getElementById('myLibrary').innerHTML = myMovies.map(m => `
        <div class="card"><img src="${m.poster}"><p><strong>${m.title}</strong></p><p>⭐ ${m.rating}</p></div>
    `).join('');
    
    renderPeople('directorList', myMovies.map(m => m.director), 'dir');
    renderPeople('actorList', myMovies.flatMap(m => m.actors), 'act');
    renderPeople('writerList', myMovies.flatMap(m => m.writers), 'wri');
    renderPeople('producerList', myMovies.flatMap(m => m.producers), 'pro');
}

function renderPeople(id, arr, type) {
    const container = document.getElementById(id);
    if (!container) return;
    const unique = Array.from(new Set(arr.map(p => p.name))).map(name => arr.find(p => p.name === name));
    container.innerHTML = unique.map(p => `
        <div class="person-card">
            <img src="${p.photo}">
            <p>${p.name}</p>
        </div>
    `).join('');
}

renderAll();
