const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8'; // <--- PEGA TU CLAVE DE TMDB AQUÍ
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w300';

let myMovies = JSON.parse(localStorage.getItem('myCineData')) || [];
let genreChart = null;
let countryChart = null;

// --- NAVEGACIÓN ---
function toggleMenu() {
    const menu = document.getElementById("sideMenu");
    menu.style.width = (menu.style.width === "250px") ? "0" : "250px";
}

function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    document.getElementById(sectionId).style.display = 'block';
    if (sectionId === 'stats') updateStatistics();
    toggleMenu();
}

// --- BÚSQUEDA ---
document.getElementById('searchBtn').addEventListener('click', async () => {
    const query = document.getElementById('searchInput').value;
    if (!query) return;
    const res = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${query}&language=es-ES`);
    const data = await res.json();
    document.getElementById('results').innerHTML = data.results.slice(0, 4).map(movie => `
        <div class="card">
            <img src="${movie.poster_path ? IMG_URL + movie.poster_path : 'https://via.placeholder.com/300x450?text=Sin+Poster'}">
            <h4>${movie.title}</h4>
            <button onclick="addMovie(${movie.id}, '${movie.title.replace(/'/g, "")}', '${movie.poster_path}')">Añadir</button>
        </div>
    `).join('');
});

// --- AÑADIR PELÍCULA ---
async function addMovie(id, title, posterPath) {
    if (myMovies.find(m => m.id === id)) return alert("Ya guardada");
    const rating = prompt(`Nota (1-10):`);
    if (!rating) return;

    const dRes = await fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}&language=es-ES`);
    const d = await dRes.json();
    const cRes = await fetch(`${BASE_URL}/movie/${id}/credits?api_key=${API_KEY}`);
    const credits = await cRes.json();
    
    const getPhoto = (p) => p ? IMG_URL + p : 'https://via.placeholder.com/200x200?text=Sin+Foto';
    const moviePosterFull = IMG_URL + posterPath;

    myMovies.push({
        id, title, rating, poster: moviePosterFull,
        runtime: d.runtime || 0,
        genre: d.genres.length > 0 ? d.genres[0].name : "Desconocido",
        country: d.production_countries.length > 0 ? d.production_countries[0].name : "Desconocido",
        director: { 
            name: credits.crew.find(c => c.job === 'Director')?.name || '?', 
            photo: getPhoto(credits.crew.find(c => c.job === 'Director')?.profile_path),
            movie: title,
            poster: moviePosterFull 
        },
        actors: credits.cast.slice(0, 5).map(a => ({ 
            name: a.name, photo: getPhoto(a.profile_path), movie: title, poster: moviePosterFull 
        })),
        writers: credits.crew.filter(c => c.department === 'Writing').slice(0, 2).map(w => ({ 
            name: w.name, photo: getPhoto(w.profile_path), movie: title, poster: moviePosterFull 
        })),
        producers: credits.crew.filter(c => c.department === 'Production').slice(0, 2).map(p => ({ 
            name: p.name, photo: getPhoto(p.profile_path), movie: title, poster: moviePosterFull 
        }))
    });

    localStorage.setItem('myCineData', JSON.stringify(myMovies));
    renderAll();
    alert("¡Añadida!");
}

// --- RENDERIZADO DE PERSONAS CON PORTADA DE PELI ---
// --- RENDERIZADO DE PERSONAS CON PORTADA RECTANGULAR ---
function renderPeople(id, arr) {
    const container = document.getElementById(id);
    if (!container) return;

    container.innerHTML = arr.filter(p => p && p.name).map(p => `
        <div class="person-card">
            <img class="person-photo" src="${p.photo}" onerror="this.src='https://via.placeholder.com/200x200?text=Sin+Foto'">
            <div class="person-info">
                <strong>${p.name}</strong>
                <div class="movie-reference">
                    <img class="mini-poster" 
                         src="${p.poster}" 
                         onclick="openModal('${p.poster}')"
                         title="Clic para ampliar"
                         onerror="this.style.display='none'">
                </div>
            </div>
        </div>
    `).join('');
}

