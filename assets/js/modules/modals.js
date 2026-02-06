/* assets/js/modules/modals.js - VERSIONE PULITA (Senza stili inline) */
import { state } from './state.js';
import { syncTokenToPlayer } from './player.js';
import { updateHpVisuals, updateStatusVisuals, updateSpellBoxDisplay } from './tokens.js';
import { renderSheetHTML } from './character-sheet.js';

// --- 1. SCHEDA PERSONAGGIO ---
export function openSheet(id) {
    state.selection.currentSheetId = id; 
    const d = state.tokens[id];
    
    // Inizializzazioni
    if(!d.details) d.details = { type: "Umanoide", acType: "" };
    if(!d.traits) d.traits = [];
    if(!d.stats) d.stats = { str:10, dex:10, con:10, int:10, wis:10, cha:10 };
    if(!d.skills) d.skills = {};
    if(!d.save_bonuses) d.save_bonuses = {};

    if ((!d.attacks || d.attacks.length === 0) && d.actions) {
        d.attacks = []; 
    }

    const html = renderSheetHTML(d);
    document.getElementById('sheet-content').innerHTML = html;
    
    renderAttacks();
    renderTraits(); 
    document.getElementById('sheet-modal').style.display = 'flex';
}

export function updateTokenData(key, val) { if(state.selection.currentSheetId) { state.tokens[state.selection.currentSheetId][key] = val; syncTokenToPlayer(state.selection.currentSheetId); } }
export function updateDetail(key, val) { if(state.selection.currentSheetId) state.tokens[state.selection.currentSheetId].details[key] = val; }

// --- TRATTI ---
export function addTraitRow() { state.tokens[state.selection.currentSheetId].traits.push({name:"", desc:""}); renderTraits(); }
export function updateTrait(ix, key, val) { state.tokens[state.selection.currentSheetId].traits[ix][key] = val; }
export function removeTrait(ix) { if(confirm("Rimuovere?")){ state.tokens[state.selection.currentSheetId].traits.splice(ix, 1); renderTraits(); } }

export function renderTraits() {
    const c = document.getElementById('traits-list'); if(!c) return;
    c.innerHTML = "";
    state.tokens[state.selection.currentSheetId].traits.forEach((t, ix) => {
        // Rimossi stili inline pesanti, usa classi CSS se possibile
        c.innerHTML += `
            <div class="trait-block" style="margin-bottom:10px;">
                <div style="display:flex;justify-content:space-between; margin-bottom:2px;">
                    <input class="sb-input trait-name" value="${t.name}" placeholder="Nome Tratto" onchange="window.updateTrait(${ix},'name',this.value)" style="width:85%; font-weight:bold; color:#922610;">
                    <button class="mini-btn btn-del" onclick="window.removeTrait(${ix})">x</button>
                </div>
                <textarea class="sb-input" style="width:100%;height:50px;resize:vertical; font-size:13px;" onchange="window.updateTrait(${ix},'desc',this.value)">${t.desc}</textarea>
            </div>`;
    });
}

// --- ATTACCHI ---
export function addAttackRow() { state.tokens[state.selection.currentSheetId].attacks.push({name:"", hit:"+0", dmg:"1d4"}); renderAttacks(); }
export function removeAttackRow(ix) { if(confirm("Eliminare?")){ state.tokens[state.selection.currentSheetId].attacks.splice(ix, 1); renderAttacks(); } }
export function updateAttack(ix, k, v) { state.tokens[state.selection.currentSheetId].attacks[ix][k] = v; }
export function updateAttackCount(v) { state.tokens[state.selection.currentSheetId].attackCount = parseInt(v)||1; }

