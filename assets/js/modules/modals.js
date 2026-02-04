/* assets/js/modules/modals.js - VERSIONE COMPLETA E CORRETTA */
import { state } from './state.js';
import { syncTokenToPlayer } from './player.js';
import { updateHpVisuals, updateStatusVisuals, updateSpellBoxDisplay } from './tokens.js';

// --- 1. SCHEDA PERSONAGGIO ---
export function openSheet(id) {
    state.selection.currentSheetId = id; 
    const d = state.tokens[id];
    
    if(!d.details) d.details = { type: "Umanoide Medio", senses: "-", languages: "-", cr: "0", profBonus: "+2" };
    if(!d.traits) d.traits = [];

    const getMod = (val) => { const m = Math.floor((val - 10) / 2); return m >= 0 ? "+"+m : m; };
    
    const html = `
        <div class="statblock-card">
            <div class="sb-header">
                <input class="sb-title sb-input" value="${d.name}" onchange="window.updateTokenData('name', this.value)" style="font-size:24px; color:#922610; font-weight:bold;">
                <input class="sb-subtitle sb-input" value="${d.details.type}" onchange="window.updateDetail('type', this.value)" placeholder="Taglia, Tipo, Allineamento">
            </div>
            <div class="tapered-rule"></div>
            <div class="sb-row">Classe Armatura <span class="sb-val">${d.ac}</span> <input class="sb-input" style="width:100px" value="${d.details.acType||''}" placeholder="(Tipo)" onchange="window.updateDetail('acType', this.value)"></div>
            <div class="sb-row">Punti Ferita <span class="sb-val">${d.hpCurrent}/${d.hpMax}</span></div>
            <div class="sb-row">Velocità <input class="sb-input" style="width:100px" value="${d.speed||'9m'}" onchange="window.updateTokenData('speed', this.value)"></div>
            <div class="tapered-rule"></div>
            <div class="ability-grid">
                <div><div>STR</div><span class="ability-score">${d.stats.str}</span><span class="ability-mod">(${getMod(d.stats.str)})</span></div>
                <div><div>DEX</div><span class="ability-score">${d.stats.dex}</span><span class="ability-mod">(${getMod(d.stats.dex)})</span></div>
                <div><div>CON</div><span class="ability-score">${d.stats.con}</span><span class="ability-mod">(${getMod(d.stats.con)})</span></div>
                <div><div>INT</div><span class="ability-score">${d.stats.int}</span><span class="ability-mod">(${getMod(d.stats.int)})</span></div>
                <div><div>WIS</div><span class="ability-score">${d.stats.wis}</span><span class="ability-mod">(${getMod(d.stats.wis)})</span></div>
                <div><div>CHA</div><span class="ability-score">${d.stats.cha}</span><span class="ability-mod">(${getMod(d.stats.cha)})</span></div>
            </div>
            <div class="tapered-rule"></div>
            <div id="traits-list"></div>
            <button class="mini-btn" style="width:100%; margin-bottom:10px;" onclick="window.addTraitRow()">+ Aggiungi Tratto</button>
            
            <div class="action-header" style="display: flex; align-items: center; justify-content: space-between;">
                <span>Azioni / Attacchi</span>
                
                <div style="font-size:12px; display:flex; align-items:center; gap:5px; color:#333; font-weight:normal;">
                    <span style="font-weight: normal; font-family: inherit;">Numero di attacchi:</span> 
                    
                    <input type="number" value="${d.attackCount||1}" 
                           style="width:40px; text-align:center; background: transparent; border: none; color: #000; font-weight: bold;" 
                           onchange="window.updateAttackCount(this.value)">
                </div>
            </div>
            <div id="sheet-attacks-list"></div>
            <button class="mini-btn" style="width:100%; margin-top:5px;" onclick="window.addAttackRow()">+ Aggiungi Attacco</button>
            
            ${!d.isEnemy ? `<div class="action-header">Incantesimi</div><button class="mini-btn" onclick="window.openSpellManager(${d.id})" style="width:100%">Apri Grimorio</button>` : ''}
            <div class="action-header">Note Master</div>
            <div class="sheet-text">${d.notes || "-"}</div>
        </div>
    `;
    document.getElementById('sheet-content').innerHTML = html;
    renderAttacks();
    renderTraits();
    document.getElementById('sheet-modal').style.display = 'flex';
}

// Funzioni Update Scheda
export function updateTokenData(key, val) { if(state.selection.currentSheetId) { state.tokens[state.selection.currentSheetId][key] = val; syncTokenToPlayer(state.selection.currentSheetId); } }
export function updateDetail(key, val) { if(state.selection.currentSheetId) state.tokens[state.selection.currentSheetId].details[key] = val; }

