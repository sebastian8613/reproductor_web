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
// CAMBIO DE TEMA
// =========================================================
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);

  if (newTheme === 'light') {
    themeIcon.className = 'fas fa-sun';
  } else {
    themeIcon.className = 'fas fa-moon';
  }
}