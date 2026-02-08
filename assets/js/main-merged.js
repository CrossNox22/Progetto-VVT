/* assets/js/main-merged.js - ENTRY POINT (VERSIONE LAUNCHER) */
import { exposeGlobals, initMasterApp } from './modules/init-merged.js';

// 1. Esponi le funzioni globali (necessarie per l'HTML onclick)
exposeGlobals();

// 2. Logica di Caricamento Intelligente
if (document.readyState === "loading") {
    // Caso raro: caricamento standard
    document.addEventListener("DOMContentLoaded", initMasterApp);
} else {
    // Caso Launcher: il DOM è già pronto, avvia subito!
    initMasterApp();
}