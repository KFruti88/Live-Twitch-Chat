const tmi = require('tmi.js');
const { WebcastPushConnection } = require('tiktok-live-connector');

// --- CONFIG ---
const CHAT_CHANNEL = 'werewolf3788'; 
const TWITCH_TOKEN = process.env.TWITCH_ACCESS_TOKEN;
const TT_USER = 'k082412';

// Memory to stop duplicates
const messageCache = new Set();
const cleanCache = (key) => setTimeout(() => messageCache.delete(key), 60000);

const client = new tmi.Client({
    identity: { username: CHAT_CHANNEL, password: `oauth:${TWITCH_TOKEN}` },
    channels: [CHAT_CHANNEL]
});

// 1. TikTok Connector with Auto-Reconnect
const tiktok = new WebcastPushConnection(TT_USER);

tiktok.on('chat', data => {
    const key = `TT:${data.uniqueId}:${data.comment}`;
    if (messageCache.has(key)) return;
    
    client.say(CHAT_CHANNEL, `[TT] ${data.uniqueId}: ${data.comment}`);
    messageCache.add(key);
    cleanCache(key);
});

// Error handling for TikTok so it doesn't crash the whole bot
tiktok.on('error', err => console.error('TikTok Error:', err.message));
tiktok.on('disconnected', () => {
    console.log('TikTok Disconnected. Retrying in 10s...');
    setTimeout(() => tiktok.connect().catch(() => {}), 10000);
});

// 2. The Main Connection Loop
client.connect()
    .then(() => {
        console.log("🚀 Twitch Connected.");
        // Try to connect to TikTok
        return tiktok.connect();
    })
    .then(() => console.log(`📡 Connected to TikTok: ${TT_USER}`))
    .catch(err => {
        console.error("Connection Error:", err.message);
        // Fallback: If TikTok fails, keep Twitch running
        if (!client.readyState() === 'OPEN') client.connect();
    });

// Keep-Alive to prevent GitHub from timing out
setInterval(() => {
    if (client.readyState() === 'OPEN') console.log('Relay Heartbeat: Active');
}, 600000); // Logs every 10 mins
