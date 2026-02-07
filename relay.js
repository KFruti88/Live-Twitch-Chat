const tmi = require('tmi.js');
const { WebcastPushConnection } = require('tiktok-live-connector');
const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// --- CONFIG FROM GITHUB SECRETS ---
const CHAT_CHANNEL = 'werewolf3788'; 
const TWITCH_TOKEN = process.env.TWITCH_ACCESS_TOKEN;
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const BROADCASTER_ID = process.env.TWITCH_BROADCASTER_ID || '896952944';
const WP_RELAY_URL = process.env.WP_RELAY_URL;
const TT_USER = 'k082412';

// Your Discord Webhook URL (Hardcoded as requested)
const DISCORD_URL = "https://discord.com/api/webhooks/1412973382433247252/fFwKe5xeW-S6VgWaPionj0A-ieKu3h_qFLaDZBl2JKobFispq0fBg_5_y8n1cWHwlGpY";

const messageCache = new Set();
const cleanCache = (key) => setTimeout(() => messageCache.delete(key), 60000);

const client = new tmi.Client({
    identity: { username: CHAT_CHANNEL, password: `oauth:${TWITCH_TOKEN}` },
    channels: [CHAT_CHANNEL]
});

/**
 * Sends data to your WordPress site so it can handle Discord mirror and Status
 */
async function forwardToWordPress(platform, user, message) {
    if (!WP_RELAY_URL) return;
    try {
        await axios.post(WP_RELAY_URL, {
            platform: platform,
            username: user,
            message: message
        }, {
            headers: {
                'X-Twitch-Client-ID': TWITCH_CLIENT_ID,
                'X-Twitch-Token': TWITCH_TOKEN,
                'Content-Type': 'application/json'
            }
        });
    } catch (err) {
        console.log(`> WP Relay failed: ${err.message}`);
    }
}

// Improved Discord Sender
async function sendToDiscord(platform, user, message) {
    if (!DISCORD_URL) return;
    try {
        await axios.post(DISCORD_URL, {
            content: `**[${platform}]** \`${user}\`: ${message}`
        });
    } catch (err) {
        console.log(`> Discord mirror failed for ${platform}`);
    }
}

// 1. TikTok Logic
const tiktok = new WebcastPushConnection(TT_USER);
tiktok.on('chat', data => {
    const key = `TT:${data.uniqueId}:${data.comment}`;
    if (messageCache.has(key)) return;
    
    const relayText = `[TT] ${data.uniqueId}: ${data.comment}`;
    client.say(CHAT_CHANNEL, relayText);
    
    sendToDiscord('TikTok', data.uniqueId, data.comment);
    forwardToWordPress('TikTok', data.uniqueId, data.comment);
    
    messageCache.add(key);
    cleanCache(key);
});

// 2. Multi-Platform Bridge (YouTube, Trovo, etc.)
app.post('/api/bridge', (req, res) => {
    const { user, text, service } = req.body;
    let tag = service ? service.toUpperCase() : "STREAM";
    if (tag === 'YOUTUBE') tag = 'YT';

    const key = `${tag}:${user}:${text}`;
    if (!messageCache.has(key)) {
        const finalMessage = `[${tag}] ${user}: ${text}`;
        
        client.say(CHAT_CHANNEL, finalMessage);
        sendToDiscord(tag, user, text);
        forwardToWordPress(tag, user, text);
        
        messageCache.add(key);
        cleanCache(key);
    }
    res.sendStatus(200);
});

// 3. Startup Sequence
client.connect().then(() => {
    console.log("🚀 Twitch Connected.");
    
    // --- AUTOMATED LIVE ANNOUNCEMENT ---
    const liveMsg = "Werewolf is now LIVE! I am relaying chat from YouTube and Trovo here so I can see your messages while I play on PlayStation! 🐺";
    client.say(CHAT_CHANNEL, liveMsg);
    sendToDiscord('System', 'Bot', 'Relay Hub is now LIVE and announcement sent.');
    
    tiktok.connect()
        .then(() => {
            console.log(`📡 Connected to TikTok: ${TT_USER}`);
        })
        .catch(() => console.log("TikTok Connection Failed (Check if you are Live)"));

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`✅ Multi-Stream Bridge listening on port ${PORT}`));
});
