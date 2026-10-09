// =========================================================
// CARÁTULA DISCO GRIS POR DEFECTO (SVG) & MANEJADOR GLOBAL
// =========================================================
const DEFAULT_COVER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%232c2c2e'/%3E%3Ccircle cx='50' cy='50' r='25' stroke='%23555' stroke-width='4' fill='none'/%3E%3Ccircle cx='50' cy='50' r='8' fill='%23777'/%3E%3C/svg%3E";

// Manejador de error para cualquier imagen que falle
window.onCoverError = function(img) {
  img.onerror = null;
  img.src = DEFAULT_COVER;
};

// =========================================================
// CONFIGURACIÓN DE INDEXEDDB (PERSISTENCIA TOTAL EN DISCO)
// =========================================================
const DB_NAME = 'NoirMusicDB';
const DB_VERSION = 1;
const STORE_NAME = 'songs';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function saveSongToDB(song) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(song);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

async function loadSongsFromDB() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function deleteSongFromDB(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

// =========================================================
// ESTADO GLOBAL DE LA APLICACIÓN
// =========================================================
let songs = [];
let playlists = JSON.parse(localStorage.getItem('noir_playlists')) || [];
let favorites = JSON.parse(localStorage.getItem('noir_favorites')) || [];
let currentView = 'all'; 
let currentSongIndex = -1;
let isPlaying = false;
let isShuffle = false;
let isRepeat = false;

let editingSongId = null;
let tempEditCoverUrl = null;

const audio = new Audio();

// ELEMENTOS DEL DOM
const fileInput = document.getElementById('file-input');
const folderInput = document.getElementById('folder-input');
const btnImportFiles = document.getElementById('btn-import-files');
const btnImportFolder = document.getElementById('btn-import-folder');
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const btnOpenIntegrations = document.getElementById('btn-open-integrations');
const integrationsModal = document.getElementById('integrations-modal');
const btnCloseIntegrations = document.getElementById('btn-close-integrations');
const settingsModal = document.getElementById('settings-modal');
const btnOpenSettings = document.getElementById('btn-open-settings');
const btnCloseSettings = document.getElementById('btn-close-settings');
const eqSlidersEl = document.getElementById('eq-sliders');
const eqCanvas = document.getElementById('eq-canvas');
const eqStatus = document.getElementById('eq-status');
const colorInputs = {
  primary: document.getElementById('color-primary'),
  accent: document.getElementById('color-accent'),
  bg: document.getElementById('color-bg'),
  card: document.getElementById('color-card')
};
const canvasVisualLoop = document.getElementById('canvas-visual-loop');
const playerCanvasLoop = document.getElementById('player-canvas-loop');
const songsList = document.getElementById('songs-list');
const emptyState = document.getElementById('empty-state');
const currentViewTitle = document.getElementById('current-view-title');
const songCountEl = document.getElementById('song-count');
const favCountEl = document.getElementById('fav-count');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const playlistsListEl = document.getElementById('playlists-list');
const btnAddPlaylist = document.getElementById('btn-add-playlist');
const canvasAmbientBg = document.getElementById('canvas-ambient-bg');

// REPRODUCTOR PRINCIPAL DOM
const btnPlay = document.getElementById('btn-play');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnShuffle = document.getElementById('btn-shuffle');
const btnRepeat = document.getElementById('btn-repeat');
const progressBar = document.getElementById('progress-bar');
const currentTimeEl = document.getElementById('current-time');
const totalTimeEl = document.getElementById('total-time');
const volumeBar = document.getElementById('volume-bar');
const playerCover = document.getElementById('player-cover');
const playerTitle = document.getElementById('player-title');
const playerArtist = document.getElementById('player-artist');
const playerFavBtn = document.getElementById('player-fav-btn');

// CANVAS FULLSCREEN DOM
const fullscreenCanvasView = document.getElementById('fullscreen-canvas-view');
const btnToggleCanvas = document.getElementById('btn-toggle-canvas');
const btnOpenCanvasView = document.getElementById('btn-open-canvas-view');
const btnCloseCanvas = document.getElementById('btn-close-canvas');
const canvasFullCover = document.getElementById('canvas-full-cover');
const canvasFullTitle = document.getElementById('canvas-full-title');
const canvasFullArtist = document.getElementById('canvas-full-artist');
const canvasFullGenre = document.getElementById('canvas-full-genre');

const canvasBtnPlay = document.getElementById('canvas-btn-play');
const canvasBtnPrev = document.getElementById('canvas-btn-prev');
const canvasBtnNext = document.getElementById('canvas-btn-next');
const canvasBtnShuffle = document.getElementById('canvas-btn-shuffle');
const canvasBtnRepeat = document.getElementById('canvas-btn-repeat');
const canvasProgressBar = document.getElementById('canvas-progress-bar');
const canvasCurrentTimeEl = document.getElementById('canvas-current-time');
const canvasTotalTimeEl = document.getElementById('canvas-total-time');

// MODAL EDITAR CANCIÓN DOM
const editSongModal = document.getElementById('edit-song-modal');
const editCoverPreview = document.getElementById('edit-cover-preview');
const btnChangeCover = document.getElementById('btn-change-cover');
const editCoverInput = document.getElementById('edit-cover-input');
const editSongTitle = document.getElementById('edit-song-title');
const editSongArtist = document.getElementById('edit-song-artist');
const editSongAlbum = document.getElementById('edit-song-album');
const editSongGenre = document.getElementById('edit-song-genre');
const btnCloseEditModal = document.getElementById('btn-close-edit-modal');
const btnCancelEditSong = document.getElementById('btn-cancel-edit-song');
const btnSaveEditSong = document.getElementById('btn-save-edit-song');

// OTROS MODALES DOM
const playlistModal = document.getElementById('playlist-modal');
const modalPlaylistsList = document.getElementById('modal-playlists-list');
const btnCloseModal = document.getElementById('btn-close-modal');

const createPlaylistModal = document.getElementById('create-playlist-modal');
const newPlaylistNameInput = document.getElementById('new-playlist-name');
const btnCloseCreateModal = document.getElementById('btn-close-create-modal');
const btnCancelCreatePlaylist = document.getElementById('btn-cancel-create-playlist');
const btnConfirmCreatePlaylist = document.getElementById('btn-confirm-create-playlist');

// =========================================================
// INICIALIZACIÓN
// =========================================================
document.addEventListener('DOMContentLoaded', async () => {
  restoreThemePreference();
  restoreIntegrationStates();
  startProceduralCanvas();
  await inicializarBibliotecaPersistente();
  renderPlaylistsNav();
  renderCurrentView();

  // Listeners de importación
  btnImportFiles.addEventListener('click', () => fileInput.click());
  btnImportFolder.addEventListener('click', () => folderInput.click());

  fileInput.addEventListener('change', handleFileSelect);
  folderInput.addEventListener('change', handleFileSelect);

  // Navegación Sidebar
  document.getElementById('nav-all').addEventListener('click', () => switchView('all'));
  document.getElementById('nav-favs').addEventListener('click', () => switchView('favs'));
  
  // Modal Crear Playlist
  btnAddPlaylist.addEventListener('click', abrirModalCrearPlaylist);
  btnCloseCreateModal.addEventListener('click', cerrarModalCrearPlaylist);
  btnCancelCreatePlaylist.addEventListener('click', cerrarModalCrearPlaylist);
  btnConfirmCreatePlaylist.addEventListener('click', confirmarCrearPlaylist);

  // Modal Editar Canción
  btnCloseEditModal.addEventListener('click', cerrarModalEditarCancion);
  btnCancelEditSong.addEventListener('click', cerrarModalEditarCancion);
  btnSaveEditSong.addEventListener('click', guardarEdicionCancion);
  btnChangeCover.addEventListener('click', () => editCoverInput.click());
  editCoverInput.addEventListener('change', handleNewCoverSelect);

  // Vista Spotify Canvas
  btnToggleCanvas.addEventListener('click', toggleCanvasFullscreen);
  btnOpenCanvasView.addEventListener('click', toggleCanvasFullscreen);
  btnCloseCanvas.addEventListener('click', () => fullscreenCanvasView.classList.remove('active'));

  // Búsqueda y Ordenamiento
  searchInput.addEventListener('input', renderCurrentView);
  sortSelect.addEventListener('change', renderCurrentView);

  // Tema Claro / Oscuro
  themeToggle.addEventListener('click', toggleTheme);
  wireSettingsUI();

  btnOpenIntegrations.addEventListener('click', () => integrationsModal.classList.add('active'));
  btnCloseIntegrations.addEventListener('click', () => integrationsModal.classList.remove('active'));
  integrationsModal.addEventListener('click', (e) => { if (e.target === integrationsModal) integrationsModal.classList.remove('active'); });
  document.querySelectorAll('.integration-connect').forEach(btn => btn.addEventListener('click', () => configureExternalService(btn.dataset.service)));
  inspectSpotifyCallback();
  if (window.matchMedia) window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', handleSystemThemeChange);

  // Controles de audio principales
  btnPlay.addEventListener('click', togglePlay);
  btnNext.addEventListener('click', nextSong);
  btnPrev.addEventListener('click', prevSong);
  btnShuffle.addEventListener('click', toggleShuffle);
  btnRepeat.addEventListener('click', toggleRepeat);

  // Controles de audio Canvas
  canvasBtnPlay.addEventListener('click', togglePlay);
  canvasBtnNext.addEventListener('click', nextSong);
  canvasBtnPrev.addEventListener('click', prevSong);
  canvasBtnShuffle.addEventListener('click', toggleShuffle);
  canvasBtnRepeat.addEventListener('click', toggleRepeat);

  audio.addEventListener('timeupdate', updateProgress);
  audio.addEventListener('ended', onSongEnd);

  progressBar.addEventListener('input', seekSong);
  canvasProgressBar.addEventListener('input', seekSongCanvas);
  volumeBar.addEventListener('input', (e) => audio.volume = e.target.value / 100);

  playerFavBtn.addEventListener('click', () => {
    if (currentSongIndex >= 0) {
      toggleFavorite(songs[currentSongIndex].id);
    }
  });

  btnCloseModal.addEventListener('click', () => playlistModal.classList.remove('active'));
});

// =========================================================
// CARGA PERSISTENTE Y SANITIZACIÓN DE CARÁTULAS DESDE DB
// =========================================================
async function inicializarBibliotecaPersistente() {
  try {
    const savedSongs = await loadSongsFromDB();
    songs = savedSongs.map(s => {
      const blobUrl = URL.createObjectURL(s.fileBlob);
      
      // Sanitizar carátulas corruptas o vacías previamente guardadas
      let cleanCover = s.cover;
      if (!cleanCover || cleanCover.trim() === "" || cleanCover.length < 30 || cleanCover.includes("undefined")) {
        cleanCover = DEFAULT_COVER;
      }

      return {
        ...s,
        url: blobUrl,
        cover: cleanCover
      };
    });
  } catch (err) {
    console.error("Error al cargar canciones guardadas:", err);
  }
}

// =========================================================
// PROCESAMIENTO DE ARCHIVOS Y GUARDA EN INDEXEDDB
// =========================================================
function handleFileSelect(event) {
  const files = Array.from(event.target.files);
  
  const audioFiles = files.filter(file => 
    file.type.startsWith('audio/') || 
    /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(file.name)
  );

  if (audioFiles.length === 0) return;

  let loadedCount = 0;
  audioFiles.forEach(file => {
    const songId = 'song_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const objectUrl = URL.createObjectURL(file);

    const newSong = {
      id: songId,
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: "Artista Desconocido",
      album: "Álbum Desconocido",
      genre: "General",
      duration: "0:00",
      fileBlob: file,
      url: objectUrl,
      dateAdded: file.lastModified || Date.now(),
      cover: DEFAULT_COVER
    };

    const finalizeAdd = async (songObj) => {
      songs.push(songObj);
      await saveSongToDB(songObj);
      loadedCount++;
      if (loadedCount === audioFiles.length) renderCurrentView();
    };

    if (window.jsmediatags) {
      window.jsmediatags.read(file, {
        onSuccess: function(tag) {
          const tags = tag.tags;
          if (tags.title) newSong.title = tags.title;
          if (tags.artist) newSong.artist = tags.artist;
          if (tags.album) newSong.album = tags.album;
          if (tags.genre) newSong.genre = tags.genre;

          if (tags.picture && tags.picture.data && tags.picture.data.length > 0) {
            const { data, format } = tags.picture;
            let base64String = "";
            for (let i = 0; i < data.length; i++) {
              base64String += String.fromCharCode(data[i]);
            }
            newSong.cover = `data:${format};base64,${window.btoa(base64String)}`;
          } else {
            newSong.cover = DEFAULT_COVER;
          }

          finalizeAdd(newSong);
        },
        onError: function() {
          newSong.cover = DEFAULT_COVER;
          finalizeAdd(newSong);
        }
      });
    } else {
      finalizeAdd(newSong);
    }
  });

  event.target.value = '';
}

// =========================================================
// RENDERIZADO DE VISTAS
// =========================================================
function switchView(viewId) {
  currentView = viewId;
  document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
  
  if (viewId === 'all') document.getElementById('nav-all').classList.add('active');
  else if (viewId === 'favs') document.getElementById('nav-favs').classList.add('active');
  else {
    const plEl = document.getElementById(`pl-${viewId}`);
    if (plEl) plEl.classList.add('active');
  }

  renderCurrentView();
}

function renderCurrentView() {
  let displayedSongs = [];
  const query = searchInput.value.toLowerCase().trim();
  const sortOption = sortSelect.value;

  if (currentView === 'all') {
    currentViewTitle.textContent = "Tu biblioteca";
    displayedSongs = [...songs];
  } else if (currentView === 'favs') {
    currentViewTitle.textContent = "Favoritos";
    displayedSongs = songs.filter(s => favorites.includes(s.id));
  } else {
    const pl = playlists.find(p => p.id === currentView);
    if (pl) {
      currentViewTitle.textContent = pl.name;
      displayedSongs = songs.filter(s => pl.songs.includes(s.id));
    }
  }

  if (query) {
    displayedSongs = displayedSongs.filter(s => 
      s.title.toLowerCase().includes(query) || 
      s.artist.toLowerCase().includes(query) ||
      (s.genre && s.genre.toLowerCase().includes(query))
    );
  }

  displayedSongs.sort((a, b) => {
    if (sortOption === 'title-asc') return a.title.localeCompare(b.title);
    if (sortOption === 'title-desc') return b.title.localeCompare(a.title);
    if (sortOption === 'artist-asc') return a.artist.localeCompare(b.artist);
    if (sortOption === 'date-desc') return (b.dateAdded || 0) - (a.dateAdded || 0);
    if (sortOption === 'date-asc') return (a.dateAdded || 0) - (b.dateAdded || 0);
    return 0;
  });

  songCountEl.textContent = `${displayedSongs.length} canciones`;
  favCountEl.textContent = favorites.length;

  songsList.innerHTML = '';
  if (displayedSongs.length === 0) {
    emptyState.style.display = 'flex';
  } else {
    emptyState.style.display = 'none';
    displayedSongs.forEach((song, index) => {
      const isFav = favorites.includes(song.id);
      const isCurrentSong = (songs[currentSongIndex] && songs[currentSongIndex].id === song.id);

      const tr = document.createElement('tr');
      if (isCurrentSong) tr.classList.add('playing-row');

      const isPlaylistView = currentView !== 'all' && currentView !== 'favs';
      const removeBtnHtml = isPlaylistView ? `
        <button class="btn-icon-small" title="Quitar de esta playlist" onclick="eliminarCancionDePlaylist('${currentView}', '${song.id}', event)">
          <i class="fas fa-minus-circle" style="color: #e74c3c;"></i>
        </button>
      ` : '';

      const indexOrEq = isCurrentSong ? `
        <div class="equalizer-icon ${isPlaying ? 'playing' : ''}">
          <span></span><span></span><span></span>
        </div>
      ` : (index + 1);

      const songCoverSrc = (song.cover && song.cover.length > 30) ? song.cover : DEFAULT_COVER;

      tr.innerHTML = `
        <td class="col-num">${indexOrEq}</td>
        <td class="col-cover">
          <img src="${songCoverSrc}" 
               class="song-img" 
               alt="Carátula" 
               onerror="onCoverError(this)">
        </td>
        <td class="col-title"><strong>${song.title}</strong></td>
        <td class="col-artist hide-mobile">${song.artist} — <em>${song.album}</em></td>
        <td class="col-duration hide-mobile">${song.duration}</td>
        <td class="col-actions">
          <button class="btn-icon-small" title="Editar canción" onclick="abrirModalEditarCancion('${song.id}', event)">
            <i class="fas fa-pen"></i>
          </button>
          <button class="btn-icon-small" onclick="toggleFavorite('${song.id}', event)">
            <i class="${isFav ? 'fas' : 'far'} fa-heart" style="${isFav ? 'color: #e74c3c;' : ''}"></i>
          </button>
          <button class="btn-icon-small" title="Añadir a playlist" onclick="abrirModalPlaylist('${song.id}', event)">
            <i class="fas fa-plus"></i>
          </button>
          ${removeBtnHtml}
          <button class="btn-icon-small" title="Eliminar canción de la biblioteca" onclick="eliminarCancionDeBiblioteca('${song.id}', event)">
            <i class="fas fa-trash-alt" style="color: rgba(255,255,255,0.4);"></i>
          </button>
        </td>
      `;

      tr.addEventListener('click', (e) => {
        if (!e.target.closest('.col-actions')) {
          if (isCurrentSong) {
            togglePlay();
          } else {
            reproducirCancion(song);
          }
        }
      });

      songsList.appendChild(tr);
    });
  }
}

// =========================================================
// EDICIÓN Y ELIMINACIÓN DE CANCIONES (PERSISTENCIA Y DB)
// =========================================================
function abrirModalEditarCancion(songId, event) {
  if (event) event.stopPropagation();
  const song = songs.find(s => s.id === songId);
  if (!song) return;

  editingSongId = songId;
  tempEditCoverUrl = (song.cover && song.cover.length > 30) ? song.cover : DEFAULT_COVER;

  editCoverPreview.src = tempEditCoverUrl;
  editSongTitle.value = song.title;
  editSongArtist.value = song.artist === "Artista Desconocido" ? "" : song.artist;
  editSongAlbum.value = song.album === "Álbum Desconocido" ? "" : song.album;
  editSongGenre.value = song.genre || "";

  editSongModal.classList.add('active');
}

function cerrarModalEditarCancion() {
  editSongModal.classList.remove('active');
  editingSongId = null;
  tempEditCoverUrl = null;
}

function handleNewCoverSelect(event) {
  const file = event.target.files[0];
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = function(e) {
      tempEditCoverUrl = e.target.result;
      editCoverPreview.src = tempEditCoverUrl;
    };
    reader.readAsDataURL(file);
  }
}

