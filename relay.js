/* ================================================================
   WEREWOLF3788 MASTER RELAY HUB
   Platforms: Twitch, TikTok (Direct), YouTube, Trovo, Facebook
   ================================================================
*/

const tmi = require('tmi.js');
const { WebcastPushConnection } = require('tiktok-live-connector');
const express = require('express');
const axios = require('axios');
const app = express(); // This fixes the "app is not defined" error

app.use(express.json());

// --- CONFIGURATION ---
const CHAT_CHANNEL = 'werewolf3788'; 
const TWITCH_TOKEN = process.env.TWITCH_ACCESS_TOKEN;
const TT_USER = 'k082412';
const DISCORD_URL = "https://discord.com/api/webhooks/1412973382433247252/fFwKe5xeW-S6VgWaPionj0A-ieKu3h_qFLaDZBl2JKobFispq0fBg_5_y8n1cWHwlGpY";

const messageCache = new Set();
const cleanCache = (key) => setTimeout(() => messageCache.delete(key), 60000);

const client = new tmi.Client({
    identity: { username: CHAT_CHANNEL, password: `oauth:${TWITCH_TOKEN}` },
    channels: [CHAT_CHANNEL]
});

// --- DISCORD WEBHOOK SENDER ---
async function sendToDiscord(platform, user, message) {
    if (!DISCORD_URL) return;
    try {
        await axios.post(DISCORD_URL, {
            content: `**[${platform}]** \`${user}\`: ${message}`
        });
    } catch (err) {
        console.error("Discord Webhook Error");
    }
}

// --- 1. TIKTOK DIRECT RELAY ---
const tiktok = new WebcastPushConnection(TT_USER);

tiktok.on('chat', data => {
    const key = `TT:${data.uniqueId}:${data.comment}`;
    if (messageCache.has(key)) return;
    
    client.say(CHAT_CHANNEL, `[TT] ${data.uniqueId}: ${data.comment}`);
    sendToDiscord('TikTok', data.uniqueId, data.comment);
    
    messageCache.add(key);
    cleanCache(key);
});

// --- 2. MULTI-PLATFORM BRIDGE HUB (YT, Trovo, FB) ---
app.post('/api/bridge', (req, res) => {
    const { user, text, service } = req.body;
    let tag = service ? service.toUpperCase() : "STREAM";
    if (tag === 'YOUTUBE') tag = 'YT';

    const key = `${tag}:${user}:${text}`;
    if (!messageCache.has(key)) {
        const finalMessage = `[${tag}] ${user}: ${text}`;
        
        client.say(CHAT_CHANNEL, finalMessage);
        sendToDiscord(tag, user, text);
        
        messageCache.add(key);
        cleanCache(key);
    }
    res.sendStatus(200);
});

// --- 3. STARTUP SEQUENCE ---
client.connect().then(() => {
    console.log("🚀 Twitch Connected.");
    
    // Connect TikTok
    tiktok.connect()
        .then(() => {
            console.log(`📡 Connected to TikTok: ${TT_USER}`);
            sendToDiscord('System', 'Bot', 'Relay Hub is now LIVE.');
        })
        .catch(() => console.log("TikTok Offline (Check if you are Live)"));

    // Start the Bridge API
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`✅ Multi-Stream Bridge listening on port ${PORT}`));
});
