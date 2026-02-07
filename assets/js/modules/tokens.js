/* tokens.js - Gestione Token, Personaggi e Oggetti Scenici */
import { state } from './state.js';
import { syncTokenToPlayer, syncPropToPlayer, removeTokenFromPlayer, removePropFromPlayer, syncInitiativeToPlayer } from './player.js';
import { processTokenImport, createTokenFromForm } from './token-gen.js';

// --- UTILITY PER BOTTONI ---
function mkBtn(t, c, f) {
    const b = document.createElement('div');
    b.className = `mini-btn ${c}`;
    b.textContent = t;
    b.onclick = e => { e.stopPropagation(); f(e); };
    return b;
}

// --- GESTIONE PROP (OGGETTI SCENICI) ---
export function spawnProp(d) {
    if (state.props[d.id]) d.id = Date.now();
    state.props[d.id] = d;
    
    const el = document.createElement('div');
    el.className = 'prop-container';
    el.id = `prop-${d.id}`;
    el.style.left = d.x + 'px';
    el.style.top = d.y + 'px';
    el.style.zIndex = d.z;
    if (d.scale) el.style.transform = `scale(${d.scale})`;

    el.innerHTML = `
        <div class="prop-controls"><button class="mini-btn btn-del">x</button></div>
        <div class="resize-handle">↘</div>
        <img src="${d.image}" class="prop-img">
    `;

    const btnDel = el.querySelector('.btn-del');
    btnDel.onclick = (e) => {
        e.stopPropagation();
        el.remove();
        delete state.props[d.id];
        removePropFromPlayer(d.id);
    };

    const handle = el.querySelector('.resize-handle');
    setupResize(el, handle, d.id, true);
    setupPropDrag(el, d.id);
    
    state.dom.worldLayer.appendChild(el);
    syncPropToPlayer(d.id);
}

function setupPropDrag(el, id) {
    let dr = false, sx, sy, il, it;
    el.addEventListener('mousedown', e => {
        if (e.button !== 0 || e.target.tagName === 'BUTTON' || e.target.className.includes('resize')) return;
        e.stopPropagation();
        dr = true; sx = e.clientX; sy = e.clientY; il = el.offsetLeft; it = el.offsetTop;
        
        el.style.transition = "none";
        
        state.props[id].z = ++state.map.highestZ;
        el.style.zIndex = state.map.highestZ;
        syncPropToPlayer(id);
    });
    window.addEventListener('mousemove', e => {
        if (dr) {
            e.preventDefault();
            const dx = (e.clientX - sx) / state.map.scale;
            const dy = (e.clientY - sy) / state.map.scale;
            el.style.left = (il + dx) + 'px';
            el.style.top = (it + dy) + 'px';
            state.props[id].x = il + dx;
            state.props[id].y = it + dy;
            syncPropToPlayer(id);
        }
    });
    window.addEventListener('mouseup', () => {
        if(dr) {
            dr = false;
            el.style.transition = "";
        }
    });
}

// --- GESTIONE TOKEN (EROI E NEMICI) ---

export function openCreationModal(type) {
    state.selection.creationType = type;
    const title = document.getElementById('creation-title');
    const slotDiv = document.getElementById('slot-input-col');

    document.getElementById('creation-modal').style.display = 'block';
    
    if (type === 'hero') {
        import('./token-gen.js').then(module => {
            if (module.initClassForm) module.initClassForm();
        });
    }

    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.style.display = 'none';
    
    if (type === 'enemy') {
        title.textContent = "Nuovo Nemico";
        title.style.color = "#FF9800";
        slotDiv.style.display = "none";
    } else {
        title.textContent = "Nuovo Eroe";
        title.style.color = "white";
        slotDiv.style.display = "block";
    }
}

