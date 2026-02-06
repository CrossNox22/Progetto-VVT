/* player-logic.js */

let peer, conn;
let scale = 1, panX = 0, panY = 0;
let dragItem = null;
let dragOffsetX, dragOffsetY;
let isPanning = false, startPanX, startPanY;

// Riferimenti DOM
const gameArea = document.getElementById('game-area');
const world = document.getElementById('world-layer');
const mapImg = document.getElementById('map-img');

/**
* Connessione al PeerJS Host (DM)
*/
function connectToGame() {
    const hostId = document.getElementById('host-id-input').value.trim();
    if (!hostId) return;
    
    document.getElementById('status-msg').textContent = "Connessione in corso...";
    
    peer = new Peer();
    
    peer.on('open', (id) => {
        conn = peer.connect(hostId);
        
        conn.on('open', () => {
            document.getElementById('login-overlay').style.display = 'none';
            console.log("Connesso con successo al DM!");
        });
        
        conn.on('data', handleData);
        
        conn.on('error', (err) => {
            alert("Errore di connessione: " + err);
            document.getElementById('status-msg').textContent = "Errore.";
        });
    });
    
    peer.on('error', (err) => {
        console.error("PeerJS Error:", err);
        alert("Errore PeerJS: " + err.type);
    });
}

/**
* Gestione dei pacchetti dati in entrata
*/
function handleData(d) {
    switch (d.type) {
        case 'SYNC_MAP':
        mapImg.src = d.payload.src;
        break;
        case 'SPAWN_TOKEN':
        spawnToken(d.payload);
        break;
        case 'REMOVE_TOKEN':
        const e = document.getElementById(d.payload.id);
        if (e) e.remove();
        break;
        case 'SPAWN_PROP':
        spawnProp(d.payload);
        break;
        case 'UPDATE_POS':
        const el = document.getElementById(d.payload.id);
        if (el) {
            el.style.left = d.payload.x + 'px';
            el.style.top = d.payload.y + 'px';
        }
        break;
        case 'SYNC_INIT':
        updateInitiative(d.payload);
        break;
        case 'SYNC_INVENTORY':
        updateInventory(d.payload);
        break;
    }
}

/**
* Creazione Token sul campo
*/
function spawnToken(d) {
    const old = document.getElementById(d.id);
    if (old) old.remove();
    if (d.hidden) return;
    
    const el = document.createElement('div');
    el.id = d.id;
    el.className = `token ${d.isEnemy ? 'enemy' : 'hero'}`;
    el.style.left = d.x + 'px';
    el.style.top = d.y + 'px';
    el.style.zIndex = d.z;
    if (d.scale) el.style.transform = `scale(${d.scale})`;
    
    let inner = `<div class="token-name">${d.name}</div>`;
    inner += `<img src="${d.image}" class="token-img">`;
    
    // Stats (CA, Spell slots)
    let statsHtml = '';
    if (!d.isEnemy || d.statsVisible) {
        statsHtml += `<div class="ac-box stat-box">${d.ac}</div>`;
        if (!d.isEnemy && d.spellSlots) {
            let avail = d.spellSlots.reduce((acc, s) => acc + (s.max - s.used), 0);
            if (avail > 0) statsHtml += `<div class="spell-box stat-box">${avail}</div>`;
        }
    }
    if (statsHtml) inner += `<div class="stats-row">${statsHtml}</div>`;
    
    // Status / Condizioni
    if (d.statuses && d.statuses.length > 0) {
        let statusHtml = d.statuses.map(s => `<div class="status-icon">${s.charAt(0)}</div>`).join('');
        inner += `<div class="status-overlay">${statusHtml}</div>`;
    }
    
    // HP Bar
    let pct = Math.max(0, Math.min(100, (d.hpCurrent / d.hpMax) * 100));
    let color = pct > 50 ? "#4CAF50" : (pct > 25 ? "#FFC107" : "#F44336");
    inner += `
        <div class="hp-bar-container">
            <div class="hp-bar-fill" style="width:${pct}%; background:${color};"></div>
            <div class="hp-text">${d.hpCurrent}/${d.hpMax}</div>
        </div>`;
    
    el.innerHTML = inner;
    world.appendChild(el);
    
    // Drag & Drop (Solo se non è un nemico, o secondo permessi DM)
    el.addEventListener('mousedown', (e) => {
        if (d.isEnemy) return;
        e.stopPropagation();
        dragItem = el;
        const rect = el.getBoundingClientRect();
        dragOffsetX = (e.clientX - rect.left) / scale;
        dragOffsetY = (e.clientY - rect.top) / scale;
    });
}

