/* assets/js/modules/token-ui.js - INTERFACCIA TOKEN E CREAZIONE */
import { state } from './state.js';
import { createTokenFromForm, processTokenImport } from './token-gen.js';
import { spawnToken, spawnProp } from './token-core.js';



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

// --- CREAZIONE TOKEN (MODALE) ---
export function openCreationModal(type) {
    state.selection.creationType = type;
    const title = document.getElementById('creation-title');
    const slotDiv = document.getElementById('slot-input-col');

    document.getElementById('creation-modal').style.display = 'block';
    
    // Inizializza il modulo generatore
    import('./token-gen.js').then(module => {
        if (module.initClassForm) module.initClassForm();
    });

    // Reset UI
    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.style.display = 'none';
    
    if (type === 'enemy') {
        title.textContent = "Nuovo Nemico";
        title.style.color = "#FF9800";
        if(slotDiv) slotDiv.style.display = "none";
    } else {
        title.textContent = "Nuovo Eroe";
        title.style.color = "white";
        if(slotDiv) slotDiv.style.display = "block";
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

    // Reset Form
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

export function previewTokenImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('token-preview-img').src = e.target.result;
        }
        reader.readAsDataURL(input.files[0]);
    }
}

export function switchCreationType(type) {
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
}

// --- GESTIONE UPLOAD ---
export function handleTokenUpload(file) {
    if(!file) return;
    const r = new FileReader();
    r.onload = v => {
        try {
            const data = JSON.parse(v.target.result);
            const tokenData = processTokenImport(data); 
            if (tokenData) spawnToken(tokenData); 
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