export function renderAttacks() {
    const c = document.getElementById('sheet-attacks-list'); 
    if(!c) return;
    c.innerHTML = "";
    const d = state.tokens[state.selection.currentSheetId];
    if(!d.attacks) d.attacks = [];
    
    d.attacks.forEach((a, ix) => {
        const row = document.createElement('div');
        row.className = 'sheet-attack-row';
        row.innerHTML = `
            <input class="atk-name-input" value="${a.name}" placeholder="NOME ATTACCO" onchange="window.updateAttack(${ix},'name',this.value)">
            <div class="atk-group">
                <input class="atk-val-input hit" value="${a.hit}" placeholder="+0" onchange="window.updateAttack(${ix},'hit',this.value)">
                <button class="dnd-icon-btn hit-btn" onclick="window.rollAttackAction('hit','${a.hit}','${a.name}')">🎲</button>
            </div>
            <div class="atk-group">
                <input class="atk-val-input dmg" value="${a.dmg}" placeholder="1d6" onchange="window.updateAttack(${ix},'dmg',this.value)">
                <button class="dnd-icon-btn dmg-btn" onclick="window.rollAttackAction('dmg','${a.dmg}','${a.name}')">💥</button>
            </div>
            <button class="dnd-icon-btn del-btn" onclick="window.removeAttackRow(${ix})">✖</button>
        `;
        c.appendChild(row);
    });
}

export function rollAttackAction(type, formula, name) { alert(`TIRO DADO: ${name} (${type}) -> ${formula}`); }

// --- INVENTARIO ---
export function openInventory(id) {
    state.selection.currentInvId = id; 
    const d = state.tokens[id];
    const modal = document.getElementById('inventory-modal');
    if(!modal) return;

    modal.querySelector('.modal-content').innerHTML = `
        <div class="statblock-card">
            <div class="sb-header"><span class="sb-title">Zaino</span><span class="sb-subtitle" style="font-weight:bold; margin-left:10px;">${d.name}</span></div>
            <div id="inv-list-container" class="inv-list-container" style="min-height:100px; max-height:300px; overflow-y:auto; margin-top:10px;"></div>
            <button class="mini-btn" style="width:100%; margin-top:10px;" onclick="window.addInvRow()">+ Aggiungi Oggetto</button>
            <div class="modal-footer">
                <button class="primary" onclick="window.closeInventory()">Chiudi</button>
            </div>
        </div>
    `;
    renderInventory();
    modal.style.display = 'flex';
}
export function closeInventory() { document.getElementById('inventory-modal').style.display = 'none'; }

export function renderInventory() {
    const d = state.tokens[state.selection.currentInvId];
    const c = document.getElementById('inv-list-container');
    if(!c) return;
    c.innerHTML = "";
    if(!d.inventory) d.inventory = [];
    
    d.inventory.forEach((item, ix) => {
        const row = document.createElement('div'); 
        row.className = 'inv-row'; // USA SOLO LA CLASSE CSS
        // RIMOSSO style.cssText che forzava i bordi
        
        row.innerHTML = `
            <input class="inv-name" value="${item.n}" onchange="window.updateInv(${ix},'n',this.value)" placeholder="Nome Oggetto" style="flex: 1; background: transparent; border: none; color: #000; font-weight: bold; margin-right: 10px;">
            <div style="display: flex; align-items: center; gap: 5px;">
                <input type="number" class="inv-qty" value="${item.q}" onchange="window.updateInv(${ix},'q',this.value)" style="width: 50px; text-align: center; border: none; background: transparent; color: #922610; font-weight: bold;">
                <button class="mini-btn btn-del" onclick="window.removeInvRow(${ix})" style="background: #922610; color: white; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">x</button>
            </div>
        `;
        c.appendChild(row);
    });
}
export function addInvRow(){ state.tokens[state.selection.currentInvId].inventory.push({n:"", q:1}); renderInventory(); }
export function updateInv(ix, k, v){ state.tokens[state.selection.currentInvId].inventory[ix][k] = v; }
export function removeInvRow(ix){ if(confirm("Eliminare?")){ state.tokens[state.selection.currentInvId].inventory.splice(ix,1); renderInventory(); } }

