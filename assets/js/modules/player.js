/* player.js - Sincronizzazione Finestra Giocatori */
import { state } from './state.js';

// --- GESTIONE FINESTRA ---

export function openPlayerWindow() {
    if(state.playerWin && !state.playerWin.closed) {
        state.playerWin.focus();
        return;
    }
    const w = window.outerWidth || 1000, h = window.outerHeight || 700;
    state.playerWin = window.open("", "PlayerView", `width=${w},height=${h}`);
    
    // HTML e CSS della finestra giocatori (basato sul codice originale)
    const playerHtml = `<!DOCTYPE html><html><head><title>GIOCATORI</title>
    <style>
        body{margin:0;background:#000;font-family:sans-serif;overflow:hidden}
        #p-game-area{width:100vw;height:100vh;position:relative;transition:background-color 2s ease} 
        #p-world-layer{position:absolute;top:0;left:0;transition:transform .1s linear; z-index:10;}
        .p-map{display:block;pointer-events:none}
        .p-token{position:absolute;width:100px;display:flex;flex-direction:column;align-items:center;transition:all .1s linear}
        .p-img{width:100%;border-radius:5px}
        .p-hp-bar{width:100%;height:8px;background:#333;margin-top:2px;border:1px solid #fff}
        .p-hp-fill{height:100%;background:#0f0;transition:width .3s}
        .p-stats-row{display:flex;justify-content:space-between;width:100%;margin-bottom:-10px;z-index:10;position:relative;top:10px}
        .p-stat-box{width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;border:2px solid #fff;border-radius:5px;color:#fff;background:#2196F3}
        .p-slot{background:#9C27B0}
        .p-name{color:#fff;background:rgba(0,0,0,0.6);padding:2px 4px;font-size:12px;border-radius:4px;margin-bottom:2px}
        .p-status-icon{width:20px;height:20px;background:rgba(0,0,0,0.8);border-radius:50%;display:flex;justify-content:center;align-items:center;font-size:12px;border:1px solid #fff;margin-bottom:2px}
        .p-status-overlay{position:absolute;top:-5px;right:-5px;display:flex;flex-direction:column}
        #p-log{position:absolute;bottom:20px;left:20px;width:300px;display:flex;flex-direction:column-reverse;pointer-events:none}
        .p-log-entry{background:rgba(0,0,0,0.6);color:#fff;padding:8px;margin-top:5px;border-left:4px solid #777}
        .crit-success{border-color:#0f0} .crit-fail{border-color:#f00}
        .p-modal{display:none;position:fixed;top:20px;right:20px;width:250px;background:rgba(0,0,0,0.9);border:2px solid #FF9800;padding:15px;color:#fff;z-index:9000;border-radius:10px}
        #p-init-panel{position:absolute;top:20px;left:20px;width:180px;background:rgba(0,0,0,0.8);border:2px solid #555;padding:10px;color:#fff;z-index:9000}
        .p-clock-overlay{position:absolute;top:10px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);padding:5px 15px;border-radius:20px;color:#FF9800;font-weight:bold;border:1px solid #555;text-align:center;z-index:2000}
        #dice-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.4); z-index: 5000; display: none; align-items: center; justify-content: center; pointer-events: none; }
        #anim-die { width: 150px; height: 150px; background: #FF9800; color: #000; display: flex; justify-content: center; align-items: center; font-size: 60px; font-weight: bold; border: 5px solid #fff; }
        .star { position: absolute; background: #fff; border-radius: 50%; animation: twinkle infinite alternate; }
        @keyframes twinkle { from { transform: scale(1); } to { transform: scale(1.5); } }
        #p-rain-canvas { display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 5; pointer-events: none; }
    </style></head><body>
        <div id="dice-overlay"><div id="anim-die">20</div></div>
        <div id="p-game-area">
            <div id="p-stars-container"></div>
            <div id="p-sun-container"></div>
            <div id="p-weather-overlay"></div>
            <canvas id="p-rain-canvas"></canvas>
            <div id="p-world-layer"><img id="p-map-img"></div>
        </div>
        <div id="p-log"></div>
        <div id="p-init-panel" style="display:none"><h4>Iniziativa</h4><div id="p-init-list"></div></div>
        <audio id="p-audio" loop></audio>
    </body></html>`;

    state.playerWin.document.write(playerHtml);
    state.playerWin.document.close();

    // Sincronizzazione iniziale
    if(window.syncMap) window.syncMap();
    if(window.syncWorldView) window.syncWorldView();
    if(window.syncInitiativeToPlayer) window.syncInitiativeToPlayer();
    if(window.syncClockToPlayer) window.syncClockToPlayer();
}

