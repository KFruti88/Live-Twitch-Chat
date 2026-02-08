/* ==========================================================================
   WEREWOLF MASTER ENGINE - V5.6 (THEME-LOCKED TROPHIES)
   Standard: Full Code Mandate - Kevin & Scott
   Updated: 2026-02-08 (Merged Careers, Two-Way Bridge, & Global Broadcast)
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

// --- CAREER TROPHY DATA (Locked to Hunter/Angler Only) ---
let rankData = { 
    bronze: 410, 
    silver: 544, 
    gold: 193, 
    mythical: 5,
    diamond: 6, 
    legendary: 0, 
    greatone: 0 
};

// --- THEME DATABASE ---
const THEMES = {
    'hunter': { color: '#2ecc71', glow: '#27ae60', name: 'theHunter', showTag: true, showTrophies: true },
    'angler': { color: '#3498db', glow: '#2980b9', name: 'The Angler', showTag: true, showTrophies: true },
    'rivals': { color: '#f1c40f', glow: '#f39c12', name: 'Marvel Rivals', showTag: false, showTrophies: false },
    'monopoly': { color: '#74b9ff', glow: '#0984e3', name: 'Monopoly', showTag: false, showTrophies: false },
    'standard': { color: '#FF5F1F', glow: '#FF5F1F', name: 'Werewolf Hub', showTag: false, showTrophies: false }
};

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));

// --- API FOR OVERLAY ---
app.get('/api/overlay', (req, res) => {
    const theme = THEMES[currentTheme] || THEMES['standard'];
    res.json({
        ranks: theme.showTrophies ? rankData : null, // Only sends numbers if hunting
        theme: theme,
        gamertag: theme.showTag ? EW_TAG : null,
        tiktokActive: isLive
    });
});

// --- INBOUND BRIDGE (YT/Trovo -> Twitch) ---
app.post('/api/bridge', (req, res) => {
    const { user, text, service } = req.body;
    if (user && text && client.readyState() === "OPEN") {
        client.say(CHAT_CHANNEL, `[${service}] ${user}: ${text}`);
    }
    res.sendStatus(200);
});

app.get('/', (req, res) => res.status(200).send("Werewolf Master Engine: ONLINE 🐺"));

const tiktok = new WebcastPushConnection(TT_USER);
function startTikTok() {
    if (!isLive) return;
    tiktok.connect().catch(() => setTimeout(startTikTok, 120000));
}

tiktok.on('chat', data => {
    if (client.readyState() === "OPEN") {
        client.say(CHAT_CHANNEL, `[TikTok] ${data.uniqueId}: ${data.comment}`);
    }
});

const client = new tmi.Client({
    identity: { username: CHAT_CHANNEL, password: `oauth:${process.env.TWITCH_OAUTH}` },
    channels: [CHAT_CHANNEL]
});

async function startEngine() {
    try {
        await client.connect();
        app.listen(process.env.PORT || 3000, () => console.log("✅ Engine 5.6 Live."));
    } catch (err) {
        process.exit(1);
    }

    client.on('message', (channel, tags, message, self) => {
        if (self) return;
        const msg = message.toLowerCase();
        const isOwner = (tags.username === CHAT_CHANNEL);

        if (isOwner) {
            if (msg === "!go-live") { isLive = true; startTikTok(); }
            if (msg.startsWith('!theme ')) {
                const target = msg.replace('!theme ', '').trim();
                if (THEMES[target]) currentTheme = target;
            }
            // Trophy updates
            if (msg === '!diamond') rankData.diamond++;
            if (msg === '!gold') rankData.gold++;
            if (msg === '!silver') rankData.silver++;
            if (msg === '!bronze') rankData.bronze++;
            if (msg === '!greatone') rankData.greatone++;
        }
    });
}

startEngine();