function spawnProp(d) {
    const el = document.createElement('div');
    el.id = d.id;
    el.className = 'prop';
    el.style.left = d.x + 'px';
    el.style.top = d.y + 'px';
    el.style.zIndex = d.z;
    el.innerHTML = `<img src="${d.image}" style="transform:scale(${d.scale || 1})">`;
    world.appendChild(el);
    
    el.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        dragItem = el;
        const rect = el.getBoundingClientRect();
        dragOffsetX = (e.clientX - rect.left) / scale;
        dragOffsetY = (e.clientY - rect.top) / scale;
    });
}

/**
* Pannelli UI (Iniziativa e Inventario)
*/
function updateInitiative(payload) {
    const p = document.getElementById('init-panel');
    if (payload.length > 0) {
        p.style.display = 'block';
        p.innerHTML = `<h3 style='margin:0 0 5px 0; color:#FF9800; text-align:center;'>Iniziativa</h3>` +
        payload.map(i => `<div class="init-row"><span style="color:#FF9800; font-weight:bold;">${i.val}</span> <span>${i.name}</span></div>`).join('');
    } else {
        p.style.display = 'none';
    }
}

function updateInventory(payload) {
    const p = document.getElementById('inventory-panel');
    if (payload.open) {
        p.style.display = 'block';
        document.getElementById('inv-title').textContent = "Zaino: " + payload.title;
        document.getElementById('inv-list').innerHTML = payload.items.map(i =>
            `<div style="display:flex; justify-content:space-between; border-bottom:1px solid #333; padding:5px; font-size:14px;">
                <span>${i.n || i.name}</span> <span style="color:#FF9800; font-weight:bold;">x${i.q || i.qty}</span>
            </div>`
        ).join('');
    } else {
        p.style.display = 'none';
    }
}

/**
* Loop di Input e Movimento Camera
*/
window.addEventListener('mousemove', (e) => {
    // Movimento Token
    if (dragItem) {
        const worldRect = world.getBoundingClientRect();
        const x = (e.clientX - worldRect.left) / scale - dragOffsetX;
        const y = (e.clientY - worldRect.top) / scale - dragOffsetY;
        dragItem.style.left = x + 'px';
        dragItem.style.top = y + 'px';
    }
    // Pan della Camera
    if (isPanning) {
        panX = e.clientX - startPanX;
        panY = e.clientY - startPanY;
        updateTransform();
    }
});

window.addEventListener('mouseup', () => {
    if (dragItem && conn) {
        conn.send({
            type: 'MOVE_REQUEST',
            payload: { id: dragItem.id, x: parseFloat(dragItem.style.left), y: parseFloat(dragItem.style.top) }
        });
        dragItem = null;
    }
    isPanning = false;
});

gameArea.addEventListener('mousedown', e => {
    if (e.target === gameArea || e.target === world || e.target.id === 'map-img') {
        isPanning = true;
        startPanX = e.clientX - panX;
        startPanY = e.clientY - panY;
    }
});

window.addEventListener('wheel', e => {
    e.preventDefault();
    scale += e.deltaY * -0.001;
    scale = Math.min(Math.max(0.1, scale), 5);
    updateTransform();
}, { passive: false });

function updateTransform() {
    world.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
}

// Esponi le funzioni necessarie all'HTML (onclick)
window.connectToGame = connectToGame;