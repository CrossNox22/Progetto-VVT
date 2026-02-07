/* assets/js/modules/player-logic.js */

let peer, conn;
// Variabili unificate per la vista
let scale = 1, panX = 0, panY = 0;
let dragItem = null, dragOffsetX = 0, dragOffsetY = 0;

// --- CONNESSIONE ---
window.connectToGame = function() {
    const hostId = document.getElementById('host-id-input').value.trim();
    if(!hostId) return;
    
    document.getElementById('status-msg').textContent = "Connessione in corso...";
    
    peer = new Peer();
    
    peer.on('open', (id) => {
        conn = peer.connect(hostId);
        conn.on('open', () => {
            document.getElementById('login-overlay').style.display = 'none';
            console.log("Connesso al Master!");
        });
        conn.on('data', handleData);
        conn.on('error', (err) => alert("Errore PeerJS: " + err));
    });
};

// --- GESTIONE DATI ---
function handleData(d) {
    if(d.type === 'SYNC_MAP') {
        const img = document.getElementById('map-img');
        if(img) img.src = d.payload.src;
    }
    // Questo sync avviene SOLO al caricamento della mappa o se il Master forza un reset
    else if(d.type === 'SYNC_VIEW') {
        panX = d.payload.x;
        panY = d.payload.y;
        scale = d.payload.scale;
        updateTransform();
    }
    else if(d.type === 'SPAWN_TOKEN') spawnToken(d.payload);
    else if(d.type === 'REMOVE_TOKEN') { const el = document.getElementById(`tok-${d.payload.id}`); if(el) el.remove(); }
    else if(d.type === 'SPAWN_PROP') spawnProp(d.payload);
    else if(d.type === 'REMOVE_PROP') { const el = document.getElementById(`prop-${d.payload.id}`); if(el) el.remove(); }
    
    else if(d.type === 'UPDATE_POS') {
        const id = d.payload.id;
        const el = document.getElementById(`tok-${id}`) || document.getElementById(`prop-${id}`) || document.getElementById(id);
        if(el) {
            el.style.left = d.payload.x + 'px';
            el.style.top = d.payload.y + 'px';
        }
    }
    
    else if(d.type === 'SYNC_INIT') renderInitiative(d.payload);
    else if(d.type === 'SYNC_INVENTORY') renderInventory(d.payload);
}

// --- FUNZIONE CENTRALE AGGIORNAMENTO VISTA ---
function updateTransform() {
    const world = document.getElementById('world-layer');
    if(world) {
        world.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    }
}

// --- LOGICA PAN & ZOOM (LATO GIOCATORE) ---
const gameArea = document.getElementById('game-area');
let isPanning = false, startPanX, startPanY;

gameArea.addEventListener('mousedown', e => {
    // Attiva il pan solo se clicchi sullo sfondo o sulla mappa (non sui token)
    if(e.target.id === 'game-area' || e.target.id === 'map-img' || e.target.id === 'world-layer') {
        isPanning = true;
        startPanX = e.clientX - panX;
        startPanY = e.clientY - panY;
    }
});

window.addEventListener('mousemove', e => {
    if(isPanning) {
        e.preventDefault();
        panX = e.clientX - startPanX;
        panY = e.clientY - startPanY;
        updateTransform();
    }
});

window.addEventListener('mouseup', () => isPanning = false);

window.addEventListener('wheel', e => {
    e.preventDefault();
    // Zoom fluido verso il cursore o centrale (qui semplice)
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    scale = Math.min(Math.max(0.1, scale + delta), 5);
    updateTransform();
}, {passive: false});


// --- GENERAZIONE TOKEN ---
function spawnToken(d) {
    const old = document.getElementById(`tok-${d.id}`);
    if(old) old.remove();
    if(d.hidden) return;

    const el = document.createElement('div');
    el.className = 'token-container'; 
    el.id = `tok-${d.id}`;
    
    el.style.left = d.x + 'px';
    el.style.top = d.y + 'px';
    el.style.zIndex = d.z;
    if (d.scale) el.style.transform = `scale(${d.scale})`;

    let statsHtml = '';
    const showStats = (!d.isEnemy || d.statsVisible);
    
    if(showStats) {
        statsHtml += `<div class="stat-box ac-box">${d.ac}</div>`;
        if(!d.isEnemy && d.spellSlots) {
            let avail = 0;
            d.spellSlots.forEach(s => { avail += (s.max - s.used); });
            if(avail > 0) statsHtml += `<div class="stat-box spell-box">${avail}</div>`;
        }
    }

    let statusHtml = '';
    if(d.statuses && d.statuses.length > 0) {
        d.statuses.forEach(s => statusHtml += `<div class="status-icon">${s}</div>`);
    }

    const pct = Math.max(0, Math.min(100, (d.hpCurrent / d.hpMax) * 100));
    const hpColor = pct > 50 ? "#4CAF50" : (pct > 25 ? "#FFC107" : "#F44336");

    el.innerHTML = `
        <div class="stats-row">${statsHtml}</div>
        <div class="token-drag-area">
            <div class="token-name">${d.name}</div>
            <img src="${d.image}" class="token-img">
        </div>
        <div class="status-overlay">${statusHtml}</div>
        <div class="hp-bar-container">
            <div class="hp-bar-fill" style="width:${pct}%; background-color:${hpColor};"></div>
            <div class="hp-text">${d.hpCurrent}/${d.hpMax}</div>
        </div>
    `;

    document.getElementById('world-layer').appendChild(el);
    if(!d.isEnemy) enableDrag(el, d.id);
}

