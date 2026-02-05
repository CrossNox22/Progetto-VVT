/* player.js - Sincronizzazione Finestra Giocatori (Tutto sotto i Token) */
import { state } from './state.js';

// --- GESTIONE FINESTRA ---

export function openPlayerWindow() {
    if(state.playerWin && !state.playerWin.closed) {
        state.playerWin.focus();
        syncAllContent();
        return;
    }
    
    const w = window.outerWidth || 1000, h = window.outerHeight || 700;
    state.playerWin = window.open("", "PlayerView", `width=${w},height=${h}`);
    
    const playerHtml = `<!DOCTYPE html><html><head><title>GIOCATORI</title>
    <style>
        body{margin:0;background:#000;font-family:sans-serif;overflow:hidden; width:100vw; height:100vh;}
        #p-game-area{width:100%; height:100%; position:relative; overflow:hidden;} 
        
        #p-stars-container, #p-sun-container { 
            position: absolute; top: 0; left: 0; width: 100%; height: 100%; 
            pointer-events: none; z-index: 2; 
        }
    
#p-game-area {
    width: 100%; 
    height: 100%; 
    position: relative; 
    overflow: hidden;
    cursor: grab; /* Cursore a manina */
}
    
#p-game-area:active {
    cursor: grabbing; /* Cursore quando trascini */
}
    
#p-init-panel {
    position: absolute;
    top: 20px;
    left: 20px;
    width: 200px;
    background: #fdf1dc; /* Crema pergamena */
    border: 3px solid #922610; /* Rosso D&D */
    border-radius: 10px;
    padding: 10px;
    color: #333;
    z-index: 9000;
    box-shadow: 0 4px 15px rgba(0,0,0,0.5);
    font-family: 'Georgia', serif;
}
    
#p-init-panel h4 {
    margin: 0 0 10px 0;
    color: #922610;
    text-align: center;
    font-variant: small-caps;
    border-bottom: 2px solid #922610;
    font-size: 18px;
}
    
.p-init-row {
    display: flex;
    align-items: center;
    padding: 5px;
    border-bottom: 1px solid #922610; /* Linea continua rosso D&D */
    transition: all 0.2s;
    font-size: 14px;
}
    
.p-init-row:last-child { border-bottom: none; }
    
/* Stile per il turno attivo (come nel Master) */
.p-init-row.active {
    background-color: rgba(146, 38, 16, 0.15);
    font-weight: bold;
    border-left: 4px solid #922610;
    padding-left: 8px;
}
    
.p-init-val {
    color: #922610;
    font-weight: bold;
    margin-right: 8px;
    min-width: 20px;
}
    
    
        .star { position: absolute; background: #fff; border-radius: 50%; z-index: 2; animation: twinkle infinite alternate; }
        @keyframes twinkle { from { opacity: 0.3; transform: scale(0.8); } to { opacity: 1; transform: scale(1.2); } }
    
        #p-world-layer{position:absolute; top:0; left:0; transition:transform .1s linear; z-index:10;}
        #p-map-img{display:block; pointer-events:none; z-index:1; position:relative;}
    
        #p-weather-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2; overflow: hidden; }
    
        .weather-snow {
            background-image: radial-gradient(3px 3px at 20% 30%, rgba(255, 255, 255, 0.9) 50%, rgba(0, 0, 0, 0)),
                              radial-gradient(3px 3px at 40% 70%, rgba(255, 255, 255, 0.9) 50%, rgba(0, 0, 0, 0));
            background-size: 200px 200px; animation: snow-anim 5s linear infinite; opacity: 0.8;
        }
        @keyframes snow-anim { 0% { background-position: 0px 0px; } 100% { background-position: 50px 200px; } }
    
        .p-token{position:absolute; width:100px; display:flex; flex-direction:column; align-items:center; transition:all .1s linear; z-index:100;}
        .p-img{width:100%; border-radius:5px; display:block; box-shadow: 0 4px 8px rgba(0,0,0,0.5);} 
        
        /* FIX HP: Altezza aumentata e posizione relativa per il testo */
        .p-hp-bar{width:100%; height:14px; background:#333; margin-top:2px; border:1px solid #fff; position:relative;}
        .p-hp-fill{height:100%; background:#0f0; transition:width .3s}
        .p-hp-text{position:absolute; top:0; left:0; width:100%; height:100%; font-size:10px; color:white; font-weight:bold; display:flex; align-items:center; justify-content:center; text-shadow:1px 1px 2px #000;}
    
        .p-stats-row{display:flex; justify-content:space-between; width:100%; margin-bottom:-10px; z-index:10; position:relative; top:10px}
        .p-stat-box{width:24px; height:24px; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px; border:2px solid #fff; border-radius:5px; color:#fff; background:#2196F3}
        
        /* FIX SLOT: Colore viola come nel Master */
        .p-slot{background:#9C27B0; display:none;} 
    
        .p-name{color:#fff; background:rgba(0,0,0,0.6); padding:2px 4px; font-size:12px; border-radius:4px; margin-bottom:2px; white-space:nowrap;}
        #p-log{position:absolute; bottom:20px; left:20px; width:300px; display:flex; flex-direction:column-reverse; pointer-events:none; z-index:2000;}
        .p-log-entry{background:rgba(0,0,0,0.6); color:#fff; padding:8px; margin-top:5px; border-left:4px solid #777}
        #p-init-panel{position:absolute; top:20px; left:20px; width:180px; background:rgba(0,0,0,0.8); border:2px solid #555; padding:10px; color:#fff; z-index:9000}
        .p-clock-overlay{position:absolute; top:10px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.8); padding:5px 15px; border-radius:20px; color:#922610; font-weight:bold; border: 1px solid #922610; text-align: center;
         z-index: 2000;}
        #p-rain-canvas { display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 3; pointer-events: none; }
    </style></head>
    <body onload="window.opener.onPlayerViewReady()">
        <div id="p-game-area">
            <div id="p-stars-container"></div>
            <div id="p-sun-container"></div>
            <div id="p-world-layer">
                <img id="p-map-img">
                <div id="p-weather-overlay"></div>
                <canvas id="p-rain-canvas"></canvas>
            </div>
        </div>
        <div id="p-log"></div>
        <div id="p-init-panel" style="display:none"><h4>Iniziativa</h4><div id="p-init-list"></div></div>
        <audio id="p-audio" loop></audio>
    </body></html>`;
    
    state.playerWin.document.write(playerHtml);
    state.playerWin.document.close();
}

