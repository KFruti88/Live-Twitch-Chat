const user = "werewolf3788";

// --- EST CLOCK ENGINE ---
function updateClock() {
    const estTime = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        timeZone: 'America/New_York' 
    });
    document.getElementById('local-time').innerText = estTime;
}

// --- CHAT & TROPHY ENGINE ---
ComfyJS.onChat = (user, message, flags, self, extra) => {
    if (self) return;
    const msg = message.toLowerCase();

    // Trophy Updates
    if (msg.includes("!diamond💎")) { const n = message.match(/\d+/); if(n) document.getElementById('dia-val').innerText = n[0]; }
    if (msg.includes("!gold🥇")) { const n = message.match(/\d+/); if(n) document.getElementById('gold-val').innerText = n[0]; }
    if (msg.includes("!silver🥈")) { const n = message.match(/\d+/); if(n) document.getElementById('silv-val').innerText = n[0]; }
    if (msg.includes("!bronze🥉")) { const n = message.match(/\d+/); if(n) document.getElementById('bron-val').innerText = n[0]; }

    // Chat Log
    const log = document.getElementById('log');
    const row = document.createElement('div');
    row.className = "chat-row";
    row.innerHTML = `<span class="chat-meta" style="color: ${extra.userColor || '#FFF'}">${user}</span><span class="chat-message">${message}</span>`;
    log.prepend(row);
    if (log.children.length > 10) log.removeChild(log.lastChild);
};

// Start Engines
setInterval(updateClock, 1000);
updateClock(); 
ComfyJS.Init(user);