// Traits
export function addTraitRow() { state.tokens[state.selection.currentSheetId].traits.push({name:"", desc:""}); renderTraits(); }
export function updateTrait(ix, key, val) { state.tokens[state.selection.currentSheetId].traits[ix][key] = val; }
export function removeTrait(ix) { if(confirm("Rimuovere?")){ state.tokens[state.selection.currentSheetId].traits.splice(ix, 1); renderTraits(); } }
export function renderTraits() {
    const c = document.getElementById('traits-list'); if(!c) return;
    c.innerHTML = "";
    state.tokens[state.selection.currentSheetId].traits.forEach((t, ix) => {
        c.innerHTML += `<div class="trait-block"><div style="display:flex;justify-content:space-between;"><input class="sb-input trait-name" value="${t.name}" placeholder="Nome" onchange="window.updateTrait(${ix},'name',this.value)" style="width:80%"><button class="mini-btn btn-del" onclick="window.removeTrait(${ix})">x</button></div><textarea class="sb-input" style="width:100%;height:40px;resize:vertical" onchange="window.updateTrait(${ix},'desc',this.value)">${t.desc}</textarea></div>`;
    });
}

// Attacks
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
        
        // Flexbox gestisce l'allineamento verticale (align-items: center)
        row.style.cssText = "display: flex; align-items: center; margin-bottom: 5px; border-bottom: 1px solid #bdaea5; padding-bottom: 4px; gap: 5px;";
        
        row.innerHTML = `
            <input value="${a.name}" placeholder="Nome (es. Spada)" 
                   style="flex: 1; background: transparent; border: none; color: #000; font-weight: normal; font-family: inherit;" 
                   onchange="window.updateAttack(${ix},'name',this.value)">
            
            <input value="${a.hit}" placeholder="+Hit" 
                   style="width: 35px; text-align: center; background: transparent; border: none; border-bottom: 1px solid #2E7D32; color: #2E7D32; font-weight: normal;" 
                   onchange="window.updateAttack(${ix},'hit',this.value)">
            
            <button class="mini-btn" style="background: #4CAF50; color: white; width: 24px; height: 24px; padding: 0; display: flex; align-items: center; justify-content: center;" 
                    title="Tira per Colpire" onclick="window.rollAttackAction('hit','${a.hit}','${a.name}')">🎲</button>
            
            <input value="${a.dmg}" placeholder="Danni" 
                   style="width: 60px; text-align: right; background: transparent; border: none; border-bottom: 1px solid #C62828; color: #C62828; font-weight: normal;" 
                   onchange="window.updateAttack(${ix},'dmg',this.value)">
            
            <button class="mini-btn" style="background: #E91E63; color: white; width: 24px; height: 24px; padding: 0; display: flex; align-items: center; justify-content: center;" 
                    title="Tira Danni" onclick="window.rollAttackAction('dmg','${a.dmg}','${a.name}')">💥</button>
            
            <button class="mini-btn btn-del" onclick="window.removeAttackRow(${ix})" 
                    style="background: #922610; color: white; width: 20px; height: 20px; padding: 0; margin-left: 5px; display: flex; align-items: center; justify-content: center;">x</button>
        `;
        c.appendChild(row);
    });
}

// Dadi Semplificati (Placeholder)
export function rollAttackAction(type, formula, name) {
    // In futuro qui metteremo la logica dei dadi 3D o log
    alert(`TIRO DADO: ${name} (${type}) -> ${formula}`);
}


// --- 2. INVENTARIO (ZAINO) ---
export function openInventory(id) {
    state.selection.currentInvId = id; 
    const d = state.tokens[id];
    
    // Assicuriamoci che l'HTML esista
    const modal = document.getElementById('inventory-modal');
    if(!modal) { alert("ERRORE: Manca <div id='inventory-modal'> in index.html!"); return; }

    const content = modal.querySelector('.modal-content');
    content.innerHTML = `
        <div class="statblock-card">
            <div class="sb-header"><span class="sb-title">Zaino</span><span class="sb-subtitle" style="font-weight:bold">${d.name}</span></div>
            <div id="inv-list-container" class="inv-list-container" style="min-height:100px; max-height:300px; overflow-y:auto;"></div>
            <button class="mini-btn" style="width:100%; margin-top:10px;" onclick="window.addInvRow()">+ Aggiungi Oggetto</button>
            <div class="modal-footer">
                <button class="primary" style="background-color:#922610!important;color:white!important" onclick="window.closeInventory()">Chiudi</button>
            </div>
        </div>
    `;
    renderInventory();
    modal.style.display = 'flex';
}