export function submitTokenCreation() {
    const type = state.selection.creationType || 'hero';
    const imgEl = document.getElementById('token-preview-img');
    let img = null;
    
    if (imgEl && !imgEl.src.includes('default_')) {
        img = imgEl.src;
    }

    const tokenData = createTokenFromForm(type, img);
    spawnToken(tokenData);

    if(document.getElementById('input-name')) document.getElementById('input-name').value = "";
    if(document.getElementById('input-hp')) document.getElementById('input-hp').value = "10";
    if(document.getElementById('input-ac')) document.getElementById('input-ac').value = "10";
    
    if (imgEl) {
        imgEl.src = type === 'enemy' 
            ? "assets/img/tokens/default_enemy.png" 
            : "assets/img/tokens/default_hero.png";
    }
    
    document.getElementById('creation-modal').style.display = 'none';
}

export function spawnToken(d) {
    if (state.tokens[d.id]) d.id = Date.now();

    if (!d.inventory) d.inventory = [];
    if (!d.spellSlots) d.spellSlots = [];
    if (!d.statuses) d.statuses = [];
    if (!d.stats) d.stats = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    if (!d.details) d.details = { type: "Umanoide Medio", acType: "(Armatura naturale)", senses: "Passiva 10", languages: "Comune", cr: "0", profBonus: "+2" };
    if (!d.attacks) d.attacks = [];
    if (!d.attackCount) d.attackCount = 1;

    state.tokens[d.id] = d;

    const el = document.createElement('div');
    el.className = 'token-container' + (d.hidden ? ' token-hidden' : '');
    el.id = `tok-${d.id}`;
    el.style.left = d.x + 'px';
    el.style.top = d.y + 'px';
    el.style.zIndex = d.z;
    if (d.scale) el.style.transform = `scale(${d.scale})`;

    const cTop = document.createElement('div');
    cTop.className = 'token-controls';
    
    cTop.append(mkBtn('👁️', 'btn-vis', () => {
        d.hidden = !d.hidden;
        d.hidden ? el.classList.add('token-hidden') : el.classList.remove('token-hidden');
        syncTokenToPlayer(d.id);
    }));

    cTop.append(mkBtn('⚔️', 'btn-init', () => {
        const v = prompt("Iniziativa:");
        if (v) addToInitiative(d.id, parseInt(v));
    }));

    cTop.append(mkBtn('✨', 'btn-cond', () => window.openStatusMenu && window.openStatusMenu(d.id)));

    let statIcon = d.isEnemy ? '📊' : '🛡️';
    let statClass = d.isEnemy ? 'btn-show-stats' : 'btn-stat';
    let bStat = mkBtn(statIcon, statClass, (e) => {
        if (d.isEnemy) d.statsVisible = !d.statsVisible;
        else d.showStats = !d.showStats;
        e.target.classList.toggle('active');
        syncTokenToPlayer(d.id);
    });
    if (d.statsVisible || d.showStats) bStat.classList.add('active');
    cTop.append(bStat);

    if (d.isEnemy) cTop.append(mkBtn('📝', 'btn-notes', () => window.openNotes && window.openNotes(d.id)));

    cTop.append(mkBtn('✖', 'btn-del', () => {
        if (confirm(`Eliminare ${d.name}?`)) {
            el.remove();
            delete state.tokens[d.id];
            removeFromInitiative(d.id);
            removeTokenFromPlayer(d.id);
        }
    }));

    const cLeft = document.createElement('div');
    cLeft.className = 'controls-left';
    cLeft.append(mkBtn('📜', 'btn-sheet', () => window.openSheet && window.openSheet(d.id)));
    cLeft.append(mkBtn('🎒', 'btn-inv', () => window.openInventory && window.openInventory(d.id)));

    const cRight = document.createElement('div');
    cRight.className = 'controls-right';
    cRight.append(mkBtn('⚔️', 'btn-quick-atk', e => toggleQuickAttacks(d.id, el)));

    const dr = document.createElement('div');
    dr.className = 'token-drag-area';
    dr.innerHTML = `<div class="token-name">${d.name}</div><img src="${d.image}" class="token-img">`;

    const stOvr = document.createElement('div'); stOvr.className = 'status-overlay';
    const hp = document.createElement('div');
    hp.className = 'hp-bar-container';
    hp.innerHTML = `<div class="hp-bar-fill"></div><div class="hp-text"></div>`;
    
    hp.onmousedown = e => {
        e.stopPropagation();
        const v = prompt("HP:", `${d.hpCurrent}/${d.hpMax}`);
        if (v) {
            const p = v.split('/');
            d.hpCurrent = parseInt(p[0]);
            if (p[1]) d.hpMax = parseInt(p[1]);
            updateHpVisuals(el, d);
            syncTokenToPlayer(d.id);
        }
    };

    const resizer = document.createElement('div'); resizer.className = 'resize-handle'; resizer.textContent = '↘';
    setupResize(el, resizer, d.id, false);

    const stRow = document.createElement('div');
    stRow.className = 'stats-row';
    const acBox = document.createElement('div');
    acBox.className = 'stat-box ac-box';
    acBox.textContent = d.ac;
    acBox.onmousedown = e => {
        e.stopPropagation();
        const n = prompt("Classe Armatura:", d.ac);
        if (n) { d.ac = n; acBox.textContent = n; syncTokenToPlayer(d.id); }
    };
    stRow.append(acBox);

    if (!d.isEnemy) {
        const spBox = document.createElement('div');
        spBox.className = 'stat-box spell-box';
        updateSpellBoxDisplay(spBox, d);
        spBox.onmousedown = e => { e.stopPropagation(); window.openSpellManager && window.openSpellManager(d.id); };
        stRow.append(spBox);
    }

    el.append(cTop, cLeft, cRight, stRow, dr, stOvr, hp, resizer);
    state.dom.worldLayer.appendChild(el);
    
    updateHpVisuals(el, d);
    updateStatusVisuals(el, d);
    setupTokenDrag(el, dr, d.id);
    syncTokenToPlayer(d.id);
}

