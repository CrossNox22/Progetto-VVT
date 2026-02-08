/* assets/js/modules/init-merged.js - INIZIALIZZAZIONE (VERSIONE MERGED FIXED) */
import { state, initDom } from './state.js';
import * as env from './environment.js';
import * as audio from './audio.js';
import * as map from './map.js';
import * as tokens from './tokens.js';
import * as modals from './modals.js';
import * as player from './player.js';
import * as dice from './dice.js'; 
import * as toolbar from './toolbar.js';
import * as session from './session-merged.js';

// --- FUNZIONE DI CHIUSURA CUSTOM (Esclude Iniziativa) ---
function closeSafePanels() {
    // NOTA: 'init-panel' è stato rimosso da questa lista per farlo rimanere aperto
    ['clock-panel', 'music-panel', 'weather-panel'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.display = 'none';
    });
}

// --- 1. ESPOSIZIONE GLOBALE ---
export function exposeGlobals() {
    window.state = state;

    // Sessione (dal modulo merged)
    window.startNewSession = session.startNewSession;
    window.loadSessionFile = session.loadSessionFile;
    window.downloadSession = session.downloadSession;

    // Toolbar & Menu
    window.closeAllMenus = closeSafePanels; 
    window.toggleTokenMenu = toolbar.toggleTokenMenu;
    window.closeAllDropdowns = toolbar.closeAllDropdowns;

    // Ambiente
    window.toggleClock = env.toggleClock; window.addTime = env.addTime; window.performLongRest = env.performLongRest;
    window.performShortRest = env.performShortRest; window.toggleWeather = env.toggleWeather; window.setWeather = env.setWeather;
    window.toggleGritty = env.toggleGritty; window.updateCalendarData = env.updateCalendarData;

    // Audio & Mappa
    window.toggleMusic = audio.toggleMusic; window.playPauseMusic = audio.playPauseMusic; window.stopMusic = audio.stopMusic;
    window.nextTrack = audio.nextTrack; window.prevTrack = audio.prevTrack; window.setVolume = audio.setVolume;
    window.toggleShuffle = audio.toggleShuffle; window.toggleLoop = audio.toggleLoop; window.togglePlayerMute = audio.togglePlayerMute;
    window.changeZoom = map.changeZoom; window.resetView = map.resetView;

    // Token & Modali
    window.addToInitiative = tokens.addToInitiative; window.removeFromInitiative = tokens.removeFromInitiative;
    window.renderInitiative = tokens.renderInitiative; window.nextTurn = tokens.nextTurn; window.clearInitiative = tokens.clearInitiative;
    window.openSheet = modals.openSheet; window.openInventory = modals.openInventory; window.openSpellManager = modals.openSpellManager;
    window.closeInventory = () => document.getElementById('inventory-modal').style.display='none';
    window.closeSpellManager = () => document.getElementById('spell-modal').style.display='none';
    
    // --- FIX TOKEN CREATION (Questi mancavano!) ---
    window.openCreationModal = tokens.openCreationModal;     // Apre la finestra
    window.submitTokenCreation = tokens.submitTokenCreation; // Bottone "Genera Token"
    window.switchCreationType = tokens.switchCreationType;   // Tab Eroe/Mostro
    window.previewTokenImage = tokens.previewTokenImage;     // Anteprima Immagine
    window.addMulticlassRow = tokens.addMulticlassRow;       // Multiclasse
    // ---------------------------------------------

    // Funzioni interne Modali
    window.updateTokenData = modals.updateTokenData; window.updateDetail = modals.updateDetail;
    window.addTraitRow = modals.addTraitRow; window.updateTrait = modals.updateTrait; window.removeTrait = modals.removeTrait;
    window.addAttackRow = modals.addAttackRow; window.removeAttackRow = modals.removeAttackRow; window.updateAttack = modals.updateAttack;
    window.updateAttackCount = modals.updateAttackCount; window.addInvRow = modals.addInvRow; window.updateInv = modals.updateInv;
    window.removeInvRow = modals.removeInvRow; window.addSpellLevelRow = modals.addSpellLevelRow;
    window.removeSpellLevel = modals.removeSpellLevel; window.togSpell = modals.togSpell; window.chMaxS = modals.chMaxS;
    window.renSpell = modals.renSpell; window.openStatusMenu = modals.openStatusMenu; window.toggleStatus = modals.toggleStatus;
    
    window.toggleQuickAttacks = tokens.toggleQuickAttacks; 
    window.openPlayerWindow = player.openPlayerWindow;
    window.rollDie = dice.rollDie; window.rollFormula = dice.rollFormula;
    window.rollAttackAction = (type, formula, name) => { dice.rollFormula(formula, name); };
}

// --- 2. LOGICA DI AVVIO (LISTENER) ---
export function initMasterApp() {
    console.log("🚀 AVVIO MASTER APP (Merged)...");
    
    initDom();
    env.initStars();
    env.updateClockUI();
    map.initMapControls();
    
    if (dice.initSecretButton) dice.initSecretButton();

    // LISTENER MAPPA (Clone Node per reset listener)
    const mapUpload = document.getElementById('upload-map');
    if (mapUpload) {
        const newMapUpload = mapUpload.cloneNode(true);
        mapUpload.parentNode.replaceChild(newMapUpload, mapUpload);
        newMapUpload.addEventListener('change', (e) => map.handleMapUpload(e.target.files[0]));
    }

    // LISTENER SESSIONE
    const sessionInput = document.getElementById('upload-session');
    if (sessionInput) {
        const newSessionInput = sessionInput.cloneNode(true);
        sessionInput.parentNode.replaceChild(newSessionInput, sessionInput);
        newSessionInput.addEventListener('change', (e) => session.loadSessionFile(e.target.files[0]));
    }

    // LISTENER DADI
    ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'die-d4', 'die-d6', 'die-d8', 'die-d10', 'die-d12', 'die-d20'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            const faces = parseInt(id.replace(/\D/g, ''));
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', () => dice.rollDie(faces));
        }
    });

    // LISTENER MUSICA
    const musicUpload = document.getElementById('upload-music');
    if(musicUpload) {
        const newMusicUpload = musicUpload.cloneNode(true);
        musicUpload.parentNode.replaceChild(newMusicUpload, musicUpload);
        newMusicUpload.addEventListener('change', (e) => audio.handleMusicUpload(e.target.files));
    }

    // LISTENER TOKEN E PROPS
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

    // --- LISTENER GLOBALE UNIFICATO ---
    window.addEventListener('mousedown', (e) => {
        
        // 1. PANNELLI FLUTTUANTI (Clock, Music, Weather) + MENU TENDINA
        if (!e.target.closest('.floating-panel') && 
            !e.target.closest('button') && 
            !e.target.closest('.submenu-dropdown') &&
            !e.target.closest('.mobile-menu')) {
            
            closeSafePanels(); 
            toolbar.closeAllDropdowns();
        }

        // 2. ATTACCHI RAPIDI
        if (!e.target.closest('.quick-attack-panel') && !e.target.closest('.btn-quick-atk')) {
            document.querySelectorAll('.quick-attack-panel').forEach(p => p.remove());
        }

        // 3. MODALI GRANDI
        const modalIds = ['sheet-modal', 'inventory-modal', 'spell-modal', 'status-modal', 'notes-modal', 'creation-modal'];
        modalIds.forEach(id => {
            const modal = document.getElementById(id);
            if (modal && modal.style.display !== 'none' && e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });

    document.body.classList.remove('loading');
}