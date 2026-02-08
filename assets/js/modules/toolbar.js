/* assets/js/modules/toolbar.js - GESTIONE UI BARRA STRUMENTI */

// Gestisce l'apertura/chiusura del menu a tendina Token
export function toggleTokenMenu() {
    const menu = document.getElementById('token-submenu');
    if (menu) {
        const isVisible = menu.style.display === 'block';
        closeAllDropdowns(); // Chiudi altri eventuali menu aperti
        menu.style.display = isVisible ? 'none' : 'block';
    }
}

// Gestisce il menu Mobile (Burger)
export function toggleMobileMenu() {
    const menu = document.querySelector('.burger-dropdown');
    if (menu) {
        const isVisible = menu.style.display === 'block';
        closeAllDropdowns();
        menu.style.display = isVisible ? 'none' : 'block';
    }
}

// Chiude tutti i menu a tendina della toolbar
export function closeAllDropdowns() {
    const ids = ['token-submenu', '.burger-dropdown'];
    ids.forEach(selector => {
        const el = selector.startsWith('.') ? document.querySelector(selector) : document.getElementById(selector);
        if (el) el.style.display = 'none';
    });
}

// Chiude tutti i pannelli fluttuanti (Clock, Music, etc.)
export function closeAllFloatingPanels() {
    ['clock-panel', 'music-panel', 'weather-panel', 'init-panel'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.display = 'none';
    });
}

// Setup dei listener (da chiamare all'avvio)
export function initToolbarEvents() {
    // 1. Listener Click Globale per chiudere menu/pannelli
    window.addEventListener('mousedown', (e) => {
        // Se non clicco su un bottone della toolbar O su un pannello aperto...
        if (!e.target.closest('.floating-panel') && 
            !e.target.closest('.toolbar-actions button') && 
            !e.target.closest('.submenu-dropdown') &&
            !e.target.closest('.mobile-menu')) {
            
            closeAllFloatingPanels();
            closeAllDropdowns();
        }
    });

    // 2. Listener Burger Menu (Mobile)
    const burger = document.getElementById('burger-btn');
    if (burger) {
        // Rimuoviamo vecchi listener per sicurezza
        const newBurger = burger.cloneNode(true);
        burger.parentNode.replaceChild(newBurger, burger);
        newBurger.addEventListener('click', toggleMobileMenu);
    }
}