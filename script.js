const apiKey = '9b9c30cef1e508d75a04ea75fad8276e';
const apiUrlBase = 'https://api.themoviedb.org/3';
const imageBaseUrl = 'https://image.tmdb.org/t/p/w500'; // Tamanho da imagem do poster

const resultsGrid = document.getElementById('results-grid');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const sectionTitle = document.getElementById('section-title');
const detailsSection = document.getElementById('details-section');
const popularMoviesBtn = document.getElementById('popular-movies-btn');
const popularTvBtn = document.getElementById('popular-tv-btn');
const paginationControls = document.getElementById('pagination-controls');
const prevPageBtn = document.getElementById('prev-page-btn');
const nextPageBtn = document.getElementById('next-page-btn');
const pageIndicator = document.getElementById('page-indicator');
const appTitle = document.getElementById('app-title'); // Seleciona o título
const genreFilterContainer = document.getElementById('genre-filter-container');
const genreFilter = document.getElementById('genre-filter');
const favoritesBtn = document.getElementById('favorites-btn'); // Botão Favoritos
const upcomingMoviesBtn = document.getElementById('upcoming-movies-btn'); // Botão Em Breve
const airingTodayTvBtn = document.getElementById('airing-today-tv-btn'); // Botão No Ar Hoje

let currentView = 'movies'; // Controla a visualização atual ('movies', 'tv', 'search')
let currentPage = 1;
let totalPages = 1;
let lastSearchQuery = '';
let movieGenres = [];
let tvGenres = [];
let selectedGenreId = ''; // ID do gênero selecionado
let favorites = []; // Array para armazenar favoritos {id, media_type}

// --- Gerenciamento de Favoritos (localStorage) ---
const FAVORITES_KEY = 'cineScopeFavorites';

function getFavoritesFromStorage() {
    const storedFavorites = localStorage.getItem(FAVORITES_KEY);
    return storedFavorites ? JSON.parse(storedFavorites) : [];
}

