/* assets/js/modules/token-core.js - GESTIONE GRAFICA TOKEN E PROP */
import { state } from './state.js';
import { syncTokenToPlayer, syncPropToPlayer, removeTokenFromPlayer, removePropFromPlayer } from './player.js';
import { addToInitiative, removeFromInitiative } from './token-init.js';
import { toggleQuickAttacks } from './token-ui.js';

// --- UTILITY ---
function mkBtn(t, c, f) {
    const b = document.createElement('div');
    b.className = `mini-btn ${c}`;
    b.textContent = t;
    b.onclick = e => { e.stopPropagation(); f(e); };
    return b;
}

// --- SPAWN TOKEN ---
export function spawnToken(d) {
    if (state.tokens[d.id]) d.id = Date.now();
    
    // Default data safety
    if (!d.inventory) d.inventory = [];
    if (!d.spellSlots) d.spellSlots = [];
    if (!d.statuses) d.statuses = [];
    if (!d.stats) d.stats = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    if (!d.attacks) d.attacks = [];

    state.tokens[d.id] = d;

    const el = document.createElement('div');
    el.className = 'token-container' + (d.hidden ? ' token-hidden' : '');
    el.id = `tok-${d.id}`;
    el.style.left = d.x + 'px'; el.style.top = d.y + 'px'; el.style.zIndex = d.z;
    if (d.scale) el.style.transform = `scale(${d.scale})`;

    // COSTRUZIONE CONTROLLI (Top Bar)
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
    let bStat = mkBtn(statIcon, d.isEnemy ? 'btn-show-stats' : 'btn-stat', (e) => {
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

    // CONTROLLI LATERALI
    const cLeft = document.createElement('div');
    cLeft.className = 'controls-left';
    cLeft.append(mkBtn('📜', 'btn-sheet', () => window.openSheet && window.openSheet(d.id)));
    cLeft.append(mkBtn('🎒', 'btn-inv', () => window.openInventory && window.openInventory(d.id)));

    const cRight = document.createElement('div');
    cRight.className = 'controls-right';
    cRight.append(mkBtn('⚔️', 'btn-quick-atk', e => toggleQuickAttacks(d.id, el)));

    // GRAFICA TOKEN
    const dr = document.createElement('div');
    dr.className = 'token-drag-area';
    dr.innerHTML = `<div class="token-name">${d.name}</div><img src="${d.image}" class="token-img">`;

    // HP BAR & STATUS
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

// --- SPAWN PROP ---
export function spawnProp(d) {
    if (state.props[d.id]) d.id = Date.now();
    state.props[d.id] = d;
    
    const el = document.createElement('div');
    el.className = 'prop-container';
    el.id = `prop-${d.id}`;
    el.style.left = d.x + 'px'; el.style.top = d.y + 'px'; el.style.zIndex = d.z;
    if (d.scale) el.style.transform = `scale(${d.scale})`;

    el.innerHTML = `
        <div class="prop-controls"><button class="mini-btn btn-del">x</button></div>
        <div class="resize-handle">↘</div>
        <img src="${d.image}" class="prop-img">
    `;

    el.querySelector('.btn-del').onclick = (e) => {
        e.stopPropagation();
        el.remove();
        delete state.props[d.id];
        removePropFromPlayer(d.id);
    };

    setupResize(el, el.querySelector('.resize-handle'), d.id, true);
    setupPropDrag(el, d.id);
    
    state.dom.worldLayer.appendChild(el);
    syncPropToPlayer(d.id);
}

// --- HELPERS GRAFICI ---
export function updateHpVisuals(el, d) {
    const f = el.querySelector('.hp-bar-fill');
    const t = el.querySelector('.hp-text');
    if(!f || !t) return;
    const p = Math.max(0, Math.min(100, (d.hpCurrent / d.hpMax) * 100));
    f.style.width = p + "%";
    f.style.background = p > 50 ? "#4CAF50" : (p > 25 ? "#FFC107" : "#F44336");
    t.textContent = `${d.hpCurrent}/${d.hpMax}`;
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

// --- LOGICA DRAG & RESIZE ---
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
            el.style.left = (il + dx) + 'px'; el.style.top = (it + dy) + 'px';
            state.tokens[id].x = il + dx; state.tokens[id].y = it + dy;
            import('./player.js').then(m => m.broadcastTokenMove(id, state.tokens[id].x, state.tokens[id].y));
        }
    });
    window.addEventListener('mouseup', () => { if(dr) { dr = false; el.style.transition = ""; import('./player.js').then(m => m.syncTokenToPlayer(id)); } });
}

function setupPropDrag(el, id) {
    let dr = false, sx, sy, il, it;
    el.addEventListener('mousedown', e => {
        if (e.button !== 0 || e.target.closest('button') || e.target.classList.contains('resize-handle')) return;
        e.stopPropagation();
        dr = true; sx = e.clientX; sy = e.clientY; il = el.offsetLeft; it = el.offsetTop;
        el.style.transition = "none";
        state.props[id].z = ++state.map.highestZ;
        el.style.zIndex = state.map.highestZ;
    });
    window.addEventListener('mousemove', e => {
        if (dr) {
            e.preventDefault();
            const dx = (e.clientX - sx) / state.map.scale;
            const dy = (e.clientY - sy) / state.map.scale;
            el.style.left = (il + dx) + 'px'; el.style.top = (it + dy) + 'px';
            state.props[id].x = il + dx; state.props[id].y = it + dy;
            syncPropToPlayer(id);
        }
    });
    window.addEventListener('mouseup', () => { if(dr) { dr = false; el.style.transition = ""; } });
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
        function stopResize() { window.removeEventListener('mousemove', doResize); window.removeEventListener('mouseup', stopResize); }
        window.addEventListener('mousemove', doResize);
        window.addEventListener('mouseup', stopResize);
    });
}