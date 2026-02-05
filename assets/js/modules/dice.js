/* assets/js/modules/dice.js */

// Funzione principale per tirare un dado singolo (usata dai bottoni in basso)
export function rollDie(sides) {
    const result = Math.floor(Math.random() * sides) + 1;
    showDiceResult(result, `1d${sides}`);
}

// Funzione per interpretare formule (es. "1d8+2" o "+5") usata dalla Scheda
export function rollFormula(formula, label = "") {
    let result = 0;
    let details = "";

    try {
        // Caso 1: Bonus fisso (es. "+5" o "5") -> Tira 1d20 + bonus
        if (formula.startsWith('+') || /^\d+$/.test(formula)) {
            const bonus = parseInt(formula);
            const roll = Math.floor(Math.random() * 20) + 1;
            result = roll + bonus;
            details = `d20 (${roll}) ${bonus >= 0 ? '+' : ''}${bonus}`;
            // Critici
            if(roll === 20) details += " <span style='color:green; font-weight:bold;'>CRIT!</span>";
            if(roll === 1) details += " <span style='color:red; font-weight:bold;'>FAIL!</span>";
        } 
        // Caso 2: Danni (es. "1d8+2")
        else if (formula.includes('d')) {
            const parts = formula.toLowerCase().split('+');
            const dicePart = parts[0].split('d'); // [1, 8]
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
        else {
            // Fallback
            result = 0;
            details = "Errore formula";
        }

        showDiceResult(result, details, label);

    } catch (e) {
        console.error("Errore tiro dadi:", e);
        alert("Formula non valida: " + formula);
    }
}

// Mostra il risultato a schermo (Stile Pergamena)
function showDiceResult(total, details, title = "Risultato") {
    // Cerca o crea il contenitore del risultato
    let box = document.getElementById('dice-result-box');
    if (!box) {
        box = document.createElement('div');
        box.id = 'dice-result-box';
        // Stile Pergamena popup
        box.style.cssText = `
            position: fixed; 
            top: 50%; 
            left: 50%; 
            transform: translate(-50%, -50%); 
            background: #f4e4bc; 
            border: 3px solid #922610; 
            box-shadow: 0 0 20px rgba(0,0,0,0.5); 
            padding: 20px 40px; 
            border-radius: 10px; 
            text-align: center; 
            z-index: 5000; 
            min-width: 200px;
            font-family: inherit;
        `;
        document.body.appendChild(box);
    }

    box.innerHTML = `
        <div style="font-variant: small-caps; color: #922610; font-weight: bold; font-size: 18px; margin-bottom: 5px;">${title}</div>
        <div style="font-size: 60px; font-weight: bold; color: #000; line-height: 1;">${total}</div>
        <div style="font-size: 14px; color: #555; margin-top: 5px;">${details}</div>
    `;

    box.style.display = 'block';

    // Animazione entrata
    box.style.opacity = '0';
    box.style.transform = 'translate(-50%, -40%)';
    setTimeout(() => {
        box.style.transition = 'all 0.3s ease-out';
        box.style.opacity = '1';
        box.style.transform = 'translate(-50%, -50%)';
    }, 10);

    // Nascondi dopo 2.5 secondi
    if (window.diceTimeout) clearTimeout(window.diceTimeout);
    window.diceTimeout = setTimeout(() => {
        box.style.opacity = '0';
        setTimeout(() => { box.style.display = 'none'; }, 300);
    }, 2500);
}