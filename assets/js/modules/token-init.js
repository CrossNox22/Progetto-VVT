/* assets/js/modules/token-init.js - GESTIONE INIZIATIVA */
import { state } from './state.js';
import { syncInitiativeToPlayer } from './player.js';

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
    state.initiative = state.initiative.filter(i => String(i.id) !== String(id));
    renderInitiative();
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

export function renderInitiative() {
    const panel = document.getElementById('init-panel');
    const list = document.getElementById('init-list');
    if(!list || !panel) return;

    if (state.initiative.length === 0) {
        panel.style.display = 'none';
        syncInitiativeToPlayer();
        return;
    }

    panel.style.display = 'block';
    list.innerHTML = "";

    state.initiative.forEach(init => {
        const d = state.tokens[init.id];
        if(!d) return; // Salta se il token è stato cancellato ma è rimasto in init

        const row = document.createElement('div');
        row.className = `init-row ${init.active ? 'active' : ''}`;
        
        row.innerHTML = `
            <span class="init-val">${init.val}</span>
            <img src="${d.image}" class="init-img">
            <span style="flex-grow:1">${d.name}</span>
        `;
        
        const btnDel = document.createElement('button');
        btnDel.className = 'mini-btn btn-del';
        btnDel.textContent = 'x';
        btnDel.onclick = () => removeFromInitiative(init.id);
        
        row.appendChild(btnDel);
        list.appendChild(row);
    });

    syncInitiativeToPlayer();
}