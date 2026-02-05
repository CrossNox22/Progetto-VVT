/* map.js - Gestione Mappa, Zoom e Navigazione */
import { state } from './state.js';

// --- NAVIGAZIONE E ZOOM ---

export function changeZoom(delta) {
    state.map.scale = Math.min(Math.max(0.1, state.map.scale + delta), 5);
    updateWorldTransform();
}

export function resetView() {
    state.map.scale = 1;
    state.map.x = 0;
    state.map.y = 0;
    updateWorldTransform();
}

export function updateWorldTransform() {
    if (state.dom.worldLayer) {
        state.dom.worldLayer.style.transform = `translate(${state.map.x}px,${state.map.y}px) scale(${state.map.scale})`;
    }
    syncWorldView();
}

// Allinea la visuale della finestra giocatori a quella del Master
export function syncWorldView() {
    if (state.playerWin && !state.playerWin.closed) {
        const w = state.playerWin.document.getElementById('p-world-layer');
        const pArea = state.playerWin.document.getElementById('p-game-area');
        
        if (w && pArea && state.dom.gameArea) {
            const masterW = state.dom.gameArea.clientWidth;
            const masterH = state.dom.gameArea.clientHeight;
            const playerW = pArea.clientWidth;
            const playerH = pArea.clientHeight;
            
            // Calcola l'offset per mantenere il centro allineato tra schermi diversi
            const diffX = (playerW - masterW) / 2;
            const diffY = (playerH - masterH) / 2;
            
            w.style.transform = `translate(${state.map.x + diffX}px,${state.map.y + diffY}px) scale(${state.map.scale})`;
        }
    }
}

// --- GESTIONE INPUT (Mouse & Wheel) ---

export function initMapControls() {
    if (!state.dom.gameArea) return;

    // Inizio spostamento mappa (Pan)
    state.dom.gameArea.addEventListener('mousedown', e => {
        // Non attiva il pan se stiamo cliccando su un token, un oggetto o un bottone
        if (e.target.closest('.token-container') || e.target.closest('.prop-container') || e.target.tagName === 'BUTTON') return;
        
        state.map.isPanning = true;
        state.map.panStartX = e.clientX - state.map.x;
        state.map.panStartY = e.clientY - state.map.y;
    });

    // Movimento mappa
    window.addEventListener('mousemove', e => {
        if (state.map.isPanning) {
            e.preventDefault();
            state.map.x = e.clientX - state.map.panStartX;
            state.map.y = e.clientY - state.map.panStartY;
            updateWorldTransform();
        }
    });

    window.addEventListener('mouseup', () => {
        state.map.isPanning = false;
    });

    // Zoom con la rotella del mouse
    state.dom.gameArea.addEventListener('wheel', e => {
        e.preventDefault();
        changeZoom(e.deltaY < 0 ? 0.1 : -0.1);
    }, { passive: false });
}

// --- CARICAMENTO MAPPA ---

export function handleMapUpload(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        if (state.dom.mapImg) {
            state.dom.mapImg.src = e.target.result;
            state.dom.mapImg.style.width = "100%";
            resetView();
            // Piccolo timeout per attendere il rendering prima della sync
            setTimeout(syncMap, 200);
        }
    };
    reader.readAsDataURL(file);
}

export function syncMap() {
    if (state.playerWin && !state.playerWin.closed && state.dom.mapImg) {
        const m = state.playerWin.document.getElementById('p-map-img');
        if (m) {
            m.src = state.dom.mapImg.getAttribute('src');
            m.style.width = state.dom.mapImg.style.width || "auto";
        }
    }
}