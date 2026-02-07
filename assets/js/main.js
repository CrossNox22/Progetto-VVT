/* main.js - Versione Fix Menu e Orologio */
import { state, initDom } from './modules/state.js';
import * as env from './modules/environment.js';
import * as audio from './modules/audio.js';
import * as map from './modules/map.js';
import * as tokens from './modules/tokens.js';
import * as modals from './modules/modals.js';
import * as player from './modules/player.js';
import * as dice from './modules/dice.js'; 

// --- 1. FUNZIONI DI AVVIO ---
window.startNewSession = function() {
    const screen = document.getElementById('start-screen');
    if (screen) {
        screen.style.opacity = '0';
        setTimeout(() => {
            screen.style.display = 'none';
            document.body.classList.remove('loading');
        }, 500);
    }
};

window.loadSessionFile = function(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const s = JSON.parse(e.target.result);
            
            // --- 1. FIX MAPPA: USA DIMENSIONI REALI ---
            if (s.map && state.dom.mapImg) { 
                // Rimuovi lo stile che schiacciava la mappa
                state.dom.mapImg.style.width = "auto";
                state.dom.mapImg.style.height = "auto";
                state.dom.mapImg.style.maxWidth = "none"; 
                
                // Imposta la sorgente
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
            
            // --- 2. FIX SYNC PLAYER (FONDAMENTALE) ---
            setTimeout(() => { 
                // Aggiorna la vista locale del Master (applica zoom corretto se salvato o reset)
                map.updateWorldTransform();
                
                // Importiamo multiplayer.js per inviare tutto ai giocatori
                import('./modules/multiplayer.js').then(mp => {
                    if (mp.broadcast) {
                        // A. Mappa
                        if(state.dom.mapImg) mp.broadcast('SYNC_MAP', { src: state.dom.mapImg.src });
                        
                        // B. Vista (Zoom e Posizione attuali del Master)
                        mp.broadcast('SYNC_VIEW', { 
                            x: state.map.x, 
                            y: state.map.y, 
                            scale: state.map.scale 
                        });
                        
                        // C. Token & Props
                        Object.values(state.tokens).forEach(t => {
                            if(!t.hidden) mp.broadcast('SPAWN_TOKEN', t);
                        });
                        Object.values(state.props).forEach(p => mp.broadcast('SPAWN_PROP', p));
                        
                        // D. Tempo & Init
                        player.syncClockToPlayer(); 
                        player.syncInitiativeToPlayer();
                    }
                });
                
                // Sync locale legacy
                map.syncMap(); 
            }, 500); // Tempo per caricare l'immagine

            alert("Sessione caricata con successo!");
            window.startNewSession();
        } catch (err) { console.error(err); alert("Errore nel caricamento del file sessione."); }
    };
    reader.readAsText(file);
};

// --- 2. ESPOSIZIONE GLOBALE (Fondamentale!) ---

// DEFINIZIONE DELLA FUNZIONE MANCANTE
window.closeAllMenus = function() {
    ['clock-panel', 'music-panel', 'weather-panel'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.display = 'none';
    });
};

window.state = state; // Utile per debug

/* --- AGGIUNGI QUESTO IN main.js (Sezione 2) --- */

// Funzione Helper per scaricare file
function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Funzione Principale SALVA SESSIONE
window.downloadSession = function() {
    // 1. Controllo di sicurezza: c'è qualcosa da salvare?
    if (!state.dom.mapImg && Object.keys(state.tokens).length === 0) {
        alert("La sessione è vuota. Niente da salvare.");
        return;
    }

    // 2. Raccolta Dati dai moduli
    const sessionData = {
        // Dati Temporali
        time: state.time.minutes,
        month: state.time.monthName,
        year: state.time.year,
        gritty: state.time.isGritty,
        
        // Mappa (Salva l'immagine come Base64)
        map: state.dom.mapImg ? state.dom.mapImg.getAttribute('src') : null,
        
        // Token e Oggetti (Convertiamo l'oggetto in Array per il salvataggio)
        tokens: Object.values(state.tokens),
        props: Object.values(state.props),
        
        // Iniziativa
        init: state.initiative,
        
        // Playlist (Solo nomi, per sicurezza)
        // Nota: Bisognerebbe esporre la playlist da audio.js se volessimo salvarla, 
        // per ora salviamo i dati essenziali di gioco.
        savedAt: new Date().toISOString()
    };

    // 3. Generazione nome file con data
    const dateStr = new Date().toISOString().slice(0, 10); // es. 2023-10-25
    downloadJSON(sessionData, `Sessione_DND_${dateStr}.ses`);
    
    console.log("💾 Sessione salvata correttamente!");
};