function saveFavoritesToStorage() {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

function isFavorite(id, mediaType) {
    return favorites.some(fav => fav.id === id && fav.media_type === mediaType);
}

function addFavorite(id, mediaType) {
    if (!isFavorite(id, mediaType)) {
        favorites.push({ id, media_type: mediaType });
        saveFavoritesToStorage();
        return true;
    }
    return false;
}

function removeFavorite(id, mediaType) {
    const initialLength = favorites.length;
    favorites = favorites.filter(fav => !(fav.id === id && fav.media_type === mediaType));
    if (favorites.length < initialLength) {
        saveFavoritesToStorage();
        return true;
    }
    return false;
}

function toggleFavorite(id, mediaType, buttonElement) {
    const currentlyFavorite = isFavorite(id, mediaType);
    let success = false;
    if (currentlyFavorite) {
        success = removeFavorite(id, mediaType);
    } else {
        success = addFavorite(id, mediaType);
    }
    
    if (success) {
        updateFavoriteButtonState(buttonElement, !currentlyFavorite);
        // Se estiver na página de favoritos, recarregar para remover o item visualmente
        if (currentView === 'favorites' && currentlyFavorite) {
            loadFavoritesPage();
        }
    }
}

function updateFavoriteButtonState(buttonElement, isFav) {
    if (!buttonElement) return;
    const icon = buttonElement.querySelector('i');
    if (isFav) {
        icon?.classList.remove('far'); // Remove estilo regular/vazio
        icon?.classList.add('fas', 'text-red-500'); // Adiciona estilo sólido/preenchido e cor
    } else {
        icon?.classList.remove('fas', 'text-red-500');
        icon?.classList.add('far');
    }
}

// --- Fim Gerenciamento de Favoritos ---

// Função para buscar dados da API TMDb
async function fetchTMDb(endpoint, params = {}) {
    const urlParams = new URLSearchParams({
        api_key: apiKey,
        language: 'pt-BR',
        ...params
    });
    const url = `${apiUrlBase}/${endpoint}?${urlParams}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Erro na API: ${response.statusText}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Falha ao buscar dados da TMDb:', error);
        resultsGrid.innerHTML = '<p class="text-red-500 text-center col-span-full">Erro ao carregar dados. Tente novamente mais tarde.</p>';
        return null;
    }
}

// Função para buscar listas de gêneros
async function fetchGenres() {
    try {
        const [movieGenresData, tvGenresData] = await Promise.all([
            fetchTMDb('genre/movie/list'),
            fetchTMDb('genre/tv/list')
        ]);
        if (movieGenresData) movieGenres = movieGenresData.genres;
        if (tvGenresData) tvGenres = tvGenresData.genres;
        // Popula o filtro inicialmente com gêneros de filmes
        populateGenreFilter('movie'); 
    } catch (error) {
        console.error("Erro ao buscar gêneros:", error);
        // Opcional: desabilitar o filtro se a busca falhar
        genreFilter.disabled = true;
        genreFilterContainer.classList.add('hidden');
    }
}

// Função para popular o dropdown de gêneros
function populateGenreFilter(mediaType) {
    const genres = mediaType === 'movie' ? movieGenres : tvGenres;
    genreFilter.innerHTML = '<option value="">Todos os Gêneros</option>'; // Opção padrão
    
    if (genres && genres.length > 0) {
        genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre.id;
            option.textContent = genre.name;
            genreFilter.appendChild(option);
        });
        genreFilter.value = selectedGenreId; // Mantém o gênero selecionado se possível
        genreFilter.disabled = false;
        genreFilterContainer.classList.remove('hidden');
    } else {
        // Esconde se não houver gêneros para o tipo
        genreFilter.disabled = true;
        genreFilterContainer.classList.add('hidden');
    }
}

// Função para criar o card de um filme/série (com botão de favorito)
function createMovieCard(item) {
    const card = document.createElement('div');
    // Adiciona relative para posicionar o botão de favorito
    card.classList.add('movie-card', 'bg-gray-800', 'rounded-lg', 'overflow-hidden', 'shadow-lg', 'cursor-pointer', 'relative'); 

    const posterPath = item.poster_path ? `${imageBaseUrl}${item.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Image';
    const title = item.title || item.name;
    const releaseDate = item.release_date || item.first_air_date;
    const year = releaseDate ? releaseDate.substring(0, 4) : 'N/A';
    const mediaType = item.media_type || (item.title ? 'movie' : 'tv');
    const itemId = item.id;

    card.innerHTML = `
        <img 
            src="${posterPath}" 
            alt="Poster de ${title}" 
            class="w-full h-auto object-cover bg-gray-700" 
            loading="lazy" 
            width="500" height="750">
        <div class="p-4">
            <h3 class="text-lg font-semibold mb-2 truncate">${title}</h3>
            <p class="text-sm text-gray-400">Ano: ${year}</p>
        </div>
        <button class="favorite-btn absolute top-2 right-2 bg-gray-900 bg-opacity-60 rounded-full p-2 text-lg leading-none z-10 hover:bg-opacity-80">
             <i class="far fa-heart text-white"></i> <!-- Ícone inicial vazio -->
        </button>
    `;

    // Evento de clique no card (exceto no botão)
    card.addEventListener('click', (event) => {
        // Não abre detalhes se o clique foi no botão de favorito
        if (!event.target.closest('.favorite-btn')) { 
            showDetails(itemId, mediaType);
        }
    });

    // Configura botão de favorito
    const favButton = card.querySelector('.favorite-btn');
    updateFavoriteButtonState(favButton, isFavorite(itemId, mediaType)); // Define estado inicial
    
    favButton?.addEventListener('click', (event) => {
        event.stopPropagation(); // Impede que o clique no botão abra os detalhes
        toggleFavorite(itemId, mediaType, favButton);
    });

    return card;
}

// Função para exibir o esqueleto da grade principal
function displayGridSkeleton(count = 10) {
    resultsGrid.innerHTML = ''; // Limpa qualquer conteúdo anterior (ex: mensagem de erro)
    for (let i = 0; i < count; i++) {
        const skeletonCard = document.createElement('div');
        skeletonCard.classList.add('bg-gray-800', 'rounded-lg', 'overflow-hidden', 'shadow-lg', 'animate-pulse');
        skeletonCard.innerHTML = `
            <div class="w-full h-64 bg-gray-700"></div> 
            <div class="p-4 space-y-2">
                <div class="h-5 bg-gray-700 rounded w-3/4"></div> 
                <div class="h-4 bg-gray-700 rounded w-1/2"></div> 
            </div>
        `;
        resultsGrid.appendChild(skeletonCard);
    }
    resultsGrid.classList.remove('hidden'); // Garante que a grade (com esqueletos) está visível
    paginationControls.classList.add('hidden'); // Esconde paginação enquanto carrega
}

// Função para criar o card de uma recomendação (versão simplificada)
function createRecommendationCard(item) {
    const card = document.createElement('div');
    card.classList.add('movie-card', 'bg-gray-700', 'rounded-lg', 'overflow-hidden', 'shadow-md', 'cursor-pointer');

    const posterPath = item.poster_path ? `${imageBaseUrl}${item.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Image';
    const title = item.title || item.name;
    const mediaType = item.media_type || (item.title ? 'movie' : 'tv');

    card.innerHTML = `
        <img 
            src="${posterPath}" 
            alt="Poster de ${title}" 
            class="w-full h-auto object-cover bg-gray-700" 
            loading="lazy" 
            width="500" height="750">
        <div class="p-2">
            <h4 class="text-sm font-semibold truncate">${title}</h4>
        </div>
    `;

    // Adiciona evento de clique para mostrar detalhes da recomendação
    card.addEventListener('click', () => showDetails(item.id, mediaType));

    return card;
}

// Função para exibir os resultados na grade
function displayResults(items, page, totalPgs) {
    resultsGrid.innerHTML = ''; // Limpa resultados anteriores
    currentPage = page;
    totalPages = totalPgs;

    if (!items || items.length === 0) {
        resultsGrid.innerHTML = '<p class="text-center col-span-full">Nenhum resultado encontrado.</p>';
        paginationControls.classList.add('hidden'); // Esconde paginação se não houver resultados
        return;
    }
    
    items.forEach(item => {
        // Ignora pessoas nos resultados de busca multi
        if (item.media_type === 'person') return; 
        const card = createMovieCard(item);
        resultsGrid.appendChild(card);
    });

    updatePaginationControls(); // Atualiza e mostra os controles
}

// Função para carregar a página de Favoritos
async function loadFavoritesPage() {
    currentView = 'favorites';
    selectedGenreId = ''; // Reseta gênero
    clearActiveButton(); 
    setActiveButton(favoritesBtn); 
    sectionTitle.textContent = 'Meus Favoritos';
    detailsSection.classList.add('hidden'); 
    genreFilterContainer.classList.add('hidden'); // Esconde filtro
    paginationControls.classList.add('hidden'); // Esconde paginação
    resultsGrid.classList.remove('hidden');

    if (favorites.length === 0) {
        resultsGrid.innerHTML = '<p class="text-center col-span-full">Você ainda não adicionou nenhum favorito. Clique no ❤️ nos cards ou nos detalhes.</p>';
        return;
    }

    displayGridSkeleton(favorites.length); // Mostra esqueletos enquanto busca

    try {
        // Busca detalhes de todos os favoritos em paralelo
        const favoriteDetailsPromises = favorites.map(fav => fetchTMDb(`${fav.media_type}/${fav.id}`));
        const favoriteDetails = await Promise.all(favoriteDetailsPromises);

        // Filtra itens que podem ter falhado na busca (ex: deletados da API)
        const validFavoriteDetails = favoriteDetails.filter(details => details !== null && details.id);
        
        // Mapeia para garantir media_type, se necessário (embora a API deva retornar)
         const itemsToDisplay = validFavoriteDetails.map(details => ({
             ...details,
             media_type: details.title ? 'movie' : 'tv' // Garante media_type
         }));

        // Reusa displayResults para exibir os cards (sem paginação)
        displayResults(itemsToDisplay, 1, 1);
        paginationControls.classList.add('hidden'); // Garante que paginação está oculta

    } catch (error) {
        console.error("Erro ao carregar detalhes dos favoritos:", error);
        resultsGrid.innerHTML = '<p class="text-red-500 text-center col-span-full">Erro ao carregar favoritos.</p>';
    }
}

// Função para buscar e exibir filmes populares (com filtro de gênero)
async function loadPopularMovies(page = 1, genreId = '') {
    currentView = 'movies';
    selectedGenreId = genreId; // Atualiza o gênero selecionado globalmente
    setActiveButton(popularMoviesBtn);
    populateGenreFilter('movie'); // Mostra e popula filtro de filmes
    genreFilter.value = genreId; 
    
    const genreName = movieGenres.find(g => g.id == genreId)?.name;
    sectionTitle.textContent = genreName ? `Filmes Populares: ${genreName}` : 'Filmes Populares';
    
    detailsSection.classList.add('hidden'); 
    displayGridSkeleton(); 

    let data;
    if (genreId) {
        data = await fetchTMDb('discover/movie', { page: page, with_genres: genreId, sort_by: 'popularity.desc' });
    } else {
        data = await fetchTMDb('movie/popular', { page: page });
    }

    if (data) {
        displayResults(data.results, data.page, data.total_pages);
    } else {
         resultsGrid.innerHTML = '<p class="text-red-500 text-center col-span-full">Erro ao carregar filmes.</p>';
         paginationControls.classList.add('hidden');
    }
}

// Função para buscar e exibir filmes Em Breve
async function loadUpcomingMovies(page = 1) {
    currentView = 'upcomingMovies';
    selectedGenreId = ''; // Reseta gênero
    setActiveButton(upcomingMoviesBtn);
    genreFilterContainer.classList.add('hidden'); // Esconde filtro
    sectionTitle.textContent = 'Filmes: Em Breve';
    detailsSection.classList.add('hidden'); 
    displayGridSkeleton(); 

    const data = await fetchTMDb('movie/upcoming', { page: page });
    if (data) {
        displayResults(data.results, data.page, data.total_pages);
    } else {
         resultsGrid.innerHTML = '<p class="text-red-500 text-center col-span-full">Erro ao carregar filmes em breve.</p>';
         paginationControls.classList.add('hidden');
    }
}

// Função para buscar e exibir séries populares (com filtro de gênero)
async function loadPopularTvShows(page = 1, genreId = '') {
    currentView = 'tv';
    selectedGenreId = genreId; // Atualiza o gênero selecionado globalmente
    setActiveButton(popularTvBtn);
    populateGenreFilter('tv'); // Mostra e popula filtro de séries
    genreFilter.value = genreId; 

    const genreName = tvGenres.find(g => g.id == genreId)?.name;
    sectionTitle.textContent = genreName ? `Séries Populares: ${genreName}` : 'Séries Populares';

    detailsSection.classList.add('hidden');
    displayGridSkeleton(); 

    let data;
    if (genreId) {
        data = await fetchTMDb('discover/tv', { page: page, with_genres: genreId, sort_by: 'popularity.desc' });
    } else {
        data = await fetchTMDb('tv/popular', { page: page }); 
    }
    
    if (data) {
        displayResults(data.results, data.page, data.total_pages);
    } else {
         resultsGrid.innerHTML = '<p class="text-red-500 text-center col-span-full">Erro ao carregar séries.</p>';
         paginationControls.classList.add('hidden');
    }
}

// Função para buscar e exibir séries No Ar Hoje
async function loadAiringTodayTvShows(page = 1) {
    currentView = 'airingTodayTv';
    selectedGenreId = ''; // Reseta gênero
    setActiveButton(airingTodayTvBtn);
    genreFilterContainer.classList.add('hidden'); // Esconde filtro
    sectionTitle.textContent = 'Séries: No Ar Hoje';
    detailsSection.classList.add('hidden'); 
    displayGridSkeleton(); 

    const data = await fetchTMDb('tv/airing_today', { page: page }); 
    if (data) {
        displayResults(data.results, data.page, data.total_pages);
    } else {
         resultsGrid.innerHTML = '<p class="text-red-500 text-center col-span-full">Erro ao carregar séries no ar hoje.</p>';
         paginationControls.classList.add('hidden');
    }
}

// Função para buscar filmes/séries (ignora filtro de gênero)
async function searchItems(query, page = 1) {
    // Se a query for diferente da última, reseta a página para 1
    if (query !== lastSearchQuery) {
        page = 1;
        lastSearchQuery = query;
    }

    if (!query) return; 

    currentView = 'search'; 
    clearActiveButton();
    genreFilterContainer.classList.add('hidden'); // Esconde filtro na busca
    sectionTitle.textContent = `Resultados para "${query}"`;
    detailsSection.classList.add('hidden');
    displayGridSkeleton(); // <--- Mostra o esqueleto da grade
    
    const data = await fetchTMDb('search/multi', { query: query, page: page }); 
    if (data) {
        // Verifica se há resultados antes de chamar displayResults
        if (data.results && data.results.length > 0) {
             displayResults(data.results, data.page, data.total_pages);
        } else {
             resultsGrid.innerHTML = `<p class="text-center col-span-full">Nenhum resultado encontrado para "${query}".</p>`;
             paginationControls.classList.add('hidden');
        }
    } else {
        resultsGrid.innerHTML = `<p class="text-red-500 text-center col-span-full">Erro ao buscar por "${query}".</p>`;
        paginationControls.classList.add('hidden');
    }
}

// Função para exibir o esqueleto da página de detalhes
function displayDetailsSkeleton() {
    const detailsSectionContent = document.getElementById('details-content');
    const recommendationsSection = document.getElementById('recommendations-section');

    detailsSectionContent.innerHTML = `
        <div class="flex flex-col md:flex-row gap-8 animate-pulse">
            <div class="w-full md:w-[30%] h-96 bg-gray-700 rounded-lg shadow-md self-start"></div>
            <div class="md:w-[70%] space-y-4">
                <div class="h-8 bg-gray-700 rounded w-3/4"></div>
                <div class="space-y-2">
                    <div class="h-4 bg-gray-700 rounded"></div>
                    <div class="h-4 bg-gray-700 rounded"></div>
                    <div class="h-4 bg-gray-700 rounded w-5/6"></div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                    <div class="h-4 bg-gray-700 rounded w-full"></div>
                    <div class="h-4 bg-gray-700 rounded w-full"></div>
                    <div class="h-4 bg-gray-700 rounded w-full"></div>
                    <div class="h-4 bg-gray-700 rounded w-full"></div>
                </div>
                <div class="pt-6">
                    <div class="h-8 bg-gray-700 rounded w-1/4 mb-4"></div>
                    <div class="bg-gray-700 rounded-lg shadow-lg h-96 w-full"></div>
                </div>
                <div class="h-10 bg-gray-700 rounded w-24 mt-6"></div>
            </div>
        </div>
    `;

    // Esqueleto para recomendações
    recommendationsSection.innerHTML = `
        <div class="animate-pulse">
            <div class="h-6 bg-gray-700 rounded w-1/3 mb-6"></div> 
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                ${Array(5).fill('').map(() => `
                    <div class="bg-gray-700 rounded-lg shadow-md">
                        <div class="w-full h-48 bg-gray-600 rounded-t-lg"></div> 
                        <div class="p-2">
                            <div class="h-4 bg-gray-600 rounded w-3/4"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    recommendationsSection.classList.remove('hidden');
}

// Função para buscar e exibir detalhes (ignora filtro de gênero)
async function showDetails(id, mediaType) {
    console.log(`Buscando detalhes para ${mediaType} com ID: ${id}`);
    detailsSection.classList.remove('hidden');
    resultsGrid.classList.add('hidden'); 
    paginationControls.classList.add('hidden'); 
    sectionTitle.textContent = 'Detalhes'; 
    clearActiveButton(); 
    genreFilterContainer.classList.add('hidden'); // Esconde filtro nos detalhes
    detailsSection.style.backgroundImage = 'none'; 
    displayDetailsSkeleton(); // Mostra o esqueleto completo
    detailsSection.scrollIntoView({ behavior: 'smooth' });

    // Busca os detalhes principais, créditos, vídeos E recomendações
    try {
        const [details, credits, videosData, recommendationsData] = await Promise.all([
            fetchTMDb(`${mediaType}/${id}`),
            fetchTMDb(`${mediaType}/${id}/credits`),
            fetchTMDb(`${mediaType}/${id}/videos`),
            fetchTMDb(`${mediaType}/${id}/recommendations`) // Busca recomendações
        ]);

        if (details && credits) {
            const trailer = videosData?.results?.find(video => video.site === 'YouTube' && (video.type === 'Trailer' || video.type === 'Teaser') && video.official === true) || 
                          videosData?.results?.find(video => video.site === 'YouTube' && (video.type === 'Trailer' || video.type === 'Teaser'));
            
            displayDetails(details, credits, trailer, mediaType, recommendationsData?.results);
        } else {
            throw new Error('Falha ao carregar detalhes ou créditos.');
        }
    } catch (error) {
        console.error("Erro ao buscar todos os dados de detalhes:", error);
        const detailsContent = document.getElementById('details-content');
        const recommendationsSection = document.getElementById('recommendations-section');
        if(detailsContent) {
             detailsContent.innerHTML = '<p class="text-red-500 text-center">Erro ao carregar detalhes.</p>';
        }
        if(recommendationsSection) {
            recommendationsSection.innerHTML = ''; // Limpa esqueleto de recomendações em caso de erro
        }
    }
}

// Função para formatar e exibir os detalhes (adicionar botão favorito)
function displayDetails(details, credits, trailer, mediaType, recommendations) {
    const detailsSectionContent = document.getElementById('details-content');
    const recommendationsSection = document.getElementById('recommendations-section');
    detailsSectionContent.innerHTML = ''; 
    recommendationsSection.innerHTML = ''; 

    const title = details.title || details.name;
    const year = (details.release_date || details.first_air_date)?.substring(0, 4) || 'N/A';
    const overview = details.overview || 'Sem descrição disponível.';
    const posterPath = details.poster_path ? `${imageBaseUrl}${details.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Image';
    const genres = details.genres?.map(g => g.name).join(', ') || '';
    const runtime = details.runtime || (details.episode_run_time?.[0]);
    const voteAverage = details.vote_average ? details.vote_average.toFixed(1) : 'N/A';
    const cast = credits?.cast?.slice(0, 10).map(person => person.name).join(', ') || '';
    const director = credits?.crew?.find(person => person.job === 'Director')?.name;
    const creators = mediaType === 'tv' ? details.created_by?.map(c => c.name).join(', ') : null;
    const itemId = details.id;

    let detailsHTML = `
        <div class="flex flex-col md:flex-row gap-8">
            <img src="${posterPath}" alt="Poster de ${title}" 
                 class="w-full md:w-[30%] rounded-lg shadow-md movie-card self-start">
            <div class="md:w-[70%]">
                <div class="flex justify-between items-start mb-4">
                    <h2 class="text-3xl font-bold">${title} (${year})</h2>
                    <button class="favorite-btn-details text-2xl text-gray-400 hover:text-red-500 ml-4 flex-shrink-0">
                        <i class="far fa-heart"></i> 
                    </button>
                </div>
                <p class="mb-4 text-gray-300">${overview}</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-sm">
                    ${genres ? `<div><strong>Gêneros:</strong> ${genres}</div>` : ''}
                    ${runtime ? `<div><strong>Duração:</strong> ${runtime} min</div>` : ''}
                    ${mediaType === 'tv' && details.number_of_seasons ? `<div><strong>Temporadas:</strong> ${details.number_of_seasons}</div>` : ''}
                    ${mediaType === 'tv' && details.number_of_episodes ? `<div><strong>Episódios:</strong> ${details.number_of_episodes}</div>` : ''}
                    ${voteAverage !== 'N/A' ? `<div><strong>Avaliação TMDb:</strong> ${voteAverage}/10</div>` : ''}
                    ${cast ? `<div><strong>Elenco Principal:</strong> ${cast}</div>` : ''}
                    ${director ? `<div><strong>Diretor:</strong> ${director}</div>` : ''}
                    ${creators ? `<div><strong>Criadores:</strong> ${creators}</div>` : ''}
                </div>
                
                <!-- Seção do Trailer -->
                <div id="trailer-section" class="mb-6">
                    ${trailer && trailer.key ? `
                        <h3 class="text-2xl font-semibold mb-4">Trailer</h3>
                        <div class="h-96">
                            <iframe 
                                class="rounded-lg shadow-lg w-full h-full"
                                src="https://www.youtube.com/embed/${trailer.key}" 
                                title="YouTube video player" 
                                frameborder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowfullscreen></iframe>
                        </div>
                    ` : ''} 
                </div>

                 <button id="back-button" class="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">Voltar</button>
            </div>
        </div>
    `; // Nota: O conteúdo exato do trailer foi omitido aqui por brevidade, mas deve ser incluído como estava antes.

    detailsSectionContent.innerHTML = detailsHTML;

    // Configura botão de favorito dos detalhes
    const favButtonDetails = detailsSectionContent.querySelector('.favorite-btn-details');
    updateFavoriteButtonState(favButtonDetails, isFavorite(itemId, mediaType));
    favButtonDetails?.addEventListener('click', () => {
        toggleFavorite(itemId, mediaType, favButtonDetails);
    });
    
    // Adiciona imagem de fundo
    if (details.backdrop_path) {
        detailsSection.style.backgroundImage = `linear-gradient(rgba(17, 24, 39, 0.9), rgba(17, 24, 39, 0.9)), url(https://image.tmdb.org/t/p/w1280${details.backdrop_path})`;
        detailsSection.style.backgroundSize = 'cover';
        detailsSection.style.backgroundPosition = 'center';
    } else {
         detailsSection.style.backgroundImage = 'none'; // Remove background se não houver imagem
    }

    // --- Exibe Recomendações --- 
    if (recommendations && recommendations.length > 0) {
        recommendationsSection.innerHTML = `
            <h3 class="text-2xl font-semibold mb-6">Recomendações</h3>
            <div id="recommendations-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <!-- Cards de recomendação -->
            </div>
        `;
        const recommendationsGrid = document.getElementById('recommendations-grid');
        recommendations.slice(0, 10).forEach(item => { // Pega as 10 primeiras recomendações
            const card = createRecommendationCard(item);
            recommendationsGrid.appendChild(card);
        });
        recommendationsSection.classList.remove('hidden');
    } else {
        recommendationsSection.classList.add('hidden'); // Oculta seção se não houver recomendações
    }

    // Adiciona evento ao botão Voltar
    document.getElementById('back-button').addEventListener('click', () => {
        detailsSection.classList.add('hidden');
        detailsSection.style.backgroundImage = 'none'; 
        resultsGrid.classList.remove('hidden');
        // genreFilterContainer.classList.remove('hidden'); // Será mostrado pela função de load

        // Volta para a visualização correta na página e GÊNERO em que estava
        if (currentView === 'movies') {
            loadPopularMovies(currentPage, selectedGenreId);
        } else if (currentView === 'tv') {
            loadPopularTvShows(currentPage, selectedGenreId);
        } else if (currentView === 'upcomingMovies') {
             loadUpcomingMovies(currentPage);
        } else if (currentView === 'airingTodayTv') {
             loadAiringTodayTvShows(currentPage);
        } else if (currentView === 'favorites') {
             loadFavoritesPage(); // Favoritos não têm paginação
        } else if (currentView === 'search') {
             searchItems(lastSearchQuery, currentPage); 
        } else {
             loadPopularMovies(1, ''); // Fallback
        }
    });
}

// Função auxiliar para marcar o botão ativo
function setActiveButton(activeButton) {
    popularMoviesBtn.classList.remove('active');
    upcomingMoviesBtn.classList.remove('active'); // Inclui Em Breve
    popularTvBtn.classList.remove('active');
    airingTodayTvBtn.classList.remove('active'); // Inclui No Ar Hoje
    favoritesBtn.classList.remove('active'); 
    if(activeButton){
        activeButton.classList.add('active');
    }
}

// Função auxiliar para limpar o botão ativo 
function clearActiveButton() {
    popularMoviesBtn.classList.remove('active');
    upcomingMoviesBtn.classList.remove('active'); // Inclui Em Breve
    popularTvBtn.classList.remove('active');
    airingTodayTvBtn.classList.remove('active'); // Inclui No Ar Hoje
    favoritesBtn.classList.remove('active'); 
}

// Função auxiliar para atualizar os controles de paginação
function updatePaginationControls() {
    pageIndicator.textContent = `Página ${currentPage} de ${totalPages}`;
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;

    // Mostra os controles apenas se houver mais de uma página
    if (totalPages > 1) {
        paginationControls.classList.remove('hidden');
    } else {
        paginationControls.classList.add('hidden');
    }
}

// Função Debounce genérica
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

// Função intermediária para lidar com o gatilho de busca
function handleSearchTrigger() {
    const query = searchInput.value.trim();
    // Só busca se houver uma query (para evitar buscas vazias pelo debounce do input)
    if (query) {
        searchItems(query, 1); // Inicia busca na página 1
    } else {
         // Se a query for apagada, volta para a visualização padrão (ex: filmes populares)
         // Opcional: Pode-se apenas limpar os resultados ou manter a view anterior.
         // Vamos voltar para os filmes populares como comportamento padrão ao limpar a busca.
         if (currentView === 'search') { // Só volta se a view atual for de busca
             loadPopularMovies(1); 
         }
    }
}

// Cria a versão debounced da função de busca (ex: 300ms de delay)
const debouncedSearch = debounce(handleSearchTrigger, 300);

// --- Event Listeners ---

// Listener para o botão de busca (USA DEBOUNCE)
searchButton.addEventListener('click', debouncedSearch);

// Listener para a tecla Enter no campo de busca (USA DEBOUNCE)
searchInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        // event.preventDefault(); // Previne comportamento padrão do Enter, se houver algum formulário
        debouncedSearch();
    }
});

// Listener para digitação no campo de busca (USA DEBOUNCE)
searchInput.addEventListener('input', debouncedSearch);

// Listeners para os botões de paginação
prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        if (currentView === 'movies') {
            loadPopularMovies(currentPage - 1, selectedGenreId);
        } else if (currentView === 'tv') {
            loadPopularTvShows(currentPage - 1, selectedGenreId);
        } else if (currentView === 'upcomingMovies') {
            loadUpcomingMovies(currentPage - 1);
        } else if (currentView === 'airingTodayTv') {
            loadAiringTodayTvShows(currentPage - 1);
        } else if (currentView === 'search') {
            searchItems(lastSearchQuery, currentPage - 1);
        }
        window.scrollTo(0, 0); // Rola para o topo
    }
});

nextPageBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
         if (currentView === 'movies') {
            loadPopularMovies(currentPage + 1, selectedGenreId);
        } else if (currentView === 'tv') {
            loadPopularTvShows(currentPage + 1, selectedGenreId);
        } else if (currentView === 'upcomingMovies') {
           loadUpcomingMovies(currentPage + 1);
        } else if (currentView === 'airingTodayTv') {
           loadAiringTodayTvShows(currentPage + 1);
        } else if (currentView === 'search') {
            searchItems(lastSearchQuery, currentPage + 1);
        }
        window.scrollTo(0, 0); // Rola para o topo
    }
});

// Listeners para os botões de navegação (resetam o gênero selecionado)
popularMoviesBtn.addEventListener('click', () => {
    selectedGenreId = ''; 
    loadPopularMovies(1, selectedGenreId);
}); 
upcomingMoviesBtn.addEventListener('click', () => loadUpcomingMovies(1)); // Chama nova função
popularTvBtn.addEventListener('click', () => {
    selectedGenreId = ''; 
    loadPopularTvShows(1, selectedGenreId);
});   
airingTodayTvBtn.addEventListener('click', () => loadAiringTodayTvShows(1)); // Chama nova função

// Listener para o título do app (reseta o gênero selecionado e vai para Pop Filmes)
appTitle.addEventListener('click', () => {
    selectedGenreId = ''; 
    loadPopularMovies(1, selectedGenreId); 
    window.scrollTo(0, 0); 
});

// Listener para o filtro de gênero (SÓ funciona para Populares)
genreFilter.addEventListener('change', (event) => {
    const genreId = event.target.value;
    // Só aplica se a view atual for de filmes ou séries populares
    if (currentView === 'movies' || currentView === 'tv') {
        selectedGenreId = genreId; 
        if (currentView === 'movies') {
            loadPopularMovies(1, genreId);
        } else { // currentView === 'tv'
            loadPopularTvShows(1, genreId);
        }
    }
});

// Listener para o botão Favoritos
favoritesBtn.addEventListener('click', loadFavoritesPage);

// Carregar favoritos, gêneros e depois filmes populares ao iniciar
document.addEventListener('DOMContentLoaded', async () => {
    favorites = getFavoritesFromStorage(); 
    await fetchGenres(); 
    loadPopularMovies(1); 
}); 