// --- LOGICA DI SUPPORTO ---

function setupTokenDrag(el, handle, id) {
    let dr = false, sx, sy, il, it;
    handle.onmousedown = e => {
        if (e.button !== 0) return;
        e.stopPropagation();
        dr = true; sx = e.clientX; sy = e.clientY; il = el.offsetLeft; it = el.offsetTop;
        el.style.transition = "none";
        state.tokens[id].z = ++state.map.highestZ;
        el.style.zIndex = state.map.highestZ;
    };
    
    window.addEventListener('mousemove', e => {
        if (dr) {
            e.preventDefault();
            const dx = (e.clientX - sx) / state.map.scale;
            const dy = (e.clientY - sy) / state.map.scale;
            const newX = il + dx;
            const newY = it + dy;
            
            el.style.left = newX + 'px';
            el.style.top = newY + 'px';
            
            state.tokens[id].x = newX;
            state.tokens[id].y = newY;
            
            import('./player.js').then(m => m.broadcastTokenMove(id, newX, newY));
        }
    });
    
    window.addEventListener('mouseup', () => {
        if(dr) {
            dr = false;
            el.style.transition = ""; 
            import('./player.js').then(m => m.syncTokenToPlayer(id));
        }
    });
}

function setupResize(el, handle, id, isProp) {
    let startY, startScale;
    handle.addEventListener('mousedown', e => {
        e.stopPropagation();
        startY = e.clientY;
        startScale = (isProp ? state.props[id].scale : state.tokens[id].scale) || 1;
        
        function doResize(ev) {
            const dy = ev.clientY - startY;
            let newScale = Math.max(0.2, startScale + dy * 0.01); 
            if (isProp) { state.props[id].scale = newScale; syncPropToPlayer(id); }
            else { state.tokens[id].scale = newScale; syncTokenToPlayer(id); }
            el.style.transform = `scale(${newScale})`;
        }
        
        function stopResize() {
            window.removeEventListener('mousemove', doResize);
            window.removeEventListener('mouseup', stopResize);
        }
        
        window.addEventListener('mousemove', doResize);
        window.addEventListener('mouseup', stopResize);
    });
}