async function guardarEdicionCancion() {
  if (!editingSongId) return;

  const song = songs.find(s => s.id === editingSongId);
  if (song) {
    song.title = editSongTitle.value.trim() || "Sin Título";
    song.artist = editSongArtist.value.trim() || "Artista Desconocido";
    song.album = editSongAlbum.value.trim() || "Álbum Desconocido";
    song.genre = editSongGenre.value.trim() || "General";
    if (tempEditCoverUrl) song.cover = tempEditCoverUrl;

    await saveSongToDB(song);

    if (songs[currentSongIndex] && songs[currentSongIndex].id === editingSongId) {
      playerTitle.textContent = song.title;
      playerArtist.textContent = song.artist;
      playerCover.src = song.cover;

      canvasFullTitle.textContent = song.title;
      canvasFullArtist.textContent = `${song.artist} — ${song.album}`;
      canvasFullCover.src = song.cover;
      canvasFullGenre.textContent = song.genre;
      canvasAmbientBg.style.backgroundImage = `url('${song.cover}')`;
    }

    renderCurrentView();
    cerrarModalEditarCancion();
  }
}

async function eliminarCancionDeBiblioteca(songId, event) {
  if (event) event.stopPropagation();
  if (confirm("¿Estás seguro de que deseas eliminar esta canción de la biblioteca?")) {
    if (songs[currentSongIndex] && songs[currentSongIndex].id === songId) {
      audio.pause();
      audio.src = '';
      isPlaying = false;
      currentSongIndex = -1;
      playerTitle.textContent = "Elige una canción";
      playerArtist.textContent = "Tu biblioteca aparecerá aquí";
      playerCover.src = DEFAULT_COVER;
      playerCover.classList.remove('playing-cover');
      canvasAmbientBg.classList.remove('active-playing');
      btnPlay.querySelector('i').className = 'fas fa-play';
      canvasBtnPlay.querySelector('i').className = 'fas fa-play';
    }

    songs = songs.filter(s => s.id !== songId);
    favorites = favorites.filter(id => id !== songId);
    playlists.forEach(pl => pl.songs = pl.songs.filter(id => id !== songId));

    await deleteSongFromDB(songId);

    guardarEnLocalStorage();
    renderCurrentView();
  }
}