// --- SINCRONIZZAZIONE TOKEN E PROP ---

export function syncTokenToPlayer(id) {
    if(!state.playerWin || state.playerWin.closed) return;
    const d = state.tokens[id];
    const w = state.playerWin.document.getElementById('p-world-layer');
    let t = state.playerWin.document.getElementById(`p-tok-${id}`);

    if(d.hidden) { if(t) t.remove(); return; }

    if(!t) {
        t = state.playerWin.document.createElement('div');
        t.id = `p-tok-${id}`;
        t.className = 'p-token';
        t.innerHTML = `<div class="p-status-overlay"></div><div class="p-stats-row"><div class="p-stat-box p-ac"></div><div class="p-stat-box p-slot"></div></div><div class="p-name"></div><img class="p-img"><div class="p-hp-bar"><div class="p-hp-fill"></div></div>`;
        w.appendChild(t);
    }

    t.style.left = d.x + 'px';
    t.style.top = d.y + 'px';
    t.style.zIndex = d.z;
    t.style.transform = `scale(${d.scale})`;
    t.querySelector('.p-img').src = d.image;
    t.querySelector('.p-name').textContent = d.name;

    // HP e Statistiche (se visibili)
    const hf = t.querySelector('.p-hp-fill');
    const sr = t.querySelector('.p-stats-row');
    let show = d.isEnemy ? d.statsVisible : d.showStats;

    if(show) {
        sr.style.display = 'flex';
        sr.querySelector('.p-ac').textContent = d.ac;
        const p = Math.max(0, Math.min(100, (d.hpCurrent / d.hpMax) * 100));
        hf.style.width = p + "%";
        hf.style.background = p > 50 ? "#4CAF50" : (p > 25 ? "#FFC107" : "#F44336");
    } else {
        sr.style.display = 'none';
        hf.style.width = "0%";
    }
}

export function removeTokenFromPlayer(id) {
    if(state.playerWin && !state.playerWin.closed) {
        const e = state.playerWin.document.getElementById(`p-tok-${id}`);
        if(e) e.remove();
    }
}

export function syncPropToPlayer(id) {
    if(!state.playerWin || state.playerWin.closed) return;
    const d = state.props[id];
    const w = state.playerWin.document.getElementById('p-world-layer');
    let t = state.playerWin.document.getElementById(`p-prop-${id}`);
    
    if(!t) {
        t = state.playerWin.document.createElement('div');
        t.id = `p-prop-${id}`;
        t.style.position = "absolute";
        t.innerHTML = `<img src="${d.image}" style="display:block;max-width:200px;">`;
        w.appendChild(t);
    }
    t.style.left = d.x + 'px';
    t.style.top = d.y + 'px';
    t.style.zIndex = d.z;
    t.style.transform = `scale(${d.scale})`;
}

export function removePropFromPlayer(id) {
    if(state.playerWin && !state.playerWin.closed) {
        const e = state.playerWin.document.getElementById(`p-prop-${id}`);
        if(e) e.remove();
    }
}

// --- LOG E INIZIATIVA ---

export function syncLogToPlayer(h, t) {
    if(!state.playerWin || state.playerWin.closed) return;
    const l = state.playerWin.document.getElementById('p-log');
    if(l) {
        const d = state.playerWin.document.createElement('div');
        d.className = `p-log-entry ${t}`;
        d.innerHTML = h;
        l.prepend(d);
        setTimeout(() => d.style.opacity = '0', 9000);
        setTimeout(() => d.remove(), 10000);
    }
}

export function syncInitiativeToPlayer() {
    if(!state.playerWin || state.playerWin.closed) return;
    const p = state.playerWin.document.getElementById('p-init-panel');
    if(state.initiative.length === 0) { p.style.display = 'none'; return; }
    p.style.display = 'block';
    const l = state.playerWin.document.getElementById('p-init-list');
    l.innerHTML = "";
    state.initiative.forEach(init => {
        const d = state.tokens[init.id];
        if(!d || d.hidden) return;
        l.innerHTML += `<div class="p-init-row ${init.active ? 'active' : ''}">
            <img src="${d.image}" style="width:25px;height:25px;border-radius:50%;margin-right:5px">
            <span>${d.name}</span>
        </div>`;
    });
}