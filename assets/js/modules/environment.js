/* environment.js - Meteo, Tempo e Cielo */
import { state } from './state.js';

// --- VARIABILI INTERNE METEO ---
let rainReq;
let drops = [];

// --- GESTIONE CIELO & STELLE ---
export function initStars() {
    const c = document.getElementById('stars-container');
    if(!c) return;
    c.innerHTML = ''; // Pulisce eventuali stelle vecchie
    for(let i=0; i<200; i++) {
        const s = document.createElement('div'); s.className = 'star';
        s.style.left = Math.random() * 100 + '%'; s.style.top = Math.random() * 100 + '%';
        const size = Math.random() * 3 + 1 + 'px'; s.style.width = size; s.style.height = size;
        s.style.animationDuration = (Math.random() * 3 + 2) + 's'; s.style.animationDelay = (Math.random() * 2) + 's';
        c.appendChild(s);
    }
}

export function updateSkyColor() {
    const time = state.time.minutes % 1440;
    let r, g, b, showSun = false, showStars = false;
    
    // Ciclo Giorno: 6:00 (360) - 20:00 (1200)
    if (time >= 360 && time <= 1200) { 
        showSun = true;
        const peak = 780; // 13:00
        const dist = Math.abs(time - peak);
        const maxDist = 420; 
        const f = Math.max(0, 1 - (dist / maxDist));
        r = Math.floor(20 + (115 * f)); g = Math.floor(20 + (186 * f)); b = Math.floor(60 + (175 * f));
    } else { // Notte
        showStars = true;
        r = 5; g = 5; b = 16;
    }
    
    // Se piove o c'è tempesta, il cielo si scurisce
    if (state.time.currentWeather === 'weather-rain' || state.time.currentWeather === 'weather-storm') {
        r = Math.floor(r * 0.3); g = Math.floor(g * 0.3); b = Math.floor(b * 0.35);
        showSun = false; 
    }
    
    const col = `rgb(${r},${g},${b})`;
    const ga = document.getElementById('game-area');
    if(ga) ga.style.backgroundColor = col;
    
    const sunC = document.getElementById('sun-container'); if(sunC) sunC.style.display = showSun ? 'block' : 'none';
    const starC = document.getElementById('stars-container'); if(starC) starC.style.display = showStars ? 'block' : 'none';
    
    // Sincronizzazione finestra giocatori (se aperta)
    if(state.playerWin && !state.playerWin.closed) { 
        const p = state.playerWin.document.getElementById('p-game-area'); if(p) p.style.backgroundColor = col; 
        const ps = state.playerWin.document.getElementById('p-sun-container'); if(ps) ps.style.display = showSun ? 'block' : 'none';
        const pst = state.playerWin.document.getElementById('p-stars-container'); if(pst) pst.style.display = showStars ? 'block' : 'none';
    }
}

// --- OROLOGIO & TEMPO ---
export function toggleClock() { 
    const p = document.getElementById('clock-panel'); 
    const wasOpen = p.style.display === 'block';
    if(window.closeAllMenus) window.closeAllMenus(); // Chiude altri menu
    
    if (!wasOpen) { 
        p.style.display = 'block'; 
        updateClockUI(); 
    }
}

export function toggleGritty() { 
    state.time.isGritty = document.getElementById('gritty-toggle').checked; 
}

export function updateCalendarData() { 
    state.time.monthName = document.getElementById('month-name').value; 
    state.time.year = parseInt(document.getElementById('year-num').value); 
    updateClockUI(); 
    syncClockToPlayer(); 
}

export function addTime(hours) {
    const oldMonth = Math.floor((Math.floor(state.time.minutes / 1440)) / 28);
    state.time.minutes += hours * 60;
    const newMonth = Math.floor((Math.floor(state.time.minutes / 1440)) / 28);
    
    if (newMonth > oldMonth) { 
        const n = prompt("Nuovo mese! Nome?", "Nuovo Mese"); 
        if(n) { 
            state.time.monthName = n; 
            document.getElementById('month-name').value = n; 
        } 
    }
    updateClockUI(); 
    syncClockToPlayer(); 
    if(window.addLog) window.addLog(`Tempo: <strong>+${hours}h</strong>`, "", "(Tempo)");
}

