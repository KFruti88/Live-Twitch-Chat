const tmi = require('tmi.js');
const { WebcastPushConnection } = require('tiktok-live-connector');
const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// --- CONFIG ---
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

async function sendToDiscord(platform, user, message) {
    try {
        await axios.post(DISCORD_URL, { content: `**[${platform}] ${user}**: ${message}` });
    } catch (err) { console.error("Discord Error"); }
}

// 1. TikTok Logic
const tiktok = new WebcastPushConnection(TT_USER);

tiktok.on('chat', data => {
    const key = `TT:${data.uniqueId}:${data.comment}`;
    if (messageCache.has(key)) return;
    
    client.say(CHAT_CHANNEL, `[TT] ${data.uniqueId}: ${data.comment}`);
    sendToDiscord('TikTok', data.uniqueId, data.comment);
    
    messageCache.add(key);
    cleanCache(key);
});

// 2. Bridge Logic (YouTube / Trovo)
app.post('/api/bridge', (req, res) => {
    const { user, text, service } = req.body;
    const tag = service ? service.toUpperCase() : "STREAM";
    const key = `${tag}:${user}:${text}`;
    
    if (!messageCache.has(key)) {
        client.say(CHAT_CHANNEL, `[${tag}] ${user}: ${text}`);
        sendToDiscord(tag, user, text);
        messageCache.add(key);
        cleanCache(key);
    }
    res.sendStatus(200);
});

// 3. Startup Sequence (TikTok First!)
client.connect().then(() => {
    console.log("🚀 Twitch Connected.");
    
    // Connect TikTok immediately
    tiktok.connect()
        .then(() => console.log(`📡 TikTok Relay Active for: ${TT_USER}`))
        .catch(err => console.log("TikTok Connection Failed - Check if you are Live."));

    // Start Bridge for others
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`✅ Multi-Stream Bridge Online on Port ${PORT}`));
});
