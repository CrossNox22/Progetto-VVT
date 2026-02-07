/* assets/js/modules/player-logic.js - VERSIONE CON RICEZIONE DADI */
import { rollDie, showRemoteResult } from './dice.js';

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
        localTokens[idStr] = updatedToken;
        spawnToken(updatedToken);
        
        if (currentOpenTokenId === idStr) {
            const sheetModal = document.getElementById('sheet-modal');
            const invModal = document.getElementById('inventory-modal');
            if (sheetModal && sheetModal.style.display !== 'none') openPlayerSheet(idStr);
            if (invModal && invModal.style.display !== 'none') openPlayerInventory(idStr);
        }
    }
    else if(d.type === 'REMOVE_TOKEN') { 
        const el = document.getElementById(`tok-${d.payload.id}`); 
        if(el) el.remove();
        delete localTokens[String(d.payload.id)];
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
    
    // --- NUOVO: RICEZIONE DADI DAL MASTER (O ALTRI PLAYER) ---
    else if (d.type === 'ROLL_NOTIFY') {
        showRemoteResult(d.payload.name, d.payload.roll, d.payload.die);
    }
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

// --- GENERAZIONE TOKEN (CSS CLEANUP) ---
function spawnToken(d) {
    const old = document.getElementById(`tok-${d.id}`);
    if(old) old.remove();
    if(d.hidden) return;

    const el = document.createElement('div');
    el.className = 'token-container'; 
    el.id = `tok-${d.id}`;
    el.style.left = d.x + 'px'; el.style.top = d.y + 'px'; el.style.zIndex = d.z;
    if (d.scale) el.style.transform = `scale(${d.scale})`;

    // --- CONTROLLI SINISTRA (Scheda/Zaino) ---
    if (!d.isEnemy) {
        const cLeft = document.createElement('div');
        cLeft.className = 'p-controls-left'; // Nuova classe CSS
        
        const mkBtn = (icon, title, fn) => {
            const b = document.createElement('div');
            b.className = 'p-mini-btn'; // Nuova classe CSS
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

    // --- CONTROLLI DESTRA (Spada) ---
    if (!d.isEnemy && d.attacks && d.attacks.length > 0) {
        const cRight = document.createElement('div');
        cRight.className = 'p-controls-right'; // Nuova classe CSS

        const btnAtk = document.createElement('div');
        btnAtk.className = 'p-mini-btn'; // Nuova classe CSS
        btnAtk.textContent = '⚔️';
        btnAtk.title = "Attacchi Rapidi";
        
        btnAtk.onmousedown = e => e.stopPropagation();
        btnAtk.onclick = e => { e.stopPropagation(); toggleQuickAttacks(d.id, el); };

        cRight.appendChild(btnAtk);
        el.appendChild(cRight);
    }

    // --- GRAFICA TOKEN ---
    let statsHtml = '';
    if(!d.isEnemy || d.statsVisible) {
        statsHtml += `<div class="stat-box ac-box" style="background:#2196F3; border:2px solid white; color:white;">${d.ac}</div>`;
        if(!d.isEnemy && d.spellSlots) {
            let avail = 0; d.spellSlots.forEach(s => { avail += (s.max - s.used); });
            if(avail > 0) statsHtml += `<div class="stat-box spell-box" style="background:#9C27B0; border:2px solid white; color:white;">${avail}</div>`;
        }
    }

    let statusHtml = '';
    if(d.statuses) d.statuses.forEach(s => statusHtml += `<div class="status-icon">${s}</div>`);

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

// --- LOGICA DRAG (FIX CLASSI CSS) ---
function enableDrag(el, id) {
    el.addEventListener('mousedown', (e) => {
        // Se clicco su un bottone, non trascinare (Usa la NUOVA classe .p-mini-btn)
        if(e.target.closest('.p-mini-btn') || e.target.classList.contains('p-mini-btn')) return;
        
        // --- FIX: Usa la NUOVA classe .p-quick-panel ---
        document.querySelectorAll('.p-quick-panel').forEach(p => p.remove());
        // ------------------------------------------------

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
    currentOpenTokenId = idStr;
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
    if (!data || data.length === 0) { p.style.display = 'none'; return; }
    
    p.style.display = 'block';
    
    let html = `<div id="init-header"><span>Iniziativa</span></div><div id="init-list">`;
    data.forEach(row => {
        const tokenData = localTokens[String(row.id)];
        const imgSrc = tokenData ? tokenData.image : 'assets/img/tokens/default_hero.png';
        
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

// --- GESTIONE DADI PLAYER (D4, D6... D100) ---
setTimeout(() => {
    ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'].forEach(type => {
        const btn = document.getElementById(`p-${type}`);
        if(btn) {
            btn.onclick = () => {
                const sides = parseInt(type.replace('d', ''));
                const result = rollDie(sides, "Tu");
                
                // Invia al Master
                if(conn && conn.open) {
                    conn.send({
                        type: 'ROLL_NOTIFY',
                        payload: {
                            name: "Giocatore", 
                            roll: result,
                            die: type
                        }
                    });
                }
            };
        }
    });
}, 500);

/* --- AGGIUNTA ATTACCHI RAPIDI --- */

/* --- FUNZIONE ATTACCHI RAPIDI (FIX PROPAGAZIONE) --- */
function toggleQuickAttacks(id, tokenEl) {
    // Chiudi se già aperto
    let existing = tokenEl.querySelector('.p-quick-panel');
    if (existing) { existing.remove(); return; }
    
    // Chiudi altri pannelli
    document.querySelectorAll('.p-quick-panel').forEach(p => p.remove());

    const d = localTokens[String(id)];
    if (!d || !d.attacks || d.attacks.length === 0) return;

    const panel = document.createElement('div');
    panel.className = 'p-quick-panel'; // Usa la classe corretta del CSS
    
    panel.innerHTML = `<div class="p-qa-header">Attacchi Rapidi</div>`;

    d.attacks.forEach(atk => {
        const row = document.createElement('div');
        row.className = 'p-qa-row';
        
        row.innerHTML = `
            <div class="p-qa-name">${atk.name}</div>
            <div class="p-qa-actions">
                <div class="p-qa-btn hit">TxC ${atk.hit}</div>
                <div class="p-qa-btn dmg">${atk.dmg}</div>
            </div>
        `;

        // --- FIX CRITICO QUI SOTTO ---
        // Usiamo 'onmousedown' invece di 'onclick' per battere sul tempo la chiusura globale
        // e usiamo stopPropagation() per impedire al listener globale di scattare.

        const btnHit = row.querySelector('.hit');
        btnHit.onmousedown = (e) => { 
            e.stopPropagation(); // Ferma l'evento qui! Non farlo arrivare alla finestra
            e.preventDefault();  // Evita selezioni di testo indesiderate
            rollPlayerAttack('hit', atk.hit, atk.name); 
        };

        const btnDmg = row.querySelector('.dmg');
        btnDmg.onmousedown = (e) => { 
            e.stopPropagation(); // Ferma l'evento qui!
            e.preventDefault();
            rollPlayerAttack('dmg', atk.dmg, atk.name); 
        };
        // -----------------------------

        panel.appendChild(row);
    });
    
    // Ferma la propagazione anche se clicchi sullo sfondo del pannello (per non chiuderlo se sbagli mira)
    panel.onmousedown = (e) => e.stopPropagation();

    tokenEl.appendChild(panel);
}

// Funzione che calcola il tiro e lo invia
function rollPlayerAttack(type, formula, name) {
    let result = 0;
    let details = "";
    
    try {
        if (type === 'hit') {
            // Tiro per Colpire (d20 + bonus)
            const bonus = parseInt(formula) || 0;
            const d20 = Math.floor(Math.random() * 20) + 1;
            result = d20 + bonus;
            details = `d20 (${d20}) ${bonus >= 0 ? '+' : ''}${bonus}`;
            if (d20 === 20) details += " CRIT!";
            if (d20 === 1) details += " FAIL!";
        } else {
            // Tiro Danni (es. 1d8+3)
            // Divide la stringa in dadi e bonus (es "1d8" e "3")
            const parts = formula.toLowerCase().split('+');
            const dicePart = parts[0].trim(); // "1d8"
            const mod = parts[1] ? parseInt(parts[1]) : 0; // 3
            
            if (dicePart.includes('d')) {
                const [numStr, facesStr] = dicePart.split('d');
                const num = parseInt(numStr) || 1;
                const faces = parseInt(facesStr);
                let totalDice = 0;
                let rolls = [];
                for(let i=0; i<num; i++) {
                    let r = Math.floor(Math.random() * faces) + 1;
                    totalDice += r;
                    rolls.push(r);
                }
                result = totalDice + mod;
                details = `[${rolls.join('+')}] ${mod ? '+'+mod : ''}`;
            } else {
                result = parseInt(dicePart) + mod; // Danno fisso
                details = "Danno fisso";
            }
        }

        // 1. Mostra a te stesso (usa la funzione importata da dice.js)
        // Nota: Assicurati che 'showRemoteResult' sia importato in alto
        import('./dice.js').then(m => m.showRemoteResult("Tu", result, `${name} (${type})`));

        // 2. Invia al Master
        if(conn && conn.open) {
            conn.send({
                type: 'ROLL_NOTIFY',
                payload: {
                    name: `Giocatore (${name})`,
                    roll: result,
                    die: type === 'hit' ? 'Tiro per Colpire' : 'Danni'
                }
            });
        }

    } catch(e) {
        console.error("Errore tiro:", e);
    }
}

/* --- GESTIONE CHIUSURA MENU E MODALI AL CLICK FUORI (FIX CLASSI) --- */
window.addEventListener('mousedown', (e) => {
    
    // 1. GESTIONE MENU ATTACCHI (Spada)
    // FIX: Usiamo le classi corrette (.p-quick-panel e .p-mini-btn)
    const isPanel = e.target.closest('.p-quick-panel');
    const isBtn = e.target.closest('.p-mini-btn');

    if (!isPanel && !isBtn) {
        document.querySelectorAll('.p-quick-panel').forEach(p => p.remove());
    }

    // 2. GESTIONE MODALI (Scheda/Zaino)
    // Queste usano ancora le classi standard (.dnd-modal), quindi sono OK
    const sheetModal = document.getElementById('sheet-modal');
    const invModal = document.getElementById('inventory-modal');

    // Se clicco esattamente sullo sfondo scuro (overlay), chiudo la modale
    if (sheetModal && e.target === sheetModal) {
        sheetModal.style.display = 'none';
    }
    
    if (invModal && e.target === invModal) {
        invModal.style.display = 'none';
    }
});