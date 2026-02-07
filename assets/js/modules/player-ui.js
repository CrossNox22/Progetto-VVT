/* assets/js/modules/player-ui.js - GESTIONE INTERFACCIA UTENTE */
import { pState } from './player-state.js';
import { showRemoteResult } from './dice.js';

// --- GESTIONE MAPPA E VISTA ---
export function updateMapImage(src) {
    const img = document.getElementById('map-img');
    if(img) img.src = src;
}

export function updateViewTransform() {
    const world = document.getElementById('world-layer');
    if(world) {
        world.style.transform = `translate(${pState.panX}px, ${pState.panY}px) scale(${pState.scale})`;
    }
}

// --- GESTIONE MODALI (SCHEDA E ZAINO) ---
export function closeModals() {
    pState.currentOpenTokenId = null;
    document.getElementById('sheet-modal').style.display = 'none';
    document.getElementById('inventory-modal').style.display = 'none';
}

export function openPlayerSheet(id) {
    const idStr = String(id);
    pState.currentOpenTokenId = idStr;
    
    const d = pState.localTokens[idStr];
    const modal = document.getElementById('sheet-modal');
    if(!modal) return;
    if(!d) { console.error("Dati token non trovati:", id); return; }

    const content = document.getElementById('sheet-content');
    
    // Default stats se mancano
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
    
    // Setup bottone chiusura
    const closeBtn = modal.querySelector('.dnd-footer button') || modal.querySelector('.modal-footer button');
    if(closeBtn) closeBtn.onclick = closeModals;
}

export function openPlayerInventory(id) {
    const idStr = String(id);
    pState.currentOpenTokenId = idStr;
    
    const d = pState.localTokens[idStr];
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
    
    const closeBtn = modal.querySelector('.dnd-footer button') || modal.querySelector('.modal-footer button');
    if(closeBtn) closeBtn.onclick = closeModals;
}

// --- PANNELLI LATERALI (UI) ---
export function renderInitiative(data) {
    const p = document.getElementById('init-panel');
    if (!data || data.length === 0) { p.style.display = 'none'; return; }
    
    p.style.display = 'block';
    
    let html = `<div id="init-header"><span>Iniziativa</span></div><div id="init-list">`;
    data.forEach(row => {
        const tokenData = pState.localTokens[String(row.id)];
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

export function renderInventory(data) { 
    // Pannello laterale (Legacy/Opzionale)
    const p = document.getElementById('inventory-panel');
    const l = document.getElementById('inv-list');
    const t = document.getElementById('inv-title');
    
    if(data.open) {
        p.style.display = 'block'; 
        t.textContent = `ZAINO: ${data.title}`; 
        l.innerHTML = '';
        data.items.forEach(i => { 
            l.innerHTML += `<div class="p-inv-row"><span>${i.n||i.name}</span><span class="p-inv-qty">x${i.q||i.qty}</span></div>`; 
        });
    } else { 
        p.style.display = 'none'; 
    }
}

// --- ATTACCHI RAPIDI (Con Fix Eventi) ---
export function toggleQuickAttacks(id, tokenEl) {
    // Chiudi se già aperto
    let existing = tokenEl.querySelector('.p-quick-panel');
    if (existing) { existing.remove(); return; }
    
    // Chiudi altri pannelli aperti
    document.querySelectorAll('.p-quick-panel').forEach(p => p.remove());

    const d = pState.localTokens[String(id)];
    if (!d || !d.attacks || d.attacks.length === 0) return;

    const panel = document.createElement('div');
    panel.className = 'p-quick-panel'; 
    
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

        // Gestione Click con stopPropagation per evitare conflitti con la chiusura
        const btnHit = row.querySelector('.hit');
        btnHit.onmousedown = (e) => { 
            e.stopPropagation(); 
            e.preventDefault();  
            rollPlayerAttack('hit', atk.hit, atk.name); 
        };

        const btnDmg = row.querySelector('.dmg');
        btnDmg.onmousedown = (e) => { 
            e.stopPropagation(); 
            e.preventDefault();
            rollPlayerAttack('dmg', atk.dmg, atk.name); 
        };

        panel.appendChild(row);
    });
    
    // Ferma la propagazione se clicco sullo sfondo del pannello
    panel.onmousedown = (e) => e.stopPropagation();

    tokenEl.appendChild(panel);
}

// --- LOGICA TIRO DADI ATTACCO ---
export function rollPlayerAttack(type, formula, name) {
    let result = 0;
    
    try {
        if (type === 'hit') {
            // Tiro per Colpire (d20 + bonus)
            const bonus = parseInt(formula) || 0;
            const d20 = Math.floor(Math.random() * 20) + 1;
            result = d20 + bonus;
            
            // Mostra risultato locale
            showRemoteResult("Tu", result, `${name} (TxC)`);
            
        } else {
            // Tiro Danni (es. 1d8+3)
            const parts = formula.toLowerCase().split('+');
            const dicePart = parts[0].trim(); 
            const mod = parts[1] ? parseInt(parts[1]) : 0;
            
            if (dicePart.includes('d')) {
                const [numStr, facesStr] = dicePart.split('d');
                const num = parseInt(numStr) || 1;
                const faces = parseInt(facesStr);
                let totalDice = 0;
                for(let i=0; i<num; i++) {
                    totalDice += Math.floor(Math.random() * faces) + 1;
                }
                result = totalDice + mod;
            } else {
                result = parseInt(dicePart) + mod; 
            }
            
            // Mostra risultato locale
            showRemoteResult("Tu", result, `${name} (Danni)`);
        }

        // Invia al Master
        if(pState.conn && pState.conn.open) {
            pState.conn.send({
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