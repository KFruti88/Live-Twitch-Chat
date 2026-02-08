/* ==========================================================================
   WEREWOLF MASTER ENGINE - V4.7 (THE LIVE PROOF BUILD)
   Standard: Full Code Mandate - Kevin & Scott
   Updated: 2026-02-08 (Real-Time Rank Sync)
   ========================================================================== */

const tmi = require('tmi.js');
const axios = require('axios');
const express = require('express');
const cors = require('cors');
const { WebcastPushConnection } = require('tiktok-live-connector');

// --- CONFIG ---
const CHAT_CHANNEL = 'werewolf3788';
const TWITCH_TOKEN = process.env.TWITCH_OAUTH; 

// --- LIVE STATE ---
let rankData = { diamond: 0, gold: 0, silver: 0, bronze: 0 };
let isLive = false;

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));

// --- 1. THE DATA DOOR: Your website pings this ---
app.get('/api/ranks', (req, res) => {
    res.json(rankData);
});

app.get('/', (req, res) => {
    res.status(200).send("Werewolf Proof Engine: ONLINE 🐺");
});

// --- 2. CONNECTIONS ---
const client = new tmi.Client({
    identity: { username: CHAT_CHANNEL, password: `oauth:${TWITCH_TOKEN}` },
    channels: [CHAT_CHANNEL]
});

// --- 3. COMMAND & SYNC LOGIC ---
client.on('message', (channel, tags, message, self) => {
    if (self) return;
    const msg = message.toLowerCase();

    // Only YOU can trigger these updates
    if (tags.username === CHAT_CHANNEL) {
        let updated = false;
        if (msg === '!diamond') { rankData.diamond++; updated = true; }
        if (msg === '!gold') { rankData.gold++; updated = true; }
        if (msg === '!silver') { rankData.silver++; updated = true; }
        if (msg === '!bronze') { rankData.bronze++; updated = true; }
        
        if (msg === '!resetranks') { 
            rankData = { diamond: 0, gold: 0, silver: 0, bronze: 0 }; 
            updated = true; 
        }

        // The Proof: Logging the update in Render so you can see it in logs
        if (updated) console.log(`🏆 RANK UPDATE: ${JSON.stringify(rankData)}`);
    }
});

// --- 4. STARTUP ---
client.connect().then(() => {
    console.log("🚀 Master Proof Engine Online.");
    app.listen(process.env.PORT || 3000);
});
