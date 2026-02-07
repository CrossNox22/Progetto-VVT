/* assets/js/modules/player-logic.js - DEBUG VERSION */

let peer, conn;
let scale = 1, panX = 0, panY = 0;
let dragItem = null, dragOffsetX = 0, dragOffsetY = 0;
let lastMoveSend = 0;

// Variabile per tracciare quale scheda è aperta
let currentOpenTokenId = null;

// DATABASE LOCALE TOKEN (Qui salviamo i dati ricevuti dal Master)
let localTokens = {};

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
    else if(d.type === 'SYNC_VIEW') {
        panX = d.payload.x; panY = d.payload.y; scale = d.payload.scale;
        updateTransform();
    }
    else if(d.type === 'SPAWN_TOKEN') {
        const updatedToken = d.payload;
        const idStr = String(updatedToken.id);
        
        console.log(`PLAYER: Ricevuto update per ${updatedToken.name} (ID: ${idStr})`);
        
        // 1. Aggiorna DB Locale
        localTokens[idStr] = updatedToken;
        
        // 2. Aggiorna Grafica Mappa
        spawnToken(updatedToken);
        
        // 3. --- LIVE REFRESH ---
        // Se stiamo guardando la scheda di QUESTO token, forziamo l'aggiornamento
        if (currentOpenTokenId === idStr) {
            console.log("PLAYER: Aggiornamento scheda aperta...");
            const sheetModal = document.getElementById('sheet-modal');
            const invModal = document.getElementById('inventory-modal');
            
            // Verifica se è visibile (controllo stile inline o computed)
            const isSheetVisible = sheetModal && (sheetModal.style.display === 'flex' || sheetModal.style.display === 'block');
            const isInvVisible = invModal && (invModal.style.display === 'flex' || invModal.style.display === 'block');
            
            if (isSheetVisible) {
                openPlayerSheet(idStr);
            }
            if (isInvVisible) {
                openPlayerInventory(idStr);
            }
        }
    }
    else if(d.type === 'REMOVE_TOKEN') { 
        const el = document.getElementById(`tok-${d.payload.id}`); 
        if(el) el.remove();
        delete localTokens[String(d.payload.id)];
        
        // Chiudi se stavamo guardando questo
        if(currentOpenTokenId === String(d.payload.id)) closeModals();
    }
    else if(d.type === 'SPAWN_PROP') spawnProp(d.payload);
    else if(d.type === 'REMOVE_PROP') { const el = document.getElementById(`prop-${d.payload.id}`); if(el) el.remove(); }
    else if(d.type === 'UPDATE_POS') {
        const id = d.payload.id;
        const el = document.getElementById(`tok-${id}`) || document.getElementById(`prop-${id}`) || document.getElementById(id);
        if(el) { el.style.left = d.payload.x + 'px'; el.style.top = d.payload.y + 'px'; }
    }
    else if(d.type === 'SYNC_INIT') renderInitiative(d.payload);
    else if(d.type === 'SYNC_INVENTORY') renderInventory(d.payload);
}

function updateTransform() {
    const world = document.getElementById('world-layer');
    if(world) world.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
}

// --- LOGICA PAN & ZOOM ---
const gameArea = document.getElementById('game-area');
let isPanning = false, startPanX, startPanY;

gameArea.addEventListener('mousedown', e => {
    if(e.target.id === 'game-area' || e.target.id === 'map-img' || e.target.id === 'world-layer') {
        isPanning = true; startPanX = e.clientX - panX; startPanY = e.clientY - panY;
    }
});
window.addEventListener('mousemove', e => {
    if(isPanning) { e.preventDefault(); panX = e.clientX - startPanX; panY = e.clientY - startPanY; updateTransform(); }
});
window.addEventListener('mouseup', () => isPanning = false);
window.addEventListener('wheel', e => {
    e.preventDefault(); const delta = e.deltaY > 0 ? -0.1 : 0.1;
    scale = Math.min(Math.max(0.1, scale + delta), 5); updateTransform();
}, {passive: false});