let pIsDragging = false;
let pStartX, pStartY;
let pCurrentX = 0;
let pCurrentY = 0;
let pScale = 1; // Gestiamo uno zoom locale per il giocatore

function setupPlayerControls() {
    const pWin = state.playerWin;
    if (!pWin) return;
    
    const gameArea = pWin.document.getElementById('p-game-area');
    const world = pWin.document.getElementById('p-world-layer');
    
    // --- LOGICA TRASCINAMENTO (PANNING) ---
    gameArea.addEventListener('mousedown', (e) => {
        if (e.button === 0 || e.button === 1) {
            pIsDragging = true;
            pStartX = e.clientX - pCurrentX;
            pStartY = e.clientY - pCurrentY;
            e.preventDefault();
        }
    });
    
    pWin.addEventListener('mousemove', (e) => {
        if (!pIsDragging) return;
        pCurrentX = e.clientX - pStartX;
        pCurrentY = e.clientY - pStartY;
        updatePlayerTransform();
    });
    
    pWin.addEventListener('mouseup', () => { pIsDragging = false; });
    
    // --- LOGICA ZOOM (ROTELINA) ---
    pWin.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05; // Sensibilità zoom
        const oldScale = pScale;
        pScale = Math.min(Math.max(0.1, pScale + delta), 5); // Limiti: 0.1x a 5x
        
        // Opzionale: Piccola compensazione per zoomare verso il cursore
        if (oldScale !== pScale) {
            updatePlayerTransform();
        }
    }, { passive: false });
    
    // Funzione interna per applicare i cambiamenti
    function updatePlayerTransform() {
        world.style.transform = `translate(${pCurrentX}px, ${pCurrentY}px) scale(${pScale})`;
    }
}

window.onPlayerViewReady = function() {
    setTimeout(() => {
        setupPlayerControls(); // Attiva panning e zoom
        syncAllContent();
    }, 150);
};

export function syncAllContent() {
    if(!state.playerWin || state.playerWin.closed) return;
    try {
        if(window.syncMap) window.syncMap();
        if(window.syncWorldView) window.syncWorldView();
        if(window.syncClockToPlayer) window.syncClockToPlayer();
        if(window.syncWeatherToPlayer) window.syncWeatherToPlayer();
        if(window.syncInitiativeToPlayer) window.syncInitiativeToPlayer();
    } catch(e) { console.error("Errore sync:", e); }
    
    Object.keys(state.tokens).forEach(id => syncTokenToPlayer(id));
    Object.keys(state.props).forEach(id => syncPropToPlayer(id));
}

