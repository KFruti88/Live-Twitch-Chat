/* ==========================================================================
   WEREWOLF UNIFIED STRIKE ENGINE - V7.6
   Standard: Full Code Mandate (No Snippets) - Kevin & Scott
   Updated: 2026-02-08 (Unified SE Trigger for TikTok, YT, Trovo, FB)
   ========================================================================== */

const tmi = require('tmi.js');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { WebcastPushConnection } = require('tiktok-live-connector');

// --- CONFIG & CAREER TOTALS ---
const CHAT_CHANNEL = 'werewolf3788';
const TT_USER = 'k082412'; 
let isLive = false; // Bridges stay closed until the announcement
let rankData = { bronze: 410, silver: 544, gold: 193, mythical: 5, diamond: 6, legendary: 0, greatone: 0 };

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));

// --- 1. TIKTOK BRIDGE ENGINE ---
const tiktok = new WebcastPushConnection(TT_USER);

function startRelays() {
    if (isLive) {
        console.log("🐺 Wake up call received. Activating TikTok Bridge...");
        tiktok.connect()
            .then(() => console.log("✅ TikTok Bridge ACTIVE"))
            .catch(() => {
                console.log("🔄 TikTok retry in 30s...");
                setTimeout(startRelays, 30000); 
            });
    }
}

tiktok.on('chat', data => {
    if (client.readyState() === "OPEN") {
        client.say(CHAT_CHANNEL, `[TIKTOK] ${data.uniqueId}: ${data.comment}`);
    }
});

// --- 2. THE UNIVERSAL INBOUND BRIDGE (YT, Trovo, FB -> Twitch) ---
// This gate only opens once isLive is true
app.post('/api/bridge', (req, res) => {
    const { user, text, service } = req.body;
    if (isLive && user && text && client.readyState() === "OPEN") {
        const relayMsg = `[${service.toUpperCase()}] ${user}: ${text}`;
        client.say(CHAT_CHANNEL, relayMsg);
        console.log(`Relay Active: ${relayMsg}`);
    }
    res.sendStatus(200);
});

// --- 3. TWITCH BOT & TRIGGER LOGIC ---
const client = new tmi.Client({
    identity: { 
        username: CHAT_CHANNEL, 
        password: `oauth:${process.env.TWITCH_OAUTH ? process.env.TWITCH_OAUTH.replace('oauth:', '') : ''}` 
    },
    channels: [CHAT_CHANNEL]
});

client.on('message', (channel, tags, message, self) => {
    if (self) return;
    const msg = message.toLowerCase();

    // UNIFIED TRIGGER: Listens for "Current Game:"
    if (tags.username === 'streamelements' && msg.includes('current game:')) {
        console.log("🎯 Live Announcement Detected. Opening All Platform Gates...");
        isLive = true;
        startRelays(); // Starts TikTok
    }

    // Owner Overrides
    if (tags.username === CHAT_CHANNEL) {
        if (msg === '!go-live') { isLive = true; startRelays(); }
        if (msg === '!diamond') rankData.diamond++;
    }
});

// --- 4. STARTUP ---
app.get('/api/overlay', (req, res) => res.json({ ranks: rankData, tiktokActive: isLive }));
app.get('/', (req, res) => res.status(200).send("Werewolf Engine 7.6: ONLINE 🐺"));

async function startEngine() {
    try {
        await client.connect();
        app.listen(process.env.PORT || 3000, () => console.log("✅ Engine 7.6 Ready."));
    } catch (err) { process.exit(1); }
}

startEngine();
