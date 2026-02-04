const gameArea=document.getElementById('game-area'), worldLayer=document.getElementById('world-layer'), mapImg=document.getElementById('map-img'), logPanel=document.getElementById('log-panel'), creationModal=document.getElementById('creation-modal');
let worldScale=1, worldX=0, worldY=0, isPanning=false, panStartX, panStartY, highestZ=100, playerWin=null, tokensData={}, propsData={}, currentSheetId=null, currentInvId=null, currentSpellId=null, currentStatusId=null, currentNotesTokenId=null, initiativeList=[];
const statusIcons = { '🔥':'Bruciato','💤':'Sonno','🩸':'Ferito','🛡️':'Scudo','💀':'Morto','👑':'Leader','🐢':'Lento','🚀':'Haste','👁️':'Conc','🕸️':'Intrapp','🤢':'Avvel','👻':'Etereo' };
let creationType = 'hero', pendingImg="";

// --- CLOCK & REST ---
let gameMinutes = 480, isGritty = false, currentMonthName = "Mese 1", currentYear = 1;
const MOON_A_CYCLE = 28, MOON_B_CYCLE = 19;
const moonPhases = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];

// --- STARS GENERATOR ---
function initStars() {
    const c = document.getElementById('stars-container');
    if(!c) return;
    for(let i=0; i<200; i++) {
        const s = document.createElement('div'); s.className = 'star';
        s.style.left = Math.random() * 100 + '%'; s.style.top = Math.random() * 100 + '%';
        const size = Math.random() * 3 + 1 + 'px'; s.style.width = size; s.style.height = size;
        s.style.animationDuration = (Math.random() * 3 + 2) + 's'; s.style.animationDelay = (Math.random() * 2) + 's';
        c.appendChild(s);
    }
}
initStars();

function toggleClock() { 
    const p = document.getElementById('clock-panel'); 
    const wasOpen = p.style.display === 'block'; // Memorizza se era aperto
    closeAllMenus(); // Chiude tutti gli altri (Musica, Meteo, ecc.)
    
    if (!wasOpen) { // Se era chiuso, aprilo
        p.style.display = 'block'; 
        updateClockUI(); 
    }
}

function toggleGritty() { isGritty = document.getElementById('gritty-toggle').checked; }
function updateCalendarData() { currentMonthName = document.getElementById('month-name').value; currentYear = parseInt(document.getElementById('year-num').value); updateClockUI(); syncClockToPlayer(); }
function addTime(hours) {
    const oldMonth = Math.floor((Math.floor(gameMinutes / 1440)) / 28);
    gameMinutes += hours * 60;
    const newMonth = Math.floor((Math.floor(gameMinutes / 1440)) / 28);
    if (newMonth > oldMonth) { const n = prompt("Nuovo mese! Nome?", "Nuovo Mese"); if(n) { currentMonthName = n; document.getElementById('month-name').value = n; } }
    updateClockUI(); syncClockToPlayer(); addLog(`Tempo: <strong>+${hours}h</strong>`, "", "(Tempo)");
}
function performLongRest() {
    let d = isGritty ? 168 : 8; if(!confirm(isGritty ? "Riposo Lungo (7gg)?" : "Riposo Lungo (8h)?")) return;
    for (let id in tokensData) { let t = tokensData[id]; if(t.isEnemy) continue; t.hpCurrent = t.hpMax; t.spellSlots.forEach(s => s.used = 0); updateHpVisuals(document.getElementById(`tok-${id}`), t); if(t.showStats) syncTokenToPlayer(id); }
    addTime(d); addLog("Riposo Lungo completato.", "crit-success", "(Riposo)");
}
function performShortRest() {
    let d = isGritty ? 8 : 1; if(!confirm(isGritty ? "Riposo Breve (8h)?" : "Riposo Breve (1h)?")) return;
    for (let id in tokensData) {
        let t = tokensData[id]; if(t.isEnemy) continue;
        if (isGritty) { t.hpCurrent = Math.min(t.hpMax, t.hpCurrent + Math.floor((t.hpMax - t.hpCurrent) / 2)); t.spellSlots.forEach(s => { s.used = Math.max(0, s.used - Math.ceil(s.max / 2)); }); } 
        else { if(t.classType === 'Warlock') t.spellSlots.forEach(s => s.used = 0); }
        updateHpVisuals(document.getElementById(`tok-${id}`), t); if(t.showStats) syncTokenToPlayer(id);
    }
    addTime(d); addLog("Riposo Breve completato.", "", "(Riposo)");
}

// --- SKY & COLOR LOGIC ---
function updateSkyColor() {
    const time = gameMinutes % 1440;
    let r, g, b, showSun = false, showStars = false;
    
    // Day Cycle: 6:00 (360) - 20:00 (1200)
    if (time >= 360 && time <= 1200) { 
        showSun = true;
        const peak = 780; // 13:00
        const dist = Math.abs(time - peak);
        const maxDist = 420; 
        const f = Math.max(0, 1 - (dist / maxDist));
        r = Math.floor(20 + (115 * f)); g = Math.floor(20 + (186 * f)); b = Math.floor(60 + (175 * f));
    } else { // Night
        showStars = true;
        r = 5; g = 5; b = 16;
    }
    
    if (currentWeather === 'weather-rain' || currentWeather === 'weather-storm') {
        r = Math.floor(r * 0.3); g = Math.floor(g * 0.3); b = Math.floor(b * 0.35);
        showSun = false; 
    }
    
    const col = `rgb(${r},${g},${b})`;
    const ga = document.getElementById('game-area');
    if(ga) ga.style.backgroundColor = col;
    
    const sunC = document.getElementById('sun-container'); if(sunC) sunC.style.display = showSun ? 'block' : 'none';
    const starC = document.getElementById('stars-container'); if(starC) starC.style.display = showStars ? 'block' : 'none';
    
    if(playerWin && !playerWin.closed) { 
        const p = playerWin.document.getElementById('p-game-area'); if(p) p.style.backgroundColor = col; 
        const ps = playerWin.document.getElementById('p-sun-container'); if(ps) ps.style.display = showSun ? 'block' : 'none';
        const pst = playerWin.document.getElementById('p-stars-container'); if(pst) pst.style.display = showStars ? 'block' : 'none';
    }
}

function updateClockUI() {
    const d = Math.floor(gameMinutes / 1440) + 1; const dom = ((d - 1) % 28) + 1;
    const h = Math.floor((gameMinutes % 1440) / 60), m = gameMinutes % 60;
    
    document.getElementById('clock-display').textContent = `${h<10?'0'+h:h}:${m<10?'0'+m:m}`;
    
    const cd = document.getElementById('calendar-display'); 
    cd.textContent = `Giorno ${dom}`;
    cd.className = [7,14,21,28].includes(dom) ? "clock-day special-day" : "clock-day";
    document.getElementById('month-name').value = currentMonthName; 
    document.getElementById('year-num').value = currentYear;
    updateSkyColor();
}

function syncClockToPlayer() {
    if(!playerWin || playerWin.closed) return;
    const d = Math.floor(gameMinutes / 1440) + 1, dom = ((d - 1) % 28) + 1;
    const h = Math.floor((gameMinutes % 1440) / 60), m = gameMinutes % 60;
    
    let pc = playerWin.document.getElementById('p-clock');
    if(!pc) { pc = playerWin.document.createElement('div'); pc.id = 'p-clock'; pc.className = 'p-clock-overlay'; playerWin.document.body.appendChild(pc); }

    const isSp = [7,14,21,28].includes(dom) ? "color:#f44336;text-shadow:0 0 5px #d32f2f;" : "color:#aaa";
    pc.innerHTML = `<div style="font-size:24px">${h<10?'0'+h:h}:${m<10?'0'+m:m}</div><div style="font-size:16px;color:#FF9800">${currentMonthName} ${currentYear}</div><div style="font-size:14px;${isSp}">Giorno ${dom}</div>`;

    updateSkyColor();
}

// --- WEATHER SYSTEM ---
let currentWeather = '';
let rainReq; const rainCanvas = document.getElementById('rain-canvas'); const rainCtx = rainCanvas.getContext('2d');
let drops = []; const flashDiv = document.getElementById('storm-flash');

function toggleWeather() { 
    const p = document.getElementById('weather-panel'); 
    const wasOpen = p.style.display === 'block';
    closeAllMenus(); 
    
    if (!wasOpen) p.style.display = 'block'; 
}

function setWeather(type) {
    currentWeather = type;
    const overlay = document.getElementById('weather-layer');
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
    const btn = Array.from(document.querySelectorAll('.weather-btn')).find(b => b.getAttribute('onclick').includes(type));
    if(btn) btn.classList.add('active');
    
    updateSkyColor();
    syncWeatherToPlayer();
}

