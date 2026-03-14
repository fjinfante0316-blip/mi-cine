const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w300';
const IMG_BIG = 'https://image.tmdb.org/t/p/w500'; // Para fotos de staff más nítidas

let myMovies = JSON.parse(localStorage.getItem('myCineData')) || [];
let genreChart = null;
let ratingChart = null;

// --- NAVEGACIÓN ---
function toggleMenu() {
    const menu = document.getElementById("sideMenu");
    menu.style.width = (menu.style.width === "250px") ? "0" : "250px";
}

function showSection(id) {
    // 1. Ocultar todas las secciones
    document.querySelectorAll('.content-section').forEach(s => {
        s.style.display = 'none';
    });

    const target = document.getElementById(id);
    if (target) {
        // 2. Mostrar la sección seleccionada
        // Importante: stats y searchSection deben ser 'flex' para que el centrado CSS funcione
        target.style.display = (id === 'stats' || id === 'searchSection') ? 'flex' : 'block';
    }

    // 3. Si es la sección de estadísticas, refrescar los datos y el gráfico
    if (id === 'stats') {
        setTimeout(() => { updateStatistics(); }, 50); // Pequeño retraso para asegurar que el DOM es visible
    }

    if (id === 'sideMenu') toggleMenu();
    window.scrollTo(0,0);
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
    // Filtro de películas
    document.querySelectorAll('.movie-grid .card').forEach(card => {
        const title = card.querySelector('h4')?.innerText.toLowerCase() || "";
        card.style.display = title.includes(term) ? "flex" : "none";
    });
    // Filtro de Staff (Estilo BLIP)
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

function getPhoto(path) { return path ? IMG_BIG + path : 'https://via.placeholder.com/500x500?text=Sin+Foto'; }

// --- RENDERIZADO ESTILO BLIP ---
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

    // Renderizar películas por años
    const sortedYears = Object.keys(groups).sort((a, b) => b - a);
    let html = '';
    sortedYears.forEach(year => {
        html += `<div class="year-divider">${year}</div><div class="movie-grid">`;
        html += groups[year].map(m => movieCardTemplate(m)).join('');
        html += `</div>`;
    });
    container.innerHTML = html;

    // Renderizar Staff (Ordenados por nota media)
    const sortByRating = (a, b) => b.averageRating - a.averageRating || b.movies.length - a.movies.length;
    renderPeople('directorList', directors.sort(sortByRating));
    renderPeople('actorList', actors.sort(sortByRating));
    renderPeople('writerList', writers.sort(sortByRating));
    renderPeople('producerList', producers.sort(sortByRating));
}

function movieCardTemplate(m) {
    return `
        <div class="card" onclick="openMovieDetails(${m.id})">
            <div class="view-count-badge">👁️ ${m.views || 1}</div>
            <div class="rating-badge">⭐ ${m.rating || 0}</div>
            <img src="${m.poster}">
            <div class="card-footer">
                <h4>${m.title}</h4>
                <button class="delete-btn-new" onclick="event.stopPropagation(); deleteMovie(${m.id})">×</button>
            </div>
        </div>`;
}

