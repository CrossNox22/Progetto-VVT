/* assets/js/modules/multiplayer.js - GESTIONE PEERJS */
import { state } from './state.js';
import { spawnToken, updateHpVisuals, updateStatusVisuals } from './tokens.js';

let peer = null;
let connections = [];

// --- FUNZIONI HOST (DM) ---
export function initHost() {
    // Crea un ID casuale breve per facilitare l'inserimento
    const peerId = "piero-dm-" + Math.floor(Math.random() * 10000);
    
    peer = new Peer(peerId);

    peer.on('open', (id) => {
        alert(`SESSIONE ONLINE ATTIVA!\n\nID SESSIONE: ${id}\n\nDai questo ID ai giocatori.`);
        console.log("Host ID:", id);
    });

    peer.on('connection', (conn) => {
        connections.push(conn);
        console.log("Nuovo giocatore connesso:", conn.peer);
        
        conn.on('data', (data) => handleDataFromPlayer(data));
        
        // Appena si connette, inviamogli TUTTO lo stato attuale (Sync Iniziale)
        setTimeout(() => fullSyncToPlayer(conn), 500);
    });
}

export function broadcast(type, payload) {
    // Invia un messaggio a TUTTI i giocatori connessi
    connections.forEach(conn => conn.send({ type, payload }));
}

function handleDataFromPlayer(data) {
    // Gestisce le azioni che arrivano dai giocatori (es. spostamento token)
    if (data.type === 'MOVE_REQUEST') {
        const { id, x, y } = data.payload;
        const token = state.tokens[id] || state.props[id];
        
        if (token) {
            // Aggiorna lato DM
            token.x = x;
            token.y = y;
            
            // Aggiorna visivamente il DM
            const el = document.getElementById(state.tokens[id] ? `tok-${id}` : `prop-${id}`);
            if (el) {
                el.style.left = x + 'px';
                el.style.top = y + 'px';
            }
            
            // Rilancia l'aggiornamento a tutti gli altri giocatori
            broadcast('UPDATE_POS', { id, x, y });
        }
    }
}

// --- SYNC COMPLETO (Quando un giocatore entra) ---
function fullSyncToPlayer(conn) {
    // 1. Mappa
    const mapImg = document.getElementById('map-img');
    if (mapImg && mapImg.src) {
        conn.send({ type: 'SYNC_MAP', payload: { src: mapImg.src } });
    }
    
    // 2. Token & Props
    Object.values(state.tokens).forEach(t => conn.send({ type: 'SPAWN_TOKEN', payload: t }));
    Object.values(state.props).forEach(p => conn.send({ type: 'SPAWN_PROP', payload: p }));
    
    // 3. Iniziativa
    conn.send({ type: 'SYNC_INIT', payload: state.initiative });
    
    // 4. Meteo & Tempo
    conn.send({ type: 'SYNC_TIME', payload: state.time });
}

// --- ESPORTA PER MAIN ---
window.startHost = initHost;