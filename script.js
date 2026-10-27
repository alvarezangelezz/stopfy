/**
 * STOPFY — Core Music Player Engine & Audio Synthesizer
 * Features: Local Download, 5-Band EQ, Spectrum Visualizer, Shuffle, Repeat
 */

document.addEventListener('DOMContentLoaded', () => {
  // ------------------------------------------------------------------------
  // 1. Music Catalog Data
  // ------------------------------------------------------------------------
  const catalog = [
    {
      id: 1,
      title: "Fuego Azul",
      artist: "Rawayana",
      album: "Asteroide Pastel",
      duration: 210,
      vibe: "chill reggae caribeño tropical",
      cover: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=400&q=80",
      bpm: 95,
      freq: 320
    },
    {
      id: 2,
      title: "Verano Neón",
      artist: "Bad Bunny",
      album: "Noches de San Juan",
      duration: 195,
      vibe: "reggaeton lento bellakeo nocturno",
      cover: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=400&q=80",
      bpm: 92,
      freq: 260
    },
    {
      id: 3,
      title: "Nubes Pastel",
      artist: "Rauw Alejandro",
      album: "Saturno Wave",
      duration: 225,
      vibe: "dancehall futurista sensual synth",
      cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80",
      bpm: 105,
      freq: 440
    },
    {
      id: 4,
      title: "Donde Encontrarte",
      artist: "Quevedo",
      album: "Buenas Noches LP",
      duration: 180,
      vibe: "trap melódico voz grave ritmo",
      cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80",
      bpm: 128,
      freq: 350
    },
    {
      id: 5,
      title: "Plan de Velo",
      artist: "Paulo Londra",
      album: "Back to the Flow",
      duration: 205,
      vibe: "hip hop suave rap acústico",
      cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80",
      bpm: 88,
      freq: 300
    },
    {
      id: 6,
      title: "Bandida de Barrio",
      artist: "Luar La L",
      album: "Calle y Sintetizador",
      duration: 240,
      vibe: "street trap duro intenso underground",
      cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80",
      bpm: 130,
      freq: 220
    },
    {
      id: 7,
      title: "Frecuencia 305",
      artist: "Yan Block",
      album: "Next Generation",
      duration: 188,
      vibe: "drill latino flow rápido",
      cover: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=400&q=80",
      bpm: 140,
      freq: 280
    },
    {
      id: 8,
      title: "Medallo Vibe",
      artist: "Blessd",
      album: "Hecho en Medellín",
      duration: 215,
      vibe: "reggaeton de fiesta perreo alegre",
      cover: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=400&q=80",
      bpm: 96,
      freq: 380
    }
  ];

  // ------------------------------------------------------------------------
  // 2. Audio State & Web Audio API Setup
  // ------------------------------------------------------------------------
  let currentSongIndex = 0;
  let isPlaying = false;
  let isShuffle = false;
  let repeatMode = 0; // 0: off, 1: repeat all, 2: repeat one
  let playbackTimer = null;
  let currentSeconds = 0;

  // Web Audio Synth & FX
  let audioCtx = null;
  let masterGain = null;
  let synthOscillator = null;
  let eqFilters = [];
  let analyserNode = null;

  function initAudioEngine() {
    if (audioCtx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();

    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.8;

    analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 64;

    // Equalizer Frequencies: 60Hz, 230Hz, 910Hz, 4kHz, 14kHz
    const freqs = [60, 230, 910, 4000, 14000];
    let prevNode = masterGain;

    eqFilters = freqs.map((freq, idx) => {
      const filter = audioCtx.createBiquadFilter();
      filter.type = idx === 0 ? 'lowshelf' : idx === freqs.length - 1 ? 'highshelf' : 'peaking';
      filter.frequency.value = freq;
      filter.gain.value = 0;
      prevNode.connect(filter);
      prevNode = filter;
      return filter;
    });

    prevNode.connect(analyserNode);
    analyserNode.connect(audioCtx.destination);
    
    startVisualizer();
  }

  function startSynthSound(frequency) {
    if (!audioCtx) initAudioEngine();
    stopSynthSound();

    synthOscillator = audioCtx.createOscillator();
    synthOscillator.type = 'sine';
    synthOscillator.frequency.setValueAtTime(frequency || 300, audioCtx.currentTime);

    // Subtle LFO modulation for warm analog synth feel
    const lfo = audioCtx.createOscillator();
    lfo.frequency.value = 4;
    const lfoGain = audioCtx.createGain();
    lfoGain.gain.value = 8;
    lfo.connect(synthOscillator.frequency);
    lfo.start();

    synthOscillator.connect(masterGain);
    synthOscillator.start();
  }

  function stopSynthSound() {
    if (synthOscillator) {
      try {
        synthOscillator.stop();
        synthOscillator.disconnect();
      } catch (e) {}
      synthOscillator = null;
    }
  }

  // ------------------------------------------------------------------------
  // 3. UI Rendering
  // ------------------------------------------------------------------------
  const songsListContainer = document.getElementById('songsList');
  const albumsGridContainer = document.getElementById('albumsGrid');
  const artistsGridContainer = document.getElementById('artistsGrid');

  function renderSongs(songsToRender) {
    songsListContainer.innerHTML = '';
    songsToRender.forEach((song, idx) => {
      const isCurrent = catalog[currentSongIndex].id === song.id;
      const el = document.createElement('div');
      el.className = `song-item ${isCurrent ? 'active-song' : ''}`;
      el.innerHTML = `
        <img src="${song.cover}" alt="${song.title}" class="song-thumb">
        <div class="song-details">
          <h4>${song.title}</h4>
          <p>${song.artist}</p>
        </div>
        <div class="song-album">${song.album}</div>
        <div class="song-vibe">${song.vibe.split(' ')[0]}</div>
        <div class="song-actions-cell">
          <button class="action-icon-btn" onclick="event.stopPropagation(); downloadSongDirectly(${song.id})" title="Descargar">
            <i class="ri-download-line"></i>
          </button>
        </div>
      `;
      el.addEventListener('click', () => {
        const targetIndex = catalog.findIndex(s => s.id === song.id);
        playSongAtIndex(targetIndex);
      });
      songsListContainer.appendChild(el);
    });
  }

  function renderAlbums() {
    albumsGridContainer.innerHTML = '';
    catalog.forEach(song => {
      const card = document.createElement('div');
      card.className = 'album-card';
      card.innerHTML = `
        <img src="${song.cover}" alt="${song.album}">
        <h4>${song.album}</h4>
        <p>${song.artist}</p>
      `;
      card.addEventListener('click', () => {
        const targetIndex = catalog.findIndex(s => s.id === song.id);
        playSongAtIndex(targetIndex);
      });
      albumsGridContainer.appendChild(card);
    });
  }

  function renderArtists() {
    artistsGridContainer.innerHTML = '';
    catalog.forEach(song => {
      const card = document.createElement('div');
      card.className = 'artist-card';
      card.innerHTML = `
        <img src="${song.cover}" alt="${song.artist}">
        <h4>${song.artist}</h4>
        <p>Artista Principal</p>
      `;
      card.addEventListener('click', () => {
        const targetIndex = catalog.findIndex(s => s.id === song.id);
        playSongAtIndex(targetIndex);
      });
      artistsGridContainer.appendChild(card);
    });
  }

  // ------------------------------------------------------------------------
  // 4. Playback Logic
  // ------------------------------------------------------------------------
  const playerCover = document.getElementById('playerCover');
  const playerTitle = document.getElementById('playerTitle');
  const playerArtist = document.getElementById('playerArtist');
  const playPauseBtn = document.getElementById('playPauseBtn');
  const currentTimeEl = document.getElementById('currentTime');
  const durationTimeEl = document.getElementById('durationTime');
  const progressFill = document.getElementById('progressFill');

  function updatePlayerUI() {
    const song = catalog[currentSongIndex];
    playerCover.src = song.cover;
    playerTitle.textContent = song.title;
    playerArtist.textContent = song.artist;
    durationTimeEl.textContent = formatTime(song.duration);

    renderSongs(catalog);
  }

  function playSongAtIndex(index) {
    currentSongIndex = index;
    currentSeconds = 0;
    isPlaying = true;

    initAudioEngine();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    startSynthSound(catalog[currentSongIndex].freq);
    updatePlayerUI();
    playPauseBtn.innerHTML = '<i class="ri-pause-fill"></i>';

    clearInterval(playbackTimer);
    playbackTimer = setInterval(() => {
      if (isPlaying) {
        currentSeconds++;
        const duration = catalog[currentSongIndex].duration;

        currentTimeEl.textContent = formatTime(currentSeconds);
        progressFill.style.width = `${(currentSeconds / duration) * 100}%`;

        if (currentSeconds >= duration) {
          handleTrackEnded();
        }
      }
    }, 1000);
  }

  function togglePlayPause() {
    if (!isPlaying) {
      if (currentSeconds === 0) {
        playSongAtIndex(currentSongIndex);
      } else {
        isPlaying = true;
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        startSynthSound(catalog[currentSongIndex].freq);
        playPauseBtn.innerHTML = '<i class="ri-pause-fill"></i>';
      }
    } else {
      isPlaying = false;
      stopSynthSound();
      playPauseBtn.innerHTML = '<i class="ri-play-fill"></i>';
    }
  }

  function handleTrackEnded() {
    if (repeatMode === 2) {
      playSongAtIndex(currentSongIndex);
    } else if (isShuffle) {
      let nextRand = Math.floor(Math.random() * catalog.length);
      playSongAtIndex(nextRand);
    } else {
      if (currentSongIndex < catalog.length - 1) {
        playSongAtIndex(currentSongIndex + 1);
      } else if (repeatMode === 1) {
        playSongAtIndex(0);
      } else {
        isPlaying = false;
        stopSynthSound();
        playPauseBtn.innerHTML = '<i class="ri-play-fill"></i>';
      }
    }
  }

  function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  // Next / Prev Buttons
  document.getElementById('nextBtn').addEventListener('click', () => {
    if (isShuffle) {
      playSongAtIndex(Math.floor(Math.random() * catalog.length));
    } else {
      playSongAtIndex((currentSongIndex + 1) % catalog.length);
    }
  });

  document.getElementById('prevBtn').addEventListener('click', () => {
    playSongAtIndex((currentSongIndex - 1 + catalog.length) % catalog.length);
  });

  playPauseBtn.addEventListener('click', togglePlayPause);
  document.getElementById('heroPlayBtn').addEventListener('click', () => playSongAtIndex(0));

  // Mode Toggles (Shuffle & Repeat)
  const shuffleBtn = document.getElementById('shuffleBtn');
  shuffleBtn.addEventListener('click', () => {
    isShuffle = !isShuffle;
    shuffleBtn.classList.toggle('active-mode', isShuffle);
  });

  const repeatBtn = document.getElementById('repeatBtn');
  repeatBtn.addEventListener('click', () => {
    repeatMode = (repeatMode + 1) % 3;
    if (repeatMode === 0) {
      repeatBtn.className = 'ctrl-btn';
      repeatBtn.innerHTML = '<i class="ri-repeat-line"></i>';
    } else if (repeatMode === 1) {
      repeatBtn.className = 'ctrl-btn active-mode';
      repeatBtn.innerHTML = '<i class="ri-repeat-line"></i>';
    } else {
      repeatBtn.className = 'ctrl-btn active-mode';
      repeatBtn.innerHTML = '<i class="ri-repeat-one-line"></i>';
    }
  });

  // Progress Bar Click Seek
  document.getElementById('progressWrap').addEventListener('click', (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    currentSeconds = Math.floor(pct * catalog[currentSongIndex].duration);
    currentTimeEl.textContent = formatTime(currentSeconds);
    progressFill.style.width = `${pct * 100}%`;
  });

  // Volume Slider
  document.getElementById('volumeSlider').addEventListener('input', (e) => {
    if (masterGain) {
      masterGain.gain.value = parseFloat(e.target.value);
    }
  });

  // ------------------------------------------------------------------------
  // 5. Equalizer Logic & Spectrum Visualizer
  // ------------------------------------------------------------------------
  const eqSliders = document.querySelectorAll('.eq-slider');
  const presetChips = document.querySelectorAll('.preset-chip');

  eqSliders.forEach(slider => {
    slider.addEventListener('input', (e) => {
      const bandIdx = parseInt(e.target.dataset.band);
      const val = parseFloat(e.target.value);
      document.getElementById(`val-${bandIdx}`).textContent = `${val > 0 ? '+' : ''}${val}dB`;
      if (eqFilters[bandIdx]) {
        eqFilters[bandIdx].gain.value = val;
      }
    });
  });

  const presets = {
    flat: [0, 0, 0, 0, 0],
    bass: [8, 5, 0, -2, -4],
    reggaeton: [6, 4, -1, 3, 5],
    chill: [4, 2, 1, -1, -3],
    vocal: [-3, 0, 5, 4, 1]
  };

  presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      presetChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const presetVals = presets[chip.dataset.preset];
      eqSliders.forEach((slider, idx) => {
        slider.value = presetVals[idx];
        document.getElementById(`val-${idx}`).textContent = `${presetVals[idx] > 0 ? '+' : ''}${presetVals[idx]}dB`;
        if (eqFilters[idx]) eqFilters[idx].gain.value = presetVals[idx];
      });
    });
  });

  function startVisualizer() {
    const canvas = document.getElementById('visualizerCanvas');
    const ctx = canvas.getContext('2d');
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
      requestAnimationFrame(draw);
      analyserNode.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillStyle = `rgba(247, 174, 248, ${dataArray[i] / 255 + 0.2})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
        x += barWidth;
      }
    }
    draw();
  }

  // ------------------------------------------------------------------------
  // 6. Direct Local Download Generator (.wav Audio File)
  // ------------------------------------------------------------------------
  window.downloadSongDirectly = function(songId) {
    const song = catalog.find(s => s.id === songId) || catalog[currentSongIndex];
    
    // Generate synthesized WAV buffer for offline file creation
    const sampleRate = 44100;
    const duration = 3; // 3 seconds sample preview download
    const numSamples = sampleRate * duration;
    const buffer = new Float32Array(numSamples);
    
    for (let i = 0; i < numSamples; i++) {
      buffer[i] = Math.sin(2 * Math.PI * song.freq * (i / sampleRate)) * 0.3;
    }

    // Convert float samples to 16-bit PCM WAV File Format
    const wavBuffer = createWavFile(buffer, sampleRate);
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${song.title} - ${song.artist} [Stopfy].wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  document.getElementById('downloadBtn').addEventListener('click', () => {
    downloadSongDirectly(catalog[currentSongIndex].id);
  });

  function createWavFile(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
  }

  // ------------------------------------------------------------------------
  // 7. Navigation Tabs & Search / AI Prompt Filter
  // ------------------------------------------------------------------------
  const tabBtns = document.querySelectorAll('.tab-btn');
  const viewPanels = document.querySelectorAll('.view-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      viewPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const tab = btn.dataset.tab;
      if (tab === 'all') document.getElementById('viewSongs').classList.add('active');
      if (tab === 'albums') document.getElementById('viewAlbums').classList.add('active');
      if (tab === 'artists') document.getElementById('viewArtists').classList.add('active');
    });
  });

  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const filtered = catalog.filter(s => 
      s.title.toLowerCase().includes(query) ||
      s.artist.toLowerCase().includes(query) ||
      s.album.toLowerCase().includes(query) ||
      s.vibe.toLowerCase().includes(query)
    );
    renderSongs(filtered);
  });

  // Initialize view
  renderSongs(catalog);
  renderAlbums();
  renderArtists();
  updatePlayerUI();
});