function startRain(isStorm) {
    rainCanvas.style.display = 'block';
    rainCanvas.width = window.innerWidth; rainCanvas.height = window.innerHeight;
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

function syncWeatherToPlayer() {
    if(!playerWin || playerWin.closed) return;
    const pWin = playerWin; 
    
    pWin.document.getElementById('p-weather-overlay').className = '';
    pWin.document.getElementById('p-rain-canvas').style.display = 'none';
    pWin.cancelAnimationFrame(pWin.pRainReq);
    pWin.document.getElementById('p-storm-flash').style.display = 'none';
    
    if(currentWeather === 'weather-snow' || currentWeather === 'weather-fog') {
        pWin.document.getElementById('p-weather-overlay').className = currentWeather;
    } else if (currentWeather === 'weather-rain' || currentWeather === 'weather-storm') {
        const isStorm = (currentWeather === 'weather-storm');
        const cvs = pWin.document.getElementById('p-rain-canvas');
        const ctx = cvs.getContext('2d');
        const flash = pWin.document.getElementById('p-storm-flash');
        
        cvs.style.display = 'block';
        cvs.width = pWin.innerWidth; cvs.height = pWin.innerHeight;
        if(isStorm) flash.style.display = 'block';
        
        let drops = []; const count = isStorm ? 500 : 200;
        for(let i=0; i<count; i++) drops.push({x: Math.random()*cvs.width, y: Math.random()*cvs.height, s: Math.random()*5+10, v: Math.random()*10+15});
        
        function pDraw() {
            ctx.clearRect(0, 0, cvs.width, cvs.height);
            ctx.strokeStyle = 'rgba(174,194,224,0.6)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            if (isStorm && Math.random() > 0.98) { flash.style.opacity = 0.6; setTimeout(()=>flash.style.opacity=0, 100); }
            for(let d of drops) {
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

// --- MUSIC ---
let bgMusic=new Audio(), playlist=[], currentTrackIdx=-1, isShuffle=false, isLoop=true;
let playerMuted = false;

bgMusic.onended = () => nextTrack();

function toggleMusic() { 
    const p = document.getElementById('music-panel'); 
    const wasOpen = p.style.display === 'block';
    closeAllMenus(); 
    
    if (!wasOpen) p.style.display = 'block'; 
}

function togglePlayerMute() { playerMuted = document.getElementById('mute-player-toggle').checked; syncAudioState(); }

document.getElementById('upload-music').addEventListener('change', function(e) {
    if(e.target.files.length > 0) {
        for (let i = 0; i < e.target.files.length; i++) playlist.push(e.target.files[i]);
        renderPlaylist();
        if(currentTrackIdx === -1 && playlist.length > 0) playTrack(0);
    }
    this.value='';
});

function renderPlaylist() {
    const c = document.getElementById('music-playlist'); c.innerHTML = "";
    playlist.forEach((f, i) => {
        const div = document.createElement('div'); div.className = 'music-item' + (i === currentTrackIdx ? ' active' : '');
        div.textContent = f.name; div.onclick = () => playTrack(i);
        c.appendChild(div);
    });
}

function playTrack(i) {
    if(i < 0 || i >= playlist.length) return;
    currentTrackIdx = i;
    const file = playlist[i];
    const url = URL.createObjectURL(file);
    bgMusic.src = url; bgMusic.play();
    document.getElementById('current-track').textContent = file.name;
    document.getElementById('btn-playpause-p').textContent = "⏸";
    renderPlaylist(); syncAudioToPlayer();
}

function playPauseMusic() {
    if(bgMusic.paused) { if(bgMusic.src) bgMusic.play(); document.getElementById('btn-playpause-p').textContent = "⏸"; }
    else { bgMusic.pause(); document.getElementById('btn-playpause-p').textContent = "▶"; }
    syncAudioState();
}
function stopMusic() { bgMusic.pause(); bgMusic.currentTime = 0; document.getElementById('btn-playpause-p').textContent = "▶"; syncAudioState(); }
function prevTrack() { playTrack(currentTrackIdx - 1 >= 0 ? currentTrackIdx - 1 : playlist.length - 1); }
function nextTrack() {
    if (isShuffle) { playTrack(Math.floor(Math.random() * playlist.length)); }
    else { 
        let next = currentTrackIdx + 1;
        if (next >= playlist.length) { if(isLoop) next = 0; else return; }
        playTrack(next);
    }
}
function setVolume(v) { bgMusic.volume = parseFloat(v); syncAudioState(); }
function toggleShuffle() { isShuffle = !isShuffle; document.getElementById('btn-shuffle').style.color = isShuffle ? "#4CAF50" : "white"; }
function toggleLoop() { isLoop = !isLoop; document.getElementById('btn-loop').style.color = isLoop ? "#4CAF50" : "white"; }

function syncAudioToPlayer(){if(playerWin&&!playerWin.closed&&bgMusic.src){const p=playerWin.document.getElementById('p-audio');if(p){p.src=bgMusic.src;p.volume=bgMusic.volume;p.play().catch(()=>{});}}}
function syncAudioState(){
    if(playerWin && !playerWin.closed){
        const p = playerWin.document.getElementById('p-audio');
        if(p){
            p.volume = playerMuted ? 0 : bgMusic.volume;
            if(bgMusic.paused) p.pause(); else p.play().catch(()=>{});
            
            if(Math.abs(p.currentTime - bgMusic.currentTime) > 0.3) p.currentTime = bgMusic.currentTime;
        }
    }
}
setInterval(syncAudioState, 1000);

// --- CORE ---
window.addEventListener('beforeunload',e=>{e.preventDefault();e.returnValue='';});
function downloadJSON(d,f){const b=new Blob([JSON.stringify(d)],{type:"application/json"});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=f;a.click();URL.revokeObjectURL(u);}
function downloadSession(){
    const s={time: gameMinutes, gritty: isGritty, month: currentMonthName, year: currentYear, map:mapImg.getAttribute('src'),tokens:Object.values(tokensData),props:Object.values(propsData),init:initiativeList};
    if(!s.map&&s.tokens.length===0){alert("Vuoto.");return;} downloadJSON(s,`Session_${new Date().toISOString().slice(0,10)}.ses`);
}

function rollDice(s) {
    const m = parseInt(document.getElementById('dice-mod').value)||0, sec = document.getElementById('gm-roll').checked;
    const r = Math.floor(Math.random()*s)+1, t = r+m;
    const type = (s===20&&r===20)?"crit-success":(s===20&&r===1?"crit-fail":(sec?"secret":""));
    const txt = `<strong>d${s}</strong> (${r}) ${m>=0?'+':''}${m} = <strong>${t}</strong>`;
    addLog(txt, type, sec?"(GM)":"");
    if(!sec && playerWin && !playerWin.closed && playerWin.triggerDiceAnim) {
        syncLogToPlayer(txt, type);
        playerWin.triggerDiceAnim(s, r);
    }
}
function addLog(h,t,p){const d=document.createElement('div');d.className=`log-entry ${t}`;d.innerHTML=(p?`<small>${p}</small> `:"")+h;logPanel.prepend(d);setTimeout(()=>d.style.opacity='0',9000);setTimeout(()=>d.remove(),10000);}

function changeZoom(d){worldScale=Math.min(Math.max(0.1,worldScale+d),5);updateWorldTransform();}
function resetView(){worldScale=1;worldX=0;worldY=0;updateWorldTransform();}

// --- MAPPA CENTRATA ---
function updateWorldTransform(){
    worldLayer.style.transform=`translate(${worldX}px,${worldY}px) scale(${worldScale})`;
    syncWorldView();
}

function syncWorldView(){
    if(playerWin && !playerWin.closed){
        const w = playerWin.document.getElementById('p-world-layer');
        const pArea = playerWin.document.getElementById('p-game-area');
        
        if(w && pArea) {
            const masterW = gameArea.clientWidth;
            const masterH = gameArea.clientHeight;
            const playerW = pArea.clientWidth;
            const playerH = pArea.clientHeight;
            const diffX = (playerW - masterW) / 2;
            const diffY = (playerH - masterH) / 2;
            w.style.transform = `translate(${worldX + diffX}px,${worldY + diffY}px) scale(${worldScale})`;
        }
    }
}

gameArea.addEventListener('mousedown',e=>{if(e.target.closest('.token-container')||e.target.closest('.prop-container')||e.target.tagName==='BUTTON')return;isPanning=true;panStartX=e.clientX-worldX;panStartY=e.clientY-worldY;});
window.addEventListener('mousemove',e=>{if(isPanning){e.preventDefault();worldX=e.clientX-panStartX;worldY=e.clientY-panStartY;updateWorldTransform();}});
window.addEventListener('mouseup',()=>isPanning=false);

gameArea.addEventListener('wheel', e => {
    e.preventDefault(); // Blocca lo scroll della pagina web
    
    // Esegue la tua funzione di zoom (rimuovendo il blocco 'if')
    changeZoom(e.deltaY < 0 ? 0.1 : -0.1);
}, { passive: false });

document.getElementById('upload-map').addEventListener('change',e=>{if(e.target.files[0]){const r=new FileReader();r.onload=v=>{mapImg.src=v.target.result;mapImg.style.width="100%";resetView();setTimeout(syncMap,200);};r.readAsDataURL(e.target.files[0]);}});

document.getElementById('upload-token').addEventListener('change',e=>{
    const f=e.target.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=v=>{
        try{const d=JSON.parse(v.target.result);
            if(d.map||(Array.isArray(d.tokens)&&d.map)){if(d.map){mapImg.src=d.map;mapImg.style.width="100%";setTimeout(syncMap,200);}const tl=Array.isArray(d.tokens)?d.tokens:[];tl.forEach(t=>spawnToken(t));const pl=Array.isArray(d.props)?d.props:[];pl.forEach(p=>spawnProp(p));initiativeList=d.init||[];renderInitiative();syncInitiativeToPlayer();alert("Sessione caricata!");}else if(Array.isArray(d)){d.forEach(t=>spawnToken(t));}else{spawnToken(d);}}catch(e){alert("Errore file. Usa il Token Creator.");}
            e.target.value=''; 
        };
        r.readAsText(f);
    });
    
    document.getElementById('upload-session').addEventListener('change', e=>{
    const f = e.target.files[0]; if(!f) return; const r = new FileReader();
    r.onload = v => { try {
        const s = JSON.parse(v.target.result);
        if (s.map) { mapImg.src = s.map; mapImg.style.width = "100%"; }
        
        // Pulisce e ricarica i dati
        document.querySelectorAll('.token-container').forEach(e => e.remove()); 
        document.querySelectorAll('.prop-container').forEach(e => e.remove());
        tokensData = {}; propsData = {}; initiativeList = [];
        
        if (s.time) gameMinutes = s.time; if (s.month) currentMonthName = s.month; if (s.year) currentYear = s.year;
        if (s.gritty !== undefined) { isGritty = s.gritty; document.getElementById('gritty-toggle').checked = isGritty; }
        
        updateClockUI();
        if (s.tokens) s.tokens.forEach(t => spawnToken(t)); 
        if (s.props) s.props.forEach(p => spawnProp(p)); 
        if (s.init) initiativeList = s.init;
        
        renderInitiative(); syncInitiativeToPlayer(); syncClockToPlayer(); setTimeout(syncMap, 200); 
        
        // --- MODIFICA FONDAMENTALE ---
        alert("Sessione caricata!");
        startNewSession(); // <--- Questa riga chiude la schermata iniziale!
        // -----------------------------

    } catch (err) { alert("Errore file sessione."); } };
    r.readAsText(f); e.target.value = '';
});
    
    document.getElementById('upload-prop').addEventListener('change', e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=v=>{ spawnProp({ id: Date.now(), image: v.target.result, x: (-worldX + gameArea.clientWidth/2)/worldScale, y: (-worldY + gameArea.clientHeight/2)/worldScale, z: 50, scale: 1 }); }; r.readAsDataURL(f); e.target.value=''; });
    
    function spawnProp(d){
        if(propsData[d.id]) d.id = Date.now(); 
        propsData[d.id] = d;
        const el = document.createElement('div'); el.className = 'prop-container'; el.id = `prop-${d.id}`;
        el.style.left = d.x + 'px'; el.style.top = d.y + 'px'; el.style.zIndex = d.z; 
        if(d.scale) el.style.transform = `scale(${d.scale})`;
        
        el.innerHTML = `<div class="prop-controls"><button class="mini-btn btn-del">x</button></div><div class="resize-handle">↘</div><img src="${d.image}" class="prop-img">`;
        
        const btnDel = el.querySelector('.btn-del');
        btnDel.onclick = (e) => { e.stopPropagation(); el.remove(); delete propsData[d.id]; removePropFromPlayer(d.id); };
        
        const handle = el.querySelector('.resize-handle');
        setupResize(el, handle, d.id, true);
        
        setupPropDrag(el, d.id); 
        worldLayer.appendChild(el); 
        syncPropToPlayer(d.id);
    }
    
    function setupResize(el, handle, id, isProp) {
        let startY, startScale;
        handle.addEventListener('mousedown', e => {
            e.stopPropagation();
            startY = e.clientY;
            startScale = (isProp ? propsData[id].scale : tokensData[id].scale) || 1;
            
            function doResize(ev) {
                const dy = ev.clientY - startY;
                let newScale = Math.max(0.2, startScale + dy * 0.01); 
                if(isProp) { propsData[id].scale = newScale; syncPropToPlayer(id); }
                else { tokensData[id].scale = newScale; syncTokenToPlayer(id); }
                el.style.transform = `scale(${newScale})`;
            }
            
            function stopResize() {
                window.removeEventListener('mousemove', doResize);
                window.removeEventListener('mouseup', stopResize);
            }
            
            window.addEventListener('mousemove', doResize);
            window.addEventListener('mouseup', stopResize);
        });
    }
    
    function setupPropDrag(el, id){
        let dr=false, sx, sy, il, it;
        el.addEventListener('mousedown', e => { 
            if(e.button!==0 || e.target.tagName==='BUTTON' || e.target.className.includes('resize')) return; 
            e.stopPropagation(); 
            dr=true; sx=e.clientX; sy=e.clientY; il=el.offsetLeft; it=el.offsetTop; 
            propsData[id].z = ++highestZ; el.style.zIndex = highestZ; syncPropToPlayer(id);
        });
        window.addEventListener('mousemove', e => {
            if(dr){ 
                e.preventDefault(); 
                const dx=(e.clientX-sx)/worldScale;
                const dy=(e.clientY-sy)/worldScale; 
                el.style.left=(il+dx)+'px'; el.style.top=(it+dy)+'px'; 
                propsData[id].x=il+dx; propsData[id].y=it+dy; 
                syncPropToPlayer(id); 
            }
        });
        window.addEventListener('mouseup', () => dr=false);
    }
    
    function syncPropToPlayer(id){
        if(!playerWin||playerWin.closed)return;
        const d=propsData[id], w=playerWin.document.getElementById('p-world-layer'); 
        let t=playerWin.document.getElementById(`p-prop-${id}`);
        if(!t){ t=playerWin.document.createElement('div'); t.id=`p-prop-${id}`; t.style.position="absolute"; t.innerHTML=`<img src="${d.image}" style="display:block;max-width:200px;">`; w.appendChild(t); }
        t.style.left=d.x+'px'; t.style.top=d.y+'px'; t.style.zIndex=d.z; t.style.transform=`scale(${d.scale})`;
    }
    function removePropFromPlayer(id){ if(playerWin&&!playerWin.closed){ const e=playerWin.document.getElementById(`p-prop-${id}`); if(e)e.remove(); } }
    
    // --- TOKENS ---
    function openCreationModal(type) {
        creationType = type;
        const title = document.getElementById('creation-title');
        const slotDiv = document.getElementById('slot-input-col');
        if (type === 'enemy') { title.textContent = "Nuovo Nemico"; title.style.color = "#FF9800"; slotDiv.style.display = "none"; } 
        else { title.textContent = "Nuovo Eroe"; title.style.color = "white"; slotDiv.style.display = "block"; }
        if(!pendingImg) document.getElementById('upload-token').click();
    }
    
    function closeModal(){creationModal.style.display='none';pendingImg="";}
    
    function confirmCreation(){
        const isEnemy = creationType === 'enemy';
        const atkCount = parseInt(document.getElementById('new-atk-count').value) || 1;
        
        const d={ 
            id:Date.now(),
            name:document.getElementById('new-name').value, 
            hpCurrent:parseInt(document.getElementById('new-hp').value)||1,
            hpMax:parseInt(document.getElementById('new-hp').value)||1, 
            ac:parseInt(document.getElementById('new-ac').value)||10, 
            slots: isEnemy ? 0 : (parseInt(document.getElementById('new-slots').value)||0), 
            attackCount: atkCount,
            hidden:document.getElementById('new-hidden').checked, 
            showStats: !isEnemy && document.getElementById('new-showstats')?.checked,
            isEnemy: isEnemy, 
            statsVisible: false, 
            image:pendingImg, scale:1, inventory:[], spellSlots:[], statuses:[], notes:"", 
            attacks: [],
            x:(-worldX+gameArea.clientWidth/2)/worldScale, y:(-worldY+gameArea.clientHeight/2)/worldScale, z:++highestZ,
            // Init FASE 1 data
            details: { type: "Umanoide Medio, Qualsiasi", acType: "(Armatura naturale)", senses: "Percezione Passiva 10", languages: "Comune", cr: "0 (0 XP)", profBonus: "+2" },
            traits: [], legendaryActions: []
        };
        
        if(!isEnemy && d.slots>0) d.spellSlots.push({level:1,name:"Liv. 1",max:d.slots,used:0});
        spawnToken(d); closeModal();
    }
    
    function spawnToken(d){
    if(tokensData[d.id]) d.id = Date.now();
    
    // --- Inizializzazione Dati (Standard) ---
    if(!d.inventory) d.inventory=[]; if(!d.spellSlots) d.spellSlots=[]; if(!d.statuses) d.statuses=[]; 
    if(!d.stats) d.stats={str:10,dex:10,con:10,int:10,wis:10,cha:10};
    if(!d.details) d.details = { type: "Umanoide Medio, Qualsiasi", acType: "(Armatura naturale)", senses: "Percezione Passiva 10", languages: "Comune", cr: "0 (0 XP)", profBonus: "+2" };
    if(!d.traits) d.traits = []; if(!d.legendaryActions) d.legendaryActions = [];
    if(!d.attacks) d.attacks = []; if(!d.attackCount) d.attackCount = 1;
    if(!d.isEnemy && d.attacks.length === 0) { const str = d.stats.str || 10; const strMod = Math.floor((str - 10) / 2); const prof = 2; const toHit = strMod + prof; const hitStr = toHit >= 0 ? `+${toHit}` : `${toHit}`; d.attacks.push({name: "Colpo Disarmato", hit: hitStr, dmg: `${1 + strMod}`}); }
    tokensData[d.id]=d;

    const el=document.createElement('div');el.className='token-container'+(d.hidden?' token-hidden':'');el.id=`tok-${d.id}`;
    el.style.left=d.x+'px';el.style.top=d.y+'px';el.style.zIndex=d.z;if(d.scale)el.style.transform=`scale(${d.scale})`;
    
    // --- BARRA SUPERIORE (Top) ---
    const cTop=document.createElement('div'); cTop.className='token-controls';
    
    // 1. Visibilità Token
    cTop.append(mkBtn('👁️','btn-vis',e=>{d.hidden=!d.hidden;const t=document.getElementById(`tok-${d.id}`);d.hidden?t.classList.add('token-hidden'):t.classList.remove('token-hidden');syncTokenToPlayer(d.id);}));
    
    // 2. Iniziativa
    cTop.append(mkBtn('⚔️','btn-init',e=>{const v=prompt("Iniziativa:");if(v)addToInitiative(d.id,parseInt(v));}));
    
    // 3. Condizioni
    cTop.append(mkBtn('✨','btn-cond',e=>openStatusMenu(d.id)));
    
    // 4. Mostra Statistiche ai Giocatori (Rimesso qui sopra)
    if(d.isEnemy){ 
        let b=mkBtn('📊','btn-show-stats',e=>{d.statsVisible=!d.statsVisible;e.target.classList.toggle('active');syncTokenToPlayer(d.id);}); 
        if(d.statsVisible)b.classList.add('active'); cTop.append(b); 
    } else { 
        let b=mkBtn('🛡️','btn-stat',e=>{d.showStats=!d.showStats;e.target.classList.toggle('active');syncTokenToPlayer(d.id);}); 
        if(d.showStats)b.classList.add('active'); cTop.append(b); 
    }

    // 5. Note (Solo nemici)
    if (d.isEnemy) { cTop.append(mkBtn('📝', 'btn-notes', e => openNotes(d.id))); }
    
    // 6. Elimina (X Rossa)
    const bD=mkBtn('✖','btn-del',e=>{if(confirm(`Eliminare ${d.name}?`)){if(confirm("Salvare prima?"))downloadJSON(d,`${d.name}.dnd`);el.remove();delete tokensData[d.id];removeFromInitiative(d.id);removeTokenFromPlayer(d.id);}}); bD.addEventListener('mousedown',e=>e.stopPropagation());
    cTop.append(bD);


    // --- LATO SINISTRO (Left) ---
    // Impilati dal basso verso l'alto (grazie a flex-direction: column-reverse nel CSS)
    const cLeft = document.createElement('div'); cLeft.className = 'controls-left';
    
    // Primo append = In basso (Scheda)
    cLeft.append(mkBtn('📜','btn-sheet',e=>openSheet(d.id))); 
    
    // Secondo append = Sopra il precedente (Inventario)
    cLeft.append(mkBtn('🎒','btn-inv',e=>openInventory(d.id))); 


    // --- LATO DESTRO (Right) ---
    const cRight = document.createElement('div'); cRight.className = 'controls-right';
    // Tasto Attacchi Rapidi
    cRight.append(mkBtn('⚔️', 'btn-quick-atk', e => toggleQuickAttacks(d.id, e.target.closest('.token-container'))));

    // --- FINE CONTROLLI ---

    const resizer = document.createElement('div'); resizer.className = 'resize-handle'; resizer.textContent = '↘';
    setupResize(el, resizer, d.id, false);
    el.appendChild(resizer);

    const st=document.createElement('div');st.className='stats-row';
    st.append(createStatBox('ac-box',d.ac,'AC',d.id,'ac'));
    if(!d.isEnemy){ const sp=document.createElement('div');sp.className='stat-box spell-box';updateSpellBoxDisplay(sp,d);sp.onmousedown=e=>{e.stopPropagation();openSpellManager(d.id);};st.append(sp); }

    const dr=document.createElement('div');dr.className='token-drag-area';dr.innerHTML=`<div class="token-name">${d.name}</div><img src="${d.image}" class="token-img">`;
    const stOvr=document.createElement('div');stOvr.className='status-overlay';
    const hp=document.createElement('div');hp.className='hp-bar-container';hp.innerHTML=`<div class="hp-bar-fill"></div><div class="hp-text"></div>`;setupHpLogic(hp,d.id);
    
    // Aggiungi tutti i contenitori al token
    el.append(cTop, cLeft, cRight, st, dr, stOvr, hp);
    
    worldLayer.appendChild(el);updateHpVisuals(el,d);updateStatusVisuals(el,d);setupDrag(el,dr,d.id);syncTokenToPlayer(d.id);
    el.oncontextmenu = (e) => { e.preventDefault(); e.stopPropagation(); if(confirm(`Scaricare i dati aggiornati di ${d.name}?`)) { downloadJSON(tokensData[d.id], `${d.name}_updated.dnd`); } };
}
    
    function mkBtn(t,c,f){const b=document.createElement('div');b.className=`mini-btn ${c}`;b.textContent=t;b.onclick=e=>{e.stopPropagation();f(e)};return b;}
    function createStatBox(c,v,t,id,f){const d=document.createElement('div');d.className=`stat-box ${c}`;d.textContent=v;d.onmousedown=e=>{e.stopPropagation();const n=prompt(t,tokensData[id][f]);if(n){tokensData[id][f]=n;d.textContent=n;syncTokenToPlayer(id);}};return d;}
    function setupHpLogic(b,id){b.onmousedown=e=>{e.stopPropagation();const d=tokensData[id],v=prompt("HP:",`${d.hpCurrent}/${d.hpMax}`);if(v){const p=v.split('/');d.hpCurrent=parseInt(p[0]);if(p[1])d.hpMax=parseInt(p[1]);updateHpVisuals(document.getElementById(`tok-${id}`),d);syncTokenToPlayer(id);}};}
    function updateHpVisuals(el,d){const f=el.querySelector('.hp-bar-fill'),t=el.querySelector('.hp-text'),p=Math.max(0,Math.min(100,(d.hpCurrent/d.hpMax)*100));f.style.width=p+"%";t.textContent=`${d.hpCurrent}/${d.hpMax}`;f.style.background=p>50?"#4CAF50":(p>25?"#FFC107":"#F44336");}
    
    function setupDrag(el,h,id){
        let dr=false,sx,sy,il,it;
        h.onmousedown=e=>{
            if(e.button!==0)return; e.stopPropagation();
            dr=true; sx=e.clientX; sy=e.clientY; il=el.offsetLeft; it=el.offsetTop;
            tokensData[id].z=++highestZ; el.style.zIndex=highestZ; syncTokenToPlayer(id);
        };
        window.addEventListener('mousemove',e=>{
            if(dr){
                e.preventDefault();
                const dx=(e.clientX-sx)/worldScale, dy=(e.clientY-sy)/worldScale;
                el.style.left=(il+dx)+'px'; el.style.top=(it+dy)+'px';
                tokensData[id].x=il+dx; tokensData[id].y=it+dy;
                syncTokenToPlayer(id);
            }
        });
        window.addEventListener('mouseup',()=>dr=false);
    }
    
    // --- UI FUNCTIONS ---
    function openSheet(id) {
    currentSheetId = id; const d = tokensData[id];
    if(!d.details) d.details = { type: "Tipo sconosciuto", senses: "-", languages: "-", cr: "0", profBonus: "+2" };
    if(!d.traits) d.traits = [];

    const getMod = (val) => { const m = Math.floor((val - 10) / 2); return m >= 0 ? "+"+m : m; };
    
    const html = `
        <div class="statblock-card">
            <div class="sb-header">
                <input class="sb-title sb-input" value="${d.name}" onchange="updateTokenData('name', this.value)" style="font-size:24px; color:#922610; font-weight:bold;">
                <input class="sb-subtitle sb-input" value="${d.details.type}" onchange="updateDetail('type', this.value)" placeholder="Taglia, Tipo, Allineamento">
            </div>

            <div class="tapered-rule"></div>
            <div class="sb-row">Classe Armatura <span class="sb-val">${d.ac}</span> <input class="sb-input" style="width:100px" value="${d.details.acType||''}" placeholder="(Tipo)" onchange="updateDetail('acType', this.value)"></div>
            <div class="sb-row">Punti Ferita <span class="sb-val">${d.hpCurrent}/${d.hpMax}</span></div>
            <div class="sb-row">Velocità <input class="sb-input" style="width:100px" value="${d.speed||'9m'}" onchange="updateTokenData('speed', this.value)"></div>
            <div class="tapered-rule"></div>

            <div class="ability-grid">
                <div><div>STR</div><span class="ability-score">${d.stats.str}</span><span class="ability-mod">(${getMod(d.stats.str)})</span></div>
                <div><div>DEX</div><span class="ability-score">${d.stats.dex}</span><span class="ability-mod">(${getMod(d.stats.dex)})</span></div>
                <div><div>CON</div><span class="ability-score">${d.stats.con}</span><span class="ability-mod">(${getMod(d.stats.con)})</span></div>
                <div><div>INT</div><span class="ability-score">${d.stats.int}</span><span class="ability-mod">(${getMod(d.stats.int)})</span></div>
                <div><div>WIS</div><span class="ability-score">${d.stats.wis}</span><span class="ability-mod">(${getMod(d.stats.wis)})</span></div>
                <div><div>CHA</div><span class="ability-score">${d.stats.cha}</span><span class="ability-mod">(${getMod(d.stats.cha)})</span></div>
            </div>
            <div class="tapered-rule"></div>

            <div class="sb-row">Sensi <input class="sb-input" value="${d.details.senses}" onchange="updateDetail('senses', this.value)"></div>
            <div class="sb-row">Lingue <input class="sb-input" value="${d.details.languages}" onchange="updateDetail('languages', this.value)"></div>
            <div class="sb-row">Sfida <input class="sb-input" style="width:100px" value="${d.details.cr}" onchange="updateDetail('cr', this.value)"> <span style="margin-left:10px">Bonus Comp. <input class="sb-input" style="width:40px" value="${d.details.profBonus}" onchange="updateDetail('profBonus', this.value)"></span></div>
            <div class="tapered-rule"></div>

            <div id="traits-list"></div>
            <button class="mini-btn" style="width:100%; margin-bottom:10px;" onclick="addTraitRow()">+ Aggiungi Tratto</button>

            <div class="action-header" style="display:flex; justify-content:space-between; align-items:center;">
                <span>Azioni / Attacchi</span>
                <div style="font-size:12px; display:flex; align-items:center; gap:5px; color:#333; font-weight:normal;">
                    Numero di attacchi: 
                    <input type="number" value="${d.attackCount||1}" 
                        style="width:40px; text-align:center; background:rgba(255,255,255,0.5); border:1px solid #922610; color:#000; font-weight:normal; font-size:14px; border-radius:3px;" 
                        onchange="updateAttackCount(this.value)">
                </div>
            </div>
            
            <div id="sheet-attacks-list"></div>
            <button class="mini-btn" style="width:100%; margin-top:5px;" onclick="addAttackRow()">+ Aggiungi Attacco</button>

            ${!d.isEnemy ? `<div class="action-header">Incantesimi</div><button class="mini-btn" onclick="openSpellManager(${d.id})" style="width:100%">Apri Grimorio</button>` : ''}
            <div class="action-header">Note Master</div>
            <div class="sheet-text" style="color:#333;">${d.notes || "-"}</div>
        </div>
    `;
    document.getElementById('sheet-content').innerHTML = html;
    document.getElementById('sheet-content').style.background = "transparent"; 
    renderAttacks();
    renderTraits(); 
    document.getElementById('sheet-modal').style.display = 'flex';
}
    
// --- FASE 1 HELPER FUNCTIONS ---
function updateTokenData(key, val) { tokensData[currentSheetId][key] = val; syncTokenToPlayer(currentSheetId); }
function updateDetail(key, val) { tokensData[currentSheetId].details[key] = val; }

function renderTraits() {
    const d = tokensData[currentSheetId];
    const c = document.getElementById('traits-list');
    if(!c) return;
    c.innerHTML = "";
    d.traits.forEach((t, ix) => {
        const row = document.createElement('div');
        row.className = "trait-block";
        row.innerHTML = `
            <div style="display:flex; justify-content:space-between;">
                <input class="sb-input trait-name" value="${t.name}" placeholder="Nome Tratto (es. Anfibio)" onchange="updateTrait(${ix}, 'name', this.value)" style="font-weight:bold; width:80%;">
                <button class="mini-btn btn-del" onclick="removeTrait(${ix})">x</button>
            </div>
            <textarea class="sb-input" style="width:100%; height:40px; font-size:13px; resize:vertical;" placeholder="Descrizione..." onchange="updateTrait(${ix}, 'desc', this.value)">${t.desc}</textarea>
        `;
        c.appendChild(row);
    });
}
function addTraitRow() { tokensData[currentSheetId].traits.push({name:"", desc:""}); renderTraits(); }
function updateTrait(ix, key, val) { tokensData[currentSheetId].traits[ix][key] = val; }
function removeTrait(ix) { if(confirm("Rimuovere tratto?")){ tokensData[currentSheetId].traits.splice(ix, 1); renderTraits(); }}

function renderAttacks() {
    const d = tokensData[currentSheetId];
    const c = document.getElementById('sheet-attacks-list');
    if(!c) return;
    c.innerHTML = "";
    
    if(!d.attacks) d.attacks = [];
    
    d.attacks.forEach((atk, ix) => {
        const row = document.createElement('div');
        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.marginBottom = "6px";
        row.style.borderBottom = "1px dotted #922610";
        row.style.paddingBottom = "4px";
        row.style.gap = "3px";
        
        row.innerHTML = `
            <input type="text" value="${atk.name}" placeholder="Nome Attacco" 
                style="flex:2; background:transparent; border:none; color:#000; font-weight:normal; font-size:14px; font-family:'Segoe UI', sans-serif;" 
                onchange="updateAttack(${ix}, 'name', this.value)">
            
            <input type="text" value="${atk.hit}" placeholder="+Hit" 
                style="width:35px; text-align:center; background:transparent; border:none; border-bottom:1px solid #2E7D32; color:#2E7D32; font-weight:bold; font-size:13px;" 
                onchange="updateAttack(${ix}, 'hit', this.value)">
            <button class="mini-btn" style="background:#4CAF50; color:white; border:1px solid #2E7D32;" title="Tira per Colpire" onclick="rollAttackAction('hit', '${atk.hit}', '${atk.name}')">🎲</button>
            
            <input type="text" value="${atk.dmg}" placeholder="Danni" 
                style="flex:1; text-align:right; background:transparent; border:none; border-bottom:1px solid #C62828; color:#C62828; font-size:13px;" 
                onchange="updateAttack(${ix}, 'dmg', this.value)">
            <button class="mini-btn" style="background:#E91E63; color:white; border:1px solid #C62828;" title="Tira Danni" onclick="rollAttackAction('dmg', '${atk.dmg}', '${atk.name}')">💥</button>
            
            <button class="mini-btn btn-del" style="margin-left:5px;" onclick="removeAttackRow(${ix})">x</button>
        `;
        c.appendChild(row);
    });
}

function addAttackRow() { tokensData[currentSheetId].attacks.push({name:"", hit:"+0", dmg:"1d4"}); renderAttacks(); }
function removeAttackRow(ix) { if(confirm("Eliminare attacco?")) { tokensData[currentSheetId].attacks.splice(ix, 1); renderAttacks(); } }
function updateAttack(ix, key, val) { tokensData[currentSheetId].attacks[ix][key] = val; }
function updateAttackCount(val) { tokensData[currentSheetId].attackCount = parseInt(val) || 1; }

function rollAttackAction(type, formula, name) {
    let txt = "";
    let logClass = "";
    let res = 0;
    
    if (type === 'hit') {
        const mod = parseInt(formula.replace('+','')) || 0;
        const die = Math.floor(Math.random() * 20) + 1;
        res = die + mod;
        const crit = (die === 20) ? "crit-success" : (die === 1 ? "crit-fail" : "");
        logClass = crit;
        txt = `<strong>${name} (TxC)</strong>: d20 (${die}) ${mod>=0?'+':''}${mod} = <strong>${res}</strong>`;
        
        if(playerWin && !playerWin.closed && playerWin.triggerDiceAnim) {
            syncLogToPlayer(txt, logClass);
            playerWin.triggerDiceAnim(20, die);
        }
    } 
    else {
        let expression = formula.toLowerCase().replace(/\s/g, '');
        if (!expression.startsWith('+') && !expression.startsWith('-')) expression = '+' + expression;
        
        const regex = /([+-])(\d*d\d+|\d+)/g;
        let match;
        let logDetails = [];
        res = 0;
        
        while ((match = regex.exec(expression)) !== null) {
            const sign = match[1] === '+' ? 1 : -1;
            const term = match[2];
            
            if (term.includes('d')) {
                let [countStr, faceStr] = term.split('d');
                let count = countStr === "" ? 1 : parseInt(countStr);
                let faces = parseInt(faceStr);
                let subRolls = [];
                let subTotal = 0;
                for (let i = 0; i < count; i++) {
                    let r = Math.floor(Math.random() * faces) + 1;
                    subRolls.push(r);
                    subTotal += r;
                }
                res += subTotal * sign;
                const signStr = (sign === -1) ? "- " : (logDetails.length > 0 ? "+ " : "");
                logDetails.push(`${signStr}${count}d${faces}[${subRolls.join(',')}]`);
            } else {
                let val = parseInt(term);
                res += val * sign;
                const signStr = (sign === -1) ? "- " : (logDetails.length > 0 ? "+ " : "");
                logDetails.push(`${signStr}${val}`);
            }
        }
        
        if (logDetails.length === 0) { res = 0; logDetails.push("0"); }
        logClass = "damage-log"; 
        txt = `<strong>${name} (Danni)</strong>: ${logDetails.join(' ')} = <strong>${res}</strong>`;
        if(playerWin && !playerWin.closed) syncLogToPlayer(txt, "");
    }
    addLog(txt, logClass);
}

// --- GESTIONE INVENTARIO (NUOVA GRAFICA) ---
function openInventory(id) {
    currentInvId = id; 
    const d = tokensData[id];
    
    const html = `
        <div class="statblock-card">
            <div class="sb-header" style="display:flex; justify-content:space-between; align-items:center;">
                <span class="sb-title">Zaino</span>
                <span class="sb-subtitle" style="font-size:16px; font-weight:bold;">${d.name}</span>
            </div>
            
            <div style="display:flex; font-size:10px; color:#922610; text-transform:uppercase; margin-bottom:5px; font-weight:bold;">
                <span style="flex:1;">Oggetto</span>
                <span style="width:50px; text-align:center; margin-right:35px;">Qtà</span>
            </div>

            <div id="inv-list-container" class="inv-list-container" style="max-height:60vh;"></div>
            
            <div class="tapered-rule"></div>
            
            <button class="mini-btn" style="width:100%; margin-top:10px; padding:5px;" onclick="addInvRow()">+ Aggiungi Oggetto</button>
            
            <div class="modal-footer" style="border-top:none; margin-top:10px;">
                <button class="primary" style="background-color: #922610 !important; color: white !important; border-color: #5a1005 !important;" onclick="closeInventory()">Chiudi</button>
            </div>
        </div>
    `;

    const modalContent = document.querySelector('#inventory-modal .modal-content');
    modalContent.innerHTML = html;
    
    modalContent.style.padding = "0"; 
    modalContent.style.background = "transparent";
    modalContent.style.border = "none";

    renderInventory();
    document.getElementById('inventory-modal').style.display = 'flex';
}

function renderInventory() {
    const d = tokensData[currentInvId]; 
    const c = document.getElementById('inv-list-container'); 
    if(!c) return;
    c.innerHTML = "";
    
    if(!d.inventory) d.inventory = [];

    d.inventory.forEach((item, ix) => {
        const row = document.createElement('div');
        row.className = 'inv-row';
        
        row.innerHTML = `
            <input class="inv-name" value="${item.n}" placeholder="Nome Oggetto" 
                   style="flex:1; margin-right:10px; color:#000; font-weight:normal; background:transparent; border:none;" 
                   onchange="updateInv(${ix},'n',this.value)">
            
            <input type="number" class="inv-qty" value="${item.q}" 
                   style="width:50px; color:#922610; font-weight:bold; background:transparent; border:none; text-align:center;" 
                   onchange="updateInv(${ix},'q',this.value)">
            
            <button class="mini-btn btn-del" onclick="removeInvRow(${ix})">x</button>
        `;
        c.appendChild(row);
    });
    
    syncInventoryToPlayer(true, d);
}

function addInvRow(){ tokensData[currentInvId].inventory.push({n:"", q:1}); renderInventory(); }
function updateInv(ix, k, v){ tokensData[currentInvId].inventory[ix][k] = v; syncInventoryToPlayer(true, tokensData[currentInvId]); }
function removeInvRow(ix){ if(confirm("Eliminare oggetto?")){ tokensData[currentInvId].inventory.splice(ix,1); renderInventory(); } }
function closeInventory(){ document.getElementById('inventory-modal').style.display='none'; syncInventoryToPlayer(false, null); }

function openSpellManager(id) {
    currentSpellId = id;
    const d = tokensData[id];
    
    // HTML Struttura Statblock (Pergamena)
    const html = `
        <div class="statblock-card">
            <div class="sb-header" style="display:flex; justify-content:space-between; align-items:center;">
                <span class="sb-title">Grimorio</span>
                <span class="sb-subtitle" style="font-size:16px; font-weight:bold;">${d.name}</span>
            </div>
            
            <div style="display:flex; font-size:10px; color:#922610; text-transform:uppercase; margin-bottom:5px; font-weight:bold;">
                <span style="width:90px;">Livello</span>
                <span style="flex:1;">Slot Disponibili / Usati</span>
                <span style="width:60px; text-align:right;">Modifica</span>
            </div>

            <div id="spell-list-container" class="inv-list-container" style="max-height:60vh;"></div>
            
            <div class="tapered-rule"></div>
            
            <button class="mini-btn" style="width:100%; margin-top:10px; padding:5px;" onclick="addSpellLevelRow()">+ Aggiungi Livello</button>
            
            <div class="modal-footer" style="border-top:none; margin-top:10px;">
                <button class="primary" style="background-color: #922610 !important; color: white !important; border-color: #5a1005 !important;" onclick="closeSpellManager()">Chiudi</button>
            </div>
        </div>
    `;

    const modalContent = document.querySelector('#spell-modal .modal-content');
    modalContent.innerHTML = html;
    
    // Reset stile modale
    modalContent.style.padding = "0"; 
    modalContent.style.background = "transparent";
    modalContent.style.border = "none";

    renderSpellSlots();
    document.getElementById('spell-modal').style.display = 'flex';
}

function renderSpellSlots() {
    const d = tokensData[currentSpellId];
    const c = document.getElementById('spell-list-container'); 
    if(!c) return;
    c.innerHTML = "";
    
    if(!d.spellSlots) d.spellSlots = [];

    d.spellSlots.forEach((s, ix) => {
        const row = document.createElement('div');
        row.className = 'spell-row';
        
        let slotsHtml = `<div class="spell-slots-area" style="display:flex; flex-wrap:wrap; gap:4px;">`;
        for(let i=0; i<s.max; i++) {
            slotsHtml += `<div class="spell-circle ${i < s.used ? 'used' : ''}" 
                               style="width:14px; height:14px; border-radius:50%; border:1px solid #555; cursor:pointer;" 
                               onclick="togSpell(${ix},${i})"></div>`;
        }
        slotsHtml += `</div>`;

        row.innerHTML = `
            <input class="spell-name" value="${s.name}" 
                   style="width:80px; margin-right:10px; color:#000; font-weight:normal; background:transparent; border:none; border-bottom:1px dashed #922610;" 
                   onchange="renSpell(${ix},this.value)">
            
            <div style="flex:1; display:flex; align-items:center;">
                ${slotsHtml}
            </div>

            <div class="spell-controls-area" style="display:flex; gap:2px;">
                <button class="mini-btn" style="width:20px; height:20px; font-size:10px; padding:0;" onclick="chMaxS(${ix},-1)">-</button>
                <button class="mini-btn" style="width:20px; height:20px; font-size:10px; padding:0;" onclick="chMaxS(${ix},1)">+</button>
                <button class="mini-btn btn-del" style="width:20px; height:20px; font-size:10px; padding:0; margin-left:5px;" onclick="removeSpellLevel(${ix})">x</button>
            </div>
        `;
        c.appendChild(row);
    });
    
    syncSpellsToPlayer(true, d);
}
function removeSpellLevel(ix){ if(confirm("Eliminare livello?")){ tokensData[currentSpellId].spellSlots.splice(ix,1); renderSpellSlots(); refreshTokenDisplay(currentSpellId); } }
function togSpell(ix,i){const s=tokensData[currentSpellId].spellSlots[ix];if(i<s.used)s.used=i;else s.used=i+1;renderSpellSlots();refreshTokenDisplay(currentSpellId);}
function chMaxS(ix,d){const s=tokensData[currentSpellId].spellSlots[ix];s.max=Math.max(0,s.max+d);if(s.used>s.max)s.used=s.max;renderSpellSlots();refreshTokenDisplay(currentSpellId);}
function renSpell(ix,v){tokensData[currentSpellId].spellSlots[ix].name=v;syncSpellsToPlayer(true,tokensData[currentSpellId]);}
function addSpellLevelRow(){const d=tokensData[currentSpellId],n=d.spellSlots.length+1;d.spellSlots.push({level:n,name:`Liv. ${n}`,max:2,used:0});renderSpellSlots();refreshTokenDisplay(currentSpellId);}
function closeSpellManager(){document.getElementById('spell-modal').style.display='none';syncSpellsToPlayer(false,null);}
function refreshTokenDisplay(id){const t=document.getElementById(`tok-${id}`);if(t){const b=t.querySelector('.spell-box');updateSpellBoxDisplay(b,tokensData[id]);}syncTokenToPlayer(id);}
function updateSpellBoxDisplay(b,d){if(!d.spellSlots||d.spellSlots.length===0){b.textContent="0";return;}let a=0,t=0;d.spellSlots.forEach(s=>{a+=(s.max-s.used);t+=s.max;});b.textContent=`${a}`;b.title=`Slot: ${a}/${t}`;}
function syncSpellsToPlayer(s,d){if(!playerWin||playerWin.closed)return;const m=playerWin.document.getElementById('p-spell-modal');if(!s){m.style.display='none';return;}playerWin.document.getElementById('p-spell-title').textContent="Grimorio: "+d.name;const b=playerWin.document.getElementById('p-spell-body');b.innerHTML="";if(!d.spellSlots||d.spellSlots.length===0)b.innerHTML="Vuoto";else d.spellSlots.forEach(sl=>{let h=`<div class="p-row"><span>${sl.name}</span><div class="p-spell-area">`;for(let i=0;i<sl.max;i++)h+=`<div class="spell-circle ${i<sl.used?'used':''}"></div>`;h+=`</div></div>`;b.innerHTML+=h;});m.style.display='block';}

function openStatusMenu(id){currentStatusId=id;const g=document.getElementById('status-grid');g.innerHTML="";Object.keys(statusIcons).forEach(ic=>{const d=document.createElement('div');d.className='status-opt';if(tokensData[id].statuses.includes(ic))d.classList.add('selected');d.innerHTML=`<div style="font-size:24px">${ic}</div><div style="font-size:10px">${statusIcons[ic]}</div>`;d.onclick=()=>toggleStatus(id,ic,d);g.appendChild(d);});document.getElementById('status-modal').style.display='flex';}
function toggleStatus(id,ic,el){const d=tokensData[id],idx=d.statuses.indexOf(ic);if(idx>-1){d.statuses.splice(idx,1);el.classList.remove('selected');}else{d.statuses.push(ic);el.classList.add('selected');}updateStatusVisuals(document.getElementById(`tok-${id}`),d);syncTokenToPlayer(id);}
function updateStatusVisuals(el,d){const o=el.querySelector('.status-overlay');o.innerHTML="";d.statuses.forEach(s=>{o.innerHTML+=`<div class="status-icon">${s}</div>`;});}
function openNotes(id) { currentNotesTokenId = id; document.getElementById('notes-area').value = tokensData[id].notes || ""; document.getElementById('notes-title').textContent = "Note: " + tokensData[id].name; document.getElementById('notes-modal').style.display = 'flex'; }
function saveNotes() { if(currentNotesTokenId) tokensData[currentNotesTokenId].notes = document.getElementById('notes-area').value; document.getElementById('notes-modal').style.display = 'none'; }

function addToInitiative(id,val){const e=initiativeList.find(i=>i.id===id);if(e)e.val=val;else initiativeList.push({id:id,val:val,active:false});renderInitiative();syncInitiativeToPlayer();}
function removeFromInitiative(id){initiativeList=initiativeList.filter(i=>i.id!==id);renderInitiative();syncInitiativeToPlayer();}
function sortInitiative(){initiativeList.sort((a,b)=>b.val-a.val);renderInitiative();syncInitiativeToPlayer();}
function nextTurn(){if(initiativeList.length===0)return;let i=initiativeList.findIndex(i=>i.active);if(i>-1)initiativeList[i].active=false;initiativeList[(i+1)%initiativeList.length].active=true;renderInitiative();syncInitiativeToPlayer();}
function clearInitiative(){if(confirm("Pulire?")){initiativeList=[];renderInitiative();syncInitiativeToPlayer();}}
function renderInitiative(){const l=document.getElementById('init-list');l.innerHTML="";initiativeList.forEach(i=>{const d=tokensData[i.id];if(!d)return;l.innerHTML+=`<div class="init-row ${i.active?'active-turn':''}"><span class="init-val">${i.val}</span><span class="init-name">${d.name}</span><div class="init-ctrls"><button onclick="removeFromInitiative(${i.id})">x</button></div></div>`;});}

function openPlayerWindow(){
    if(playerWin&&!playerWin.closed){playerWin.focus();return;}
    const w=window.outerWidth||1000, h=window.outerHeight||700;
    playerWin=window.open("","PlayerView",`width=${w},height=${h}`);
    try{playerWin.resizeTo(w,h);}catch(e){}
    
    const script=`<script>
        window.addEventListener('resize', () => { if(window.opener && window.opener.syncWorldView) { window.opener.syncWorldView(); } });
        function triggerDiceAnim(s, r) {
            const overlay = document.getElementById('dice-overlay'); const die = document.getElementById('anim-die');
            overlay.style.display = 'flex'; die.className = 'rolling-anim';
            let clip=""; if(s===4)clip="polygon(50% 0%, 0% 100%, 100% 100%)"; else if(s===6)clip="none"; else if(s===8)clip="polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)"; else if(s===10)clip="polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)"; else if(s===12)clip="polygon(50% 0%, 95% 38%, 82% 100%, 18% 100%, 5% 38%)"; else if(s===20)clip="polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)"; else clip="circle(50%)";
            die.style.clipPath = clip; die.style.background = "#FF9800"; die.style.color = "#000";
            let c=0; const iv = setInterval(()=>{ die.textContent = Math.floor(Math.random()*s)+1; c++; if(c>10) clearInterval(iv); }, 60);
            setTimeout(()=>{ clearInterval(iv); die.textContent = r; die.className = 'landed-anim'; setTimeout(()=>{ overlay.style.display='none'; }, 1200); }, 800);
        }
        const c = document.getElementById('p-stars-container');
        if(c) {
            for(let i=0; i<200; i++) {
                const s = document.createElement('div'); s.className = 'star';
                const size = Math.random() * 3 + 1 + 'px'; s.style.width = size; s.style.height = size;
                s.style.left = Math.random() * 100 + '%'; s.style.top = Math.random() * 100 + '%';
                s.style.animationDuration = (Math.random() * 3 + 2) + 's'; s.style.animationDelay = (Math.random() * 2) + 's';
                c.appendChild(s);
            }
        }
    <\/script>`;
    
    playerWin.document.write(`<!DOCTYPE html><html><head><title>GIOCATORI</title><style>body{margin:0;background:#000;font-family:sans-serif;overflow:hidden}
    #p-game-area{width:100vw;height:100vh;position:relative;transition:background-color 2s ease} 
        #p-world-layer{position:absolute;top:0;left:0;transition:transform .1s linear; z-index:10;}.p-map{display:block;pointer-events:none}.p-token{position:absolute;width:100px;display:flex;flex-direction:column;align-items:center;transition:all .1s linear}.p-img{width:100%;border-radius:5px}.p-hp-bar{width:100%;height:8px;background:#333;margin-top:2px;border:1px solid #fff}.p-hp-fill{height:100%;background:#0f0;transition:width .3s}.p-stats-row{display:flex;justify-content:space-between;width:100%;margin-bottom:-10px;z-index:10;position:relative;top:10px}.p-stat-box{width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;border:2px solid #fff;border-radius:5px;color:#fff;background:#2196F3}.p-slot{background:#9C27B0}.p-name{color:#fff;background:rgba(0,0,0,0.6);padding:2px 4px;font-size:12px;border-radius:4px;margin-bottom:2px}.p-status-icon{width:20px;height:20px;background:rgba(0,0,0,0.8);border-radius:50%;display:flex;justify-content:center;align-items:center;font-size:12px;border:1px solid #fff;margin-bottom:2px}.p-status-overlay{position:absolute;top:-5px;right:-5px;display:flex;flex-direction:column}#audio-btn{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:99999;color:#FF9800;font-size:30px;border:none;cursor:pointer}#p-log{position:absolute;bottom:20px;left:20px;width:300px;display:flex;flex-direction:column-reverse;pointer-events:none}.p-log-entry{background:rgba(0,0,0,0.6);color:#fff;padding:8px;margin-top:5px;border-left:4px solid #777}.crit-success{border-color:#0f0}.crit-fail{border-color:#f00}.p-modal{display:none;position:fixed;top:20px;right:20px;width:250px;background:rgba(0,0,0,0.9);border:2px solid #FF9800;padding:15px;color:#fff;z-index:9000;border-radius:10px}.p-row{display:flex;justify-content:space-between;padding:5px;border-bottom:1px solid #444}#p-init-panel{position:absolute;top:20px;left:20px;width:180px;background:rgba(0,0,0,0.8);border:2px solid #555;padding:10px;color:#fff;z-index:9000}.p-init-row{display:flex;padding:4px;border-bottom:1px solid #444;align-items:center}.active{background:rgba(255,152,0,0.3);border-left:3px solid #FF9800}.spell-circle{width:12px;height:12px;border-radius:50%;border:1px solid #888;margin-right:2px;display:inline-block}.used{background:#9C27B0}.p-spell-area{display:flex;flex-wrap:wrap;gap:2px;flex-direction:row;} #p-inv-list{width:100%;border-collapse:collapse;margin-top:10px;} td{padding:5px;border-bottom:1px solid #444;font-size:14px;} .p-clock-overlay{position:absolute;top:10px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);padding:5px 15px;border-radius:20px;color:#FF9800;font-weight:bold;border:1px solid #555;text-align:center;z-index:2000} #dice-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.4); z-index: 5000; display: none; align-items: center; justify-content: center; pointer-events: none; } #anim-die { width: 150px; height: 150px; background: #FF9800; color: #000; display: flex; justify-content: center; align-items: center; font-size: 60px; font-weight: bold; border: 5px solid #fff; box-shadow: 0 0 30px rgba(255, 152, 0, 0.8); transition: transform 0.1s; } .rolling-anim { animation: shake 0.5s infinite; } .landed-anim { animation: pulse 0.5s ease-out; transform: scale(1.2); background: #4CAF50 !important; color: white !important; border-color: #FF9800 !important; } @keyframes shake { 0% { transform: translate(1px, 1px) rotate(0deg); } 20% { transform: translate(-3px, 0px) rotate(5deg); } 40% { transform: translate(1px, -1px) rotate(5deg); } 60% { transform: translate(-3px, 1px) rotate(0deg); } 80% { transform: translate(-1px, -1px) rotate(5deg); } 100% { transform: translate(1px, -2px) rotate(-5deg); } } @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.5); } 100% { transform: scale(1); } }
    /* PLAYER SKY */
    #p-sun-container { display: none; position: absolute; top:0; left:0; width:100%; height:100%; pointer-events: none; }
    #p-stars-container { display: none; position: absolute; top:0; left:0; width:100%; height:100%; }
    .sun { position: absolute; top:0; left:0; right:0; bottom:0; margin: auto; width:70px; height:70px; border-radius:50%; background:white; opacity:0.9; box-shadow: 0px 0px 40px 15px white; }
    .ray_box { position: absolute; margin: auto; top:0px; left:0; right:0; bottom:0; width:70px; animation: ray_anim 120s linear infinite; }
    .ray { background: linear-gradient(top, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 100%); margin-left:10px; border-radius:80% 80% 0 0; position:absolute; opacity:0.1; }
    .ray1 { height:170px; width:30px; transform: rotate(180deg); top:-175px; left: 15px; } .ray2 { height:100px; width:8px; transform: rotate(220deg); top:-90px; left: 75px; } .ray3 { height:170px; width:50px; transform: rotate(250deg); top:-80px; left: 100px; } .ray4 { height:120px; width:14px; transform: rotate(305deg); top:30px; left: 100px; } .ray5 { height:140px; width:30px; transform: rotate(-15deg); top:60px; left: 40px; } .ray6 { height:90px; width:50px; transform: rotate(30deg); top:60px; left: -40px; } .ray7 { height:180px; width:10px; transform: rotate(70deg); top:-35px; left: -40px; } .ray8 { height:120px; width:30px; transform: rotate(100deg); top:-45px; left:-90px; } .ray9 { height:80px; width:10px; transform: rotate(120deg); top:-65px; left:-60px; } .ray10 { height:190px; width:23px; transform: rotate(150deg); top:-185px; left: -60px; }
    @keyframes ray_anim { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }
    .star { position: absolute; background: #fff; border-radius: 50%; animation: twinkle infinite alternate; }
    @keyframes twinkle { from { transform: scale(1); } to { transform: scale(1.5); box-shadow: 0 0 5px 0.5px rgba(150, 150, 150, 0.6); } }
    /* PLAYER WEATHER - Z-INDEX 5 (Behind map 10) */
    #p-weather-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 5; }
    .weather-rain { background-image: linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%); background-size: 2px 30px; animation: rain 0.4s linear infinite; opacity: 0.6; }
    .weather-snow { background-image: radial-gradient(3px 3px at 20% 30%, rgba(255, 255, 255, 0.9) 50%, rgba(0,0,0,0)), radial-gradient(3px 3px at 40% 70%, rgba(255, 255, 255, 0.9) 50%, rgba(0,0,0,0)), radial-gradient(3px 3px at 60% 20%, rgba(255, 255, 255, 0.9) 50%, rgba(0,0,0,0)), radial-gradient(3px 3px at 80% 90%, rgba(255, 255, 255, 0.9) 50%, rgba(0,0,0,0)); background-size: 200px 200px; animation: snow 5s linear infinite; opacity: 0.8; }
    .weather-fog { background: linear-gradient(to right, rgba(200,200,200,0) 0%, rgba(200,200,200,0.4) 40%, rgba(200,200,200,0) 100%); background-size: 200% 100%; animation: fog-scroll 10s linear infinite; opacity: 0.5; }
    .weather-storm { background-image: linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0) 100%); background-size: 3px 40px; animation: rain 0.2s linear infinite, flash 6s infinite; opacity: 0.7; }
    .weather-night { background-color: rgba(0, 5, 20, 0.7); }
    @keyframes rain { 0% { background-position: 0% 0%; } 100% { background-position: 10px 100%; } }
    @keyframes snow { 0% { background-position: 0px 0px; } 100% { background-position: 50px 200px; } }
    @keyframes fog-scroll { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
    @keyframes flash { 0%, 92%, 95% { background-color: transparent; } 93%, 96% { background-color: rgba(255, 255, 255, 0.5); } }
    /* PLAYER RAIN */
    #p-rain-canvas { display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 5; pointer-events: none; }
    #p-storm-flash { display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: white; opacity: 0; z-index: 5; pointer-events: none; }
    </style></head><body>
    <div id="dice-overlay" style="display:none"><div id="anim-die">20</div></div>
    
    <button id="audio-btn" onclick="document.getElementById('p-audio').play().then(()=>{this.style.display='none'}).catch(()=>{})">🔊 ABILITA AUDIO</button><audio id="p-audio" loop></audio>
    <div id="p-game-area">
        <div id="p-sky-layer" style="position:absolute;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;">
            <div id="p-stars-container"></div>
            <div id="p-sun-container">
                <div class="sun">
                    <div class="ray_box">
                        <div class="ray ray1"></div><div class="ray ray2"></div><div class="ray ray3"></div><div class="ray ray4"></div><div class="ray ray5"></div>
                        <div class="ray ray6"></div><div class="ray ray7"></div><div class="ray ray8"></div><div class="ray ray9"></div><div class="ray ray10"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <div id="p-weather-overlay"></div>
        <canvas id="p-rain-canvas"></canvas>
        <div id="p-storm-flash"></div>
        
        <div id="p-world-layer" style="z-index:10"><img id="p-map-img"></div>
    </div>
    
    <div id="p-log"></div><div id="p-inv-modal" class="p-modal"><h3 id="p-inv-title" style="margin-top:0">Zaino</h3><table id="p-inv-list"><tbody></tbody></table></div><div id="p-spell-modal" class="p-modal" style="border-color:#9C27B0;left:20px;right:auto"><h3 id="p-spell-title" style="margin-top:0">Grimorio</h3><div id="p-spell-body"></div></div><div id="p-init-panel" style="display:none"><h4>Iniziativa</h4><div id="p-init-list"></div></div>${script}</body></html>`);
        
        syncMap();syncWorldView();Object.keys(tokensData).forEach(id=>syncTokenToPlayer(id));if(currentAudioUrl)syncAudioToPlayer();syncInitiativeToPlayer();syncClockToPlayer();syncWeatherToPlayer();playerWin.document.close();
    }
    
    function syncLogToPlayer(h,t){if(!playerWin||playerWin.closed)return;const l=playerWin.document.getElementById('p-log');if(l){const d=playerWin.document.createElement('div');d.className=`p-log-entry ${t}`;d.innerHTML=h;l.prepend(d);setTimeout(()=>d.style.opacity='0',9000);setTimeout(()=>d.remove(),10000);}}
    function syncMap(){if(playerWin&&!playerWin.closed){const m=playerWin.document.getElementById('p-map-img');if(m){m.src=mapImg.getAttribute('src');m.style.width=mapImg.style.width||"auto";}}}
    
    function syncWorldView(){
        if(playerWin && !playerWin.closed){
            const w = playerWin.document.getElementById('p-world-layer');
            const pArea = playerWin.document.getElementById('p-game-area');
            
            if(w && pArea) {
                // Calcola le dimensioni delle due finestre
                const masterW = gameArea.clientWidth;
                const masterH = gameArea.clientHeight;
                const playerW = pArea.clientWidth;
                const playerH = pArea.clientHeight;
                
                // Calcola la differenza per allineare i centri
                const diffX = (playerW - masterW) / 2;
                const diffY = (playerH - masterH) / 2;
                
                // Applica la trasformazione con l'offset
                w.style.transform = `translate(${worldX + diffX}px,${worldY + diffY}px) scale(${worldScale})`;
            }
        }
    }
    function syncTokenToPlayer(id){if(!playerWin||playerWin.closed)return;const d=tokensData[id],w=playerWin.document.getElementById('p-world-layer');let t=playerWin.document.getElementById(`p-tok-${id}`);if(d.hidden){if(t)t.remove();return;}if(!t){t=playerWin.document.createElement('div');t.id=`p-tok-${id}`;t.className='p-token';t.innerHTML=`<div class="p-status-overlay"></div><div class="p-stats-row" style="display:none"><div class="p-stat-box p-ac"></div><div class="p-stat-box p-slot"></div></div><div class="p-name"></div><img class="p-img"><div class="p-hp-bar"><div class="p-hp-fill"></div></div>`;w.appendChild(t);}t.style.left=d.x+'px';t.style.top=d.y+'px';t.style.zIndex=d.z;t.style.transform=`scale(${d.scale})`;t.querySelector('.p-img').src=d.image;t.querySelector('.p-name').textContent=d.name;const st=t.querySelector('.p-status-overlay');st.innerHTML="";d.statuses.forEach(s=>st.innerHTML+=`<div class="p-status-icon">${s}</div>`);const sr=t.querySelector('.p-stats-row'),hf=t.querySelector('.p-hp-fill');let show=(d.isEnemy?d.statsVisible:d.showStats);if(show){sr.style.display='flex';sr.querySelector('.p-ac').textContent=d.ac;if(!d.isEnemy){sr.querySelector('.p-slot').style.display='flex';let a=0,tt=0;if(d.spellSlots)d.spellSlots.forEach(s=>{a+=(s.max-s.used);tt+=s.max;});sr.querySelector('.p-slot').textContent=`${a}/${tt}`;}else{sr.querySelector('.p-slot').style.display='none';}hf.style.display='block';const p=Math.max(0,Math.min(100,(d.hpCurrent/d.hpMax)*100));hf.style.width=p+"%";hf.style.background=p>50?"#4CAF50":(p>25?"#FFC107":"#F44336");}else{sr.style.display='none';hf.style.display='none';}}
    function syncInventoryToPlayer(s,d){if(!playerWin||playerWin.closed)return;const m=playerWin.document.getElementById('p-inv-modal');if(!s){m.style.display='none';return;}playerWin.document.getElementById('p-inv-title').textContent="Zaino: "+d.name;const b=playerWin.document.querySelector('#p-inv-list tbody');b.innerHTML="";if(!d.inventory||d.inventory.length===0)b.innerHTML="<tr><td colspan='2' style='color:#777'>Vuoto</td></tr>";else d.inventory.forEach(i=>{b.innerHTML+=`<tr><td>${i.n}</td><td style="text-align:right">x${i.q}</td></tr>`;});m.style.display='block';}
    function syncSpellsToPlayer(s,d){if(!playerWin||playerWin.closed)return;const m=playerWin.document.getElementById('p-spell-modal');if(!s){m.style.display='none';return;}playerWin.document.getElementById('p-spell-title').textContent="Grimorio: "+d.name;const b=playerWin.document.getElementById('p-spell-body');b.innerHTML="";if(!d.spellSlots||d.spellSlots.length===0)b.innerHTML="Vuoto";else d.spellSlots.forEach(sl=>{let h=`<div class="p-row"><span>${sl.name}</span><div class="p-spell-area">`;for(let i=0;i<sl.max;i++)h+=`<div class="spell-circle ${i<sl.used?'used':''}"></div>`;h+=`</div></div>`;b.innerHTML+=h;});m.style.display='block';}
    function syncInitiativeToPlayer(){if(!playerWin||playerWin.closed)return;const p=playerWin.document.getElementById('p-init-panel');if(initiativeList.length===0){p.style.display='none';return;}p.style.display='block';const l=playerWin.document.getElementById('p-init-list');l.innerHTML="";initiativeList.forEach(i=>{const d=tokensData[i.id];if(!d||d.hidden)return;l.innerHTML+=`<div class="p-init-row ${i.active?'active':''}"><img src="${d.image}" style="width:25px;height:25px;border-radius:50%;margin-right:5px"><span>${d.name}</span></div>`;});}
    function removeTokenFromPlayer(id){if(playerWin&&!playerWin.closed){const e=playerWin.document.getElementById(`p-tok-${id}`);if(e)e.remove();}}
    function syncPropToPlayer(id){
        if(!playerWin||playerWin.closed)return;
        const d=propsData[id], w=playerWin.document.getElementById('p-world-layer'); 
        let t=playerWin.document.getElementById(`p-prop-${id}`);
        if(!t){ t=playerWin.document.createElement('div'); t.id=`p-prop-${id}`; t.style.position="absolute"; t.innerHTML=`<img src="${d.image}" style="display:block;max-width:200px;">`; w.appendChild(t); }
        t.style.left=d.x+'px'; t.style.top=d.y+'px'; t.style.zIndex=d.z; t.style.transform=`scale(${d.scale})`;
    }
    function removePropFromPlayer(id){ if(playerWin&&!playerWin.closed){ const e=playerWin.document.getElementById(`p-prop-${id}`); if(e)e.remove(); } }

    // --- START SCREEN LOGIC ---

// Eseguiamo questo all'avvio
document.addEventListener("DOMContentLoaded", () => {
    // Aggiungiamo la classe loading al body per nascondere l'interfaccia di gioco
    document.body.classList.add('loading');
});

function startNewSession() {
    // Rimuove la schermata iniziale
    const screen = document.getElementById('start-screen');
    screen.style.opacity = '0';
    setTimeout(() => {
        screen.style.display = 'none';
        document.body.classList.remove('loading'); // Mostra la toolbar
    }, 500);
}

// Modifichiamo leggermente il caricamento sessione per chiudere il menu
const originalSessionLoader = document.getElementById('upload-session').onchange; // Salviamo il vecchio listener se esiste (ma meglio riscriverlo qui sotto per pulizia)

// SOSTITUISCI il listener 'upload-session' esistente con questo:
document.getElementById('upload-session').addEventListener('change', e => {
    const f = e.target.files[0]; if(!f) return; 
    const r = new FileReader();
    r.onload = v => { try {
        const s = JSON.parse(v.target.result);
        if (s.map) { mapImg.src = s.map; mapImg.style.width = "100%"; }
        
        // Pulisce e carica
        document.querySelectorAll('.token-container').forEach(e => e.remove()); 
        document.querySelectorAll('.prop-container').forEach(e => e.remove());
        tokensData = {}; propsData = {}; initiativeList = [];
        
        if (s.time) gameMinutes = s.time; if (s.month) currentMonthName = s.month; if (s.year) currentYear = s.year;
        if (s.gritty !== undefined) { isGritty = s.gritty; document.getElementById('gritty-toggle').checked = isGritty; }
        
        updateClockUI();
        if (s.tokens) s.tokens.forEach(t => spawnToken(t)); 
        if (s.props) s.props.forEach(p => spawnProp(p)); 
        if (s.init) initiativeList = s.init;
        
        renderInitiative(); syncInitiativeToPlayer(); syncClockToPlayer(); 
        setTimeout(syncMap, 200); 
        
        alert("Sessione caricata!");
        startNewSession(); // <--- CHIUDE IL MENU INIZIALE
        
    } catch (err) { alert("Errore file sessione."); } };
    r.readAsText(f); e.target.value = '';
});

// --- GESTIONE CHIUSURA MENU (CLICK OUTSIDE) ---

// Funzione che chiude tutti i pannelli flottanti
function closeAllMenus() {
    ['clock-panel', 'music-panel', 'weather-panel'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.display = 'none';
    });
}

// Listener globale: se clicchi fuori, chiude i menu
window.addEventListener('mousedown', function(e) {
    // 1. Se clicco dentro un pannello rapido, non fare nulla
    if (e.target.closest('.quick-attack-panel')) return;

    // 2. Se clicco il bottone che apre il pannello rapido, non fare nulla (ci pensa il toggle)
    if (e.target.closest('.btn-quick-atk')) return;

    // 3. Chiudi tutti i pannelli attacchi rapidi aperti
    document.querySelectorAll('.quick-attack-panel').forEach(p => p.remove());

    // --- Logica precedente per i menu fluttuanti ---
    if (e.target.closest('.floating-panel')) return;
    if (e.target.closest('button')) return;
    closeAllMenus();
});

// --- GESTIONE ATTACCHI RAPIDI (LATO DESTRO) ---

function toggleQuickAttacks(id, tokenEl) {
    // Controlla se il pannello esiste già per questo token
    let panel = tokenEl.querySelector('.quick-attack-panel');
    
    // Se esiste, lo chiudiamo e basta (toggle)
    if (panel) {
        panel.remove();
        return;
    }

    // Chiude eventuali altri pannelli rapidi aperti su altri token
    document.querySelectorAll('.quick-attack-panel').forEach(p => p.remove());

    const d = tokensData[id];
    if (!d.attacks || d.attacks.length === 0) {
        alert("Nessun attacco configurato.");
        return;
    }

    // Crea il nuovo pannello
    panel = document.createElement('div');
    panel.className = 'quick-attack-panel';
    
    // Titolo del pannello
    panel.innerHTML = `<div style="font-weight:bold; color:#922610; border-bottom:2px solid #922610; margin-bottom:5px; font-variant:small-caps;">Attacchi Rapidi</div>`;
    
    // Genera la lista degli attacchi
    d.attacks.forEach(atk => {
        const row = document.createElement('div');
        row.className = 'qa-row';
        row.innerHTML = `
            <span class="qa-name" title="${atk.name}">${atk.name}</span>
            <div class="qa-btns">
                <button class="qa-btn hit" onclick="rollAttackAction('hit', '${atk.hit}', '${atk.name}')">${atk.hit}</button>
                <button class="qa-btn dmg" onclick="rollAttackAction('dmg', '${atk.dmg}', '${atk.name}')">${atk.dmg}</button>
            </div>
        `;
        panel.appendChild(row);
    });

    // Aggiunge il pannello dentro il token container
    tokenEl.appendChild(panel);
}