// --- GENERAZIONE TOKEN ---
function spawnToken(d) {
    const old = document.getElementById(`tok-${d.id}`);
    if(old) old.remove();
    if(d.hidden) return;

    const el = document.createElement('div');
    el.className = 'token-container'; 
    el.id = `tok-${d.id}`;
    el.style.left = d.x + 'px'; el.style.top = d.y + 'px'; el.style.zIndex = d.z;
    if (d.scale) el.style.transform = `scale(${d.scale})`;

    const controlsDiv = document.createElement('div');
    if (!d.isEnemy) {
        controlsDiv.className = 'controls-left';
        controlsDiv.style.cssText = "opacity:0; transition:opacity 0.2s; pointer-events: auto; display:flex; flex-direction:column-reverse; gap:4px; z-index: 9999;";
        
        const btnSheet = document.createElement('div');
        btnSheet.className = 'mini-btn';
        btnSheet.textContent = '📜';
        btnSheet.title = "Apri Scheda";
        btnSheet.style.cursor = "pointer";
        btnSheet.onmousedown = (e) => e.stopPropagation(); 
        btnSheet.onclick = (e) => { e.stopPropagation(); e.preventDefault(); openPlayerSheet(d.id); };

        const btnInv = document.createElement('div');
        btnInv.className = 'mini-btn';
        btnInv.textContent = '🎒';
        btnInv.title = "Apri Zaino";
        btnInv.style.cursor = "pointer";
        btnInv.onmousedown = (e) => e.stopPropagation(); 
        btnInv.onclick = (e) => { e.stopPropagation(); e.preventDefault(); openPlayerInventory(d.id); };

        controlsDiv.appendChild(btnSheet);
        controlsDiv.appendChild(btnInv);
        
        el.onmouseenter = () => { controlsDiv.style.opacity = 1; };
        el.onmouseleave = () => { controlsDiv.style.opacity = 0; };
    }

    let statsHtml = '';
    const showStats = (!d.isEnemy || d.statsVisible);
    if(showStats) {
        statsHtml += `<div class="stat-box ac-box">${d.ac}</div>`;
        if(!d.isEnemy && d.spellSlots) {
            let avail = 0; d.spellSlots.forEach(s => { avail += (s.max - s.used); });
            if(avail > 0) statsHtml += `<div class="stat-box spell-box">${avail}</div>`;
        }
    }

    let statusHtml = '';
    if(d.statuses) d.statuses.forEach(s => statusHtml += `<div class="status-icon">${s}</div>`);

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

    if (!d.isEnemy) el.appendChild(controlsDiv);
    document.getElementById('world-layer').appendChild(el);
    if(!d.isEnemy) enableDrag(el, d.id);
}

function spawnProp(d) {
    const old = document.getElementById(`prop-${d.id}`);
    if(old) old.remove();
    const el = document.createElement('div');
    el.className = 'prop-container'; el.id = `prop-${d.id}`;
    el.style.left = d.x + 'px'; el.style.top = d.y + 'px'; el.style.zIndex = d.z;
    if (d.scale) el.style.transform = `scale(${d.scale})`;
    el.innerHTML = `<img src="${d.image}" class="prop-img" style="display:block; pointer-events:none;">`;
    document.getElementById('world-layer').appendChild(el);
    enableDrag(el, d.id);
}

// --- LOGICA DRAG ---
function enableDrag(el, id) {
    el.addEventListener('mousedown', (e) => {
        if(e.target.closest('.mini-btn') || e.target.classList.contains('mini-btn')) return;
        e.stopPropagation();
        dragItem = el;
        el.style.transition = "none";
        const rect = el.getBoundingClientRect();
        dragOffsetX = (e.clientX - rect.left) / scale;
        dragOffsetY = (e.clientY - rect.top) / scale;
    });
}

window.addEventListener('mousemove', (e) => {
    if(dragItem) {
        const worldRect = document.getElementById('world-layer').getBoundingClientRect();
        const x = (e.clientX - worldRect.left) / scale - dragOffsetX;
        const y = (e.clientY - worldRect.top) / scale - dragOffsetY;
        dragItem.style.left = x + 'px'; dragItem.style.top = y + 'px';
        const now = Date.now();
        if (conn && (now - lastMoveSend > 30)) {
            const rawId = dragItem.id.replace('tok-', '').replace('prop-', '');
            conn.send({ type: 'MOVE_REQUEST', payload: { id: rawId, x: x, y: y } });
            lastMoveSend = now;
        }
    }
});

window.addEventListener('mouseup', () => {
    if(dragItem) {
        dragItem.style.transition = "";
        if(conn) {
            const rawId = dragItem.id.replace('tok-', '').replace('prop-', '');
            conn.send({ type: 'MOVE_REQUEST', payload: { id: rawId, x: parseFloat(dragItem.style.left), y: parseFloat(dragItem.style.top) } });
        }
        dragItem = null;
    }
});

// --- HELPER CHIUSURA ---
function closeModals() {
    currentOpenTokenId = null;
    document.getElementById('sheet-modal').style.display = 'none';
    document.getElementById('inventory-modal').style.display = 'none';
}

// --- FUNZIONI APERTURA SCHEDE (LOCALI) ---

