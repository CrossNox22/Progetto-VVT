/* assets/js/modules/player-logic.js - MAIN CONTROLLER */
import { pState } from './player-state.js';
import { connectToGame } from './player-network.js';
import { updateViewTransform } from './player-ui.js';
import { rollDie } from './dice.js';

console.log("Player Logic Loaded"); // DEBUG: Se non vedi questo, c'è un errore negli import

// --- INIT ---
window.connectToGame = connectToGame;

// --- GESTIONE INPUT UTENTE (Pan & Zoom Mappa) ---
const gameArea = document.getElementById('game-area');

if (gameArea) {
    let isPanning = false;
    let startPanX, startPanY;

    // Mouse Down: Inizia il Pan
    gameArea.addEventListener('mousedown', e => {
        // Ignora se clicchi su token o UI
        if(e.target.id === 'game-area' || e.target.id === 'map-img' || e.target.id === 'world-layer') {
            isPanning = true; 
            startPanX = e.clientX - pState.panX; 
            startPanY = e.clientY - pState.panY;
        }
    });

    // Mouse Move: Sposta la mappa
    window.addEventListener('mousemove', e => {
        if(isPanning) { 
            e.preventDefault(); 
            pState.panX = e.clientX - startPanX; 
            pState.panY = e.clientY - startPanY; 
            updateViewTransform(); 
        }
    });

    // Mouse Up: Ferma il Pan
    window.addEventListener('mouseup', () => isPanning = false);

    // Wheel: Zoom
    window.addEventListener('wheel', e => {
        e.preventDefault(); 
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        pState.scale = Math.min(Math.max(0.1, pState.scale + delta), 5); 
        updateViewTransform();
    }, {passive: false});
} else {
    console.error("ERRORE CRITICO: #game-area non trovato nell'HTML!");
}

// --- GESTIONE DADI (Click sulla barra inferiore) ---
setTimeout(() => {
    ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'].forEach(type => {
        const btn = document.getElementById(`p-${type}`);
        if(btn) {
            btn.onclick = () => {
                const sides = parseInt(type.replace('d', ''));
                const result = rollDie(sides, "Tu");
                
                if(pState.conn && pState.conn.open) {
                    pState.conn.send({
                        type: 'ROLL_NOTIFY',
                        payload: { name: "Giocatore", roll: result, die: type }
                    });
                }
            };
        }
    });
}, 500);

// --- LISTENER GLOBALE CHIUSURA (Menu e Modali) ---
window.addEventListener('mousedown', (e) => {
    // 1. GESTIONE MENU ATTACCHI (Spada)
    const isPanel = e.target.closest('.p-quick-panel');
    const isBtn = e.target.closest('.p-mini-btn');

    if (!isPanel && !isBtn) {
        document.querySelectorAll('.p-quick-panel').forEach(p => p.remove());
    }

    // 2. GESTIONE MODALI (Scheda/Zaino)
    const sheetModal = document.getElementById('sheet-modal');
    const invModal = document.getElementById('inventory-modal');

    if (sheetModal && e.target === sheetModal) {
        sheetModal.style.display = 'none';
        pState.currentOpenTokenId = null;
    }
    
    if (invModal && e.target === invModal) {
        invModal.style.display = 'none';
        pState.currentOpenTokenId = null;
    }
});