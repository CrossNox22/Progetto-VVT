/* assets/js/modules/character-sheet.js - CALCOLO AUTOMATICO SKILL */

// Mappa Dati Abilità: Nome Italiano + Statistica di Riferimento
const SKILL_DATA = {
    "acrobatics": { label: "Acrobazia", stat: "dex" },
    "animal-handling": { label: "Addestrare Animali", stat: "wis" },
    "arcana": { label: "Arcano", stat: "int" },
    "athletics": { label: "Atletica", stat: "str" },
    "deception": { label: "Inganno", stat: "cha" },
    "history": { label: "Storia", stat: "int" },
    "insight": { label: "Intuizione", stat: "wis" },
    "intimidation": { label: "Intimidire", stat: "cha" },
    "investigation": { label: "Indagare", stat: "int" },
    "medicine": { label: "Medicina", stat: "wis" },
    "nature": { label: "Natura", stat: "int" },
    "perception": { label: "Percezione", stat: "wis" },
    "performance": { label: "Intrattenere", stat: "cha" },
    "persuasion": { label: "Persuasione", stat: "cha" },
    "religion": { label: "Religione", stat: "int" },
    "sleight-of-hand": { label: "Rapidità di Mano", stat: "dex" },
    "stealth": { label: "Furtività", stat: "dex" },
    "survival": { label: "Sopravvivenza", stat: "wis" }
};