// =========================================================
// GESTIÓN DE PLAYLISTS Y FAVORITOS
// =========================================================
function abrirModalCrearPlaylist() {
  newPlaylistNameInput.value = '';
  createPlaylistModal.classList.add('active');
  setTimeout(() => newPlaylistNameInput.focus(), 50);
}

function cerrarModalCrearPlaylist() {
  createPlaylistModal.classList.remove('active');
}

function confirmarCrearPlaylist() {
  const nombre = newPlaylistNameInput.value.trim();
  if (nombre) {
    const pl = {
      id: 'pl_' + Date.now(),
      name: nombre,
      songs: []
    };
    playlists.push(pl);
    guardarEnLocalStorage();
    renderPlaylistsNav();
    cerrarModalCrearPlaylist();
  }
}

function renderPlaylistsNav() {
  playlistsListEl.innerHTML = '';
  playlists.forEach(pl => {
    const li = document.createElement('li');
    li.id = `pl-${pl.id}`;
    if (currentView === pl.id) li.classList.add('active');

    li.innerHTML = `
      <div class="playlist-item-left">
        <i class="fas fa-list-ul"></i>
        <span>${pl.name}</span>
      </div>
      <button class="btn-icon-small btn-delete-playlist" title="Eliminar esta playlist" onclick="eliminarPlaylist('${pl.id}', event)">
        <i class="fas fa-trash-alt"></i>
      </button>
    `;

    li.addEventListener('click', (e) => {
      if (!e.target.closest('.btn-delete-playlist')) switchView(pl.id);
    });

    playlistsListEl.appendChild(li);
  });
}

function eliminarPlaylist(playlistId, event) {
  if (event) event.stopPropagation();
  if (confirm("¿Estás seguro de que deseas eliminar esta playlist?")) {
    playlists = playlists.filter(p => p.id !== playlistId);
    guardarEnLocalStorage();
    if (currentView === playlistId) switchView('all');
    else renderPlaylistsNav();
  }
}

function abrirModalPlaylist(songId, event) {
  if (event) event.stopPropagation();
  selectedSongIdForModal = songId;
  modalPlaylistsList.innerHTML = '';

  if (playlists.length === 0) {
    modalPlaylistsList.innerHTML = '<p class="subtext">No tienes playlists creadas</p>';
  } else {
    playlists.forEach(pl => {
      const item = document.createElement('div');
      item.className = 'modal-item';
      const estaEnPL = pl.songs.includes(songId);
      item.innerHTML = `
        <span>${pl.name}</span>
        <i class="fas ${estaEnPL ? 'fa-check' : 'fa-plus'}"></i>
      `;
      item.addEventListener('click', () => {
        if (!estaEnPL) {
          pl.songs.push(songId);
          guardarEnLocalStorage();
          playlistModal.classList.remove('active');
          if (currentView === pl.id) renderCurrentView();
        }
      });
      modalPlaylistsList.appendChild(item);
    });
  }

  playlistModal.classList.add('active');
}

function eliminarCancionDePlaylist(playlistId, songId, event) {
  if (event) event.stopPropagation();
  const pl = playlists.find(p => p.id === playlistId);
  if (pl) {
    pl.songs = pl.songs.filter(id => id !== songId);
    guardarEnLocalStorage();
    renderCurrentView();
  }
}

function toggleFavorite(songId, event) {
  if (event) event.stopPropagation();
  if (favorites.includes(songId)) favorites = favorites.filter(id => id !== songId);
  else favorites.push(songId);
  
  guardarEnLocalStorage();
  renderCurrentView();

  if (songs[currentSongIndex] && songs[currentSongIndex].id === songId) {
    const isFav = favorites.includes(songId);
    playerFavBtn.querySelector('i').className = `${isFav ? 'fas' : 'far'} fa-heart`;
  }
}

function guardarEnLocalStorage() {
  localStorage.setItem('noir_playlists', JSON.stringify(playlists));
  localStorage.setItem('noir_favorites', JSON.stringify(favorites));
}

// =========================================================
// LÓGICA DEL REPRODUCTOR & SPOTIFY CANVAS
// =========================================================
function reproducirCancion(song) {
  currentSongIndex = songs.findIndex(s => s.id === song.id);
  audio.src = song.url;
  audio.play();
  isPlaying = true;

  const songCoverSrc = (song.cover && song.cover.length > 30) ? song.cover : DEFAULT_COVER;

  playerCover.src = songCoverSrc;
  playerTitle.textContent = song.title;
  playerArtist.textContent = song.artist;

  canvasFullCover.src = songCoverSrc;
  setProceduralCanvasTrack(song);
  canvasFullTitle.textContent = song.title;
  canvasFullArtist.textContent = `${song.artist} — ${song.album}`;
  canvasFullGenre.textContent = song.genre || "General";

  canvasAmbientBg.style.backgroundImage = `url('${songCoverSrc}')`;
  canvasAmbientBg.classList.add('active-playing');

  playerCover.classList.add('playing-cover');

  const isFav = favorites.includes(song.id);
  playerFavBtn.querySelector('i').className = `${isFav ? 'fas' : 'far'} fa-heart`;

  btnPlay.querySelector('i').className = 'fas fa-pause';
  canvasBtnPlay.querySelector('i').className = 'fas fa-pause';
  renderCurrentView();
}