// --- GRIMORIO ---
export function openSpellManager(id) {
    state.selection.currentSpellId = id;
    const d = state.tokens[id];
    const modal = document.getElementById('spell-modal');
    if(!modal) return;

    modal.querySelector('.modal-content').innerHTML = `
        <div class="statblock-card">
            <div class="sb-header"><span class="sb-title">Grimorio</span><span class="sb-subtitle" style="font-weight:bold; margin-left:10px;">${d.name}</span></div>
            <div id="spell-list-container" class="inv-list-container" style="min-height:100px; max-height:400px; overflow-y:auto;"></div>
            <button class="mini-btn" style="width:100%; margin-top:10px;" onclick="window.addSpellLevelRow()">+ Aggiungi Livello</button>
            <div class="modal-footer">
                <button class="primary" onclick="window.closeSpellManager()">Chiudi</button>
            </div>
        </div>
    `;
    renderSpellSlots();
    modal.style.display = 'flex';
}
export function closeSpellManager() { document.getElementById('spell-modal').style.display = 'none'; }

export function renderSpellSlots() {
    const d = state.tokens[state.selection.currentSpellId];
    const c = document.getElementById('spell-list-container');
    if(!c) return;
    c.innerHTML = "";
    if(!d.spellSlots) d.spellSlots = [];

    d.spellSlots.forEach((s, ix) => {
        let slotsHtml = `<div class="spell-slots-area" style="display:flex; flex-direction:row; flex-wrap:wrap; gap:5px; margin-left: 10px;">`;
        for(let i=0; i<s.max; i++) {
            slotsHtml += `<div class="spell-circle ${i < s.used ? 'used' : ''}" style="cursor:pointer; width:14px; height:14px; border:1px solid #922610; border-radius:50%; background:${i < s.used ? '#922610' : 'transparent'};" onclick="window.togSpell(${ix},${i})"></div>`;
        }
        slotsHtml += `</div>`;

        const row = document.createElement('div');
        row.className = 'spell-row'; // USA SOLO LA CLASSE CSS
        // RIMOSSO style.cssText che forzava i bordi

        row.innerHTML = `
            <input class="spell-name" value="${s.name}" onchange="window.renSpell(${ix},this.value)" style="background: transparent; border: none; border-bottom: 1px solid #bdaea5; color: #000; font-weight: bold; width: 80px;">
            <div style="flex:1; display:flex; align-items:center;">${slotsHtml}</div>
            <div style="display:flex; gap:3px;">
                <button class="mini-btn" onclick="window.chMaxS(${ix},-1)" style="width:24px;">-</button>
                <button class="mini-btn" onclick="window.chMaxS(${ix},1)" style="width:24px;">+</button>
                <button class="mini-btn btn-del" onclick="window.removeSpellLevel(${ix})" style="background: #922610; color: white; width: 24px;">x</button>
            </div>
        `;
        c.appendChild(row);
    });
}
export function addSpellLevelRow(){const d=state.tokens[state.selection.currentSpellId];const n=d.spellSlots.length+1;d.spellSlots.push({level:n,name:`Liv. ${n}`,max:2,used:0});renderSpellSlots(); refreshTokenDisplay(state.selection.currentSpellId);}
export function removeSpellLevel(ix){if(confirm("Eliminare?")){state.tokens[state.selection.currentSpellId].spellSlots.splice(ix,1);renderSpellSlots(); refreshTokenDisplay(state.selection.currentSpellId);}}
export function togSpell(ix,i){const s=state.tokens[state.selection.currentSpellId].spellSlots[ix];s.used=(i<s.used?i:i+1);renderSpellSlots(); refreshTokenDisplay(state.selection.currentSpellId);}
export function chMaxS(ix,d){const s=state.tokens[state.selection.currentSpellId].spellSlots[ix];s.max=Math.max(0,s.max+d);renderSpellSlots(); refreshTokenDisplay(state.selection.currentSpellId);}
export function renSpell(ix,v){state.tokens[state.selection.currentSpellId].spellSlots[ix].name=v;}

function refreshTokenDisplay(id){ const t = document.getElementById(`tok-${id}`); if(t){ const b = t.querySelector('.spell-box'); if(b) updateSpellBoxDisplay(b, state.tokens[id]); } }