function processStaff(list, person, rating) {
    if (!person || !person.name) return;
    let existing = list.find(p => p.name === person.name);
    if (existing) {
        existing.totalRating += rating;
        if (!existing.movies.find(mov => mov.title === person.movie)) {
            existing.movies.push({ title: person.movie, poster: person.poster, id: person.id });
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

// Asegúrate de que renderPeople use onclick="showStaffTimeline"
function renderPeople(id, arr) {
    const container = document.getElementById(id);
    if (!container) return;
    
    container.innerHTML = arr.map(p => `
        <div class="person-card">
            <div class="person-info-block" onclick="showStaffTimeline('${p.name.replace(/'/g, "\\'")}')">
                <img class="person-photo" src="${p.photo}">
                <strong>${p.name}</strong>
                <div class="staff-avg-badge">⭐ ${p.averageRating}</div>
            </div>
            <div class="person-movies-block">
                ${p.movies.map(mov => {
                    const mData = myMovies.find(m => m.title === mov.title);
                    return `<img class="mini-poster" src="${mov.poster}" onclick="openMovieDetails(${mData ? mData.id : 0})">`;
                }).join('')}
            </div>
        </div>
    `).join('');
}

// --- RESTO DE FUNCIONES (Siguen funcionando igual) ---
function saveAndRefresh() { localStorage.setItem('myCineData', JSON.stringify(myMovies)); renderAll(); }
function deleteMovie(id) { if(confirm("¿Eliminar?")) { myMovies = myMovies.filter(m => m.id !== id); saveAndRefresh(); } }
function updateStatistics() {
    if (myMovies.length === 0) return;

    // 1. Estadísticas de texto
    const mins = myMovies.reduce((acc, m) => acc + (parseInt(m.runtime) || 0) * (m.views || 1), 0);
    document.getElementById('statTotal').innerText = myMovies.length;
    document.getElementById('statHours').innerText = `${Math.floor(mins / 60)}h ${mins % 60}m`;

    // 2. Gráfico de Géneros
    const genData = {};
    myMovies.forEach(mov => genData[mov.genre] = (genData[mov.genre] || 0) + 1);

    const ctxGenre = document.getElementById('genreChart').getContext('2d');
    if (genreChart) genreChart.destroy();
    genreChart = new Chart(ctxGenre, {
        type: 'doughnut',
        data: {
            labels: Object.keys(genData),
            datasets: [{
                data: Object.values(genData),
                backgroundColor: ['#e50914', '#564d4d', '#831010', '#b9090b', '#f5f5f1'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Hace que respete el contenedor
            plugins: { legend: { position: 'bottom', labels: { color: 'white' } } }
        }
    });

    // 3. Gráfico de Evolución de Notas (CORREGIDO)
    // Ordenamos películas por año para ver la evolución
    const sortedMovies = [...myMovies].sort((a, b) => parseInt(a.year) - parseInt(b.year));
    const labelsRating = sortedMovies.map(m => m.title.substring(0, 10) + "...");
    const dataRating = sortedMovies.map(m => m.rating);

    const ctxRating = document.getElementById('ratingChart').getContext('2d');
    if (ratingChart) ratingChart.destroy();
    ratingChart = new Chart(ctxRating, {
        type: 'line',
        data: {
            labels: labelsRating,
            datasets: [{
                label: 'Nota',
                data: dataRating,
                borderColor: '#e50914',
                backgroundColor: 'rgba(229, 9, 20, 0.2)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { min: 0, max: 10, grid: { color: '#333' }, ticks: { color: 'white' } },
                x: { ticks: { color: 'white', display: false } } // Ocultamos nombres si son muchos
            },
            plugins: { legend: { display: false } }
        }
    });
}
function showStaffTimeline(name) {
    const staffMovies = myMovies.filter(m => {
        const s = m.rawStaff;
        return s.director?.name === name || s.actors?.some(a => a.name === name);
    }).sort((a, b) => parseInt(a.year) - parseInt(b.year));

    const overlay = document.getElementById('timelineOverlay');
    overlay.innerHTML = `
        <div class="timeline-header">
            <button class="back-btn" onclick="closeTimeline()">← Volver</button>
            <h2 style="margin-top:20px;">Trayectoria: ${name}</h2>
        </div>
        <div class="timeline-track">
            ${staffMovies.map(m => `
                <div class="timeline-item" onclick="openMovieDetails(${m.id})">
                    <div class="timeline-year">${m.year}</div>
                    <div class="timeline-dot"></div>
                    <img src="${m.poster}" class="mini-poster" style="width:90px; height:130px;">
                    <p style="font-size:0.7rem; margin-top:5px; max-width:90px;">${m.title}</p>
                </div>
            `).join('')}
        </div>
    `;
    overlay.style.display = 'block';
}

// --- FUNCIÓN UNIFICADA PARA ABRIR DETALLES (CENTRADO) ---
async function openMovieDetails(movieId) {
    if (!movieId) return;
    const modal = document.getElementById('movieModal');
    
    // 1. Limpieza previa para evitar "parpadeos" de datos antiguos
    closeMovieDetails(); // Cerramos y limpiamos antes de cargar

    // Buscamos la película en nuestra biblioteca local (myMovies)
    const movie = myMovies.find(m => m.id === movieId);
    if (!movie) return;

    // 2. Cargar datos básicos de nuestra biblioteca local
    document.getElementById('detailPoster').src = movie.poster;
    document.getElementById('detailTitle').innerText = movie.title;
    document.getElementById('detailYear').innerText = movie.year;
    document.getElementById('detailRating').innerText = `⭐ ${movie.rating}/10`;
    
    // Calculamos la duración (runtime) si la tenemos
    const runtimeSpan = document.getElementById('detailRuntime');
    if (movie.runtime) {
        runtimeSpan.innerText = `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`;
    } else {
        runtimeSpan.innerText = "Duración desconocida";
    }

    // 3. Pedir datos extras a TMDB (Sinopsis, Finanzas, Proveedores)
    // Usamos append_to_response para traer proveedores en la misma llamada
    const res = await fetch(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=es-ES&append_to_response=watch/providers`);
    const data = await res.json();

    // 4. Rellenar datos dinámicos de TMDB
    document.getElementById('detailOverview').innerText = data.overview || "No hay sinopsis disponible.";
    document.getElementById('detailTagline').innerText = data.tagline ? `"${data.tagline}"` : "";

    // --- SECCIÓN DE FINANZAS ---
    const triviaSection = document.getElementById('detailTrivia');
    triviaSection.innerHTML = ""; // Limpiamos trivia anterior

    if (data.budget > 0 || data.revenue > 0) {
        const profit = data.revenue - data.budget;
        // Color de la barra: verde si hay beneficio, rojo si hay pérdida
        const barColor = profit >= 0 ? '#4CAF50' : '#e50914';
        
        triviaSection.innerHTML = `
            <h3>Finanzas</h3>
            <div class="finance-container">
                <div class="finance-item">
                    <span>Presupuesto:</span>
                    <strong>$${data.budget.toLocaleString()}</strong>
                </div>
                <div class="finance-item">
                    <span>Recaudación:</span>
                    <strong>$${data.revenue.toLocaleString()}</strong>
                </div>
                <div class="profit-bar-wrapper">
                    <div class="profit-bar" style="width: 100%; background: ${barColor};"></div>
                </div>
                <p class="profit-text" style="color: ${barColor}">
                    ${profit >= 0 ? 'Ganancia estimada' : 'Pérdida estimada'}: $${Math.abs(profit).toLocaleString()}
                </p>
            </div>
        `;
    }

    // 5. Procesar proveedores (ES = España)
    const providersDiv = document.getElementById('detailProviders');
    providersDiv.innerHTML = ""; // Limpiamos proveedores anteriores
    const providers = data['watch/providers']?.results?.ES?.flatrate;

    if (providers && providers.length > 0) {
        providersDiv.innerHTML = providers.map(p => `
            <div class="provider-item">
                <img src="https://image.tmdb.org/t/p/original${p.logo_path}" title="${p.provider_name}">
            </div>
        `).join('');
    } else {
        providersDiv.innerText = "No disponible en plataformas de suscripción.";
    }

    // 6. Mostrar el modal y bloquear el scroll del fondo
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// --- FUNCIÓN PARA CERRAR Y LIMPIAR EL MODAL ---
function closeMovieDetails() {
    const modal = document.getElementById('movieModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto'; // Devolvemos el scroll
    
    // Limpieza profunda de los campos HTML para el próximo uso
    document.getElementById('detailTitle').innerText = "";
    document.getElementById('detailTagline').innerText = "";
    document.getElementById('detailPoster').src = ""; // Evita ver el poster anterior
    document.getElementById('detailYear').innerText = "";
    document.getElementById('detailRuntime').innerText = "";
    document.getElementById('detailRating').innerText = "";
    document.getElementById('detailOverview').innerText = "";
    document.getElementById('detailTrivia').innerHTML = "";
    document.getElementById('detailProviders').innerHTML = "";
}

// --- EXPORTAR DATOS ---
function exportData() {
    if (myMovies.length === 0) {
        alert("No hay películas en tu biblioteca para exportar.");
        return;
    }

    // Convertimos el array de películas a un string JSON con formato
    const dataStr = JSON.stringify(myMovies, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    // Creamos un link temporal para la descarga
    const link = document.createElement("a");
    link.href = url;
    link.download = `mi_cine_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    
    // Limpieza
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// --- IMPORTAR DATOS ---
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // Validación básica: comprobamos si es un array
            if (Array.isArray(importedData)) {
                if (confirm(`Se han encontrado ${importedData.length} películas. ¿Deseas sobreescribir tu biblioteca actual?`)) {
                    myMovies = importedData;
                    saveAndRefresh(); // Esta función ya guarda en LocalStorage y refresca el render
                    alert("¡Biblioteca importada con éxito!");
                }
            } else {
                alert("El archivo no tiene el formato correcto.");
            }
        } catch (err) {
            console.error("Error al importar:", err);
            alert("Hubo un error al leer el archivo. Asegúrate de que sea un JSON válido.");
        }
    };
    reader.readAsText(file);
    
    // Resetear el input para permitir importar el mismo archivo de nuevo si fuera necesario
    event.target.value = '';
}

renderAll();
