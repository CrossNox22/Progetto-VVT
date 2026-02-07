/* assets/js/modules/player-state.js */
export const pState = {
    localTokens: {},     // Database locale dei token
    conn: null,          // Connessione attiva
    peer: null,          // Istanza PeerJS
    currentOpenTokenId: null, // ID del token di cui stiamo guardando la scheda
    
    // Variabili Mappa
    scale: 1,
    panX: 0,
    panY: 0
};