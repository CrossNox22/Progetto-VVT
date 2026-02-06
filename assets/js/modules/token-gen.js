/* assets/js/modules/token-gen.js - VERSIONE DEFINITIVA (Con Parsing Attacchi Multipli) */

// --- 1. DATABASE CLASSI E TABELLE ---

const DND_CLASSES = {
    "Artificer": ["Alchemist", "Armorer", "Artillerist", "Battle Smith"],
    "Barbarian": ["Berserker", "Totem Warrior", "Ancestral Guardian", "Storm Herald", "Zealot", "Wild Magic", "Beast"],
    "Bard": ["Lore", "Valor", "Glamour", "Swords", "Whispers", "Eloquence", "Creation"],
    "Cleric": ["Life", "Light", "Nature", "Tempest", "Trickery", "War", "Knowledge", "Forge", "Grave", "Order", "Peace", "Twilight"],
    "Druid": ["Land", "Moon", "Dreams", "Shepherd", "Spores", "Stars", "Wildfire"],
    "Fighter": ["Champion", "Battle Master", "Eldritch Knight", "Arcane Archer", "Cavalier", "Samurai", "Echo Knight", "Rune Knight"],
    "Monk": ["Open Hand", "Shadow", "Four Elements", "Kensei", "Sun Soul", "Drunken Master", "Mercy", "Astral Self"],
    "Paladin": ["Devotion", "Ancients", "Vengeance", "Crown", "Conquest", "Redemption", "Glory", "Watchers"],
    "Ranger": ["Hunter", "Beast Master", "Gloom Stalker", "Horizon Walker", "Monster Slayer", "Fey Wanderer", "Swarmkeeper"],
    "Rogue": ["Thief", "Assassin", "Arcane Trickster", "Inquisitive", "Mastermind", "Scout", "Swashbuckler", "Phantom", "Soulknife"],
    "Sorcerer": ["Draconic", "Wild Magic", "Divine Soul", "Shadow", "Storm", "Aberrant Mind", "Clockwork Soul"],
    "Warlock": ["Archfey", "Fiend", "Great Old One", "Celestial", "Hexblade", "Fathomless", "Genie", "Undead"],
    "Wizard": ["Abjuration", "Conjuration", "Divination", "Enchantment", "Evocation", "Illusion", "Necromancy", "Transmutation", "War Magic", "Bladesinging", "Scribes"]
};

const SPELL_SLOTS_TABLE = {
    1:[2], 2:[3], 3:[4,2], 4:[4,3], 5:[4,3,2], 6:[4,3,3], 7:[4,3,3,1], 8:[4,3,3,2], 9:[4,3,3,3,1],
    10:[4,3,3,3,2], 11:[4,3,3,3,2,1], 12:[4,3,3,3,2,1], 13:[4,3,3,3,2,1,1], 14:[4,3,3,3,2,1,1],
    15:[4,3,3,3,2,1,1,1], 16:[4,3,3,3,2,1,1,1], 17:[4,3,3,3,2,1,1,1,1], 18:[4,3,3,3,3,1,1,1,1],
    19:[4,3,3,3,3,2,1,1,1], 20:[4,3,3,3,3,2,2,1,1]
};

const WARLOCK_TABLE = {
    1:{s:1,l:1}, 2:{s:2,l:1}, 3:{s:2,l:2}, 4:{s:2,l:2}, 5:{s:2,l:3}, 6:{s:2,l:3}, 7:{s:2,l:4}, 8:{s:2,l:4},
    9:{s:2,l:5}, 10:{s:2,l:5}, 11:{s:3,l:5}, 12:{s:3,l:5}, 13:{s:3,l:5}, 14:{s:3,l:5}, 15:{s:3,l:5}, 16:{s:3,l:5},
    17:{s:4,l:5}, 18:{s:4,l:5}, 19:{s:4,l:5}, 20:{s:4,l:5}
};

// --- 2. LOGICA CONDIVISA CALCOLO SLOT ---

