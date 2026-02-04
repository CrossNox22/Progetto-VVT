/* state.js - Gestione dello Stato Globale dell'Applicazione */

export const state = {
    // Riferimenti DOM (saranno popolati all'avvio)
    dom: {
        gameArea: null,
        worldLayer: null,
        mapImg: null,
        logPanel: null,
        creationModal: null
    },

    // Variabili Mappa
    map: {
        scale: 1,
        x: 0,
        y: 0,
        isPanning: false,
        panStartX: 0,
        panStartY: 0,
        highestZ: 100
    },

    // Variabili Tempo & Ambiente
    time: {
        minutes: 480, // 08:00
        isGritty: false,
        monthName: "Mese 1",
        year: 1,
        currentWeather: ''
    },

    // Dati di Gioco
    tokens: {},       // Database dei token attivi
    props: {},        // Database degli oggetti scenici
    initiative: [],   // Lista iniziativa
    
    // Riferimento alla Finestra Giocatori
    playerWin: null,

    // ID temporanei per le modali aperte
    selection: {
        currentSheetId: null,
        currentInvId: null,
        currentSpellId: null,
        currentStatusId: null,
        currentNotesTokenId: null,
        creationType: 'hero',
        pendingImg: ""
    },

    // Costanti
    constants: {
        statusIcons: { 
            '🔥':'Bruciato','💤':'Sonno','🩸':'Ferito','🛡️':'Scudo',
            '💀':'Morto','👑':'Leader','🐢':'Lento','🚀':'Haste',
            '👁️':'Conc','🕸️':'Intrapp','🤢':'Avvel','👻':'Etereo' 
        }
    }
};

// Funzione di utilità per inizializzare i riferimenti DOM
export function initDom() {
    state.dom.gameArea = document.getElementById('game-area');
    state.dom.worldLayer = document.getElementById('world-layer');
    state.dom.mapImg = document.getElementById('map-img');
    state.dom.logPanel = document.getElementById('log-panel');
    state.dom.creationModal = document.getElementById('creation-modal');
}