function openPlayerSheet(id) {
    const idStr = String(id);
    currentOpenTokenId = idStr; // Segna come aperto per il refresh automatico
    
    const d = localTokens[idStr];
    const modal = document.getElementById('sheet-modal');
    if(!modal) return;
    if(!d) { console.error("Dati token non trovati:", id); return; }

    const content = document.getElementById('sheet-content');
    const stats = d.stats || {str:10, dex:10, con:10, int:10, wis:10, cha:10};
    const mod = (val) => Math.floor((val - 10) / 2);
    const fmtMod = (val) => (val >= 0 ? `+${val}` : val);

    let html = `
        <div class="sb-header">
            <div class="sb-title">${d.name}</div>
            <div class="sb-subtitle">${d.details.type || "Eroe"}</div>
        </div>
        <div class="tapered-rule"></div>
        <div style="display:flex; justify-content:space-between; color:#922610;">
            <div><strong>CA</strong> <span class="sb-val">${d.ac}</span></div>
            <div><strong>HP</strong> <span class="sb-val">${d.hpCurrent}/${d.hpMax}</span></div>
            <div><strong>Vel</strong> <span class="sb-val">${d.speed}</span></div>
        </div>
        <div class="tapered-rule"></div>
        <div class="ability-grid">
            ${Object.keys(stats).map(k => `
                <div>
                    <span class="ability-score">${stats[k]}</span>
                    <span style="font-size:10px; font-weight:bold;">${k.toUpperCase()}</span>
                    <span class="ability-mod">${fmtMod(mod(stats[k]))}</span>
                </div>
            `).join('')}
        </div>
        <div class="tapered-rule"></div>
    `;

    if(d.attacks && d.attacks.length > 0) {
        html += `<div class="action-header">Azioni</div>`;
        d.attacks.forEach(a => {
            html += `
            <div style="display:flex; justify-content:space-between; border-bottom:1px dotted #ccc; padding:4px 0;">
                <span style="font-weight:bold;">${a.name}</span>
                <span>
                    <span style="color:#2E7D32; font-weight:bold;">${a.hit}</span> | 
                    <span style="color:#C62828; font-weight:bold;">${a.dmg}</span>
                </span>
            </div>`;
        });
    }

    if(d.notes) {
        html += `<div class="action-header">Tratti & Note</div><div style="white-space: pre-wrap; font-size:13px; color:#333;">${d.notes}</div>`;
    }

    content.innerHTML = html;
    modal.style.display = 'flex';
    
    // Aggiorna anche il bottone chiudi per resettare l'ID
    const closeBtn = modal.querySelector('.modal-footer button');
    if(closeBtn) closeBtn.onclick = closeModals;
}

function openPlayerInventory(id) {
    const idStr = String(id);
    currentOpenTokenId = idStr;
    
    const d = localTokens[idStr];
    const modal = document.getElementById('inventory-modal');
    if(!modal) return;
    if(!d) return;
    
    const container = document.getElementById('inv-list-container');
    container.innerHTML = "";
    if(!d.inventory || d.inventory.length === 0) {
        container.innerHTML = "<em>Zaino vuoto.</em>";
    } else {
        d.inventory.forEach(item => {
            container.innerHTML += `
                <div class="inv-row" style="display:flex; justify-content:space-between; padding:5px; border-bottom:1px solid #ddd;">
                    <span style="font-weight:bold;">${item.n}</span>
                    <span style="color:#922610;">x${item.q}</span>
                </div>`;
        });
    }
    modal.style.display = 'flex';
    const closeBtn = modal.querySelector('.modal-footer button');
    if(closeBtn) closeBtn.onclick = closeModals;
}

// --- UI INIZIATIVA ---
function renderInitiative(data) {
    const p = document.getElementById('init-panel');
    if (!data || data.length === 0) { 
        p.style.display = 'none'; 
        return; 
    }
    
    p.style.display = 'block';
    
    // Header stile Master
    let html = `<div id="init-header"><span>Iniziativa</span></div><div id="init-list">`;
    
    data.forEach(row => {
        // Recupera l'immagine dal database locale usando l'ID
        // Se il token non c'è (es. è nascosto o non caricato), usa un'immagine di default
        const tokenData = localTokens[String(row.id)];
        const imgSrc = tokenData ? tokenData.image : 'assets/img/tokens/default_hero.png'; // Fallback sicuro
        
        html += `
            <div class="init-row ${row.active ? 'active-turn' : ''}">
                <span class="init-val">${row.val}</span>
                <img src="${imgSrc}" class="init-img">
                <span class="init-name">${row.name}</span>
            </div>`;
    });
    
    html += `</div>`;
    p.innerHTML = html;
}
function renderInventory(data) { /* Legacy */
    const p = document.getElementById('inventory-panel');
    const l = document.getElementById('inv-list');
    const t = document.getElementById('inv-title');
    if(data.open) {
        p.style.display = 'block'; t.textContent = `ZAINO: ${data.title}`; l.innerHTML = '';
        data.items.forEach(i => { l.innerHTML += `<div class="p-inv-row"><span>${i.n||i.name}</span><span class="p-inv-qty">x${i.q||i.qty}</span></div>`; });
    } else { p.style.display = 'none'; }
}