function spawnProp(d) {
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
    enableDrag(el, d.id);
}

// --- DRAG DEI TOKEN ---
function enableDrag(el, id) {
    el.addEventListener('mousedown', (e) => {
        if(e.target.tagName === 'BUTTON') return;
        e.stopPropagation();
        dragItem = el;
        
        // DISATTIVA TRANSIZIONI
        el.style.transition = "none";
        
        const rect = el.getBoundingClientRect();
        dragOffsetX = (e.clientX - rect.left) / scale;
        dragOffsetY = (e.clientY - rect.top) / scale;
    });
}

// Nota: Aggiungiamo il ripristino nel listener mouseup globale che c'è già
window.addEventListener('mouseup', () => {
    if(dragItem) {
        // RIATTIVA TRANSIZIONI
        dragItem.style.transition = "";
        
        if(conn) {
            const rawId = dragItem.id.replace('tok-', '').replace('prop-', '');
            conn.send({
                type: 'MOVE_REQUEST',
                payload: { id: rawId, x: parseFloat(dragItem.style.left), y: parseFloat(dragItem.style.top) }
            });
        }
        dragItem = null;
    }
});

// Variabile per limitare l'invio dati (Throttling leggero)
let lastMoveSend = 0;

window.addEventListener('mousemove', (e) => {
    if(dragItem) {
        // 1. Calcolo Posizione Locale (Visuale Immediata)
        const worldRect = document.getElementById('world-layer').getBoundingClientRect();
        const x = (e.clientX - worldRect.left) / scale - dragOffsetX;
        const y = (e.clientY - worldRect.top) / scale - dragOffsetY;
        
        dragItem.style.left = x + 'px';
        dragItem.style.top = y + 'px';
        
        // 2. INVIO DATI AL MASTER (In Tempo Reale)
        // Usiamo un piccolo timer (30ms) per non intasare la rete se il mouse è troppo veloce
        const now = Date.now();
        if (conn && (now - lastMoveSend > 30)) {
            const rawId = dragItem.id.replace('tok-', '').replace('prop-', '');
            
            conn.send({
                type: 'MOVE_REQUEST',
                payload: { 
                    id: rawId, 
                    x: x, 
                    y: y 
                }
            });
            lastMoveSend = now;
        }
    }
});

window.addEventListener('mouseup', () => {
    if(dragItem && conn) {
        const rawId = dragItem.id.replace('tok-', '').replace('prop-', '');
        conn.send({
            type: 'MOVE_REQUEST',
            payload: { id: rawId, x: parseFloat(dragItem.style.left), y: parseFloat(dragItem.style.top) }
        });
        dragItem = null;
    }
});

// --- UI ---
function renderInitiative(data) {
    const p = document.getElementById('init-panel');
    if(!data || data.length === 0) { p.style.display = 'none'; return; }
    p.style.display = 'block';
    let html = `<h3 style="color:#FF9800; border-bottom:1px solid #FF9800; text-align:center; margin:0 0 5px 0;">Iniziativa</h3>`;
    data.forEach(row => {
        html += `<div class="p-init-row ${row.active?'active-turn':''}" style="${row.active?'background:rgba(146,38,16,0.3);':''}">
            <span class="p-init-val">${row.val}</span><span style="color:#eee;">${row.name}</span></div>`;
    });
    p.innerHTML = html;
}

function renderInventory(data) {
    const p = document.getElementById('inventory-panel');
    const l = document.getElementById('inv-list');
    const t = document.getElementById('inv-title');
    if(data.open) {
        p.style.display = 'block'; t.textContent = `ZAINO: ${data.title}`; l.innerHTML = '';
        data.items.forEach(i => { l.innerHTML += `<div class="p-inv-row"><span>${i.n||i.name}</span><span class="p-inv-qty">x${i.q||i.qty}</span></div>`; });
    } else { p.style.display = 'none'; }
}