function calculateSpellSlotsFromData(classesObj) {
    if (!classesObj) return [];
    const casterLevels = { full: 0, half: 0, third: 0, warlock: 0 };
    
    Object.keys(classesObj).forEach(key => {
        const cls = classesObj[key];
        const name = (cls['class-name'] || key).toLowerCase();
        const lvl = parseInt(cls['class-level'] || cls.level || 0);
        const sub = (cls['subclass-name'] || cls.subclass || "").toLowerCase();

        if (name.includes('warlock')) casterLevels.warlock += lvl;
        else if (['bard', 'cleric', 'druid', 'sorcerer', 'wizard'].some(c => name.includes(c))) casterLevels.full += lvl;
        else if (['paladin', 'ranger'].some(c => name.includes(c))) casterLevels.half += lvl;
        else if (name.includes('artificer')) casterLevels.full += Math.ceil(lvl / 2); 
        else if (['fighter', 'rogue'].some(c => name.includes(c))) {
            if (['eldritch','arcane','trickster','magic'].some(s => sub.includes(s))) casterLevels.third += lvl;
        }
    });

    let effectiveLevel = 0;
    const totalNonWarlock = (casterLevels.full > 0 ? 1 : 0) + (casterLevels.half > 0 ? 1 : 0) + (casterLevels.third > 0 ? 1 : 0);
    
    if (totalNonWarlock > 1) effectiveLevel = casterLevels.full + Math.floor(casterLevels.half / 2) + Math.floor(casterLevels.third / 3);
    else {
        if (casterLevels.full > 0) effectiveLevel = casterLevels.full;
        else if (casterLevels.half > 0) effectiveLevel = Math.ceil(casterLevels.half / 2);
        else if (casterLevels.third > 0) effectiveLevel = Math.ceil(casterLevels.third / 3);
    }

    let finalSlots = [];
    if (effectiveLevel > 0) {
        const row = SPELL_SLOTS_TABLE[Math.min(effectiveLevel, 20)];
        if(row) finalSlots = row.map((m,i)=>({level:i+1, name:`Liv. ${i+1}`, max:m, used:0}));
    }

    if (casterLevels.warlock > 0) {
        const p = WARLOCK_TABLE[Math.min(casterLevels.warlock, 20)];
        if (p) {
            const ex = finalSlots.find(s => s.level === p.l);
            if (ex) ex.max += p.s;
            else finalSlots.push({level:p.l, name:`Liv. ${p.l}`, max:p.s, used:0});
        }
    }
    
    finalSlots.sort((a,b)=>a.level-b.level);
    return finalSlots;
}

// --- 3. GESTIONE IMPORTAZIONE ---

