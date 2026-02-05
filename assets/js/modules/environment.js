/* environment.js - Meteo, Tempo e Riposo */
import { state } from './state.js';

// --- VARIABILI INTERNE METEO ---
let rainReq;     
let drops = [];  

// --- GESTIONE CIELO & STELLE ---
export function initStars(targetContainer) {
    const c = targetContainer || document.getElementById('stars-container');
    if(!c) return;
    c.innerHTML = ''; 
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
    
    if (time >= 360 && time <= 1200) { 
        showSun = true;
        const peak = 780; 
        const dist = Math.abs(time - peak);
        const f = Math.max(0, 1 - (dist / 420));
        r = Math.floor(20 + (115 * f)); g = Math.floor(20 + (186 * f)); b = Math.floor(60 + (175 * f));
    } else { 
        showStars = true;
        r = 5; g = 5; b = 16;
    }
    
    if (state.time.currentWeather === 'weather-rain') {
        r = Math.floor(r * 0.3); g = Math.floor(g * 0.3); b = Math.floor(b * 0.35);
        showSun = false; 
    }
    
    const col = `rgb(${r},${g},${b})`;
    const ga = document.getElementById('game-area');
    if(ga) ga.style.backgroundColor = col;
    
    const sunC = document.getElementById('sun-container'); if(sunC) sunC.style.display = showSun ? 'block' : 'none';
    const starC = document.getElementById('stars-container'); if(starC) starC.style.display = showStars ? 'block' : 'none';
    
    if(state.playerWin && !state.playerWin.closed) { 
        const pDoc = state.playerWin.document;
        const p = pDoc.getElementById('p-game-area'); if(p) p.style.backgroundColor = col; 
        const ps = pDoc.getElementById('p-sun-container'); if(ps) ps.style.display = showSun ? 'block' : 'none';
        const pst = pDoc.getElementById('p-stars-container'); 
        if(pst) {
            pst.style.display = showStars ? 'block' : 'none';
            if(showStars && pst.children.length === 0) initStars(pst);
        }
    }
}

// --- OROLOGIO & TEMPO ---
export function toggleClock() { 
    const p = document.getElementById('clock-panel'); 
    if (!p) return;
    const wasOpen = p.style.display === 'block';
    if(window.closeAllMenus) window.closeAllMenus();
    if (!wasOpen) { p.style.display = 'block'; updateClockUI(); }
}

export function updateClockUI() {
    const d = Math.floor(state.time.minutes / 1440) + 1; 
    const dom = ((d - 1) % 28) + 1;
    const h = Math.floor((state.time.minutes % 1440) / 60);
    const m = state.time.minutes % 60;
    
    const clockDisplay = document.getElementById('clock-display');
    if(clockDisplay) clockDisplay.textContent = `${h<10?'0'+h:h}:${m<10?'0'+m:m}`;
    
    const cd = document.getElementById('calendar-display'); 
    if(cd) cd.textContent = `Giorno ${dom}`;
    
    // --- AGGIUNTA PER IL BUG CARICAMENTO ---
    // Sincronizziamo i campi di input del Master con i dati dello stato
    const monthInput = document.getElementById('month-name');
    if(monthInput) monthInput.value = state.time.monthName;
    
    const yearInput = document.getElementById('year-num');
    if(yearInput) yearInput.value = state.time.year;
    // ---------------------------------------
    
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
    
    // Qui abbiamo tolto #FF9800 e messo #922610 ovunque per sicurezza
    pc.innerHTML = `<div style="font-size:24px; color:#922610;  font-family: 'Cinzel', serif;">${h<10?'0'+h:h}:${m<10?'0'+m:m}</div>
                    <div style="font-size:16px; color:#922610;  font-family: 'Cinzel', serif;">${state.time.monthName} ${state.time.year}</div>
                    <div style="font-size:14px; color:#922610;  font-family: 'Cinzel', serif;">Giorno ${dom}</div>`;
    updateSkyColor();
}

export function addTime(hours) {
    const minutiPerMese = 28 * 1440; // 28 giorni in minuti
    const vecchioIndiceMese = Math.floor(state.time.minutes / minutiPerMese);
    
    state.time.minutes += hours * 60;
    
    const nuovoIndiceMese = Math.floor(state.time.minutes / minutiPerMese);
    
    // Se il calcolo dei mesi è aumentato, chiediamo il nuovo nome
    if (nuovoIndiceMese > vecchioIndiceMese) {
        const nuovoNome = prompt("È passato un mese! Inserisci il nome del nuovo mese:", state.time.monthName);
        if (nuovoNome) {
            state.time.monthName = nuovoNome;
            
            // Opzionale: Incrementa l'anno ogni 12 mesi
            if (nuovoIndiceMese % 12 === 0) {
                state.time.year++;
            }
        }
    }
    
    updateClockUI();
    syncClockToPlayer();
}

// --- NUOVO: GESTIONE CALENDARIO E GRITTY ---
export function updateCalendarData() {
    state.time.monthName = document.getElementById('month-name').value;
    state.time.year = parseInt(document.getElementById('year-num').value);
    syncClockToPlayer();
}

export function toggleGritty() {
    state.time.isGritty = document.getElementById('gritty-toggle').checked;
}