function togglePlay() {
  ensureAudioGraph();
  if (currentSongIndex === -1 && songs.length > 0) {
    reproducirCancion(songs[0]);
    return;
  }
  if (!audio.src) return;

  if (isPlaying) {
    audio.pause();
    btnPlay.querySelector('i').className = 'fas fa-play';
    canvasBtnPlay.querySelector('i').className = 'fas fa-play';
    playerCover.classList.remove('playing-cover');
    canvasAmbientBg.classList.remove('active-playing');
  } else {
    audio.play();
    btnPlay.querySelector('i').className = 'fas fa-pause';
    canvasBtnPlay.querySelector('i').className = 'fas fa-pause';
    playerCover.classList.add('playing-cover');
    canvasAmbientBg.classList.add('active-playing');
  }
  isPlaying = !isPlaying;
  renderCurrentView();
}

function toggleShuffle() {
  isShuffle = !isShuffle;
  btnShuffle.classList.toggle('active', isShuffle);
  canvasBtnShuffle.classList.toggle('active', isShuffle);
}

function toggleRepeat() {
  isRepeat = !isRepeat;
  btnRepeat.classList.toggle('active', isRepeat);
  canvasBtnRepeat.classList.toggle('active', isRepeat);
}

function toggleCanvasFullscreen() {
  if (currentSongIndex >= 0) {
    fullscreenCanvasView.classList.toggle('active');
    if (fullscreenCanvasView.classList.contains('active')) setTimeout(() => resizeProceduralCanvas?.(), 30);
  } else {
    alert("Primero reproduce una canción para activar la vista Canvas.");
  }
}

function nextSong() {
  if (songs.length === 0) return;
  if (isShuffle) currentSongIndex = Math.floor(Math.random() * songs.length);
  else currentSongIndex = (currentSongIndex + 1) % songs.length;
  reproducirCancion(songs[currentSongIndex]);
}

function prevSong() {
  if (songs.length === 0) return;
  currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
  reproducirCancion(songs[currentSongIndex]);
}

function onSongEnd() {
  if (isRepeat) {
    audio.currentTime = 0;
    audio.play();
  } else {
    nextSong();
  }
}

function updateProgress() {
  if (audio.duration) {
    const pct = (audio.currentTime / audio.duration) * 100;
    progressBar.value = pct;
    canvasProgressBar.value = pct;

    const formattedCurrent = formatTime(audio.currentTime);
    const formattedTotal = formatTime(audio.duration);

    currentTimeEl.textContent = formattedCurrent;
    totalTimeEl.textContent = formattedTotal;

    canvasCurrentTimeEl.textContent = formattedCurrent;
    canvasTotalTimeEl.textContent = formattedTotal;

    if (songs[currentSongIndex] && songs[currentSongIndex].duration === "0:00") {
      songs[currentSongIndex].duration = formattedTotal;
      renderCurrentView();
    }
  }
}

function seekSong() {
  if (audio.duration) {
    audio.currentTime = (progressBar.value / 100) * audio.duration;
  }
}