export function updateClockUI() {
    const d = Math.floor(state.time.minutes / 1440) + 1; 
    const dom = ((d - 1) % 28) + 1;
    const h = Math.floor((state.time.minutes % 1440) / 60);
    const m = state.time.minutes % 60;
    
    const clockDisplay = document.getElementById('clock-display');
    if(clockDisplay) clockDisplay.textContent = `${h<10?'0'+h:h}:${m<10?'0'+m:m}`;
    
    const cd = document.getElementById('calendar-display'); 
    if(cd) {
        cd.textContent = `Giorno ${dom}`;
        cd.className = [7,14,21,28].includes(dom) ? "clock-day special-day" : "clock-day";
    }
    
    const mn = document.getElementById('month-name'); if(mn) mn.value = state.time.monthName;
    const yn = document.getElementById('year-num'); if(yn) yn.value = state.time.year;
    
    updateSkyColor();
}

export function syncClockToPlayer() {
    if(!state.playerWin || state.playerWin.closed) return;
    const d = Math.floor(state.time.minutes / 1440) + 1;
    const dom = ((d - 1) % 28) + 1;
    const h = Math.floor((state.time.minutes % 1440) / 60);
    const m = state.time.minutes % 60;
    
    let pc = state.playerWin.document.getElementById('p-clock');
    if(!pc) { 
        pc = state.playerWin.document.createElement('div'); 
        pc.id = 'p-clock'; 
        pc.className = 'p-clock-overlay'; 
        state.playerWin.document.body.appendChild(pc); 
    }

    const isSp = [7,14,21,28].includes(dom) ? "color:#f44336;text-shadow:0 0 5px #d32f2f;" : "color:#aaa";
    pc.innerHTML = `<div style="font-size:24px">${h<10?'0'+h:h}:${m<10?'0'+m:m}</div>
                    <div style="font-size:16px;color:#FF9800">${state.time.monthName} ${state.time.year}</div>
                    <div style="font-size:14px;${isSp}">Giorno ${dom}</div>`;

    updateSkyColor();
}

// --- RIPOSI (Short & Long) ---
export function performLongRest() {
    let d = state.time.isGritty ? 168 : 8; 
    if(!confirm(state.time.isGritty ? "Riposo Lungo (7gg)?" : "Riposo Lungo (8h)?")) return;
    
    for (let id in state.tokens) { 
        let t = state.tokens[id]; 
        if(t.isEnemy) continue; 
        
        t.hpCurrent = t.hpMax; 
        if(t.spellSlots) t.spellSlots.forEach(s => s.used = 0); 
        
        // Aggiorna la grafica (Funzioni globali esposte da tokens.js)
        if(window.updateHpVisuals) window.updateHpVisuals(document.getElementById(`tok-${id}`), t); 
        if(t.showStats && window.syncTokenToPlayer) window.syncTokenToPlayer(id); 
    }
    addTime(d); 
    if(window.addLog) window.addLog("Riposo Lungo completato.", "crit-success", "(Riposo)");
}

export function performShortRest() {
    let d = state.time.isGritty ? 8 : 1; 
    if(!confirm(state.time.isGritty ? "Riposo Breve (8h)?" : "Riposo Breve (1h)?")) return;
    
    for (let id in state.tokens) {
        let t = state.tokens[id]; 
        if(t.isEnemy) continue;
        
        if (state.time.isGritty) { 
            t.hpCurrent = Math.min(t.hpMax, t.hpCurrent + Math.floor((t.hpMax - t.hpCurrent) / 2)); 
            if(t.spellSlots) t.spellSlots.forEach(s => { s.used = Math.max(0, s.used - Math.ceil(s.max / 2)); }); 
        } else { 
            if(t.classType === 'Warlock' && t.spellSlots) t.spellSlots.forEach(s => s.used = 0); 
        }
        
        if(window.updateHpVisuals) window.updateHpVisuals(document.getElementById(`tok-${id}`), t); 
        if(t.showStats && window.syncTokenToPlayer) window.syncTokenToPlayer(id);
    }
    addTime(d); 
    if(window.addLog) window.addLog("Riposo Breve completato.", "", "(Riposo)");
}

// --- METEO ---
export function toggleWeather() { 
    const p = document.getElementById('weather-panel'); 
    const wasOpen = p.style.display === 'block';
    if(window.closeAllMenus) window.closeAllMenus();
    
    if (!wasOpen) p.style.display = 'block'; 
}

