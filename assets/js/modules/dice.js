/* assets/js/modules/dice.js - VERSIONE CON TIRO SEGRETO */

let isSecretRoll = false; // Default: Pubblico

// Inizializza il pulsante Occhio nella barra dei dadi
export function initSecretButton() {
    const bar = document.querySelector('.dice-bar');
    // Esegui solo se esiste la barra e non c'è già il bottone (evita duplicati)
    if (bar && !document.getElementById('btn-secret-roll')) {
        const btn = document.createElement('button');
        btn.id = 'btn-secret-roll';
        btn.className = 'dice-btn';
        btn.innerHTML = '👁️';
        btn.title = "Tiri Pubblici (Clicca per nascondere)";
        btn.style.borderColor = '#4CAF50'; // Verde = Pubblico
        btn.style.color = '#4CAF50';
        btn.style.marginRight = '15px'; // Separatore visivo
        
        btn.onclick = toggleSecretRoll;
        
        // Inseriscilo all'inizio della barra
        bar.insertBefore(btn, bar.firstChild);
    }
}

export function toggleSecretRoll() {
    isSecretRoll = !isSecretRoll;
    const btn = document.getElementById('btn-secret-roll');
    if(btn) {
        if(isSecretRoll) {
            btn.innerHTML = '🙈';
            btn.title = "Tiri Nascosti (Solo tu vedi)";
            btn.style.borderColor = '#f44336'; // Rosso = Segreto
            btn.style.color = '#f44336';
        } else {
            btn.innerHTML = '👁️';
            btn.title = "Tiri Pubblici (Tutti vedono)";
            btn.style.borderColor = '#4CAF50';
            btn.style.color = '#4CAF50';
        }
    }
}

// Funzione principale tiro
export function rollDie(sides, playerName = "Master") {
    const result = Math.floor(Math.random() * sides) + 1;
    
    // 1. Mostra Locale (Sempre)
    const label = isSecretRoll ? "Tiro Segreto (Solo tu)" : "Tiro Pubblico";
    showDiceResult(result, `1d${sides}`, label);

    // 2. Invia ai Player (Solo se NON è segreto e siamo il Master)
    // window.broadcast esiste solo sul Master (definito in multiplayer.js)
    if (!isSecretRoll && window.broadcast) {
        window.broadcast('ROLL_NOTIFY', {
            name: "Master",
            roll: result,
            die: `d${sides}`
        });
    }
    
    return result;
}

export function rollFormula(formula, label = "") {
    let result = 0;
    let details = "";

    try {
        if (formula.startsWith('+') || /^\d+$/.test(formula)) {
            const bonus = parseInt(formula);
            const roll = Math.floor(Math.random() * 20) + 1;
            result = roll + bonus;
            details = `d20 (${roll}) ${bonus >= 0 ? '+' : ''}${bonus}`;
            if(roll === 20) details += " <span style='color:green; font-weight:bold;'>CRIT!</span>";
            if(roll === 1) details += " <span style='color:red; font-weight:bold;'>FAIL!</span>";
        } 
        else if (formula.includes('d')) {
            const parts = formula.toLowerCase().split('+');
            const dicePart = parts[0].split('d'); 
            const bonus = parts.length > 1 ? parseInt(parts[1]) : 0;
            const numDice = parseInt(dicePart[0]) || 1;
            const faces = parseInt(dicePart[1]);
            
            let diceTotal = 0;
            let rolls = [];
            for(let i=0; i<numDice; i++) {
                const r = Math.floor(Math.random() * faces) + 1;
                diceTotal += r;
                rolls.push(r);
            }
            result = diceTotal + bonus;
            details = `[${rolls.join('+')}]${bonus ? '+' + bonus : ''}`;
        }
        else { result = 0; details = "Errore formula"; }

        // Mostra Locale
        const title = isSecretRoll ? `${label} (Segreto)` : label;
        showDiceResult(result, details, title);

        // Invia ai Player (Solo se pubblico)
        if (!isSecretRoll && window.broadcast) {
            window.broadcast('ROLL_NOTIFY', {
                name: "Master",
                roll: result,
                die: "Formula" // O dettagli personalizzati
            });
        }

    } catch (e) { console.error("Errore tiro dadi:", e); }
}

export function showRemoteResult(name, roll, type) {
    showDiceResult(roll, type, `${name} ha tirato`);
}

function showDiceResult(total, details, title) {
    let box = document.getElementById('dice-result-box');
    if (!box) {
        box = document.createElement('div');
        box.id = 'dice-result-box';
        box.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #f4e4bc; border: 3px solid #922610; 
            box-shadow: 0 0 30px rgba(0,0,0,0.8);
            padding: 20px 40px; border-radius: 10px; text-align: center; 
            z-index: 9999; min-width: 220px; font-family: 'Cinzel', serif;
            pointer-events: none;
        `;
        document.body.appendChild(box);
    }

    // Se è un tiro segreto, usiamo un colore diverso per il bordo/titolo
    const isSecretMsg = title.toLowerCase().includes('segreto');
    const color = isSecretMsg ? "#555" : "#922610";
    box.style.borderColor = color;

    box.innerHTML = `
        <div style="font-variant: small-caps; color: ${color}; font-weight: bold; font-size: 18px; margin-bottom: 5px;">${title}</div>
        <div style="font-size: 60px; font-weight: bold; color: #000; line-height: 1;">${total}</div>
        <div style="font-size: 14px; color: #555; margin-top: 5px; font-style: italic;">${details}</div>
    `;

    box.style.display = 'block';
    box.style.opacity = '0';
    box.style.transform = 'translate(-50%, -40%) scale(0.8)';
    
    setTimeout(() => {
        box.style.transition = 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        box.style.opacity = '1';
        box.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 10);

    if (window.diceTimeout) clearTimeout(window.diceTimeout);
    window.diceTimeout = setTimeout(() => {
        box.style.opacity = '0';
        box.style.transform = 'translate(-50%, -60%)';
        setTimeout(() => { box.style.display = 'none'; }, 300);
    }, 3000);
}