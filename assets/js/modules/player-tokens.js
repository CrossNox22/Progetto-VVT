/* assets/js/modules/player-tokens.js - GESTIONE GRAFICA E MOVIMENTO TOKEN */
import { pState } from './player-state.js';
import { openPlayerSheet, openPlayerInventory, toggleQuickAttacks } from './player-ui.js';

// Variabili locali per il trascinamento
let dragItem = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let lastMoveSend = 0;

// --- SPAWN TOKEN GIOCATORE ---
export function spawnPlayerToken(d) {
    const old = document.getElementById(`tok-${d.id}`);
    if(old) old.remove();
    
    // Se è nascosto, non disegnarlo (il Master lo vede, il Player no)
    if(d.hidden) return;

    const el = document.createElement('div');
    el.className = 'token-container'; 
    el.id = `tok-${d.id}`;
    el.style.left = d.x + 'px'; 
    el.style.top = d.y + 'px'; 
    el.style.zIndex = d.z;
    if (d.scale) el.style.transform = `scale(${d.scale})`;

    // 1. CONTROLLI SINISTRA (Scheda/Zaino)
    // Solo se non è un nemico
    if (!d.isEnemy) {
        const cLeft = document.createElement('div');
        cLeft.className = 'p-controls-left'; // Classe CSS Player
        
        const mkBtn = (icon, title, fn) => {
            const b = document.createElement('div');
            b.className = 'p-mini-btn';
            b.textContent = icon;
            b.title = title;
            b.onmousedown = e => e.stopPropagation();
            b.onclick = e => { e.stopPropagation(); fn(d.id); };
            return b;
        };

        cLeft.appendChild(mkBtn('📜', 'Scheda', openPlayerSheet));
        cLeft.appendChild(mkBtn('🎒', 'Zaino', openPlayerInventory));
        el.appendChild(cLeft);
    }

    // 2. CONTROLLI DESTRA (Attacchi Rapidi - Spada)
    // Se ha attacchi configurati e non è un nemico
    if (!d.isEnemy && d.attacks && d.attacks.length > 0) {
        const cRight = document.createElement('div');
        cRight.className = 'p-controls-right';

        const btnAtk = document.createElement('div');
        btnAtk.className = 'p-mini-btn';
        btnAtk.textContent = '⚔️';
        btnAtk.title = "Attacchi Rapidi";
        
        btnAtk.onmousedown = e => e.stopPropagation();
        btnAtk.onclick = e => { e.stopPropagation(); toggleQuickAttacks(d.id, el); };

        cRight.appendChild(btnAtk);
        el.appendChild(cRight);
    }

    // 3. GRAFICA (Statistiche, Immagine, Status)
    let statsHtml = '';
    // Mostra stats se è un eroe o se il Master le ha rese visibili per questo nemico
    if(!d.isEnemy || d.statsVisible) {
        statsHtml += `<div class="stat-box ac-box" style="background:#2196F3; border:2px solid white; color:white;">${d.ac}</div>`;
        if(!d.isEnemy && d.spellSlots) {
            let avail = 0; 
            d.spellSlots.forEach(s => { avail += (s.max - s.used); });
            if(avail > 0) statsHtml += `<div class="stat-box spell-box" style="background:#9C27B0; border:2px solid white; color:white;">${avail}</div>`;
        }
    }

    let statusHtml = '';
    if(d.statuses) d.statuses.forEach(s => statusHtml += `<div class="status-icon">${s}</div>`);

    // Calcolo HP Bar
    const pct = Math.max(0, Math.min(100, (d.hpCurrent / d.hpMax) * 100));
    const hpColor = pct > 50 ? "#4CAF50" : (pct > 25 ? "#FFC107" : "#F44336");

    const contentHtml = `
        <div class="stats-row" style="display:flex; justify-content:space-between; width:100%; position:relative; top:10px; z-index:110;">${statsHtml}</div>
        <div class="token-drag-area">
            <div class="token-name" style="background:rgba(0,0,0,0.8); color:white; padding:2px; border-radius:4px; font-size:11px; text-align:center;">${d.name}</div>
            <img src="${d.image}" class="token-img" style="width:100%; border-radius:5px; display:block;">
        </div>
        <div class="status-overlay">${statusHtml}</div>
        
        <div class="p-hp-container">
            <div class="p-hp-fill" style="width:${pct}%; background-color:${hpColor};"></div>
            <div class="p-hp-text">${d.hpCurrent}/${d.hpMax}</div>
        </div>
    `;
    
    el.insertAdjacentHTML('beforeend', contentHtml);
    document.getElementById('world-layer').appendChild(el);
    
    // Abilita il trascinamento (Solo se non è nemico, per evitare che i giocatori muovano i mostri)
    if(!d.isEnemy) enableDrag(el, d.id);
}