export function updateHpVisuals(el, d) {
    const f = el.querySelector('.hp-bar-fill');
    const t = el.querySelector('.hp-text');
    const p = Math.max(0, Math.min(100, (d.hpCurrent / d.hpMax) * 100));
    if (f) {
        f.style.width = p + "%";
        f.style.background = p > 50 ? "#4CAF50" : (p > 25 ? "#FFC107" : "#F44336");
    }
    if (t) t.textContent = `${d.hpCurrent}/${d.hpMax}`;
}

export function updateStatusVisuals(el, d) {
    const o = el.querySelector('.status-overlay');
    if (o) {
        o.innerHTML = "";
        d.statuses.forEach(s => { o.innerHTML += `<div class="status-icon">${s}</div>`; });
    }
}

export function updateSpellBoxDisplay(b, d) {
    if (!d.spellSlots || d.spellSlots.length === 0) { b.textContent = "0"; return; }
    let avail = 0, total = 0;
    d.spellSlots.forEach(s => { avail += (s.max - s.used); total += s.max; });
    b.textContent = `${avail}`;
    b.title = `Slot: ${avail}/${total}`;
}

export function handleTokenUpload(file) {
    if(!file) return;
    const inputEl = document.getElementById('upload-token');
    if (inputEl) inputEl.value = ''; 

    const r = new FileReader();
    r.onload = v => {
        try {
            const data = JSON.parse(v.target.result);
            const tokenData = processTokenImport(data); 
            if (tokenData) {
                spawnToken(tokenData); 
            }
        } catch(e) {
            console.error(e);
            alert("Errore nel caricamento del file JSON.");
        }
    };
    r.readAsText(file);
}

export function handlePropUpload(file) {
    if(!file) return;
    const r = new FileReader();
    r.onload = v => {
        spawnProp({ 
            id: Date.now(), 
            image: v.target.result, 
            x: (-state.map.x + state.dom.gameArea.clientWidth/2)/state.map.scale, 
            y: (-state.map.y + state.dom.gameArea.clientHeight/2)/state.map.scale, 
            z: 50, 
            scale: 1 
        });
    };
    r.readAsDataURL(file);
}

/* --- GESTIONE INIZIATIVA (FIX CANCELLAZIONE) --- */

export function addToInitiative(id, val) {
    const existing = state.initiative.find(i => i.id === id);
    const token = state.tokens[id];
    const name = token ? token.name : "Sconosciuto";

    if (existing) {
        existing.val = val;
        existing.name = name;
    } else {
        state.initiative.push({ id: id, val: val, name: name, active: false });
    }
    
    state.initiative.sort((a, b) => b.val - a.val);
    renderInitiative();
}

export function removeFromInitiative(id) {
    // FIX 1: Convertiamo in stringa per evitare errori di tipo (Numero vs Stringa)
    state.initiative = state.initiative.filter(i => String(i.id) !== String(id));
    renderInitiative();
}

export function renderInitiative() {
    const panel = document.getElementById('init-panel');
    const list = document.getElementById('init-list');
    if(!list || !panel) return;

    if (state.initiative.length === 0) {
        panel.style.display = 'none';
        // Invia sync vuoto al player
        if (typeof syncInitiativeToPlayer === 'function') {
            syncInitiativeToPlayer();
        }
        return;
    }

    panel.style.display = 'block';
    list.innerHTML = "";

    state.initiative.forEach(init => {
        const d = state.tokens[init.id];
        if(!d) return;

        const row = document.createElement('div');
        row.className = `init-row ${init.active ? 'active' : ''}`;
        
        // FIX 2: Creazione DOM per evitare problemi di scope con onclick=""
        // Parte HTML statica
        row.innerHTML = `
            <span class="init-val">${init.val}</span>
            <img src="${d.image}" class="init-img">
            <span style="flex-grow:1">${d.name}</span>
        `;
        
        // Creazione bottone X via Javascript
        const btnDel = document.createElement('button');
        btnDel.className = 'mini-btn btn-del';
        btnDel.textContent = 'x';
        btnDel.onclick = () => removeFromInitiative(init.id); // Qui passiamo la variabile diretta!
        
        row.appendChild(btnDel);
        list.appendChild(row);
    });

    if (typeof syncInitiativeToPlayer === 'function') {
        syncInitiativeToPlayer();
    }
}

