/* ==========================================================================
   WEREWOLF MASTER ENGINE - V6.9 (THE UNIFIED PROOF BUILD)
   Standard: Full Code Mandate (No Snippets) - Kevin & Scott
   Updated: 2026-02-08 (Merged Themes, Careers, Two-Way Bridge, & Stability)
   ========================================================================== */

const tmi = require('tmi.js');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { WebcastPushConnection } = require('tiktok-live-connector');

// --- CONFIG & STATE ---
const CHAT_CHANNEL = 'werewolf3788';
const TT_USER = 'k082412'; 
const EW_TAG = "Werewolf88#9992";

let isLive = false;
let currentTheme = 'standard';

// --- CAREER TROPHY DATA (Locked Baseline) ---
let rankData = { 
    bronze: 410, silver: 544, gold: 193, mythical: 5,
    diamond: 6, legendary: 0, greatone: 0 
};

// --- THEME DATABASE ---
const THEMES = {
    'hunter': { color: '#2ecc71', glow: '#27ae60', name: 'theHunter', showTag: true, showTrophies: true },
    'angler': { color: '#3498db', glow: '#2980b9', name: 'The Angler', showTag: true, showTrophies: true },
    'rivals': { color: '#f1c40f', glow: '#f39c12', name: 'Marvel Rivals', showTag: false, showTrophies: false },
    'cod': { color: '#e74c3c', glow: '#c0392b', name: 'Call of Duty', showTag: false, showTrophies: false },
    'grounded': { color: '#a29bfe', glow: '#6c5ce7', name: 'Grounded', showTag: false, showTrophies: false },
    'farm': { color: '#55efc4', glow: '#00b894', name: 'Farming Sim', showTag: false, showTrophies: false },
    'monopoly': { color: '#74b9ff', glow: '#0984e3', name: 'Monopoly', showTag: false, showTrophies: false },
    'division': { color: '#e67e22', glow: '#d35400', name: 'The Division', showTag: false, showTrophies: false },
    'standard': { color: '#FF5F1F', glow: '#FF5F1F', name: 'Werewolf Hub', showTag: false, showTrophies: false }
};

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));

// --- 1. THE DATA DOOR (API for Overlay) ---
app.get('/api/overlay', (req, res) => {
    const theme = THEMES[currentTheme] || THEMES['standard'];
    res.json({
        ranks: theme.showTrophies ? rankData : null,
        theme: theme,
        gamertag: theme.showTag ? EW_TAG : null,
        tiktokActive: isLive
    });
});

// --- 2. THE UNIVERSAL BRIDGE (YT, Trovo, FB -> Twitch) ---
app.post('/api/bridge', (req, res) => {
    const { user, text, service } = req.body;
    if (user && text && client.readyState() === "OPEN") {
        const relayMsg = `[${service.toUpperCase()}] ${user}: ${text}`;
        client.say(CHAT_CHANNEL, relayMsg); // Relays to Twitch & Overlay
        console.log(`Relay Active: ${relayMsg}`);
    }
    res.sendStatus(200);
});

app.get('/', (req, res) => res.status(200).send("Werewolf Master Engine: ONLINE 🐺"));

// --- 3. CONNECTIONS ---
const tiktok = new WebcastPushConnection(TT_USER);
const client = new tmi.Client({
    identity: { 
        username: CHAT_CHANNEL, 
        password: `oauth:${process.env.TWITCH_OAUTH ? process.env.TWITCH_OAUTH.replace('oauth:', '') : ''}` 
    },
    channels: [CHAT_CHANNEL]
});

// TikTok Chat Relay Logic
tiktok.on('chat', data => {
    if (client.readyState() === "OPEN") {
        client.say(CHAT_CHANNEL, `[TIKTOK] ${data.uniqueId}: ${data.comment}`);
    }
});

// --- 4. STARTUP LOGIC ---
async function startEngine() {
    console.log("🛠️ Starting Werewolf Master Engine v6.9...");

    if (!process.env.TWITCH_OAUTH) {
        console.error("🛑 ERROR: TWITCH_OAUTH missing from Environment Variables!");
        process.exit(1);
    }

    try {
        await client.connect();
        console.log("🚀 Twitch Connection: SUCCESS");

        const serverPort = process.env.PORT || 3000;
        app.listen(serverPort, () => {
            console.log("✅ Engine 6.9: All Platforms Synced & Live.");
        });

    } catch (err) {
        console.error("🛑 Startup Failure:", err.message);
        process.exit(1);
    }

    // --- 5. COMMAND LISTENER ---
    client.on('message', (channel, tags, message, self) => {
        if (self) return;
        const msg = message.toLowerCase();
        const isOwner = (tags.username === CHAT_CHANNEL);

        if (isOwner) {
            // Live Triggers
            if (msg === "!go-live" || msg.includes("live announcement")) {
                isLive = true;
                tiktok.connect().then(() => console.log("✅ TikTok Connected")).catch(() => {});
                console.log("🚀 Multi-Platform Bridge Activated.");
            }

            // Theme Controls
            if (msg.startsWith('!theme ')) {
                const target = msg.replace('!theme ', '').trim();
                if (THEMES[target]) {
                    currentTheme = target;
                    console.log(`🎨 Theme set to: ${target}`);
                }
            }

            // Trophy Tracker (Hunter/Angler Only)
            if (msg === '!bronze') rankData.bronze++;
            if (msg === '!silver') rankData.silver++;
            if (msg === '!gold') rankData.gold++;
            if (msg === '!mythical') rankData.mythical++;
            if (msg === '!diamond') rankData.diamond++;
            if (msg === '!legendary') rankData.legendary++;
            if (msg === '!greatone') rankData.greatone++;

            // Global Broadcast (Twitch -> Discord/Logs)
            if (msg.startsWith('!broadcast ')) {
                const announcement = message.replace('!broadcast ', '');
                if (process.env.DISCORD_WEBHOOK_URL) {
                    axios.post(process.env.DISCORD_WEBHOOK_URL, { content: `📢 **ANNOUNCEMENT:** ${announcement}` });
                }
            }
        }
    });
}

startEngine();

process.on('uncaughtException', (err) => console.log('🛑 UNCAUGHT ERROR:', err.message));