export function setWeather(type) {
    state.time.currentWeather = type;
    const overlay = document.getElementById('weather-layer');
    const rainCanvas = document.getElementById('rain-canvas');
    const flashDiv = document.getElementById('storm-flash');
    
    overlay.className = ''; 
    rainCanvas.style.display = 'none';
    cancelAnimationFrame(rainReq);
    flashDiv.style.display = 'none';
    
    if(type === 'weather-snow' || type === 'weather-fog') {
        overlay.className = type;
    } else if (type === 'weather-rain' || type === 'weather-storm') {
        startRain(type === 'weather-storm');
    }
    
    document.querySelectorAll('.weather-btn').forEach(b => b.classList.remove('active'));
    const btn = Array.from(document.querySelectorAll('.weather-btn')).find(b => b.getAttribute('onclick') && b.getAttribute('onclick').includes(type));
    if(btn) btn.classList.add('active');
    
    updateSkyColor();
    syncWeatherToPlayer();
}

function startRain(isStorm) {
    const rainCanvas = document.getElementById('rain-canvas');
    const rainCtx = rainCanvas.getContext('2d');
    const flashDiv = document.getElementById('storm-flash');
    
    rainCanvas.style.display = 'block';
    rainCanvas.width = window.innerWidth; 
    rainCanvas.height = window.innerHeight;
    drops = [];
    const count = isStorm ? 500 : 200;
    for(let i=0; i<count; i++) drops.push({x: Math.random()*rainCanvas.width, y: Math.random()*rainCanvas.height, s: Math.random()*5+10, v: Math.random()*10+15});
    
    if(isStorm) flashDiv.style.display = 'block';
    
    function draw() {
        rainCtx.clearRect(0, 0, rainCanvas.width, rainCanvas.height);
        rainCtx.strokeStyle = 'rgba(174,194,224,0.6)';
        rainCtx.lineWidth = 1.5;
        rainCtx.beginPath();
        
        if (isStorm && Math.random() > 0.98) {
            flashDiv.style.opacity = 0.6;
            setTimeout(()=>flashDiv.style.opacity=0, 100);
        }
        
        for(let d of drops) {
            rainCtx.moveTo(d.x, d.y);
            rainCtx.lineTo(d.x - 2, d.y + d.s);
            d.y += d.v; d.x -= 1;
            if(d.y > rainCanvas.height) { d.y = -20; d.x = Math.random() * rainCanvas.width; }
        }
        rainCtx.stroke();
        rainReq = requestAnimationFrame(draw);
    }
    draw();
}

export function syncWeatherToPlayer() {
    if(!state.playerWin || state.playerWin.closed) return;
    const pWin = state.playerWin; 
    
    pWin.document.getElementById('p-weather-overlay').className = '';
    pWin.document.getElementById('p-rain-canvas').style.display = 'none';
    pWin.cancelAnimationFrame(pWin.pRainReq);
    pWin.document.getElementById('p-storm-flash').style.display = 'none';
    
    const cw = state.time.currentWeather;
    
    if(cw === 'weather-snow' || cw === 'weather-fog') {
        pWin.document.getElementById('p-weather-overlay').className = cw;
    } else if (cw === 'weather-rain' || cw === 'weather-storm') {
        const isStorm = (cw === 'weather-storm');
        const cvs = pWin.document.getElementById('p-rain-canvas');
        const ctx = cvs.getContext('2d');
        const flash = pWin.document.getElementById('p-storm-flash');
        
        cvs.style.display = 'block';
        cvs.width = pWin.innerWidth; cvs.height = pWin.innerHeight;
        if(isStorm) flash.style.display = 'block';
        
        let pDrops = []; 
        const count = isStorm ? 500 : 200;
        for(let i=0; i<count; i++) pDrops.push({x: Math.random()*cvs.width, y: Math.random()*cvs.height, s: Math.random()*5+10, v: Math.random()*10+15});
        
        function pDraw() {
            ctx.clearRect(0, 0, cvs.width, cvs.height);
            ctx.strokeStyle = 'rgba(174,194,224,0.6)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            if (isStorm && Math.random() > 0.98) { flash.style.opacity = 0.6; setTimeout(()=>flash.style.opacity=0, 100); }
            for(let d of pDrops) {
                ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 2, d.y + d.s);
                d.y += d.v; d.x -= 1;
                if(d.y > cvs.height) { d.y = -20; d.x = Math.random() * cvs.width; }
            }
            ctx.stroke();
            pWin.pRainReq = pWin.requestAnimationFrame(pDraw);
        }
        pDraw();
    }
}