export function nextTurn() {
    if(state.initiative.length === 0) return;
    let idx = state.initiative.findIndex(i => i.active);
    if(idx > -1) state.initiative[idx].active = false;
    const nextIdx = (idx + 1) % state.initiative.length;
    state.initiative[nextIdx].active = true;
    renderInitiative();
}

export function clearInitiative() {
    state.initiative = [];
    renderInitiative();
}

export function toggleQuickAttacks(id, tokenEl) {
    let panel = tokenEl.querySelector('.quick-attack-panel');
    if (panel) { panel.remove(); return; }
    document.querySelectorAll('.quick-attack-panel').forEach(p => p.remove());

    const d = state.tokens[id];
    if (!d.attacks || d.attacks.length === 0) { alert("Nessun attacco configurato."); return; }

    panel = document.createElement('div');
    panel.className = 'quick-attack-panel';
    panel.style.cssText = "position:absolute; left:110%; top:0; background:#f4e4bc; border:2px solid #922610; padding:5px; width:180px; z-index:100; border-radius:5px; box-shadow: 2px 2px 5px rgba(0,0,0,0.5);";
    panel.innerHTML = `<div style="font-weight:bold; color:#922610; border-bottom:1px solid #922610; margin-bottom:5px; font-variant:small-caps;">Attacchi Rapidi</div>`;
    
    d.attacks.forEach(atk => {
        const row = document.createElement('div');
        row.className = 'qa-row';
        row.style.cssText = "margin-bottom: 5px; border-bottom: 1px dotted #bdaea5; padding-bottom: 5px;";
        row.innerHTML = `
            <div style="font-weight:bold; font-size:13px; margin-bottom: 3px; color:#000;">${atk.name}</div>
            <div style="display:flex; gap:5px;">
                <button class="qa-btn hit" style="flex:1; background:#4CAF50; color:white; border:none; border-radius:3px; cursor:pointer; padding: 4px; font-weight:bold;" onclick="window.rollAttackAction('hit', '${atk.hit}', '${atk.name}')">TxC ${atk.hit}</button>
                <button class="qa-btn dmg" style="flex:1; background:#C62828; color:white; border:none; border-radius:3px; cursor:pointer; padding: 4px; font-weight:bold;" onclick="window.rollAttackAction('dmg', '${atk.dmg}', '${atk.name}')">${atk.dmg}</button>
            </div>`;
        panel.appendChild(row);
    });
    tokenEl.appendChild(panel);
}

export function toggleTokenMenu() {
    const menu = document.getElementById('token-submenu');
    if (menu) {
        menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
    }
}

export function previewTokenImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('token-preview-img').src = e.target.result;
        }
        reader.readAsDataURL(input.files[0]);
    }
}

// Esposizione Globale
window.removeFromInitiative = removeFromInitiative;
window.addToInitiative = addToInitiative;
window.toggleQuickAttacks = toggleQuickAttacks;
window.submitTokenCreation = submitTokenCreation;
window.openCreationModal = openCreationModal
window.toggleTokenMenu = toggleTokenMenu;

window.switchCreationType = function(type) {
    state.selection.creationType = type;
    const heroFields = document.getElementById('hero-extra-fields');
    const title = document.getElementById('creation-title');
    const tabs = document.querySelectorAll('.tab-btn');

    tabs.forEach(t => t.classList.remove('active'));
    
    if (type === 'hero') {
        heroFields.style.display = 'block';
        title.textContent = "Nuovo Eroe";
        tabs[0].classList.add('active');
    } else {
        heroFields.style.display = 'none';
        title.textContent = "Nuovo Mostro";
        tabs[1].classList.add('active');
    }
};

window.previewTokenImage = previewTokenImage;