export function renderInventory() {
    const d = state.tokens[state.selection.currentInvId];
    const c = document.getElementById('inv-list-container');
    if(!c) return;
    c.innerHTML = "";
    if(!d.inventory) d.inventory = [];
    
    d.inventory.forEach((item, ix) => {
        const row = document.createElement('div'); 
        row.className = 'inv-row';
        
        // MODIFICA 1: Cambio da 'dotted' a 'solid' per una linea continua
        // Ho usato un colore leggermente più chiaro (#bdaea5) per non appesantire, 
        // ma se la vuoi rosso scuro usa pure #922610
        row.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #bdaea5;";
        
        row.innerHTML = `
            <input class="inv-name" value="${item.n}" onchange="window.updateInv(${ix},'n',this.value)" 
                   placeholder="Nome Oggetto" 
                   style="flex: 1; background: transparent; border: none; color: #000; font-weight: bold; margin-right: 10px;">
            
            <div style="display: flex; align-items: center; gap: 5px;">
                <input type="number" class="inv-qty" value="${item.q}" onchange="window.updateInv(${ix},'q',this.value)" 
                       style="width: 50px; text-align: center; border: none; background: transparent; color: #922610; font-weight: bold;" title="Quantità">
                
                <button class="mini-btn btn-del" onclick="window.removeInvRow(${ix})" 
                        style="background: #922610; color: white; border: none; border-radius: 3px; cursor: pointer; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
                    x
                </button>
            </div>
        `;
        c.appendChild(row);
    });
}
export function addInvRow(){ state.tokens[state.selection.currentInvId].inventory.push({n:"", q:1}); renderInventory(); }
export function updateInv(ix, k, v){ state.tokens[state.selection.currentInvId].inventory[ix][k] = v; }
export function removeInvRow(ix){ if(confirm("Eliminare?")){ state.tokens[state.selection.currentInvId].inventory.splice(ix,1); renderInventory(); } }


// --- 3. GRIMORIO (INCANTESIMI) ---
export function openSpellManager(id) {
    state.selection.currentSpellId = id;
    const d = state.tokens[id];
    
    const modal = document.getElementById('spell-modal');
    if(!modal) { alert("ERRORE: Manca <div id='spell-modal'> in index.html!"); return; }

    const content = modal.querySelector('.modal-content');
    content.innerHTML = `
        <div class="statblock-card">
            <div class="sb-header"><span class="sb-title">Grimorio</span><span class="sb-subtitle" style="font-weight:bold">${d.name}</span></div>
            <div id="spell-list-container" class="inv-list-container" style="min-height:100px; max-height:400px; overflow-y:auto;"></div>
            <button class="mini-btn" style="width:100%; margin-top:10px;" onclick="window.addSpellLevelRow()">+ Aggiungi Livello</button>
            <div class="modal-footer">
                <button class="primary" style="background-color:#922610!important;color:white!important" onclick="window.closeSpellManager()">Chiudi</button>
            </div>
        </div>
    `;
    renderSpellSlots();
    modal.style.display = 'flex';
}

