/* token-gen.js - Parser per importazione DMV e Beta Editor */
// CORREZIONE 1: Percorso corretto (era ../state.js)
import { state } from './state.js'; 
// CORREZIONE 2: Rimosso import circolare di spawnToken

export function processTokenImport(jsonData) {
    try {
        let tokenData;

        // Formato Dungeon Master's Vault (DMV)
        if (jsonData.character && Array.isArray(jsonData.character)) {
            tokenData = parseDMVCharacter(jsonData.character[0]);
        } 
        // Formato Editor Beta (.dnd) o Standard
        else {
            tokenData = jsonData;
        }

        if (!tokenData.id) tokenData.id = Date.now();
        
        // Posizionamento al centro
        tokenData.x = (-state.map.x + state.dom.gameArea.clientWidth / 2) / state.map.scale;
        tokenData.y = (-state.map.y + state.dom.gameArea.clientHeight / 2) / state.map.scale;

        // CORREZIONE 3: Non chiamiamo spawnToken qui. Restituiamo i dati a tokens.js
        return tokenData; 

    } catch (error) {
        console.error("Errore importazione:", error);
        alert("Errore nel formato del file.");
        return null;
    }
}

function parseDMVCharacter(char) {
    let totalLevel = 0;
    if (char.classes) {
        Object.values(char.classes).forEach(c => totalLevel += (c['class-level'] || 0));
    }

    const stats = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    if (char.abilities_bonuses && char.abilities_bonuses[0]) {
        const ab = char.abilities_bonuses[0].abilities;
        Object.keys(stats).forEach(k => stats[k] = ab[k] || 10);
    }

    const inventory = [];
    if (char.equipment && char.equipment[0]) {
        const eq = char.equipment[0];
        if (eq.weapons) eq.weapons.forEach(w => inventory.push({ n: w[0], q: 1 }));
        if (eq.equipment) {
            Object.entries(eq.equipment).forEach(([name, details]) => {
                inventory.push({ n: name.replace(/-/g, ' '), q: details.quantity || 1 });
            });
        }
    }

    return {
        name: char.character_name.trim(),
        hpMax: (char.hp && char.hp[0]) ? char.hp[0].hp_max : 10,
        hpCurrent: (char.hp && char.hp[0]) ? char.hp[0].hp_max : 10,
        ac: char.ac || 10,
        speed: char.characteristics ? char.characteristics[0].speed + "ft" : "30ft",
        level: totalLevel || 1,
        stats: stats,
        passivePerception: char.passive_perception || 10,
        image: char.image_url || "assets/img/tokens/default_hero.png",
        isEnemy: false,
        hidden: false,
        showStats: true,
        statsVisible: false,
        inventory: inventory,
        spellSlots: [], 
        notes: char.characteristics ? char.characteristics[0].character_backstory : "",
        scale: 1,
        z: 100
    };
}

export function createTokenFromForm(type, specifiedImage) {
    // 1. Recupera i valori dagli input HTML
    const nameInput = document.getElementById('input-name');
    const hpInput = document.getElementById('input-hp');
    const acInput = document.getElementById('input-ac');

    // Valori di default se i campi sono vuoti
    const name = nameInput && nameInput.value ? nameInput.value : (type === 'enemy' ? "Nuovo Nemico" : "Nuovo Eroe");
    const hp = hpInput && hpInput.value ? parseInt(hpInput.value) : 10;
    const ac = acInput && acInput.value ? parseInt(acInput.value) : 10;

    // Immagine di default se non ne è stata caricata una
    const defaultImg = type === 'enemy' 
        ? "assets/img/tokens/default_enemy.png" 
        : "assets/img/tokens/default_hero.png";

    return {
        id: Date.now(),
        name: name,
        hpMax: hp,
        hpCurrent: hp,
        ac: ac,
        speed: "30ft",
        level: 1,
        stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        passivePerception: 10,
        // Usa l'immagine specificata (caricata manualmente) o quella di default
        image: specifiedImage || defaultImg,
        isEnemy: (type === 'enemy'), // True se nemico, False se eroe
        hidden: false,
        showStats: true,
        statsVisible: false,
        inventory: [],
        spellSlots: [], 
        notes: "",
        scale: 1,
        z: 100
    };
}