export function renderSheetHTML(d) {
    // Funzione helper per calcolare il modificatore (es. 16 -> +3)
    const getMod = (val) => { const m = Math.floor((val - 10) / 2); return m; };
    const fmtMod = (val) => { const m = getMod(val); return m >= 0 ? "+"+m : m; };
    
    // Recupera il Bonus di Competenza (Proficiency) pulendo la stringa (es. "+2" -> 2)
    let profBonus = 2; // Default
    if (d.details && d.details.profBonus) {
        profBonus = parseInt(d.details.profBonus.replace('+','')) || 2;
    }
    
    // Oggetto con i modificatori attuali (es. {str: 0, dex: 1...})
    const mods = {
        str: getMod(d.stats.str),
        dex: getMod(d.stats.dex),
        con: getMod(d.stats.con),
        int: getMod(d.stats.int),
        wis: getMod(d.stats.wis),
        cha: getMod(d.stats.cha)
    };
    
    // --- GENERAZIONE LISTA ABILITÀ ---
    let skillsHtml = "";
    if (d.skills) {
        skillsHtml = `<div class="skills-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: x 20px; font-size: 13px; margin-top:10px; padding-top:10px; border-top:1px solid #d4c4a9;">`;
        
        Object.keys(SKILL_DATA).forEach(key => {
            const info = SKILL_DATA[key]; // {label: "Atletica", stat: "str"}
            
            // 1. Controlla Competenza (True/False)
            const rawCheck = d.skills[key + "-check"];
            const isProf = (rawCheck === true || rawCheck === "true");
            
            // 2. Calcola Valore Teorico (Mod Statistica + Competenza se attivo)
            let calculatedVal = mods[info.stat] + (isProf ? profBonus : 0);
            
            // 3. Recupera Valore dal JSON (se esiste ed è diverso da stringa vuota)
            // Se nel JSON c'è scritto un valore manuale, usa quello. Altrimenti usa il calcolato.
            let displayVal = d.skills[key];
            if (displayVal === undefined || displayVal === "" || displayVal === null) {
                displayVal = calculatedVal;
            }
            
            // Formattazione estetica (+ davanti ai positivi)
            const valStr = (parseInt(displayVal) >= 0 && String(displayVal).indexOf('+') === -1 && String(displayVal) !== "0") ? "+" + displayVal : displayVal;
            
            skillsHtml += `
                <div class="skill-row" style="display:flex; align-items:center; justify-content:space-between; padding:2px 0;">
                    <div style="display:flex; align-items:center;">
                        <div onclick="window.toggleSkillProf('${key}')" 
                             style="cursor:pointer; width:10px; height:10px; border-radius:50%; background:${isProf ? '#922610' : 'transparent'}; margin-right:8px; border:1px solid #5a1005;">
                        </div>
                        
                        <span style="color:${isProf ? '#922610' : '#333'}; font-weight:${isProf ? 'bold' : 'normal'};">
                            ${info.label} <span style="font-size:10px; color:#777;">(${info.stat.toUpperCase()})</span>
                        </span>
                    </div>
            
                    <input type="text" value="${valStr}" 
                           onchange="window.updateSkillVal('${key}', this.value)"
                           style="width:35px; text-align:right; border:none; border-bottom:1px dotted #ccc; background:transparent; font-weight:bold; color:#2b2b2b; font-family:inherit;">
                </div>`;
        });
        skillsHtml += `</div>`;
    }
    
    return `
        <div class="statblock-card">
            <div class="sb-header">
                <input class="sb-title sb-input" value="${d.name}" onchange="window.updateTokenData('name', this.value)" style="font-size:24px; color:#922610; font-weight:bold; width:100%;">
                <input class="sb-subtitle sb-input" value="${d.details.type}" onchange="window.updateDetail('type', this.value)" placeholder="Taglia, Tipo, Allineamento">
            </div>
            
            <div class="tapered-rule"></div>
            
            <div class="sb-row">Classe Armatura <span class="sb-val">${d.ac}</span> <input class="sb-input" style="width:120px" value="${d.details.acType||''}" placeholder="(Tipo Armatura)" onchange="window.updateDetail('acType', this.value)"></div>
            <div class="sb-row">Punti Ferita <span class="sb-val">${d.hpCurrent}/${d.hpMax}</span></div>
            <div class="sb-row">Velocità <input class="sb-input" style="width:100px" value="${d.speed||'9m'}" onchange="window.updateTokenData('speed', this.value)"></div>
            
            <div class="tapered-rule"></div>
            
            <div class="ability-grid">
                <div><div>STR</div><span class="ability-score">${d.stats.str}</span><span class="ability-mod">(${fmtMod(d.stats.str)})</span></div>
                <div><div>DEX</div><span class="ability-score">${d.stats.dex}</span><span class="ability-mod">(${fmtMod(d.stats.dex)})</span></div>
                <div><div>CON</div><span class="ability-score">${d.stats.con}</span><span class="ability-mod">(${fmtMod(d.stats.con)})</span></div>
                <div><div>INT</div><span class="ability-score">${d.stats.int}</span><span class="ability-mod">(${fmtMod(d.stats.int)})</span></div>
                <div><div>WIS</div><span class="ability-score">${d.stats.wis}</span><span class="ability-mod">(${fmtMod(d.stats.wis)})</span></div>
                <div><div>CHA</div><span class="ability-score">${d.stats.cha}</span><span class="ability-mod">(${fmtMod(d.stats.cha)})</span></div>
            </div>
    
            ${skillsHtml}
    
            <div class="tapered-rule"></div>
            
            <div id="traits-list"></div>
            <button class="mini-btn" style="width:100%; margin-bottom:15px;" onclick="window.addTraitRow()">+ Aggiungi Tratto</button>
            
            <div class="action-header" style="display: flex; align-items: center; justify-content: space-between;">
                <span>Azioni / Attacchi</span>
                <div style="font-size:12px; display:flex; align-items:center; gap:5px; color:#black; font-weight:normal;">
                    <span>Numero attacchi:</span> 
                    <input type="number" value="${d.attackCount||1}" 
                           style="width:30px; text-align:center; background: transparent; border: none; border-bottom:1px solid #922610; color: #922610; font-weight: bold;" 
                           onchange="window.updateAttackCount(this.value)">
                </div>
            </div>
            
            <div id="sheet-attacks-list"></div>
            <button class="mini-btn" style="width:100%; margin-top:5px; margin-bottom:15px;" onclick="window.addAttackRow()">+ Aggiungi Attacco</button>
            
            ${(!d.isEnemy || (d.spellSlots && d.spellSlots.length > 0)) ? `<div class="action-header">Incantesimi</div><button class="mini-btn" onclick="window.openSpellManager(${d.id})" style="width:100%; margin-bottom:15px;">Apri Grimorio</button>` : ''}
            
            <div class="action-header">Note Master</div>
            <div class="sheet-text" style="font-style:italic; font-size:13px;">${d.notes || "-"}</div>
            
            <div class="modal-footer">
                <button class="primary" onclick="document.getElementById('sheet-modal').style.display='none'">Chiudi</button>
            </div>
        </div>
    `;
}