// Ambiente
window.toggleClock = env.toggleClock;
window.addTime = env.addTime;
window.performLongRest = env.performLongRest;
window.performShortRest = env.performShortRest;
window.toggleWeather = env.toggleWeather;
window.setWeather = env.setWeather;
window.toggleGritty = env.toggleGritty;
window.updateCalendarData = env.updateCalendarData;
window.syncClockToPlayer = env.syncClockToPlayer;
window.syncWeatherToPlayer = env.syncWeatherToPlayer;
window.syncClockToPlayer = env.syncClockToPlayer;
window.syncWeatherToPlayer = env.syncWeatherToPlayer;
window.updateSkyColor = env.updateSkyColor;

// Audio
window.toggleMusic = audio.toggleMusic;
window.playPauseMusic = audio.playPauseMusic;
window.stopMusic = audio.stopMusic;
window.nextTrack = audio.nextTrack;
window.prevTrack = audio.prevTrack;
window.setVolume = audio.setVolume;
window.toggleShuffle = audio.toggleShuffle;
window.toggleLoop = audio.toggleLoop;
window.togglePlayerMute = audio.togglePlayerMute;

// Mappa
window.changeZoom = map.changeZoom;
window.resetView = map.resetView;
window.syncMap = map.syncMap;
window.syncWorldView = map.syncWorldView;

// Token
window.addToInitiative = tokens.addToInitiative;
window.removeFromInitiative = tokens.removeFromInitiative;
window.renderInitiative = tokens.renderInitiative;
window.nextTurn = tokens.nextTurn;
window.clearInitiative = tokens.clearInitiative;
window.syncInitiativeToPlayer = player.syncInitiativeToPlayer;

// Modali (Schede)
window.openSheet = modals.openSheet;
window.openInventory = modals.openInventory;
window.openSpellManager = modals.openSpellManager;
window.closeInventory = () => document.getElementById('inventory-modal').style.display='none';
window.closeSpellManager = () => document.getElementById('spell-modal').style.display='none';

// Funzioni Interne Scheda (Quelle aggiunte prima)
window.updateTokenData = modals.updateTokenData;
window.updateDetail = modals.updateDetail;
window.addTraitRow = modals.addTraitRow;
window.updateTrait = modals.updateTrait;
window.removeTrait = modals.removeTrait;
window.addAttackRow = modals.addAttackRow;
window.removeAttackRow = modals.removeAttackRow;
window.updateAttack = modals.updateAttack;
window.updateAttackCount = modals.updateAttackCount;
window.renderAttacks = modals.renderAttacks;
window.renderTraits = modals.renderTraits;
window.addInvRow = modals.addInvRow;
window.updateInv = modals.updateInv;
window.removeInvRow = modals.removeInvRow;
window.addSpellLevelRow = modals.addSpellLevelRow;
window.removeSpellLevel = modals.removeSpellLevel;
window.togSpell = modals.togSpell;
window.chMaxS = modals.chMaxS;
window.renSpell = modals.renSpell;
window.rollAttackAction = modals.rollAttackAction;

window.openPlayerWindow = player.openPlayerWindow;

window.addToInitiative = tokens.addToInitiative;
window.removeFromInitiative = tokens.removeFromInitiative;
window.renderInitiative = tokens.renderInitiative;
window.nextTurn = tokens.nextTurn;
window.clearInitiative = tokens.clearInitiative;
// Funzioni Attacchi Rapidi (da tokens.js)
window.toggleQuickAttacks = tokens.toggleQuickAttacks;