function seekSongCanvas() {
  if (audio.duration) {
    audio.currentTime = (canvasProgressBar.value / 100) * audio.duration;
  }
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// =========================================================
// AJUSTES NOIR — WEB AUDIO EQ + PALETAS PERSISTENTES
// =========================================================
let audioContext = null;
let mediaSourceNode = null;
let masterGainNode = null;
let analyserNode = null;
let eqFilters = [];
let eqVisualizerFrame = null;
const EQ_BANDS = [60, 120, 230, 460, 910, 1800, 3600, 7200, 11000, 14000];
const EQ_PRESETS = {
  flat:       [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  rock:       [4, 3, 1, -1, -2, 1, 3, 4, 4, 3],
  pop:        [-1, 1, 3, 4, 3, 1, -1, -1, 1, 2],
  bass:       [7, 6, 5, 3, 1, 0, 0, 0, 0, 0],
  vocal:      [-2, -1, 1, 3, 4, 4, 3, 1, 0, -1],
  electronic: [4, 3, 0, -2, -1, 2, 3, 4, 5, 4]
};
const PALETTE_DEFS = {
  noir: {
    dark:  { bg:'#090c10', sidebar:'#0c1116', card:'#131a21', hover:'#1b252e', active:'#23323d', player:'#0d1318', primary:'#f7fbff', accent:'#00d9ff', accentHover:'#18e2ff', accentLight:'rgba(0,217,255,.18)' },
    light: { bg:'#f4f7fa', sidebar:'#eaf0f4', card:'#ffffff', hover:'#e4edf2', active:'#d7e7ee', player:'#ffffff', primary:'#10212a', accent:'#007f96', accentHover:'#006d82', accentLight:'rgba(0,127,150,.12)' }
  },
  ocean: {
    dark:  { bg:'#06151b', sidebar:'#081c24', card:'#0b2832', hover:'#103c48', active:'#165364', player:'#0a222a', primary:'#ebfdff', accent:'#38d7ee', accentHover:'#74e6f3', accentLight:'rgba(56,215,238,.18)' },
    light: { bg:'#eefbfd', sidebar:'#e0f4f8', card:'#ffffff', hover:'#d8f0f4', active:'#c8e9ef', player:'#ffffff', primary:'#12343b', accent:'#087f95', accentHover:'#066d7f', accentLight:'rgba(8,127,149,.12)' }
  },
  violet: {
    dark:  { bg:'#0d0a16', sidebar:'#120d1c', card:'#21152f', hover:'#332046', active:'#472c63', player:'#191022', primary:'#faf5ff', accent:'#b68cff', accentHover:'#caa9ff', accentLight:'rgba(182,140,255,.18)' },
    light: { bg:'#f7f2fc', sidebar:'#eee4f7', card:'#ffffff', hover:'#eadcf5', active:'#ddc9ed', player:'#ffffff', primary:'#2f2140', accent:'#7b4fc5', accentHover:'#633ba7', accentLight:'rgba(123,79,197,.12)' }
  },
  sunset: {
    dark:  { bg:'#170b09', sidebar:'#1d100d', card:'#321916', hover:'#4a211b', active:'#633027', player:'#28130f', primary:'#fff7f2', accent:'#ff9b67', accentHover:'#ffb58f', accentLight:'rgba(255,155,103,.18)' },
    light: { bg:'#fff5ef', sidebar:'#f8e9df', card:'#ffffff', hover:'#f7ded0', active:'#efccba', player:'#ffffff', primary:'#3c241d', accent:'#c85e2c', accentHover:'#a84c22', accentLight:'rgba(200,94,44,.12)' }
  },
  mint: {
    dark:  { bg:'#06130f', sidebar:'#0a1b15', card:'#102f27', hover:'#17473a', active:'#1d5e4c', player:'#0c241d', primary:'#edfff8', accent:'#6ee7b7', accentHover:'#91f1c9', accentLight:'rgba(110,231,183,.18)' },
    light: { bg:'#effbf6', sidebar:'#e1f3ec', card:'#ffffff', hover:'#d7eee5', active:'#c5e2d6', player:'#ffffff', primary:'#18372d', accent:'#168b64', accentHover:'#107451', accentLight:'rgba(22,139,100,.12)' }
  }
};
const PALETTE_STORAGE_KEY = 'noir_palette_name';
const PALETTE_OVERRIDE_KEY = 'noir_palette_overrides';
const EQ_STORAGE_KEY = 'noir_eq';

function readJsonStorage(key, fallback = null) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch (_) { return fallback; }
}
function ensureAudioGraph() {
  if (audioContext) { if (audioContext.state === 'suspended') audioContext.resume().catch(() => {}); return true; }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) { if (eqStatus) eqStatus.textContent = 'No compatible'; return false; }
  try {
    audioContext = new Ctx();
    mediaSourceNode = audioContext.createMediaElementSource(audio);
    let previous = mediaSourceNode;
    eqFilters = [];
    EQ_BANDS.forEach(hz => {
      const filter = audioContext.createBiquadFilter();
      filter.type = 'peaking'; filter.frequency.value = hz; filter.Q.value = 1.05; filter.gain.value = 0;
      previous.connect(filter); previous = filter; eqFilters.push(filter);
    });
    masterGainNode = audioContext.createGain();
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048; analyserNode.smoothingTimeConstant = .84;
    previous.connect(masterGainNode); masterGainNode.connect(analyserNode); analyserNode.connect(audioContext.destination);
    restoreEqToGraph();
    if (eqStatus) eqStatus.textContent = 'Web Audio activo';
    startEqVisualizer();
    return true;
  } catch (error) {
    console.error('NOIR Web Audio:', error);
    audioContext = mediaSourceNode = masterGainNode = analyserNode = null; eqFilters = [];
    if (eqStatus) eqStatus.textContent = 'Audio normal';
    return false;
  }
}
function formatEqLabel(hz) { return hz >= 1000 ? `${hz / 1000}kHz`.replace('.0kHz','kHz') : `${hz}Hz`; }
function buildEqUI() {
  if (!eqSlidersEl || eqSlidersEl.children.length) return;
  eqSlidersEl.innerHTML = EQ_BANDS.map((hz,i)=>`<div class="eq-band" data-band-index="${i}"><output id="eq-out-${i}">0 dB</output><input class="eq-range" id="eq-${i}" type="range" min="-12" max="12" step="0.5" value="0" aria-label="${hz} Hz"><label for="eq-${i}">${formatEqLabel(hz)}</label></div>`).join('');
  EQ_BANDS.forEach((_,i)=>document.getElementById(`eq-${i}`)?.addEventListener('input',e=>setEqBand(i,Number(e.target.value),true)));
}
function updateEqControl(i,value){ const input=document.getElementById(`eq-${i}`), out=document.getElementById(`eq-out-${i}`); if(input) input.value=String(value); if(out) out.textContent=`${value>0?'+':''}${Number(value).toFixed(1).replace('.0','')} dB`; }
function readEqValues(){ const saved=readJsonStorage(EQ_STORAGE_KEY,null); return Array.isArray(saved)&&saved.length===10?saved.map(v=>Math.max(-12,Math.min(12,Number(v)||0))):[...EQ_PRESETS.flat]; }
function restoreEqToControls(){ buildEqUI(); readEqValues().forEach((v,i)=>updateEqControl(i,v)); updateEqPresetState(); }
function restoreEqToGraph(){ if(!eqFilters.length)return; readEqValues().forEach((v,i)=>{eqFilters[i].gain.value=v; updateEqControl(i,v);}); }
function setEqBand(i,value,persist=true){ const safe=Math.max(-12,Math.min(12,Number(value)||0)); if(!eqFilters.length&&!ensureAudioGraph()){updateEqControl(i,safe);return;} eqFilters[i].gain.value=safe; updateEqControl(i,safe); if(persist)localStorage.setItem(EQ_STORAGE_KEY,JSON.stringify(EQ_BANDS.map((_,j)=>eqFilters[j]?.gain.value??0))); updateEqPresetState(); }
function applyEqPreset(name){ const values=EQ_PRESETS[name]||EQ_PRESETS.flat; if(!ensureAudioGraph())return; values.forEach((v,i)=>{eqFilters[i].gain.value=v;updateEqControl(i,v);}); localStorage.setItem(EQ_STORAGE_KEY,JSON.stringify(values)); updateEqPresetState(name); }
function updateEqPresetState(name=null){ document.querySelectorAll('#eq-presets button').forEach(b=>b.classList.toggle('is-active',name?b.dataset.preset===name:JSON.stringify(readEqValues())===JSON.stringify(EQ_PRESETS[b.dataset.preset]||[]))); }
function startEqVisualizer(){
  if(!eqCanvas||!analyserNode||eqVisualizerFrame)return;
  const ctx=eqCanvas.getContext('2d'); if(!ctx)return;
  const data=new Uint8Array(analyserNode.frequencyBinCount);
  const render=()=>{ if(!analyserNode){eqVisualizerFrame=null;return;} analyserNode.getByteFrequencyData(data); const w=eqCanvas.clientWidth||eqCanvas.width,h=eqCanvas.clientHeight||eqCanvas.height,dpr=Math.min(devicePixelRatio||1,2); if(eqCanvas.width!==Math.floor(w*dpr)||eqCanvas.height!==Math.floor(h*dpr)){eqCanvas.width=Math.max(1,Math.floor(w*dpr));eqCanvas.height=Math.max(1,Math.floor(h*dpr));} ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);const bars=64,step=Math.max(1,Math.floor(data.length/bars)),gap=3,bw=Math.max(2,(w-gap*bars)/bars),accent=getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim()||'#00d9ff';for(let i=0;i<bars;i++){let sum=0;for(let j=0;j<step;j++)sum+=data[i*step+j]||0;const level=(sum/step)/255,bh=Math.max(2,level*h*.78),x=i*(bw+gap),g=ctx.createLinearGradient(0,h-bh,0,h);g.addColorStop(0,accent);g.addColorStop(1,'rgba(255,255,255,.08)');ctx.fillStyle=g;ctx.fillRect(x,h-bh,bw,bh);}eqVisualizerFrame=requestAnimationFrame(render);};
  eqVisualizerFrame=requestAnimationFrame(render);
}
function getCurrentPaletteName(){ return localStorage.getItem(PALETTE_STORAGE_KEY)||'noir'; }
function getPaletteOverrides(){ return readJsonStorage(PALETTE_OVERRIDE_KEY,{})||{}; }
function paletteTokensFor(theme,name=getCurrentPaletteName()){ const base=PALETTE_DEFS[name]?.[theme]||PALETTE_DEFS.noir[theme]; const ov=getPaletteOverrides()?.[theme]||{}; return {...base,...ov}; }
function applyPaletteForCurrentTheme(){ const theme=document.documentElement.dataset.theme==='light'?'light':'dark',t=paletteTokensFor(theme),r=document.documentElement; r.style.setProperty('--bg-color',t.bg);r.style.setProperty('--bg-main',t.bg);r.style.setProperty('--bg-sidebar',t.sidebar);r.style.setProperty('--bg-card',t.card);r.style.setProperty('--bg-hover',t.hover);r.style.setProperty('--bg-active',t.active);r.style.setProperty('--player-bg',t.player);r.style.setProperty('--primary-color',t.primary);r.style.setProperty('--accent-color',t.accent);r.style.setProperty('--accent-cyan',t.accent);r.style.setProperty('--accent-cyan-hover',t.accentHover);r.style.setProperty('--accent-cyan-light',t.accentLight);r.style.setProperty('--text-primary',t.primary);updatePaletteInputs(t);updatePaletteState(); }
function updatePaletteInputs(t){ if(!colorInputs.primary)return;colorInputs.primary.value=t.primary.match(/^#[0-9a-f]{6}$/i)?t.primary:t.accent;colorInputs.accent.value=t.accent;colorInputs.bg.value=t.bg;colorInputs.card.value=t.card; }
function updatePaletteState(){ const active=getCurrentPaletteName(),theme=document.documentElement.dataset.theme||'dark';document.querySelectorAll('[data-theme-preset]').forEach(b=>b.classList.toggle('is-active',b.dataset.themePreset===active));document.querySelectorAll('[data-mode-choice]').forEach(b=>b.classList.toggle('is-active',b.dataset.modeChoice===theme)); }
function setPalette(name){ if(!PALETTE_DEFS[name])return;localStorage.setItem(PALETTE_STORAGE_KEY,name);applyPaletteForCurrentTheme(); }
function updateCustomPaletteFromInputs(){ const theme=document.documentElement.dataset.theme==='light'?'light':'dark',all=getPaletteOverrides();const current=paletteTokensFor(theme);all[theme]={primary:colorInputs.primary.value||current.primary,accent:colorInputs.accent.value||current.accent,bg:colorInputs.bg.value||current.bg,card:colorInputs.card.value||current.card,hover:colorInputs.bg.value||current.hover,active:colorInputs.card.value||current.active,sidebar:colorInputs.bg.value||current.sidebar,player:colorInputs.card.value||current.player,accentHover:colorInputs.accent.value||current.accentHover,accentLight:`color-mix(in srgb, ${colorInputs.accent.value||current.accent} 18%, transparent)`};localStorage.setItem(PALETTE_OVERRIDE_KEY,JSON.stringify(all));applyPaletteForCurrentTheme(); }
function resetCurrentPalette(){ const theme=document.documentElement.dataset.theme==='light'?'light':'dark',all=getPaletteOverrides();delete all[theme];localStorage.setItem(PALETTE_OVERRIDE_KEY,JSON.stringify(all));applyPaletteForCurrentTheme(); }
function wireSettingsUI(){
  restoreEqToControls(); applyPaletteForCurrentTheme();
  btnOpenSettings?.addEventListener('click',()=>{settingsModal?.classList.add('active');settingsModal?.setAttribute('aria-hidden','false');restoreEqToControls();if(document.querySelector('.settings-tab.active')?.dataset.settingsTab==='equalizer')ensureAudioGraph();});
  btnCloseSettings?.addEventListener('click',()=>{settingsModal?.classList.remove('active');settingsModal?.setAttribute('aria-hidden','true');});
  settingsModal?.addEventListener('click',e=>{if(e.target===settingsModal){settingsModal.classList.remove('active');settingsModal.setAttribute('aria-hidden','true');}});
  document.querySelectorAll('.settings-tab').forEach(tab=>tab.addEventListener('click',()=>{document.querySelectorAll('.settings-tab').forEach(x=>{x.classList.remove('active');x.setAttribute('aria-selected',x===tab?'true':'false');});document.querySelectorAll('.settings-panel').forEach(x=>x.classList.remove('active'));tab.classList.add('active');document.querySelector(`[data-settings-panel="${tab.dataset.settingsTab}"]`)?.classList.add('active');if(tab.dataset.settingsTab==='equalizer'){ensureAudioGraph();restoreEqToControls();}else if(document.documentElement.dataset.theme)updatePaletteState();}));
  document.querySelectorAll('#eq-presets button').forEach(b=>b.addEventListener('click',()=>applyEqPreset(b.dataset.preset)));
  document.querySelectorAll('[data-mode-choice]').forEach(b=>b.addEventListener('click',()=>applyTheme(b.dataset.modeChoice,true)));
  document.querySelectorAll('[data-theme-preset]').forEach(b=>b.addEventListener('click',()=>setPalette(b.dataset.themePreset)));
  Object.values(colorInputs).forEach(input=>input?.addEventListener('input',updateCustomPaletteFromInputs));
  document.getElementById('btn-reset-theme')?.addEventListener('click',resetCurrentPalette);
  document.getElementById('btn-open-integrations-from-settings')?.addEventListener('click',()=>{settingsModal?.classList.remove('active');integrationsModal?.classList.add('active');});
  document.querySelectorAll('.service-doc-button').forEach(b=>b.addEventListener('click',()=>{const urls={spotify:'https://developer.spotify.com/documentation/web-api',apple:'https://developer.apple.com/documentation/musickit',youtube:'https://music.youtube.com/'};window.open(urls[b.dataset.service],'_blank','noopener,noreferrer');}));
}

// =========================================================
// CANVAS AUTOMÁTICO POR PISTA — SIN MP4/GIF DEL USUARIO
// =========================================================
let proceduralCanvasFrame = null;
let proceduralCanvasSong = null;
let proceduralCanvasSeed = 1;
let proceduralCanvasImage = null;
let resizeProceduralCanvas = null;

function hashString(value) {
  let h = 2166136261;
  const text = String(value || 'NOIR');
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function genrePalette(genre = '') {
  const g = genre.toLowerCase();
  if (g.includes('rock')) return ['#ff4d6d','#ff9f1c','#7b2cbf'];
  if (g.includes('elect')) return ['#00f5d4','#00bbf9','#7b2cff'];
  if (g.includes('jazz')) return ['#ffd166','#ef8354','#6d597a'];
  if (g.includes('pop')) return ['#ff70a6','#70d6ff','#e9ff70'];
  if (g.includes('hip') || g.includes('rap')) return ['#8d99ae','#ef233c','#8338ec'];
  return ['#ff335f','#6c63ff','#00d4ff'];
}

function setProceduralCanvasTrack(song) {
  proceduralCanvasSong = song || null;
  proceduralCanvasSeed = hashString(song ? `${song.id}|${song.title}|${song.artist}|${song.genre}` : 'NOIR');
  const colors = genrePalette(song?.genre);
  document.documentElement.style.setProperty('--canvas-accent-1', colors[0]);
  document.documentElement.style.setProperty('--canvas-accent-2', colors[1]);
  proceduralCanvasImage = new Image();
  proceduralCanvasImage.decoding = 'async';
  proceduralCanvasImage.src = song?.cover || DEFAULT_COVER;
}

function startProceduralCanvas() {
  if (!canvasVisualLoop || typeof canvasVisualLoop.getContext !== 'function') return;
  const ctx = canvasVisualLoop.getContext('2d');
  const miniCtx = playerCanvasLoop && typeof playerCanvasLoop.getContext === 'function' ? playerCanvasLoop.getContext('2d') : null;
  if (!ctx) return;
  resizeProceduralCanvas = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), rect = canvasVisualLoop.getBoundingClientRect();
    canvasVisualLoop.width = Math.max(1, Math.floor(rect.width*dpr)); canvasVisualLoop.height = Math.max(1, Math.floor(rect.height*dpr)); ctx.setTransform(dpr,0,0,dpr,0,0);
    if (miniCtx) { const r=playerCanvasLoop.getBoundingClientRect(); playerCanvasLoop.width=Math.max(1,Math.floor(r.width*dpr));playerCanvasLoop.height=Math.max(1,Math.floor(r.height*dpr));miniCtx.setTransform(dpr,0,0,dpr,0,0); }
  };
  window.addEventListener('resize',resizeProceduralCanvas,{passive:true}); resizeProceduralCanvas();
  const drawCover=(c,img,w,h,scale=1,ox=0,oy=0,alpha=1)=>{if(!img?.complete||!img.naturalWidth)return false;const ratio=Math.max(w/img.naturalWidth,h/img.naturalHeight)*scale,dw=img.naturalWidth*ratio,dh=img.naturalHeight*ratio;c.globalAlpha=alpha;c.drawImage(img,(w-dw)/2+ox,(h-dh)/2+oy,dw,dh);c.globalAlpha=1;return true;};
  const frame=(time)=>{
    const w=canvasVisualLoop.clientWidth||1,h=canvasVisualLoop.clientHeight||1,colors=genrePalette(proceduralCanvasSong?.genre),base=proceduralCanvasSeed%997,t=time*.00018,pulse=getCanvasAudioPulse();
    ctx.clearRect(0,0,w,h);
    ctx.save();ctx.filter='blur(18px) saturate(1.35) brightness(.62)';drawCover(ctx,proceduralCanvasImage,w,h,1.06+Math.sin(t*.9+base)*.018+pulse*.018,Math.sin(t*.7)*10,Math.cos(t*.6)*8,.96);ctx.restore();
    const grad=ctx.createLinearGradient(0,0,w,h);grad.addColorStop(0,colors[0]+'22');grad.addColorStop(.48,'rgba(0,0,0,.04)');grad.addColorStop(1,colors[2]+'35');ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
    ctx.save();ctx.globalCompositeOperation='screen';for(let i=0;i<2;i++){ctx.beginPath();const amp=h*(.10+i*.025),y0=h*(.36+i*.22);for(let x=-20;x<=w+20;x+=12){const y=y0+Math.sin(x*(.006+i*.001)+t*(1.6+i*.45)+base*.012)*amp;x===-20?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.lineWidth=Math.max(3,Math.min(w,h)*.012);ctx.strokeStyle=colors[i]+(i===0?'38':'2c');ctx.shadowBlur=22+pulse*18;ctx.shadowColor=colors[i];ctx.stroke();}ctx.restore();
    ctx.save();ctx.globalCompositeOperation='screen';for(let i=0;i<18;i++){const ph=base*.017+i*1.77,x=(.5+Math.sin(t*(.28+(i%5)*.035)+ph)*.48)*w,y=(.5+Math.cos(t*(.22+(i%4)*.04)+ph*1.3)*.46)*h,r=1+((i*7)%5)*.65+pulse*1.8;ctx.fillStyle=colors[i%3]+'88';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}ctx.restore();
    if(miniCtx){const mw=playerCanvasLoop.clientWidth||1,mh=playerCanvasLoop.clientHeight||1;miniCtx.clearRect(0,0,mw,mh);const mg=miniCtx.createRadialGradient(mw*(.35+Math.sin(t)*.1),mh*(.4+Math.cos(t*.9)*.1),0,mw*.5,mh*.5,Math.max(mw,mh)*.8);mg.addColorStop(0,colors[0]+'72');mg.addColorStop(.55,colors[1]+'25');mg.addColorStop(1,'transparent');miniCtx.fillStyle=mg;miniCtx.fillRect(0,0,mw,mh);miniCtx.globalAlpha=.55+pulse*.12;for(let i=0;i<7;i++){const x=(.12+i*.15+Math.sin(t*1.5+i)*.03)*mw,bh=(.16+.12*Math.sin(t*2.1+i)+pulse*.18)*mh;miniCtx.fillStyle=colors[i%3]+'86';miniCtx.fillRect(x,mh-bh,Math.max(2,mw*.03),bh);}miniCtx.globalAlpha=1;}
    proceduralCanvasFrame=requestAnimationFrame(frame);
  };
  cancelAnimationFrame(proceduralCanvasFrame);proceduralCanvasFrame=requestAnimationFrame(frame);
}
function getCanvasAudioPulse(){if(!analyserNode)return 0.12;const data=new Uint8Array(24);analyserNode.getByteFrequencyData(data);let total=0;for(const v of data)total+=v;return total/(data.length*255);}

// =========================================================
// INTEGRACIONES EXTERNAS — SOLO SPOTIFY / APPLE MUSIC / YOUTUBE MUSIC
// =========================================================
const externalStateKey = 'noir_external_services';
const spotifyClientIdInput = document.getElementById('spotify-client-id');
const youtubeUrlInput = document.getElementById('youtube-url');
const externalActionResult = document.getElementById('external-action-result');
const youtubePlayerShell = document.getElementById('youtube-player-shell');
let youtubePlayer = null;

function readExternalState() {
  try { return JSON.parse(localStorage.getItem(externalStateKey)) || {}; } catch (_) { return {}; }
}

function writeExternalState(state) {
  localStorage.setItem(externalStateKey, JSON.stringify(state));
}

function restoreIntegrationStates() {
  const state = readExternalState();
  ['spotify', 'apple', 'youtube'].forEach(service => {
    const el = document.getElementById(`${service}-status`);
    if (!el) return;
    el.textContent = state[service]?.status || 'No configurado';
  });
  if (spotifyClientIdInput) spotifyClientIdInput.value = state.spotify?.clientId || '';
  if (youtubeUrlInput) youtubeUrlInput.value = state.youtube?.url || '';
}

function showExternalResult(message, ok = false) {
  if (!externalActionResult) return;
  externalActionResult.textContent = message;
  externalActionResult.classList.toggle('success', ok);
  externalActionResult.classList.toggle('error', !ok);
}

function base64UrlEncode(bytes) {
  let binary = '';
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function randomString(size = 64) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function buildSpotifyPkceAuthUrl(clientId) {
  if (!clientId) throw new Error('Introduce primero el Client ID de Spotify.');
  if (!window.isSecureContext && location.hostname !== '127.0.0.1') {
    throw new Error('Spotify PKCE debe ejecutarse en HTTPS o en desarrollo sobre 127.0.0.1.');
  }

  const verifier = randomString(64);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = base64UrlEncode(new Uint8Array(digest));
  const redirectUri = `${location.origin}${location.pathname}`;
  const stateValue = randomString(24);

  const state = readExternalState();
  state.spotify = { ...(state.spotify || {}), clientId, status: 'PKCE listo', redirectUri };
  writeExternalState(state);
  sessionStorage.setItem('noir_spotify_code_verifier', verifier);
  sessionStorage.setItem('noir_spotify_state', stateValue);

  const scopes = 'streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state';
  const params = new URLSearchParams({
    response_type: 'code', client_id: clientId, scope: scopes,
    code_challenge_method: 'S256', code_challenge: challenge,
    redirect_uri: redirectUri, state: stateValue
  });
  return `https://accounts.spotify.com/authorize?${params}`;
}

async function configureSpotify() {
  try {
    const clientId = spotifyClientIdInput.value.trim();
    const authUrl = await buildSpotifyPkceAuthUrl(clientId);
    showExternalResult('PKCE preparado. Te llevo al consentimiento de Spotify; después necesitas intercambiar el code en tu callback para obtener el access token.', true);
    window.location.assign(authUrl);
    restoreIntegrationStates();
  } catch (err) {
    showExternalResult(err.message || 'No se pudo preparar Spotify.');
  }
}

async function configureAppleMusic() {
  const state = readExternalState();
  state.apple = { status: 'MusicKit listo' };
  writeExternalState(state);
  restoreIntegrationStates();
  showExternalResult('Apple Music queda preparado conceptualmente: tu backend debe emitir el Developer Token y MusicKit en la web solicitará el Music User Token al usuario.', true);
  window.open('https://developer.apple.com/documentation/musickit', '_blank', 'noopener,noreferrer');
}

function extractYouTubeVideoId(input) {
  try {
    const url = new URL(input.trim());
    if (url.hostname.includes('youtu.be')) return url.pathname.slice(1).split('/')[0];
    if (url.hostname.includes('youtube.com')) {
      const v = url.searchParams.get('v');
      if (v) return v;
      const match = url.pathname.match(/\/shorts\/([^/]+)/);
      return match ? match[1] : null;
    }
  } catch (_) {}
  return null;
}

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === 'function') previous();
      resolve();
    };
    const existing = document.querySelector('script[data-noir-youtube-api]');
    if (existing) {
      const started = Date.now();
      const poll = () => window.YT?.Player ? resolve() : (Date.now() - started > 10000 ? reject(new Error('YouTube IFrame API no respondió.')) : setTimeout(poll, 100));
      poll();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.dataset.noirYoutubeApi = 'true';
    script.onerror = () => reject(new Error('No se pudo cargar la YouTube IFrame API.'));
    document.head.appendChild(script);
  });
}

