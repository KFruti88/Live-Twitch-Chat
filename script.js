/* ==========================================================================
   JAVASCRIPT: WEREWOLF MASTER LOGIC
   Standard: Full Code Mandate (No Snippets)
   Features: EST Clock, Wolf Burst Alerts, Trophy Syncing, Chat Log
   ========================================================================== */

const user = "werewolf3788";
const WOLF_EMOJIS = ["🐺", "🐾", "🌕", "🌑"];
let guestTriggered = false; // Prevents guest alert from double-firing

/**
 * EST Clock Engine: Fixed to America/New_York (Eastern Time)
 */
function updateClock() {
    const estTime = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        timeZone: 'America/New_York' 
    });
    const clockElement = document.getElementById('local-time');
    if (clockElement) {
        clockElement.innerText = estTime;
    }
}

/**
 * Wolf Burst Alert Engine: Fires for New Followers, Subs, and Guests
 */
function triggerWolfBurst(type, name) {
    const box = document.getElementById('flashy-alert');
    const title = document.getElementById('alert-type');
    const userDisplay = document.getElementById('alert-user');
    const container = document.getElementById('special-event-container');

    if (!box || !title || !userDisplay || !container) return;

    // Update Banner Content
    title.innerText = type;
    userDisplay.innerText = name.toUpperCase();
    box.style.display = 'block';
    
    // Spawn 20 Wolf Particles across the screen
    for (let i = 0; i < 20; i++) {
        const el = document.createElement('span');
        el.innerText = WOLF_EMOJIS[Math.floor(Math.random() * WOLF_EMOJIS.length)];
        el.className = "burst-item";
        
        // Randomize Spawn Locations
        el.style.left = Math.floor(Math.random() * 90) + "%";
        el.style.top = Math.floor(Math.random() * 90) + "%";
        
        container.appendChild(el);
        
        // Remove particles from DOM after animation completes
        setTimeout(() => el.remove(), 4000);
    }

    // Hide the alert box after 8 seconds
    setTimeout(() => { 
        box.style.display = 'none'; 
    }, 8000);
}

// --- COMFYJS EVENT LISTENERS ---

// Listen for New Followers
ComfyJS.onFollow = (follower) => { 
    triggerWolfBurst("NEW FOLLOWER", follower); 
};

// Listen for New Subscribers
ComfyJS.onSub = (subscriber) => { 
    triggerWolfBurst("NEW SUBSCRIBER", subscriber); 
};

/**
 * Main Chat Listener: Syncs Trophy counts and Log rendering
 */
ComfyJS.onChat = (chatUser, message, flags, self, extra) => {
    if (self) return;
    const msg = message.toLowerCase();

    // --- TROPHY UPDATERS ---
    
    // Great One Sync: !greatoneGreat 1: $(count greatone)
    // Box only appears if the count is higher than 0
    if (msg.includes("!greatone")) {
        const n = message.match(/\d+/);
        if (n) {
            const count = parseInt(n[0]);
            const goVal = document.getElementById('go-val');
            const goBox = document.getElementById('go-box');
            if (goVal) goVal.innerText = count;
            if (goBox) goBox.style.display = (count > 0) ? 'flex' : 'none';
        }
    }

    // Standard Trophy Listeners (Syncs with StreamElements Counts)
    if (msg.includes("!diamond💎")) { 
        const n = message.match(/\d+/); if(n) document.getElementById('dia-val').innerText = n[0]; 
    }
    if (msg.includes("!gold🥇")) { 
        const n = message.match(/\d+/); if(n) document.getElementById('gold-val').innerText = n[0]; 
    }
    if (msg.includes("!silver🥈")) { 
        const n = message.match(/\d+/); if(n) document.getElementById('silv-val').innerText = n[0]; 
    }
    if (msg.includes("!bronze🥉")) { 
        const n = message.match(/\d+/); if(n) document.getElementById('bron-val').innerText = n[0]; 
    }

    // --- SPECIAL GUEST ENTRY ---
    if (chatUser.toLowerCase() === "unicornbunnyshiver" && !guestTriggered) {
        triggerWolfBurst("SPECIAL GUEST", chatUser);
        guestTriggered = true;
    }

    // --- CHAT LOG RENDERING ---
    const log = document.getElementById('log');
    if (log) {
        const row = document.createElement('div');
        row.className = "chat-row";
        
        // Use user's custom Twitch color or default to Werewolf Orange
        const userColor = extra.userColor || '#FF5F1F';
        
        row.innerHTML = `
            <span class="chat-meta" style="color: ${userColor}">${chatUser}</span>
            <span class="chat-message">${message}</span>
        `;
        
        log.prepend(row);
        
        // Performance Management: Limit to last 10 messages
        if (log.children.length > 10) {
            log.removeChild(log.lastChild);
        }
    }
};

// --- INITIALIZE ENGINES ---
// Start EST Clock
setInterval(updateClock, 1000);
updateClock(); 

// Connect to Twitch Channel
ComfyJS.Init(user);
console.log(`🐺 Werewolf Master Logic: Synchronized for ${user}`);