// Funzioni Status (da modals.js)
window.openStatusMenu = modals.openStatusMenu;
window.toggleStatus = modals.toggleStatus;

// Per sicurezza, riesponiamo anche queste se per caso mancavano
window.openInventory = modals.openInventory;
window.openSpellManager = modals.openSpellManager;

// Roll dice
window.rollDie = dice.rollDie;
window.rollFormula = dice.rollFormula;

// Sovrascrivi la vecchia funzione placeholder "rollAttackAction"
// Ora userà il nuovo sistema di dadi intelligente!
window.rollAttackAction = (type, formula, name) => {
    dice.rollFormula(formula, name);
};

// --- 3. INIZIALIZZAZIONE & EVENTI ---
document.addEventListener("DOMContentLoaded", () => {
    initDom();
    env.initStars();
    env.updateClockUI();
    map.initMapControls();
    
    // 1. INIZIALIZZA BOTTONE SEGRETO DADI
    if (dice.initSecretButton) {
        dice.initSecretButton();
    }

    // 2. LISTENER MAPPA (Corretto: una sola dichiarazione)
    const mapUpload = document.getElementById('upload-map');
    if (mapUpload) {
        const newMapUpload = mapUpload.cloneNode(true);
        mapUpload.parentNode.replaceChild(newMapUpload, mapUpload);
        newMapUpload.addEventListener('change', (e) => map.handleMapUpload(e.target.files[0]));
    }

    // Listener Sessione
    const sessionInput = document.getElementById('upload-session');
    if (sessionInput) {
        const newSessionInput = sessionInput.cloneNode(true);
        sessionInput.parentNode.replaceChild(newSessionInput, sessionInput);
        newSessionInput.addEventListener('change', (e) => window.loadSessionFile(e.target.files[0]));
    }

// 6. Listener Dadi in Basso
    // Cerchiamo elementi con ID tipo "d4", "d6", "die-d20", ecc.
    ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'die-d4', 'die-d6', 'die-d8', 'die-d10', 'die-d12', 'die-d20'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            // Estrai il numero dal nome (es. "d20" -> 20)
            const faces = parseInt(id.replace(/\D/g, ''));
            // Rimuovi vecchi listener (clone)
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', () => {
                dice.rollDie(faces);
            });
        }
    });

    // Listener Musica
    const musicUpload = document.getElementById('upload-music');
    if(musicUpload) {
        const newMusicUpload = musicUpload.cloneNode(true);
        musicUpload.parentNode.replaceChild(newMusicUpload, musicUpload);
        newMusicUpload.addEventListener('change', (e) => audio.handleMusicUpload(e.target.files));
    }

    // Listener Token e Props
    const tokenUpload = document.getElementById('upload-token');
    if(tokenUpload) {
        const newTokenUpload = tokenUpload.cloneNode(true);
        tokenUpload.parentNode.replaceChild(newTokenUpload, tokenUpload);
        newTokenUpload.addEventListener('change', (e) => tokens.handleTokenUpload(e.target.files[0]));
    }
    const propUpload = document.getElementById('upload-prop');
    if(propUpload) {
        const newPropUpload = propUpload.cloneNode(true);
        propUpload.parentNode.replaceChild(newPropUpload, propUpload);
        newPropUpload.addEventListener('change', (e) => tokens.handlePropUpload(e.target.files[0]));
    }

    document.body.classList.remove('loading');
});

// GESTORE EVENTI CLIC (CHIUSURA MENU)
window.addEventListener('mousedown', (e) => {
    // Se clicchi fuori da pannelli e bottoni, chiudi tutto
    if (!e.target.closest('.floating-panel') && !e.target.closest('button')) {
        window.closeAllMenus(); // ORA QUESTA FUNZIONE ESISTE!
    }
    
    // Attacchi rapidi
    if (!e.target.closest('.quick-attack-panel') && !e.target.closest('.btn-quick-atk')) {
        document.querySelectorAll('.quick-attack-panel').forEach(p => p.remove());
    }
});
