/* audio.js - Gestione Musica e DJ Station */
import { state } from './state.js';

// --- VARIABILI INTERNE AUDIO ---
const bgMusic = new Audio();
let playlist = [];
let currentTrackIdx = -1;
let isShuffle = false;
let isLoop = true;
let playerMuted = false;

// Evento fine traccia: passa alla successiva 
bgMusic.onended = () => nextTrack();

export function toggleMusic() { 
    const p = document.getElementById('music-panel'); 
    const wasOpen = p.style.display === 'block';
    if(window.closeAllMenus) window.closeAllMenus(); 
    
    if (!wasOpen) p.style.display = 'block'; 
}

export function togglePlayerMute() { 
    playerMuted = document.getElementById('mute-player-toggle').checked; 
    syncAudioState(); 
}

// Caricamento file musicali 
export function handleMusicUpload(files) {
    if(files.length > 0) {
        for (let i = 0; i < files.length; i++) {
            playlist.push(files[i]);
        }
        renderPlaylist();
        if(currentTrackIdx === -1 && playlist.length > 0) {
            playTrack(0);
        }
    }
}

export function renderPlaylist() {
    const c = document.getElementById('music-playlist'); 
    if(!c) return;
    c.innerHTML = "";
    playlist.forEach((f, i) => {
        const div = document.createElement('div'); 
        div.className = 'music-item' + (i === currentTrackIdx ? ' active' : '');
        div.textContent = f.name; 
        div.onclick = () => playTrack(i);
        c.appendChild(div);
    });
}

export function playTrack(i) {
    if(i < 0 || i >= playlist.length) return;
    currentTrackIdx = i;
    const file = playlist[i];
    const url = URL.createObjectURL(file);
    bgMusic.src = url; 
    bgMusic.play().catch(e => console.log("Riproduzione bloccata dal browser", e));
    
    const ct = document.getElementById('current-track');
    if(ct) ct.textContent = file.name;
    
    const btn = document.getElementById('btn-playpause-p');
    if(btn) btn.textContent = "⏸";
    
    renderPlaylist(); 
    syncAudioToPlayer();
}

export function playPauseMusic() {
    const btn = document.getElementById('btn-playpause-p');
    if(bgMusic.paused) { 
        if(bgMusic.src) bgMusic.play(); 
        if(btn) btn.textContent = "⏸"; 
    } else { 
        bgMusic.pause(); 
        if(btn) btn.textContent = "▶"; 
    }
    syncAudioState();
}

export function stopMusic() { 
    bgMusic.pause(); 
    bgMusic.currentTime = 0; 
    const btn = document.getElementById('btn-playpause-p');
    if(btn) btn.textContent = "▶"; 
    syncAudioState(); 
}

export function prevTrack() { 
    playTrack(currentTrackIdx - 1 >= 0 ? currentTrackIdx - 1 : playlist.length - 1); 
}

export function nextTrack() {
    if (isShuffle) { 
        playTrack(Math.floor(Math.random() * playlist.length)); 
    } else { 
        let next = currentTrackIdx + 1;
        if (next >= playlist.length) { 
            if(isLoop) next = 0; else return; 
        }
        playTrack(next);
    }
}

export function setVolume(v) { 
    bgMusic.volume = parseFloat(v); 
    syncAudioState(); 
}

export function toggleShuffle() { 
    isShuffle = !isShuffle; 
    const btn = document.getElementById('btn-shuffle');
    if(btn) btn.style.color = isShuffle ? "#4CAF50" : "white"; 
}

export function toggleLoop() { 
    isLoop = !isLoop; 
    const btn = document.getElementById('btn-loop');
    if(btn) btn.style.color = isLoop ? "#4CAF50" : "white"; 
}

// --- SINCRONIZZAZIONE GIOCATORI --- 

export function syncAudioToPlayer() {
    if(state.playerWin && !state.playerWin.closed && bgMusic.src) {
        const p = state.playerWin.document.getElementById('p-audio');
        if(p) {
            p.src = bgMusic.src;
            p.volume = playerMuted ? 0 : bgMusic.volume;
            p.play().catch(() => {});
        }
    }
}

export function syncAudioState() {
    if(state.playerWin && !state.playerWin.closed) {
        const p = state.playerWin.document.getElementById('p-audio');
        if(p) {
            p.volume = playerMuted ? 0 : bgMusic.volume;
            if(bgMusic.paused) p.pause(); 
            else p.play().catch(() => {});
            
            // Corregge eventuale desincronizzazione temporale
            if(Math.abs(p.currentTime - bgMusic.currentTime) > 0.3) {
                p.currentTime = bgMusic.currentTime;
            }
        }
    }
}

// Avvia il loop di sincronizzazione stato ogni secondo 
setInterval(syncAudioState, 1000);