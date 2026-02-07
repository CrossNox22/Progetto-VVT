/* assets/js/modules/player-logic.js - MAIN CONTROLLER (CLEAN) */
import { pState } from './player-state.js';
import { connectToGame } from './player-network.js';
import { updateViewTransform } from './player-ui.js';
import { rollDie } from './dice.js';

// --- INIT ---
// Esponiamo la funzione di connessione per il bottone HTML
window.connectToGame = connectToGame;

// --- GESTIONE INPUT UTENTE (Pan & Zoom Mappa) ---
const gameArea = document.getElementById('game-area');
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

// --- GESTIONE DADI (Click sulla barra inferiore) ---
setTimeout(() => {
    ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'].forEach(type => {
        const btn = document.getElementById(`p-${type}`);
        if(btn) {
            btn.onclick = () => {
                const sides = parseInt(type.replace('d', ''));
                const result = rollDie(sides, "Tu");
                
                // Invia notifica al Master tramite il modulo di stato/rete
                if(pState.conn && pState.conn.open) {
                    pState.conn.send({
                        type: 'ROLL_NOTIFY',
                        payload: {
                            name: "Giocatore", 
                            roll: result,
                            die: type
                        }
                    });
                }
            };
        }
    });
}, 500);

// --- LISTENER GLOBALE CHIUSURA (Menu e Modali) ---
window.addEventListener('mousedown', (e) => {
    
    // 1. GESTIONE MENU ATTACCHI (Spada)
    // Usa le nuove classi .p-quick-panel e .p-mini-btn
    const isPanel = e.target.closest('.p-quick-panel');
    const isBtn = e.target.closest('.p-mini-btn');

    if (!isPanel && !isBtn) {
        document.querySelectorAll('.p-quick-panel').forEach(p => p.remove());
    }

    // 2. GESTIONE MODALI (Scheda/Zaino)
    const sheetModal = document.getElementById('sheet-modal');
    const invModal = document.getElementById('inventory-modal');

    // Se clicco esattamente sullo sfondo scuro (overlay), chiudo la modale
    if (sheetModal && e.target === sheetModal) {
        sheetModal.style.display = 'none';
        pState.currentOpenTokenId = null;
    }
    
    if (invModal && e.target === invModal) {
        invModal.style.display = 'none';
        pState.currentOpenTokenId = null;
    }
});