export function processTokenImport(data) {
    let json = data;
    if (data.character && Array.isArray(data.character)) json = data.character[0];
    else if (Array.isArray(data)) json = data[0];

    const getName = () => json.character_name || json.name || json.Name || data.player_name || "Sconosciuto";
    
    const getHPObj = () => {
        if (Array.isArray(json.hp) && json.hp[0]) return json.hp[0];
        if (json.hp && typeof json.hp === 'object') return json.hp;
        return { hp_max: parseInt(json.hpMax || json.hp || 10), hp_current: parseInt(json.hpCurrent || json.hp || 10) };
    };
    const hpData = getHPObj();
    const maxHP = parseInt(hpData.hp_max || hpData.max || hpData.value || 10);
    const curHP = parseInt(hpData.hp_current || hpData.value || maxHP);

    const getAC = () => {
        if (json.ac) {
            if (typeof json.ac === 'object') return parseInt(json.ac.value || 10);
            return parseInt(json.ac);
        }
        return 10;
    };

    const getSpeed = () => {
        let s = parseInt(json.speed || json.Speed || 0);
        if (s > 0) {
            if (s > 20) return Math.floor(s / 3.3) + "m";
            return s + "m";
        }
        return "9m";
    };

    const getStats = () => {
        if (json.abilities_bonuses && Array.isArray(json.abilities_bonuses) && json.abilities_bonuses[0]) {
            const a = json.abilities_bonuses[0].abilities;
            return {
                str: parseInt(a.str), dex: parseInt(a.dex), con: parseInt(a.con),
                int: parseInt(a.int), wis: parseInt(a.wis), cha: parseInt(a.cha)
            };
        }
        const s = json.stats || json.abilities || json; 
        return {
            str: parseInt(s.str || 10), dex: parseInt(s.dex || 10), con: parseInt(s.con || 10),
            int: parseInt(s.int || 10), wis: parseInt(s.wis || 10), cha: parseInt(s.cha || 10)
        };
    };

    const getAttacks = () => {
        if (Array.isArray(json.attacks)) return json.attacks;
        const attacks = [];
        if (json.attacks && typeof json.attacks === 'object') {
            const raw = json.attacks;
            for (let i = 1; i <= 20; i++) {
                const name = raw[`weapon-name-${i}`];
                if (name) {
                    const bonus = raw[`weapon-attack-bonus-${i}`] || "+0";
                    const damage = raw[`weapon-damage-${i}`] || "1d4";
                    let cleanDmg = damage.split(' ')[0]; 
                    attacks.push({ name: name, hit: bonus, dmg: cleanDmg });
                }
            }
        }
        return attacks;
    };

    const getInventory = () => {
        const inv = [];
        if (json.inventory && Array.isArray(json.inventory)) return json.inventory;
        if (json.equipment) {
            const eqData = Array.isArray(json.equipment) ? json.equipment[0] : json.equipment;
            if (!eqData) return inv;
            const fmtName = (str) => str.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).trim();
            const addItem = (k, d) => inv.push({ n: fmtName(k), q: d.quantity || 1 });

            if (eqData.equipment) Object.keys(eqData.equipment).forEach(k => addItem(k, eqData.equipment[k]));
            if (eqData.armor) Object.keys(eqData.armor).forEach(k => addItem(k, eqData.armor[k]));
            if (eqData.weapons && Array.isArray(eqData.weapons)) {
                eqData.weapons.forEach(w => { if (Array.isArray(w) && w.length > 1) addItem(w[0], w[1]); });
            }
        }
        return inv;
    };

    // --- LOGICA NOTE (Traits extra) ---
    const getNotes = () => {
        let text = json.character_backstory || "";
        if (json.traits && typeof json.traits === 'object' && json.traits['features-and-traits-2']) {
            if (text) text += "\n\n=== TRATTI & AZIONI EXTRA ===\n";
            text += json.traits['features-and-traits-2'];
        }
        return text;
    };

    // --- NUOVA LOGICA: NUMERO ATTACCHI ---
    const getAttackCount = () => {
        // Default 1
        let count = 1;

        // Controlla se esiste il campo 'attacks-and-spellcasting' dentro 'attacks' (Formato DMV)
        if (json.attacks && typeof json.attacks === 'object' && json.attacks['attacks-and-spellcasting']) {
            const text = json.attacks['attacks-and-spellcasting'];
            // Regex: Cerca "Number of Attacks:" seguito da un numero
            // (\d+) cattura il numero. Ignora tutto il resto.
            const match = text.match(/Number of Attacks:\s*(\d+)/i);
            
            if (match && match[1]) {
                count = parseInt(match[1]);
            }
        }
        return count;
    };

    let typeDesc = "Umanoide";
    if (json.race) typeDesc = json.race;
    if (json.classes) {
        const classes = Object.keys(json.classes).map(k => json.classes[k]['class-name'] + " " + json.classes[k]['class-level']).join(" / ");
        typeDesc += ` (${classes})`;
    }

    return {
        id: Date.now(),
        name: getName(),
        hpMax: maxHP, hpCurrent: curHP, ac: getAC(), speed: getSpeed(),
        image: json.image_url || json.image || "assets/img/tokens/default_hero.png",
        isEnemy: (typeof json.isEnemy !== 'undefined') ? json.isEnemy : false,
        scale: json.scale || 1, x: 0, y: 0, z: 100,
        
        stats: getStats(),
        skills: json.skills || {}, 
        save_bonuses: json.save_bonuses || {},
        
        details: { 
            type: typeDesc, 
            acType: "", 
            profBonus: json.proficiency_bonus ? `+${json.proficiency_bonus}` : "+2" 
        },
        
        attacks: getAttacks(),
        attackCount: getAttackCount(), // <--- ASSEGNAZIONE DEL NUMERO ESTRATTO
        inventory: getInventory(),
        spellSlots: calculateSpellSlotsFromData(json.classes),
        traits: [], 
        statuses: [], 
        notes: getNotes() 
    };
}

// --- 4. CREAZIONE MANUALE (Invariata) ---
export function initClassForm() {
    const container = document.getElementById('classes-container');
    if (!container) return; 
    container.innerHTML = "";
    addMulticlassRow(true);

    const totalLvlInput = document.getElementById('input-level');
    const btnAdd = document.getElementById('btn-add-class');
    if(totalLvlInput && btnAdd) {
        totalLvlInput.addEventListener('input', () => {
            btnAdd.style.display = (parseInt(totalLvlInput.value) >= 2) ? 'block' : 'none';
        });
    }
}