// --- FUNCIÓN PARA EL ZOOM ---
function openModal(url) {
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("imgFull");
    modal.style.display = "flex";
    modalImg.src = url;
}
// --- ACTUALIZAR TODA LA WEB ---
function renderAll() {
    const watchedCont = document.getElementById('watchedMovies');
    const pendingCont = document.getElementById('pendingMovies');

    if (watchedCont && pendingCont) {
        // Render de Vistas
        watchedCont.innerHTML = myMovies.filter(m => m.status === 'watched').map(m => `
            <div class="card">
                <button class="delete-btn" onclick="deleteMovie(${m.id})">×</button>
                <img src="${m.poster}">
                <p><strong>${m.title}</strong></p>
                <p>⭐ ${m.rating}</p>
            </div>
        `).join('');

        // Render de Pendientes
        pendingCont.innerHTML = myMovies.filter(m => m.status === 'pending').map(m => `
            <div class="card">
                <button class="delete-btn" onclick="deleteMovie(${m.id})">×</button>
                <img src="${m.poster}" style="filter: grayscale(0.8);">
                <p><strong>${m.title}</strong></p>
                <button onclick="markAsWatched(${m.id})" style="background:#28a745; color:white; border:none; padding:5px; border-radius:5px; cursor:pointer;">¡Vista!</button>
            </div>
        `).join('');
    }
    
    // El resto de los renderPeople se quedan igual...
    renderPeople('directorList', myMovies.map(m => m.director));
    renderPeople('actorList', myMovies.flatMap(m => m.actors));
    renderPeople('writerList', myMovies.flatMap(m => m.writers));
    renderPeople('producerList', myMovies.flatMap(m => m.producers));
}

function deleteMovie(id) {
    if (confirm("¿Seguro que quieres eliminar esta película de tu lista?")) {
        // Filtramos: nos quedamos con todas las pelis EXCEPTO la que tiene ese ID
        myMovies = myMovies.filter(movie => movie.id !== id);
        
        // Guardamos la nueva lista en el navegador
        localStorage.setItem('myCineData', JSON.stringify(myMovies));
        
        // Actualizamos la pantalla inmediatamente
        renderAll();
    }
}

// --- ESTADÍSTICAS ---
function updateStatistics() {
    if (myMovies.length === 0) return;
    const totalMinutesAll = myMovies.reduce((acc, m) => acc + (m.runtime || 0), 0);
    const hours = Math.floor(totalMinutesAll / 60);
    const mins = totalMinutesAll % 60;
    document.getElementById('statHours').innerText = `${hours}h ${mins}min`;
    const countriesSet = new Set(myMovies.map(m => m.country));
    document.getElementById('statCountries').innerText = countriesSet.size;

    const genreData = {};
    myMovies.forEach(m => genreData[m.genre] = (genreData[m.genre] || 0) + 1);
    const countryData = {};
    myMovies.forEach(m => countryData[m.country] = (countryData[m.country] || 0) + 1);

    if (genreChart) genreChart.destroy();
    genreChart = new Chart(document.getElementById('genreChart'), {
        type: 'doughnut',
        data: { labels: Object.keys(genreData), datasets: [{ data: Object.values(genreData), backgroundColor: ['#e50914', '#b9090b', '#564d4d', '#f5f5f1'] }] },
        options: { plugins: { legend: { labels: { color: 'white' } }, title: { display: true, text: 'GÉNEROS', color: 'white' } } }
    });

    if (countryChart) countryChart.destroy();
    countryChart = new Chart(document.getElementById('countryChart'), {
        type: 'bar',
        data: { labels: Object.keys(countryData), datasets: [{ label: 'Películas', data: Object.values(countryData), backgroundColor: '#e50914' }] },
        options: { scales: { y: { ticks: { color: 'white' } }, x: { ticks: { color: 'white' } } } }
    });
}

function editCountry(movieId) {
    const movie = myMovies.find(m => m.id === movieId);
    const newCountry = prompt(`Cambiar país para "${movie.title}":`, movie.country);
    if (newCountry) {
        movie.country = newCountry;
        localStorage.setItem('myCineData', JSON.stringify(myMovies));
        renderAll();
    }
}

// Ejecución inicial
renderAll();
