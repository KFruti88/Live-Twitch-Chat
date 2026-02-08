/* ==========================================================================
   WEREWOLF MASTER ENGINE - FINAL PROOF V5.2
   Standard: Full Code Mandate (No Snippets) - Kevin & Scott
   Updated: 2026-02-08 (TikTok Trigger + Themes + Ranks + Proof)
   ========================================================================== */

const tmi = require('tmi.js');
const axios = require('axios');
const express = require('express');
const cors = require('cors');
const { WebcastPushConnection } = require('tiktok-live-connector');

// --- CONFIG & SECRETS ---
const CHAT_CHANNEL = 'werewolf3788';
const TT_USER = 'k082412'; // Your TikTok username
const EW_TAG = "Werewolf88#9992"; // Your Hunter/Angler ID

// --- LIVE STATE & MEMORY ---
let isLive = false; 
let currentTheme = 'standard';
let rankData = { diamond: 0, gold: 0, silver: 0, bronze: 0 };

// --- THEME DATABASE ---
const THEMES = {
    'hunter': { color: '#2ecc71', glow: '#27ae60', name: 'theHunter', showTag: true },
    'angler': { color: '#3498db', glow: '#2980b9', name: 'The Angler', showTag: true },
    'rivals': { color: '#f1c40f', glow: '#f39c12', name: 'Marvel Rivals', showTag: false },
    'cod': { color: '#e74c3c', glow: '#c0392b', name: 'Call of Duty', showTag: false },
    'grounded': { color: '#a29bfe', glow: '#6c5ce7', name: 'Grounded', showTag: false },
    'farm': { color: '#55efc4', glow: '#00b894', name: 'Farming Sim', showTag: false },
    'monopoly': { color: '#74b9ff', glow: '#0984e3', name: 'Monopoly', showTag: false },
    'division': { color: '#e67e22', glow: '#d35400', name: 'The Division', showTag: false },
    'standard': { color: '#FF5F1F', glow: '#FF5F1F', name: 'Werewolf Hub', showTag: false }
};

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));

// --- 1. THE PROOF API (For WordPress Overlay) ---
app.get('/api/overlay', (req, res) => {
    const theme = THEMES[currentTheme] || THEMES['standard'];
    res.json({
        ranks: rankData,
        theme: theme,
        gamertag: theme.showTag ? EW_TAG : null,
        tiktokActive: isLive
    });
});

app.get('/', (req, res) => {
    res.status(200).send("Werewolf Smart Engine: ONLINE 🐺");
});

// --- 2. CONNECTIONS ---
const client = new tmi.Client({
    identity: { username: CHAT_CHANNEL, password: `oauth:${process.env.TWITCH_OAUTH}` },
    channels: [CHAT_CHANNEL]
});

const tiktok = new WebcastPushConnection(TT_USER);

// --- 3. TIKTOK LOGIC (Activation only on "Live Announcement") ---
function startTikTok() {
    if (!isLive) return;
    console.log("🐺 Attempting TikTok Connection...");
    tiktok.connect().then(() => {
        console.log("✅ TikTok Bridge ACTIVE");
    }).catch((err) => {
        console.log("🔄 TikTok retry in 2 mins...");
        setTimeout(startTikTok, 120000);
    });
}

tiktok.on('chat', data => {
    client.say(CHAT_CHANNEL, `[TikTok] ${data.uniqueId}: ${data.comment}`);
});

// --- 4. TWITCH COMMANDS & TRIGGER ENGINE ---
client.on('message', (channel, tags, message, self) => {
    if (self) return;
    const msg = message.toLowerCase();
    const isOwner = (tags.username === CHAT_CHANNEL);

    // LIVE TRIGGER: Only starts TikTok bridge on announcement
    if (isOwner && (msg === "!go-live" || msg.includes("live announcement"))) {
        if (!isLive) {
            isLive = true;
            console.log("🚀 LIVE DETECTED. Starting Multi-Platform Relay...");
            startTikTok();
        }
    }

    // RANK TRACKER
    if (isOwner) {
        if (msg === '!diamond') rankData.diamond++;
        if (msg === '!gold') rankData.gold++;
        if (msg === '!resetranks') rankData = { diamond: 0, gold: 0, silver: 0, bronze: 0 };
        
        // THEME SWITCHER
        if (msg.startsWith('!theme ')) {
            const target = msg.replace('!theme ', '').trim();
            if (THEMES[target]) currentTheme = target;
        }
    }
});

// --- 5. STARTUP ---
client.connect().then(() => {
    console.log("✅ Master Engine V5.2 Online.");
    app.listen(process.env.PORT || 3000);
});

process.on('uncaughtException', (err) => console.log('🛑 ERROR:', err.message));
