/* ==========================================================================
   WEREWOLF MASTER ENGINE - V5.4 (CAREER TOTALS & STABILITY)
   Standard: Full Code Mandate (No Snippets) - Kevin & Scott
   Updated: 2026-02-08 (Merged Careers, Themes, Ranks, & TikTok Trigger)
   ========================================================================== */

const tmi = require('tmi.js');
const express = require('express');
const cors = require('cors');
const { WebcastPushConnection } = require('tiktok-live-connector');

// --- CONFIG & STATE ---
const CHAT_CHANNEL = 'werewolf3788';
const TT_USER = 'k082412'; 
const EW_TAG = "Werewolf88#9992";

let isLive = false;
let currentTheme = 'standard';

// --- CAREER TROPHY DATA ---
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

// --- API FOR OVERLAY ---
app.get('/api/overlay', (req, res) => {
    const theme = THEMES[currentTheme] || THEMES['standard'];
    res.json({
        ranks: rankData,
        theme: theme,
        gamertag: theme.showTag ? EW_TAG : null,
        tiktokActive: isLive
    });
});

app.get('/', (req, res) => res.status(200).send("Werewolf Master Engine: ONLINE 🐺"));

// --- TIKTOK CONNECTION ENGINE ---
const tiktok = new WebcastPushConnection(TT_USER);

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

// --- MAIN STARTUP WRAPPER ---
async function startEngine() {
    console.log("🛠️ Starting Werewolf Engine...");

    if (!process.env.TWITCH_OAUTH) {
        console.error("🛑 ERROR: TWITCH_OAUTH environment variable is missing!");
        process.exit(1); 
    }

    const client = new tmi.Client({
        identity: { 
            username: CHAT_CHANNEL, 
            password: `oauth:${process.env.TWITCH_OAUTH.replace('oauth:', '')}` 
        },
        channels: [CHAT_CHANNEL]
    });

    try {
        await client.connect();
        console.log("🚀 Twitch Connection: SUCCESS");

        const serverPort = process.env.PORT || 3000;
        app.listen(serverPort, () => {
            console.log(`✅ Web Portal Active on Port ${serverPort}`);
        });

    } catch (err) {
        console.error("🛑 Engine failed to turn over:", err.message);
        process.exit(1);
    }

    // --- TWITCH EVENT LISTENER ---
    client.on('message', (channel, tags, message, self) => {
        if (self) return;
        const msg = message.toLowerCase();
        const isOwner = (tags.username === CHAT_CHANNEL);

        // TRIGGER: TikTok activates only on announcement
        if (isOwner && (msg === "!go-live" || msg.includes("live announcement"))) {
            if (!isLive) {
                isLive = true;
                console.log("🚀 LIVE DETECTED. Starting TikTok Bridge...");
                startTikTok();
            }
        }

        // TROPHY TRACKER
        if (isOwner) {
            if (msg === '!bronze') rankData.bronze++;
            if (msg === '!silver') rankData.silver++;
            if (msg === '!gold') rankData.gold++;
            if (msg === '!mythical') rankData.mythical++;
            if (msg === '!diamond') rankData.diamond++;
            if (msg === '!legendary') rankData.legendary++;
            if (msg === '!greatone') rankData.greatone++;
            
            // THEME SWITCHER
            if (msg.startsWith('!theme ')) {
                const target = msg.replace('!theme ', '').trim();
                if (THEMES[target]) {
                    currentTheme = target;
                    console.log(`🎨 Theme set to: ${target}`);
                }
            }
        }
    });
}

startEngine();

process.on('uncaughtException', (err) => console.log('🛑 UNCAUGHT ERROR:', err.message));