export function addMulticlassRow(isFirst = false) {
    const container = document.getElementById('classes-container');
    const div = document.createElement('div');
    div.className = 'class-row';
    
    let classOpts = `<option value="" disabled selected>Classe</option>`;
    Object.keys(DND_CLASSES).forEach(cls => { classOpts += `<option value="${cls}">${cls}</option>`; });

    const removeBtn = isFirst ? '' : `<button type="button" onclick="this.parentElement.remove()" style="background:none; border:none; color:#922610; font-weight:bold; cursor:pointer;">✖</button>`;

    div.innerHTML = `
        <div style="flex: 3;">
            <select class="dnd-select cls-select" onchange="window.updateSubOptions(this)">${classOpts}</select>
        </div>
        <div style="flex: 3;">
            <select class="dnd-select sub-select" disabled><option value="">(Scegli Classe)</option></select>
        </div>
        <div style="flex: 1;">
            <input type="number" class="cls-lvl" value="1" min="1" max="20" placeholder="Lv"
                   style="width:100%; border:none; border-bottom:1px solid #922610; background:transparent; text-align:center; color:#922610; font-weight:bold; font-family:inherit;">
        </div>
        ${removeBtn}
    `;
    container.appendChild(div);
}

export function updateSubOptions(selectEl) {
    const row = selectEl.closest('.class-row');
    const subSelect = row.querySelector('.sub-select');
    const className = selectEl.value;
    subSelect.innerHTML = `<option value="">Sottoclasse (Opz.)</option>`;
    
    if (DND_CLASSES[className]) {
        subSelect.disabled = false;
        DND_CLASSES[className].forEach(sub => { subSelect.innerHTML += `<option value="${sub}">${sub}</option>`; });
    } else {
        subSelect.disabled = true;
    }
}

window.addMulticlassRow = addMulticlassRow;
window.updateSubOptions = updateSubOptions;

export function createTokenFromForm(type, specifiedImage) {
    const name = document.getElementById('input-name').value || (type === 'enemy' ? "Nuovo Mostro" : "Nuovo Eroe");
    const hp = parseInt(document.getElementById('input-hp').value) || 10;
    const ac = parseInt(document.getElementById('input-ac').value) || 10;
    const speed = document.getElementById('input-speed') ? document.getElementById('input-speed').value : "9m";
    const totalLevel = parseInt(document.getElementById('input-level').value) || 1;
    const profBonus = document.getElementById('input-prof') ? document.getElementById('input-prof').value : "+2";
    
    const defaultImg = type === 'enemy' ? "assets/img/tokens/default_enemy.png" : "assets/img/tokens/default_hero.png";

    let classesObj = {};
    let typeDesc = type === 'enemy' ? "Mostro" : "Eroe";
    let classStrings = [];

    const rows = document.querySelectorAll('.class-row');
    if (rows.length > 0) {
        rows.forEach((row, idx) => {
            const cls = row.querySelector('.cls-select').value;
            const sub = row.querySelector('.sub-select').value;
            const lvl = parseInt(row.querySelector('.cls-lvl').value) || 1;

            if (cls) {
                classesObj[`manual-${idx}`] = { "class-name": cls, "subclass-name": sub, "class-level": lvl };
                classStrings.push(`${cls} ${lvl}`);
            }
        });
        if (classStrings.length > 0) typeDesc += ` (${classStrings.join(' / ')})`;
    } else {
        typeDesc += ` (Lv ${totalLevel})`;
    }

    return {
        id: Date.now(),
        name: name,
        hpMax: hp, hpCurrent: hp, ac: ac,
        image: specifiedImage || defaultImg,
        isEnemy: (type === 'enemy'), scale: 1, z: 100,
        stats: { str:10, dex:10, con:10, int:10, wis:10, cha:10 },
        skills: {}, save_bonuses: {},
        
        details: { 
            type: typeDesc, 
            profBonus: profBonus.startsWith('+') ? profBonus : `+${profBonus}` 
        },
        
        spellSlots: calculateSpellSlotsFromData(classesObj),
        statuses: [], inventory: [], attacks: [], traits: [],
        speed: speed, level: totalLevel, showStats: (type === 'hero')
    };
}