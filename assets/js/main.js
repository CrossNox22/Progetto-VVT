/* main.js - ENTRY POINT */
import { exposeGlobals, setupEventListeners } from './modules/init.js';

// 1. Esponi le funzioni a window (così l'HTML funziona)
exposeGlobals();

// 2. Avvia i listener quando il DOM è pronto
document.addEventListener("DOMContentLoaded", () => {
    setupEventListeners();
});