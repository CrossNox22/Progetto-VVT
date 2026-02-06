/* assets/js/modules/player.js - VERSIONE MULTIPLAYER (BROADCASTER FIXED) */
import { broadcast } from './multiplayer.js';

// --- MOVIMENTO RAPIDO (Leggero) ---
export function broadcastTokenMove(id, x, y) {
    broadcast('UPDATE_POS', { id, x, y });
}

// --- SYNC COMPLETA (Spawn/Stats/Pesante) ---
export function syncTokenToPlayer(id) {
    import('./state.js').then(({state}) => {
        const token = state.tokens[id];
        if(!token) return;
        
        if(token.hidden) {
            removeTokenFromPlayer(id);
        } else {
            broadcast('SPAWN_TOKEN', token);
        }
    });
}

export function removeTokenFromPlayer(id) { 
    broadcast('REMOVE_TOKEN', { id }); 
}

// --- GESTIONE PROPS ---
export function syncPropToPlayer(id) {
    import('./state.js').then(({state}) => {
        const prop = state.props[id];
        if(prop) broadcast('SPAWN_PROP', prop);
    });
}

export function removePropFromPlayer(id) { 
    broadcast('REMOVE_PROP', { id }); 
}

// --- GESTIONE INIZIATIVA ---
export function syncInitiativeToPlayer() {
    import('./state.js').then(({state}) => {
        broadcast('SYNC_INIT', state.initiative);
    });
}

// --- GESTIONE ZAINO ---
export function syncInventoryToPlayer(tokenName, inventory) {
    broadcast('SYNC_INVENTORY', { 
        open: true, 
        title: tokenName, 
        items: inventory 
    });
}

export function closeInventoryOnPlayer() { 
    broadcast('SYNC_INVENTORY', { open: false }); 
}

// --- FUNZIONI LEGACY & UTILITY ---
export function openPlayerWindow() { 
    alert("In modalità ONLINE, usa il pulsante 'ONLINE' in alto per invitare i giocatori."); 
}

export function syncMapToPlayer() {
    // Placeholder se serve sync mappa manuale
}