export function renderSpellSlots() {
    const d = state.tokens[state.selection.currentSpellId];
    const c = document.getElementById('spell-list-container');
    if(!c) return;
    c.innerHTML = "";
    if(!d.spellSlots) d.spellSlots = [];

    d.spellSlots.forEach((s, ix) => {
        // --- COSTRUZIONE DEI PALLINI (SLOTS) ---
        // display: flex e flex-direction: row assicurano che siano orizzontali
        let slotsHtml = `<div class="spell-slots-area" style="display:flex; flex-direction:row; flex-wrap:wrap; gap:5px; margin-left: 10px;">`;
        for(let i=0; i<s.max; i++) {
            // Aggiungiamo cursore pointer per far capire che sono cliccabili
            slotsHtml += `<div class="spell-circle ${i < s.used ? 'used' : ''}" 
                               style="cursor:pointer; width:14px; height:14px; border:1px solid #922610; border-radius:50%; background:${i < s.used ? '#922610' : 'transparent'};" 
                               onclick="window.togSpell(${ix},${i})"></div>`;
        }
        slotsHtml += `</div>`;

        // --- COSTRUZIONE DELLA RIGA ---
        const row = document.createElement('div');
        row.className = 'spell-row';
        // Layout della riga: Nome a sinistra, Pallini in mezzo, Bottoni a destra
        row.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #bdaea5;";

        row.innerHTML = `
            <input class="spell-name" value="${s.name}" onchange="window.renSpell(${ix},this.value)"
                   style="background: transparent; border: none; border-bottom: 1px solid #bdaea5; color: #000; font-weight: bold; width: 80px; font-family: inherit;">

            <div style="flex:1; display:flex; align-items:center;">
                ${slotsHtml}
            </div>

            <div class="spell-controls-area" style="display:flex; gap:3px;">
                <button class="mini-btn" onclick="window.chMaxS(${ix},-1)" style="width:24px; height:24px;">-</button>
                <button class="mini-btn" onclick="window.chMaxS(${ix},1)" style="width:24px; height:24px;">+</button>
                <button class="mini-btn btn-del" onclick="window.removeSpellLevel(${ix})" 
                        style="background: #922610; color: white; border: none; width: 24px; height: 24px;">x</button>
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

function refreshTokenDisplay(id){
    const t = document.getElementById(`tok-${id}`);
    if(t){
        const b = t.querySelector('.spell-box');
        if(b) updateSpellBoxDisplay(b, state.tokens[id]);
    }
}


// --- 4. STATUS / CONDIZIONI ---
export function openStatusMenu(id) {
    state.selection.currentStatusId = id;
    
    const modal = document.getElementById('status-modal');
    if(!modal) return;

    const content = modal.querySelector('.modal-content');
    
    // Contenitore principale (Pergamena)
    content.innerHTML = `
        <div class="statblock-card" style="width: 320px; max-width: 95vw;">
            <div class="sb-header" style="border-bottom: 2px solid #922610; margin-bottom: 15px; padding-bottom: 5px;">
                <span class="sb-title" style="color: #922610; font-size: 22px;">Condizioni</span>
            </div>
            
            <div id="status-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; justify-items: center;">
                </div>

            <div class="modal-footer" style="margin-top: 20px; text-align: center;">
                <button class="primary" style="background-color: #922610; color: white; border: none; padding: 8px 20px; font-weight: bold; cursor: pointer; border-radius: 4px;" 
                        onclick="document.getElementById('status-modal').style.display='none'">Chiudi</button>
            </div>
        </div>
    `;

    // Generazione Icone
    const g = document.getElementById('status-grid');
    const currentStatuses = state.tokens[id].statuses || [];
    
    Object.keys(state.constants.statusIcons).forEach(ic => {
        const isActive = currentStatuses.includes(ic);
        
        const d = document.createElement('div');
        d.className = 'status-opt';
        
        // STILE MINIMAL + QUADRATO
        // width: 80px assicura che siano bei quadrati visibili
        d.style.cssText = `
            cursor: pointer; 
            width: 80px; 
            height: 80px; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            border-radius: 8px; 
            transition: all 0.2s;
            background-color: ${isActive ? 'rgba(146, 38, 16, 0.1)' : 'transparent'};
            border: ${isActive ? '2px solid #922610' : '1px solid #bdaea5'};
            opacity: ${isActive ? '1' : '0.7'};
        `;

        const textStyle = isActive ? 'color: #922610; font-weight: bold;' : 'color: #333; font-weight: normal;';
        
        d.innerHTML = `
            <div style="font-size: 32px; margin-bottom: 4px; line-height: 1;">${ic}</div>
            <div style="font-size: 11px; ${textStyle}">${state.constants.statusIcons[ic]}</div>
        `;
        
        d.onclick = () => window.toggleStatus(id, ic, d);
        g.appendChild(d);
    });
    
    modal.style.display = 'flex';
}

// Assicuriamoci che anche toggleStatus gestisca l'aggiornamento visivo immediato
export function toggleStatus(id, ic, el) {
    const d = state.tokens[id];
    const idx = d.statuses.indexOf(ic);
    const textDiv = el.querySelector('div:last-child'); // Il div del testo

    if(idx > -1) {
        // RIMUOVI
        d.statuses.splice(idx, 1);
        // Torna allo stile "spento"
        el.style.backgroundColor = "transparent";
        el.style.border = "1px solid #bdaea5";
        el.style.opacity = "0.7";
        textDiv.style.color = "#333";
        textDiv.style.fontWeight = "normal";
    } else {
        // AGGIUNGI
        d.statuses.push(ic);
        // Applica stile "attivo" (Rosso/Beige)
        el.style.backgroundColor = "rgba(146, 38, 16, 0.1)"; // Rosso molto tenue
        el.style.border = "2px solid #922610";
        el.style.opacity = "1";
        textDiv.style.color = "#922610";
        textDiv.style.fontWeight = "bold";
    }
    
    // Aggiorna l'aspetto del token sulla mappa e sincronizza
    const tokenEl = document.getElementById(`tok-${id}`);
    updateStatusVisuals(tokenEl, d);
    syncTokenToPlayer(id);
}