// --- CONDIZIONI E SKILLS ---
export function openStatusMenu(id) {
    state.selection.currentStatusId = id;
    const modal = document.getElementById('status-modal');
    if(!modal) return;
    
    modal.querySelector('.modal-content').innerHTML = `
        <div class="statblock-card" style="width: 320px; max-width: 95vw;">
            <div class="sb-header"><span class="sb-title">Condizioni</span></div>
            <div id="status-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; justify-items: center; margin-top:15px;"></div>
            <div class="modal-footer"><button class="primary" onclick="document.getElementById('status-modal').style.display='none'">Chiudi</button></div>
        </div>`;
    
    const g = document.getElementById('status-grid');
    const cur = state.tokens[id].statuses || [];
    
    Object.keys(state.constants.statusIcons).forEach(ic => {
        const isActive = cur.includes(ic);
        const d = document.createElement('div');
        d.className = 'status-opt';
        // Stile inline minimo per il layout griglia, i colori sono gestiti dalla logica toggle
        d.style.cssText = `cursor: pointer; width: 80px; height: 80px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 8px; transition: all 0.2s; background-color: ${isActive ? 'rgba(146, 38, 16, 0.1)' : 'transparent'}; border: ${isActive ? '2px solid #922610' : '1px solid #bdaea5'}; opacity: ${isActive ? '1' : '0.7'};`;
        
        const textStyle = isActive ? 'color: #922610; font-weight: bold;' : 'color: #333; font-weight: normal;';
        d.innerHTML = `<div style="font-size: 32px; margin-bottom: 4px; line-height: 1;">${ic}</div><div style="font-size: 11px; ${textStyle}">${state.constants.statusIcons[ic]}</div>`;
        d.onclick = () => window.toggleStatus(id, ic, d);
        g.appendChild(d);
    });
    modal.style.display = 'flex';
}

export function toggleStatus(id, ic, el) {
    const d = state.tokens[id];
    const idx = d.statuses.indexOf(ic);
    const txt = el.querySelector('div:last-child');
    if(idx > -1) {
        d.statuses.splice(idx, 1);
        el.style.backgroundColor="transparent"; el.style.border="1px solid #bdaea5"; el.style.opacity="0.7"; txt.style.color="#333"; txt.style.fontWeight="normal";
    } else {
        d.statuses.push(ic);
        el.style.backgroundColor="rgba(146, 38, 16, 0.1)"; el.style.border="2px solid #922610"; el.style.opacity="1"; txt.style.color="#922610"; txt.style.fontWeight="bold";
    }
    const tokenEl = document.getElementById(`tok-${id}`);
    updateStatusVisuals(tokenEl, d);
    syncTokenToPlayer(id);
}

export function updateSkillVal(key, val) { if(state.selection.currentSheetId) state.tokens[state.selection.currentSheetId].skills[key] = val; }
export function toggleSkillProf(key) {
    const id = state.selection.currentSheetId;
    if(!id) return;
    const d = state.tokens[id];
    d.skills[key + "-check"] = !d.skills[key + "-check"];
    d.skills[key] = ""; 
    openSheet(id);
}

window.openSheet = openSheet;
window.updateTokenData = updateTokenData;
window.updateDetail = updateDetail;
window.addTraitRow = addTraitRow;
window.updateTrait = updateTrait;
window.removeTrait = removeTrait;
window.addAttackRow = addAttackRow;
window.removeAttackRow = removeAttackRow;
window.updateAttack = updateAttack;
window.updateAttackCount = updateAttackCount;
window.rollAttackAction = rollAttackAction;
window.openInventory = openInventory;
window.closeInventory = closeInventory;
window.addInvRow = addInvRow;
window.updateInv = updateInv;
window.removeInvRow = removeInvRow;
window.openSpellManager = openSpellManager;
window.closeSpellManager = closeSpellManager;
window.addSpellLevelRow = addSpellLevelRow;
window.removeSpellLevel = removeSpellLevel;
window.togSpell = togSpell;
window.chMaxS = chMaxS;
window.renSpell = renSpell;
window.openStatusMenu = openStatusMenu;
window.toggleStatus = toggleStatus;
window.updateSkillVal = updateSkillVal;
window.toggleSkillProf = toggleSkillProf;