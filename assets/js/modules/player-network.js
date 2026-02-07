/* assets/js/modules/player-network.js - GESTIONE RETE E MESSAGGI */
import { pState } from './player-state.js';
import { showRemoteResult } from './dice.js';
// Importiamo le funzioni grafiche dagli altri moduli (che creerai dopo)
import { spawnPlayerToken, removePlayerToken, spawnPlayerProp, removePlayerProp, updateElementPos } from './player-tokens.js';
import { renderInitiative, renderInventory, openPlayerSheet, openPlayerInventory, updateMapImage, updateViewTransform, closeModals } from './player-ui.js';

// --- CONNESSIONE ---
export function connectToGame() {
    const hostId = document.getElementById('host-id-input').value.trim();
    if(!hostId) return;
    
    document.getElementById('status-msg').textContent = "Connessione in corso...";
    
    // Creiamo una nuova istanza Peer
    pState.peer = new Peer();
    
    pState.peer.on('open', (id) => {
        // Connettiamoci al Master
        pState.conn = pState.peer.connect(hostId);
        
        pState.conn.on('open', () => {
            document.getElementById('login-overlay').style.display = 'none';
            console.log("Connesso al Master!");
        });
        
        // Quando arrivano dati, passali alla funzione di smistamento
        pState.conn.on('data', handleData);
        
        pState.conn.on('error', (err) => alert("Errore PeerJS: " + err));
    });
}

// --- SMISTAMENTO DATI RICEVUTI ---
function handleData(d) {
    // 1. SINCRONIZZAZIONE MAPPA
    if(d.type === 'SYNC_MAP') {
        updateMapImage(d.payload.src);
    }
    
    // 2. SINCRONIZZAZIONE VISTA (Pan & Zoom del Master)
    else if(d.type === 'SYNC_VIEW') {
        // Aggiorniamo lo stato globale nel player-state
        pState.panX = d.payload.x;
        pState.panY = d.payload.y;
        pState.scale = d.payload.scale;
        updateViewTransform(); // Applica le modifiche CSS
    }
    
    // 3. TOKEN (Spawn e Aggiornamento)
    else if(d.type === 'SPAWN_TOKEN') {
        const updatedToken = d.payload;
        const idStr = String(updatedToken.id);
        
        // Salviamo nel database locale
        pState.localTokens[idStr] = updatedToken;
        
        // Disegniamo il token
        spawnPlayerToken(updatedToken);
        
        // Se la scheda di questo token è aperta, aggiorniamola in tempo reale
        if (pState.currentOpenTokenId === idStr) {
            const sheetModal = document.getElementById('sheet-modal');
            const invModal = document.getElementById('inventory-modal');
            // Riapriamo la scheda per aggiornare i dati
            if (sheetModal && sheetModal.style.display !== 'none') openPlayerSheet(idStr);
            if (invModal && invModal.style.display !== 'none') openPlayerInventory(idStr);
        }
    }
    
    // 4. RIMOZIONE TOKEN
    else if(d.type === 'REMOVE_TOKEN') { 
        removePlayerToken(d.payload.id);
        delete pState.localTokens[String(d.payload.id)];
        // Se stavi guardando la scheda di questo token, chiudila
        if(pState.currentOpenTokenId === String(d.payload.id)) closeModals();
    }
    
    // 5. OGGETTI DI SCENA (Props)
    else if(d.type === 'SPAWN_PROP') {
        spawnPlayerProp(d.payload);
    }
    else if(d.type === 'REMOVE_PROP') {
        removePlayerProp(d.payload.id);
    }
    
    // 6. MOVIMENTO
    else if(d.type === 'UPDATE_POS') {
        updateElementPos(d.payload.id, d.payload.x, d.payload.y);
    }
    
    // 7. UI DI GIOCO (Iniziativa e Inventario)
    else if(d.type === 'SYNC_INIT') {
        renderInitiative(d.payload);
    }
    else if(d.type === 'SYNC_INVENTORY') {
        renderInventory(d.payload);
    }
    
    // 8. DADI
    else if (d.type === 'ROLL_NOTIFY') {
        showRemoteResult(d.payload.name, d.payload.roll, d.payload.die);
    }
}