// --- NUOVO: RIPOSO BREVE E LUNGO ---
export function performShortRest() {
    // Se Realismo Crudo è attivo, il riposo breve dura 8 ore, altrimenti 1 ora
    const hours = state.time.isGritty ? 8 : 1;
    addTime(hours);
    console.log(`Riposo Breve completato (+${hours}h)`);
}

export function performLongRest() {
    // Se Realismo Crudo è attivo, il riposo lungo dura 7 giorni (168 ore), altrimenti 8 ore
    const hours = state.time.isGritty ? 168 : 8; 
    const label = state.time.isGritty ? "7 giorni" : "8 ore";
    
    if(!confirm(`Eseguire un Riposo Lungo? (Ripristina HP e Slot a TUTTI i token e avanza di ${label})`)) return;
    
    // 1. Avanza il tempo
    addTime(hours);
    
    // 2. Ripristina tutti i Token
    Object.values(state.tokens).forEach(t => {
        t.hpCurrent = t.hpMax;
        if(t.spellSlots) {
            t.spellSlots.forEach(s => s.used = 0);
        }
        
        // Aggiorna UI Master
        const el = document.getElementById(`tok-${t.id}`);
        if(el) {
            import('./tokens.js').then(m => {
                m.updateHpVisuals(el, t);
                const sb = el.querySelector('.spell-box');
                if(sb) m.updateSpellBoxDisplay(sb, t);
            });
        }
        
        // Sincronizza Giocatore
        import('./player.js').then(m => m.syncTokenToPlayer(t.id));
    });
}

// --- METEO ---
export function toggleWeather() { 
    const p = document.getElementById('weather-panel'); 
    if(p) p.style.display = p.style.display === 'block' ? 'none' : 'block';
}

export function setWeather(type) {
    state.time.currentWeather = type;
    const overlay = document.getElementById('weather-layer');
    const rainCanvas = document.getElementById('rain-canvas');
    if(overlay) overlay.className = ''; 
    if(rainCanvas) {
        rainCanvas.style.display = 'none';
        cancelAnimationFrame(rainReq);
    }
    
    document.querySelectorAll('.weather-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes(`'${type}'`)) btn.classList.add('active');
    });
    
    if(type === 'weather-snow' || type === 'weather-fog') {
        if(overlay) overlay.className = type;
    } else if (type === 'weather-rain') { 
        startRain(); 
    }
    updateSkyColor();
    syncWeatherToPlayer();
}

function startRain() {
    const rainCanvas = document.getElementById('rain-canvas');
    if(!rainCanvas) return;
    const rainCtx = rainCanvas.getContext('2d');
    const gameArea = document.getElementById('game-area');
    rainCanvas.style.display = 'block';
    rainCanvas.width = gameArea.clientWidth; 
    rainCanvas.height = gameArea.clientHeight;
    drops = [];
    for(let i=0; i<200; i++) drops.push({x: Math.random()*rainCanvas.width, y: Math.random()*rainCanvas.height, s: Math.random()*5+10, v: Math.random()*10+15});
    
    function draw() {
        rainCtx.clearRect(0, 0, rainCanvas.width, rainCanvas.height);
        rainCtx.strokeStyle = 'rgba(174,194,224,0.6)'; rainCtx.lineWidth = 1.5; rainCtx.beginPath();
        for(let d of drops) {
            rainCtx.moveTo(d.x, d.y); rainCtx.lineTo(d.x - 2, d.y + d.s);
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
    const pDoc = pWin.document;
    const overlay = pDoc.getElementById('p-weather-overlay');
    const canvas = pDoc.getElementById('p-rain-canvas');
    
    if(overlay) overlay.className = '';
    if(canvas) {
        canvas.style.display = 'none';
        pWin.cancelAnimationFrame(pWin.pRainReq);
    }
    const cw = state.time.currentWeather;
    if(!cw) return;
    
    if(cw === 'weather-snow' || cw === 'weather-fog') {
        if(overlay) overlay.className = cw;
    } else if (cw === 'weather-rain') {
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.style.display = 'block';
        canvas.width = pWin.innerWidth; canvas.height = pWin.innerHeight;
        let pDrops = []; 
        for(let i=0; i<200; i++) pDrops.push({x: Math.random()*canvas.width, y: Math.random()*canvas.height, s: Math.random()*5+10, v: Math.random()*10+15});
        function pDraw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = 'rgba(174,194,224,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath();
            for(let d of pDrops) {
                ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 2, d.y + d.s);
                d.y += d.v; d.x -= 1;
                if(d.y > canvas.height) { d.y = -20; d.x = Math.random() * canvas.width; }
            }
            ctx.stroke();
            pWin.pRainReq = pWin.requestAnimationFrame(pDraw);
        }
        pDraw();
    }
}

// Toggle dropdown mobile
const burgerBtn = document.getElementById('burger-btn');
const burgerDropdown = document.querySelector('.burger-dropdown');

burgerBtn.addEventListener('click', () => {
    burgerDropdown.style.display = burgerDropdown.style.display === 'flex' ? 'none' : 'flex';
});

// Chiude il menu se clicchi fuori
document.addEventListener('click', (e) => {
    if (!burgerBtn.contains(e.target) && !burgerDropdown.contains(e.target)) {
        burgerDropdown.style.display = 'none';
    }
});
