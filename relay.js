const tmi = require('tmi.js');
const { WebcastPushConnection } = require('tiktok-live-connector');
const express = require('express');
const app = express();

// Enable the bot to read the data sent from StreamElements
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// --- 1. TIKTOK LOGIC (KEEPING THIS RUNNING) ---
const tiktok = new WebcastPushConnection(TT_USER);

tiktok.on('chat', data => {
    const key = `TT:${data.uniqueId}:${data.comment}`;
    if (messageCache.has(key)) return;
    
    client.say(CHAT_CHANNEL, `[TT] ${data.uniqueId}: ${data.comment}`);
    messageCache.add(key);
    cleanCache(key);
});

// --- 2. THE BRIDGE LOGIC (FOR YT, TROVO, FB) ---
// This listens for the 'fetch' calls from your StreamElements Widget
app.post('/api/bridge', (req, res) => {
    try {
        const { user, text, service } = req.body;
        
        // Map the service name to a clean tag
        let tag = "Stream";
        if (service === 'youtube') tag = "YT";
        else if (service === 'trovo') tag = "Trovo";
        else if (service === 'facebook') tag = "FB";

        const key = `${tag}:${user}:${text}`;
        if (!messageCache.has(key)) {
            client.say(CHAT_CHANNEL, `[${tag}] ${user}: ${text}`);
            messageCache.add(key);
            cleanCache(key);
        }
        res.status(200).send('Relayed');
    } catch (err) {
        res.status(500).send('Error');
    }
});

// --- 3. START EVERYTHING ---
client.connect().then(() => {
    console.log("🚀 Twitch Connected.");
    
    // Start TikTok
    tiktok.connect()
        .then(() => console.log(`📡 Connected to TikTok: ${TT_USER}`))
        .catch(err => console.log("TikTok Connection Failed, but relay is still up."));

    // Start the Bridge Server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`RTMP Bridge listening on port ${PORT}`);
    });
});
