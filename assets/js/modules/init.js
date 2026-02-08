/* assets/js/modules/init.js - INIZIALIZZAZIONE GLOBALE */
import { state, initDom } from './state.js';
import * as env from './environment.js';
import * as audio from './audio.js';
import * as map from './map.js';
import * as tokens from './tokens.js';
import * as modals from './modals.js';
import * as player from './player.js';
import * as dice from './dice.js'; 
import * as session from './session.js'; 
import * as toolbar from './toolbar.js';

// --- 1. ESPOSIZIONE GLOBALE (Window) ---
export function exposeGlobals() {
    window.state = state;
    
    // Sessione
    window.startNewSession = session.startNewSession;
    window.loadSessionFile = session.loadSessionFile;
    window.downloadSession = session.downloadSession;

    // Ambiente
    window.toggleClock = env.toggleClock;
    window.addTime = env.addTime;
    window.performLongRest = env.performLongRest;
    window.performShortRest = env.performShortRest;
    window.toggleWeather = env.toggleWeather;
    window.setWeather = env.setWeather;
    window.toggleGritty = env.toggleGritty;
    window.updateCalendarData = env.updateCalendarData;
    
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
    
    // Token & Init
    window.addToInitiative = tokens.addToInitiative;
    window.removeFromInitiative = tokens.removeFromInitiative;
    window.renderInitiative = tokens.renderInitiative;
    window.nextTurn = tokens.nextTurn;
    window.clearInitiative = tokens.clearInitiative;
    window.toggleQuickAttacks = tokens.toggleQuickAttacks;

    // *** FIX MENU TOKEN ***
    window.toggleTokenMenu = toolbar.toggleTokenMenu;      
    window.switchCreationType = tokens.switchCreationType; // Serve per la modale
    window.previewTokenImage = tokens.previewTokenImage;   // Serve per upload img
    window.openCreationModal = tokens.openCreationModal;   // Serve per aprire la modale
    window.submitTokenCreation = tokens.submitTokenCreation; // Serve per il tasto "Genera"
    // **********************
    
    // Modali
    window.openSheet = modals.openSheet;
    window.openInventory = modals.openInventory;
    window.openSpellManager = modals.openSpellManager;
    window.closeInventory = modals.closeInventory;
    window.closeSpellManager = modals.closeSpellManager;
    window.openStatusMenu = modals.openStatusMenu;
    window.toggleStatus = modals.toggleStatus;
    
    // Funzioni interne Modali (Sheet)
    window.updateTokenData = modals.updateTokenData;
    window.updateDetail = modals.updateDetail;
    window.addTraitRow = modals.addTraitRow;
    window.updateTrait = modals.updateTrait;
    window.removeTrait = modals.removeTrait;
    window.addAttackRow = modals.addAttackRow;
    window.removeAttackRow = modals.removeAttackRow;
    window.updateAttack = modals.updateAttack;
    window.updateAttackCount = modals.updateAttackCount;
    window.rollAttackAction = (type, formula, name) => dice.rollFormula(formula, name); // Helper dadi
    window.addInvRow = modals.addInvRow;
    window.updateInv = modals.updateInv;
    window.removeInvRow = modals.removeInvRow;
    window.addSpellLevelRow = modals.addSpellLevelRow;
    window.removeSpellLevel = modals.removeSpellLevel;
    window.togSpell = modals.togSpell;
    window.chMaxS = modals.chMaxS;
    window.renSpell = modals.renSpell;

    // Player
    window.openPlayerWindow = player.openPlayerWindow;
    window.syncInitiativeToPlayer = player.syncInitiativeToPlayer;

    // Dadi
    window.rollDie = dice.rollDie;

    // Helper UI: Close All
    window.closeAllMenus = function() {
        ['clock-panel', 'music-panel', 'weather-panel'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.style.display = 'none';
        });
    };
}

// --- 2. LISTENER DOM ---
export function setupEventListeners() {
    initDom();
    env.initStars();
    env.updateClockUI();
    map.initMapControls();
    
    if (dice.initSecretButton) dice.initSecretButton();

    // Listener Mappa
    const mapUpload = document.getElementById('upload-map');
    if (mapUpload) {
        const n = mapUpload.cloneNode(true);
        mapUpload.parentNode.replaceChild(n, mapUpload);
        n.addEventListener('change', (e) => map.handleMapUpload(e.target.files[0]));
    }

    // Listener Sessione
    const sessionInput = document.getElementById('upload-session');
    if (sessionInput) {
        const n = sessionInput.cloneNode(true);
        sessionInput.parentNode.replaceChild(n, sessionInput);
        n.addEventListener('change', (e) => session.loadSessionFile(e.target.files[0]));
    }

    // Listener Dadi (Bottom Bar)
    ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            const faces = parseInt(id.replace(/\D/g, ''));
            const n = btn.cloneNode(true);
            btn.parentNode.replaceChild(n, btn);
            n.addEventListener('click', () => dice.rollDie(faces));
        }
    });

    // Listener Musica
    const musicUpload = document.getElementById('upload-music');
    if(musicUpload) {
        const n = musicUpload.cloneNode(true);
        musicUpload.parentNode.replaceChild(n, musicUpload);
        n.addEventListener('change', (e) => audio.handleMusicUpload(e.target.files));
    }

    // Listener Token/Props
    const tokenUpload = document.getElementById('upload-token');
    if(tokenUpload) {
        const n = tokenUpload.cloneNode(true);
        tokenUpload.parentNode.replaceChild(n, tokenUpload);
        n.addEventListener('change', (e) => tokens.handleTokenUpload(e.target.files[0]));
    }
    const propUpload = document.getElementById('upload-prop');
    if(propUpload) {
        const n = propUpload.cloneNode(true);
        propUpload.parentNode.replaceChild(n, propUpload);
        n.addEventListener('change', (e) => tokens.handlePropUpload(e.target.files[0]));
    }

    // Chiusura Menu e Modali al Click Fuori
    window.addEventListener('mousedown', (e) => {
        
        // 1. GESTIONE TOOLBAR E PANNELLI FLUTTUANTI
        if (!e.target.closest('.floating-panel') && !e.target.closest('button') && !e.target.closest('.submenu-dropdown')) {
            window.closeAllMenus();
        }

        // 2. GESTIONE ATTACCHI RAPIDI
        if (!e.target.closest('.quick-attack-panel') && !e.target.closest('.btn-quick-atk')) {
            document.querySelectorAll('.quick-attack-panel').forEach(p => p.remove());
        }

        // 3. GESTIONE MODALI (Inventario, Scheda, ecc.)
        // Lista degli ID delle finestre che vuoi chiudere cliccando fuori
        const modalIds = ['inventory-modal', 'sheet-modal', 'spell-modal', 'status-modal', 'notes-modal', 'creation-modal'];
        
        modalIds.forEach(id => {
            const modal = document.getElementById(id);
            // Se la modale esiste ED è visibile E il click è avvenuto esattamente sullo sfondo (non sul contenuto)
            if (modal && modal.style.display !== 'none' && e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });

    document.body.classList.remove('loading');
}