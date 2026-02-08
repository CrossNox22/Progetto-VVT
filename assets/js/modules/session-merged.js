/* assets/js/modules/session-merged.js - GESTIONE SESSIONE (VERSIONE MERGED) */
import { state } from './state.js';
import * as env from './environment.js';
import * as map from './map.js';
import * as tokens from './tokens.js';
import * as player from './player.js';

// --- AVVIO NUOVA SESSIONE ---
export function startNewSession() {
    const screen = document.getElementById('start-screen');
    if (screen) {
        screen.style.opacity = '0';
        setTimeout(() => {
            screen.style.display = 'none';
            document.body.classList.remove('loading');
        }, 500);
    }
}

// --- CARICAMENTO SESSIONE ---
export function loadSessionFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const s = JSON.parse(e.target.result);
            
            // FIX MAPPA
            if (s.map && state.dom.mapImg) { 
                state.dom.mapImg.style.width = "auto";
                state.dom.mapImg.style.height = "auto";
                state.dom.mapImg.style.maxWidth = "none"; 
                state.dom.mapImg.src = s.map; 
            }
            
            // Pulizia
            document.querySelectorAll('.token-container').forEach(el => el.remove()); 
            document.querySelectorAll('.prop-container').forEach(el => el.remove());
            state.tokens = {}; state.props = {}; state.initiative = [];
            
            // Ripristino Dati
            if (s.time) state.time.minutes = s.time;
            if (s.month) state.time.monthName = s.month;
            if (s.year) state.time.year = s.year;
            if (s.gritty !== undefined) {
                state.time.isGritty = s.gritty;
                const gt = document.getElementById('gritty-toggle');
                if(gt) gt.checked = s.gritty;
            }
            if (s.tokens) s.tokens.forEach(t => tokens.spawnToken(t)); 
            if (s.props) s.props.forEach(p => tokens.spawnProp(p)); 
            if (s.init) state.initiative = s.init;
            
            // Aggiornamento UI
            env.updateClockUI();
            if(window.renderInitiative) window.renderInitiative();
            
            // FIX SYNC PLAYER (Specifico per Multiplayer)
            setTimeout(() => { 
                map.updateWorldTransform();
                
                import('./multiplayer.js').then(mp => {
                    if (mp.broadcast) {
                        if(state.dom.mapImg) mp.broadcast('SYNC_MAP', { src: state.dom.mapImg.src });
                        mp.broadcast('SYNC_VIEW', { x: state.map.x, y: state.map.y, scale: state.map.scale });
                        Object.values(state.tokens).forEach(t => { if(!t.hidden) mp.broadcast('SPAWN_TOKEN', t); });
                        Object.values(state.props).forEach(p => mp.broadcast('SPAWN_PROP', p));
                        player.syncClockToPlayer(); 
                        player.syncInitiativeToPlayer();
                    }
                });
                map.syncMap(); 
            }, 500); 

            alert("Sessione caricata con successo!");
            startNewSession();
        } catch (err) { console.error(err); alert("Errore nel caricamento del file sessione."); }
    };
    reader.readAsText(file);
}

// --- SALVATAGGIO SESSIONE ---
function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function downloadSession() {
    if (!state.dom.mapImg && Object.keys(state.tokens).length === 0) {
        alert("La sessione è vuota. Niente da salvare.");
        return;
    }
    const sessionData = {
        time: state.time.minutes, month: state.time.monthName, year: state.time.year, gritty: state.time.isGritty,
        map: state.dom.mapImg ? state.dom.mapImg.getAttribute('src') : null,
        tokens: Object.values(state.tokens), props: Object.values(state.props),
        init: state.initiative, savedAt: new Date().toISOString()
    };
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadJSON(sessionData, `Sessione_DND_${dateStr}.ses`);
}