// --- RIMOZIONE TOKEN ---
export function removePlayerToken(id) {
    const el = document.getElementById(`tok-${id}`);
    if(el) el.remove();
}

// --- PROPS (Oggetti Scenici) ---
export function spawnPlayerProp(d) {
    const old = document.getElementById(`prop-${d.id}`);
    if(old) old.remove();
    
    const el = document.createElement('div');
    el.className = 'prop-container'; 
    el.id = `prop-${d.id}`;
    el.style.left = d.x + 'px'; 
    el.style.top = d.y + 'px'; 
    el.style.zIndex = d.z;
    if (d.scale) el.style.transform = `scale(${d.scale})`;
    
    el.innerHTML = `<img src="${d.image}" class="prop-img" style="display:block; pointer-events:none;">`;
    document.getElementById('world-layer').appendChild(el);
    
    // Le props sono trascinabili da tutti (di solito)
    enableDrag(el, d.id); 
}

export function removePlayerProp(id) {
    const el = document.getElementById(`prop-${id}`);
    if(el) el.remove();
}

// --- AGGIORNAMENTO POSIZIONE (Dal Master) ---
export function updateElementPos(id, x, y) {
    // Cerca sia tra i token che tra le props
    const el = document.getElementById(`tok-${id}`) || document.getElementById(`prop-${id}`);
    if(el) { 
        el.style.left = x + 'px'; 
        el.style.top = y + 'px'; 
    }
}

// --- LOGICA DRAG & DROP ---
function enableDrag(el, id) {
    el.addEventListener('mousedown', (e) => {
        // Ignora se clicchi sui pulsantini
        if(e.target.closest('.p-mini-btn') || e.target.classList.contains('p-mini-btn')) return;
        
        // Chiudi menu attacchi se trascini un token (UX Improvement)
        document.querySelectorAll('.p-quick-panel').forEach(p => p.remove());

        e.stopPropagation();
        dragItem = el;
        el.style.transition = "none"; // Disabilita animazioni CSS durante il drag
        
        const rect = el.getBoundingClientRect();
        // Calcola l'offset basandosi sulla scala corrente della vista (Zoom)
        // Nota: pState.scale deve essere gestito in player-state.js
        dragOffsetX = (e.clientX - rect.left) / pState.scale;
        dragOffsetY = (e.clientY - rect.top) / pState.scale;
    });
}

// Listener Globali per il movimento (devono essere attivi sempre)
window.addEventListener('mousemove', (e) => {
    if(dragItem) {
        const worldRect = document.getElementById('world-layer').getBoundingClientRect();
        
        // Calcola nuove coordinate
        const x = (e.clientX - worldRect.left) / pState.scale - dragOffsetX;
        const y = (e.clientY - worldRect.top) / pState.scale - dragOffsetY;
        
        // Muovi visivamente
        dragItem.style.left = x + 'px'; 
        dragItem.style.top = y + 'px';
        
        // Rate Limiting: Invia al master solo ogni 30ms per non intasare la rete
        const now = Date.now();
        if (pState.conn && (now - lastMoveSend > 30)) {
            const rawId = dragItem.id.replace('tok-', '').replace('prop-', '');
            pState.conn.send({ type: 'MOVE_REQUEST', payload: { id: rawId, x: x, y: y } });
            lastMoveSend = now;
        }
    }
});

window.addEventListener('mouseup', () => {
    if(dragItem) {
        dragItem.style.transition = ""; // Riabilita animazioni
        
        // Invio finale della posizione precisa
        if(pState.conn) {
            const rawId = dragItem.id.replace('tok-', '').replace('prop-', '');
            pState.conn.send({ 
                type: 'MOVE_REQUEST', 
                payload: { 
                    id: rawId, 
                    x: parseFloat(dragItem.style.left), 
                    y: parseFloat(dragItem.style.top) 
                } 
            });
        }
        dragItem = null;
    }
});