function extractYouTubePlaylistId(input) {
  try {
    const url = new URL(input.trim());
    if (url.hostname.includes('youtube.com')) return url.searchParams.get('list');
  } catch (_) {}
  return null;
}

async function configureYouTube() {
  const input = youtubeUrlInput.value.trim();
  const videoId = extractYouTubeVideoId(input);
  // Si no hay vídeo concreto pero sí una playlist (/playlist?list=...), se carga la playlist.
  const playlistId = videoId ? null : extractYouTubePlaylistId(input);
  if (!videoId && !playlistId) {
    showExternalResult('Pega una URL válida de YouTube o YouTube Music que apunte a un vídeo o a una playlist.');
    return;
  }

  try {
    await loadYouTubeApi();
    youtubePlayerShell.hidden = false;
    if (youtubePlayer) {
      if (videoId) youtubePlayer.loadVideoById(videoId);
      else youtubePlayer.loadPlaylist({ listType: 'playlist', list: playlistId });
    } else {
      const playerVars = { playsinline: 1, rel: 0, modestbranding: 1 };
      if (playlistId) { playerVars.listType = 'playlist'; playerVars.list = playlistId; }
      youtubePlayer = new YT.Player('youtube-player', {
        width: '100%', height: '260', ...(videoId ? { videoId } : {}),
        playerVars,
        events: { onError: () => showExternalResult('YouTube rechazó la reproducción de ese contenido en un reproductor embebido.') }
      });
    }
    const state = readExternalState();
    state.youtube = { status: playlistId ? 'Playlist lista' : 'Reproductor listo', url: input, videoId: videoId || null, playlistId };
    writeExternalState(state);
    restoreIntegrationStates();
    syncServiceBadges();
    showExternalResult('Reproductor YouTube preparado. Este contenido se reproduce dentro del iframe oficial y no se copia a la biblioteca local.', true);
  } catch (err) {
    showExternalResult(err.message || 'No se pudo preparar YouTube.');
  }
}