export function syncTokenToPlayer(id) {
    if(!state.playerWin || state.playerWin.closed) return;
    const d = state.tokens[id];
    if (!d) return;
    const w = state.playerWin.document.getElementById('p-world-layer');
    if(!w) return;
    
    let t = state.playerWin.document.getElementById(`p-tok-${id}`);
    if(d.hidden) { if(t) t.remove(); return; }
    
    if(!t) {
        t = state.playerWin.document.createElement('div');
        t.id = `p-tok-${id}`;
        t.className = 'p-token';
        // HTML AGGIORNATO: Aggiunto p-hp-text
        t.innerHTML = `<div class="p-status-overlay"></div><div class="p-stats-row"><div class="p-stat-box p-ac"></div><div class="p-stat-box p-slot"></div></div><div class="p-name"></div><img class="p-img"><div class="p-hp-bar"><div class="p-hp-fill"></div><div class="p-hp-text"></div></div>`;
        w.appendChild(t);
    }
    
    t.style.left = d.x + 'px';
    t.style.top = d.y + 'px';
    t.style.zIndex = (d.z || 100) + 10; 
    t.style.transform = `scale(${d.scale || 1})`;
    t.querySelector('.p-img').src = d.image;
    t.querySelector('.p-name').textContent = d.name;
    
    const hf = t.querySelector('.p-hp-fill');
    const ht = t.querySelector('.p-hp-text');
    const ps = t.querySelector('.p-slot');
    const sr = t.querySelector('.p-stats-row');
    
    if(d.isEnemy ? d.statsVisible : d.showStats) {
        sr.style.display = 'flex';
        sr.querySelector('.p-ac').textContent = d.ac;
        
        // HP Testuali
        if (ht) ht.textContent = `${d.hpCurrent}/${d.hpMax}`;
        
        // Calcolo Slot Incantesimi (Logica copiata da tokens.js)
        if (ps) {
            if (!d.isEnemy && d.spellSlots && d.spellSlots.length > 0) {
                let avail = 0;
                d.spellSlots.forEach(s => { avail += (s.max - s.used); });
                ps.textContent = avail;
                ps.style.display = 'flex';
            } else {
                ps.style.display = 'none';
            }
        }
        
        const p = Math.max(0, Math.min(100, (d.hpCurrent / d.hpMax) * 100));
        hf.style.width = p + "%";
        hf.style.background = p > 50 ? "#4CAF50" : (p > 25 ? "#FFC107" : "#F44336");
    } else {
        sr.style.display = 'none';
        hf.style.width = "0%";
        if (ht) ht.textContent = "";
    }
}

export function syncPropToPlayer(id) {
    if(!state.playerWin || state.playerWin.closed) return;
    const d = state.props[id];
    if (!d) return;
    const w = state.playerWin.document.getElementById('p-world-layer');
    if(!w) return;
    let t = state.playerWin.document.getElementById(`p-prop-${id}`);
    if(!t) {
        t = state.playerWin.document.createElement('div');
        t.id = `p-prop-${id}`;
        t.style.position = "absolute";
        t.innerHTML = `<img src="${d.image}" style="display:block;">`;
        w.appendChild(t);
    }
    t.style.left = d.x + 'px';
    t.style.top = d.y + 'px';
    t.style.zIndex = d.z || 50;
    t.style.transform = `scale(${d.scale || 1})`;
}

export function removeTokenFromPlayer(id) {
    if(state.playerWin && !state.playerWin.closed) {
        const e = state.playerWin.document.getElementById(`p-tok-${id}`);
        if(e) e.remove();
    }
}

export function removePropFromPlayer(id) {
    if(state.playerWin && !state.playerWin.closed) {
        const e = state.playerWin.document.getElementById(`p-prop-${id}`);
        if(e) e.remove();
    }
}

export function syncInitiativeToPlayer() {
    if(!state.playerWin || state.playerWin.closed) return;
    const p = state.playerWin.document.getElementById('p-init-panel');
    if(!p || state.initiative.length === 0) { if(p) p.style.display = 'none'; return; }
    
    p.style.display = 'block';
    const l = state.playerWin.document.getElementById('p-init-list');
    l.innerHTML = "";
    
    state.initiative.forEach(init => {
        const d = state.tokens[init.id];
        if(!d || d.hidden) return;
        
        const row = state.playerWin.document.createElement('div');
        row.className = `p-init-row ${init.active ? 'active' : ''}`;
        
        row.innerHTML = `
            <span class="p-init-val">${init.val}</span>
            <img src="${d.image}" style="width:25px; height:25px; border-radius:50%; margin-right:8px; border:1px solid #922610;">
            <span>${d.name}</span>
        `;
        l.appendChild(row);
    });
}