function configureExternalService(service) {
  if (service === 'spotify') return configureSpotify();
  if (service === 'apple') return configureAppleMusic();
  if (service === 'youtube') return configureYouTube();
}

// =========================================================
// CAMBIO DE TEMA — SISTEMA CENTRALIZADO Y PERSISTENTE
// =========================================================
function applyTheme(theme, persist = true) {
  const safeTheme = theme === 'light' ? 'light' : 'dark';
  const root = document.documentElement;
  root.setAttribute('data-theme', safeTheme);
  root.dataset.theme = safeTheme;
  if (document.body) document.body.setAttribute('data-theme', safeTheme);
  if (themeIcon) themeIcon.className = safeTheme === 'light' ? 'fas fa-sun' : 'fas fa-moon';
  if (themeToggle) {
    themeToggle.title = safeTheme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro';
    themeToggle.setAttribute('aria-pressed', safeTheme === 'light' ? 'true' : 'false');
  }
  if (persist) { try { localStorage.setItem('noir_theme_mode', safeTheme); } catch (_) {} }
  if (typeof applyPaletteForCurrentTheme === 'function' && document.readyState !== 'loading') applyPaletteForCurrentTheme();
}

function restoreThemePreference() {
  let saved = null;
  try { saved = localStorage.getItem('noir_theme_mode'); } catch (_) {}
  const preferred = saved === 'light' || saved === 'dark'
    ? saved
    : ((window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark');
  applyTheme(preferred, false);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(currentTheme === 'light' ? 'dark' : 'light', true);
}

function handleSystemThemeChange(event) {
  if (!localStorage.getItem('noir_theme_mode')) applyTheme(event.matches ? 'light' : 'dark', false);
}

// =========================================================
// ADAPTADORES SDK — SEPARADOS DE LA REPRODUCCIÓN LOCAL
// =========================================================
function loadExternalScript(src, globalName) {
  return new Promise((resolve, reject) => {
    if (globalName && window[globalName]) return resolve(window[globalName]);
    const existing = [...document.scripts].find(s => s.src === src);
    if (existing) {
      const started = Date.now();
      const poll = () => window[globalName] ? resolve(window[globalName]) :
        (Date.now() - started > 10000 ? reject(new Error(`No se pudo cargar ${src}.`)) : setTimeout(poll, 100));
      poll();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve(globalName ? window[globalName] : true);
    script.onerror = () => reject(new Error(`No se pudo cargar ${src}.`));
    document.head.appendChild(script);
  });
}

async function initSpotifyWebPlayback(accessToken, onReady = () => {}) {
  if (!accessToken) throw new Error('Se necesita un access token de Spotify válido.');
  await loadExternalScript('https://sdk.scdn.co/spotify-player.js', 'Spotify');
  return new Promise((resolve, reject) => {
    const player = new Spotify.Player({
      name: 'NOIR Web Player',
      getOAuthToken: cb => cb(accessToken),
      volume: Number(volumeBar?.value || 100) / 100,
      enableMediaSession: true
    });
    player.addListener('ready', ({ device_id }) => { onReady({ player, device_id }); resolve({ player, device_id }); });
    player.addListener('authentication_error', ({ message }) => reject(new Error(message)));
    player.addListener('account_error', ({ message }) => reject(new Error(message)));
    player.connect();
  });
}

async function initAppleMusicWeb(developerToken, onAuthorized = () => {}) {
  if (!developerToken) throw new Error('Apple Music necesita un Developer Token emitido por tu backend.');
  await loadExternalScript('https://js-cdn.music.apple.com/musickit/v3/musickit.js', 'MusicKit');
  await new Promise(resolve => {
    if (window.MusicKit?.configure) return resolve();
    setTimeout(resolve, 0);
  });
  if (!window.MusicKit?.configure) throw new Error('MusicKit JS no quedó disponible.');
  const music = MusicKit.configure({ developerToken });
  await music.authorize();
  onAuthorized(music);
  return music;
}

window.NOIRExternal = Object.freeze({
  initSpotifyWebPlayback,
  initAppleMusicWeb,
  loadYouTubeApi,
  configureExternalService
});

// Procesa un callback de Spotify PKCE si el proveedor devuelve ?code=...&state=...
function inspectSpotifyCallback() {
  const params = new URLSearchParams(location.search);
  const code = params.get('code');
  const incomingState = params.get('state');
  const expectedState = sessionStorage.getItem('noir_spotify_state');
  if (!code || !incomingState || incomingState !== expectedState) return;
  showExternalResult('Spotify devolvió un authorization code válido. Completa en tu backend el intercambio /api/token con el code_verifier guardado en sessionStorage.', true);
  history.replaceState({}, document.title, `${location.pathname}${location.hash || ''}`);
}



// =========================================================
// SERVICIOS EXTERNOS — UX DE SIDEBAR Y MODAL (pestañas + pegado de enlaces)
// Módulo aditivo: no toca la reproducción local ni IndexedDB.
// =========================================================
(function setupExternalServicesUX() {
  const SERVICES = ['spotify', 'youtube', 'apple'];
  const LAST_TAB_KEY = 'noir_external_last_tab';
  const modal = document.getElementById('integrations-modal');
  if (!modal) return;

  const tabs = Array.from(modal.querySelectorAll('[data-svc-tab]'));
  const panels = Array.from(modal.querySelectorAll('[data-service-card]'));

  // --- Estado visual (punto verde) en sidebar y pestañas ---
  window.syncServiceBadges = function syncServiceBadges() {
    SERVICES.forEach(service => {
      const statusEl = document.getElementById(`${service}-status`);
      const active = !!statusEl && statusEl.textContent.trim() !== '' && statusEl.textContent.trim() !== 'No configurado';
      document.querySelectorAll(`[data-open-service="${service}"], [data-svc-tab="${service}"]`)
        .forEach(el => el.classList.toggle('is-linked', active));
    });
  };

  function setStatus(service, text) {
    const el = document.getElementById(`${service}-status`);
    if (el) el.textContent = text;
    syncServiceBadges();
  }

  // --- Pestañas ---
  function selectTab(service, { focus = false } = {}) {
    if (!SERVICES.includes(service)) service = 'spotify';
    tabs.forEach(tab => {
      const on = tab.dataset.svcTab === service;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
      if (on && focus) tab.focus();
    });
    panels.forEach(panel => panel.classList.toggle('is-active', panel.dataset.serviceCard === service));
    try { localStorage.setItem(LAST_TAB_KEY, service); } catch (_) {}
    // El mensaje compartido pertenece al servicio anterior: se limpia al cambiar de pestaña.
    const result = document.getElementById('external-action-result');
    if (result) { result.textContent = ''; result.classList.remove('success', 'error'); }
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tab.dataset.svcTab));
    tab.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      selectTab(next.dataset.svcTab, { focus: true });
    });
  });

  // --- Apertura desde el sidebar ---
  document.querySelectorAll('[data-open-service]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectTab(btn.dataset.openService);
      modal.classList.add('active');
    });
  });

  // Tanto este módulo como los botones antiguos (enchufe / ajustes) abren el mismo modal:
  // al activarse, se enfoca la pestaña activa; con Esc se cierra.
  new MutationObserver(() => {
    if (modal.classList.contains('active')) {
      syncServiceBadges();
      setTimeout(() => (modal.querySelector('.svc-tab[aria-selected="true"]') || tabs[0])?.focus(), 30);
    }
  }).observe(modal, { attributes: true, attributeFilter: ['class'] });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('active')) modal.classList.remove('active');
  });
  document.getElementById('btn-close-integrations')?.addEventListener('click', syncServiceBadges);

  // --- Botón "Pegar" (portapapeles) ---
  document.querySelectorAll('.svc-paste').forEach(btn => {
    btn.addEventListener('click', async () => {
      const input = document.getElementById(btn.dataset.pasteTarget);
      if (!input) return;
      try {
        input.value = (await navigator.clipboard.readText()).trim();
        input.focus();
      } catch (_) {
        input.focus();
        showExternalResult('El navegador no permitió leer el portapapeles. Pega el enlace con Ctrl/Cmd + V.');
      }
    });
  });

  // --- Parseo y validación de enlaces ---
  function parseSpotifyLink(raw) {
    const text = (raw || '').trim();
    const uri = text.match(/^spotify:(track|album|playlist|artist|episode|show):([A-Za-z0-9]{10,})$/);
    if (uri) return { type: uri[1], id: uri[2] };
    try {
      const url = new URL(text);
      if (url.hostname !== 'open.spotify.com') return null;
      const parts = url.pathname.split('/').filter(Boolean).filter(p => !/^intl-[a-z-]+$/i.test(p));
      const i = parts[0] === 'embed' ? 1 : 0;
      const type = parts[i], id = parts[i + 1];
      if (/^(track|album|playlist|artist|episode|show)$/.test(type || '') && /^[A-Za-z0-9]{10,}$/.test(id || '')) return { type, id };
    } catch (_) {}
    return null;
  }

  function parseAppleMusicLink(raw) {
    try {
      const url = new URL((raw || '').trim());
      if (url.hostname !== 'music.apple.com' && url.hostname !== 'embed.music.apple.com') return null;
      if (!/\/(album|playlist|song|artist)\//.test(url.pathname)) return null;
      const compact = /\/song\//.test(url.pathname) || url.searchParams.has('i');
      return { src: `https://embed.music.apple.com${url.pathname}${url.search}`, compact };
    } catch (_) {}
    return null;
  }

  // --- Embeds oficiales ---
  function renderEmbed(container, { src, height, allow, title }) {
    container.textContent = '';
    const frame = document.createElement('iframe');
    frame.src = src;
    frame.height = String(height);
    frame.title = title;
    frame.allow = allow;
    frame.loading = 'lazy';
    frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    container.appendChild(frame);
    container.hidden = false;
  }

  function loadLink(service) {
    if (service === 'spotify') {
      const input = document.getElementById('spotify-link');
      const info = parseSpotifyLink(input.value);
      if (!info) {
        showExternalResult('Enlace no reconocido. Usa un enlace de open.spotify.com (playlist, álbum, canción o podcast). Los enlaces cortos spotify.link no se pueden resolver.');
        return;
      }
      renderEmbed(document.getElementById('spotify-embed'), {
        src: `https://open.spotify.com/embed/${info.type}/${info.id}`,
        height: (info.type === 'track' || info.type === 'episode') ? 152 : 352,
        allow: 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture',
        title: `Spotify: ${info.type}`
      });
      setStatus('spotify', 'Enlace cargado');
      showExternalResult('Contenido de Spotify cargado en su reproductor oficial. Para escuchar completo, inicia sesión dentro del propio reproductor.', true);
    } else if (service === 'apple') {
      const input = document.getElementById('apple-link');
      const info = parseAppleMusicLink(input.value);
      if (!info) {
        showExternalResult('Enlace no reconocido. Usa un enlace de music.apple.com (álbum, playlist o canción).');
        return;
      }
      renderEmbed(document.getElementById('apple-embed'), {
        src: info.src,
        height: info.compact ? 175 : 450,
        allow: 'autoplay *; encrypted-media *; fullscreen *; clipboard-write',
        title: 'Apple Music'
      });
      setStatus('apple', 'Enlace cargado');
      showExternalResult('Contenido de Apple Music cargado en su reproductor oficial. Para escuchar completo, inicia sesión dentro del propio reproductor.', true);
    }
  }

  document.querySelectorAll('[data-load-link]').forEach(btn => btn.addEventListener('click', () => loadLink(btn.dataset.loadLink)));

  // Enter dentro de cada campo ejecuta "Cargar"
  [['spotify-link', () => loadLink('spotify')], ['apple-link', () => loadLink('apple')], ['youtube-url', () => configureYouTube()]]
    .forEach(([id, fn]) => document.getElementById(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); fn(); } }));

  // --- Arranque ---
  let initial = 'spotify';
  try { initial = localStorage.getItem(LAST_TAB_KEY) || 'spotify'; } catch (_) {}
  selectTab(initial);
  syncServiceBadges();
  // restoreIntegrationStates() corre en DOMContentLoaded; se re-sincroniza después.
  document.addEventListener('DOMContentLoaded', syncServiceBadges);
})();
