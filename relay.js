// ==========================================
// WEREWOLF MULTI-STREAM RELAY ENGINE
// ==========================================
// Standard: Full Code Mandate - Kevin & Scott
// Updated: 2026-02-06
// Fixes: Integrated full chat mirroring for Twitch, TikTok, and Discord logs.

const tmi = require('tmi.js');
const axios = require('axios');
const express = require('express');
const { WebcastPushConnection } = require('tiktok-live-connector');

// --- CONFIG & SECRETS ---
const CHAT_CHANNEL = 'werewolf3788';
const TWITCH_TOKEN = process.env.TWITCH_OAUTH; 
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
const TT_USER = 'k082412';

// --- CRITICAL SECRET CHECK ---
// Ensures bot stops safely if GitHub Secrets are missing
if (!TWITCH_TOKEN || !TWITCH_CLIENT_ID || !DISCORD_WEBHOOK) {
    console.error("❌ ERROR: One or more GitHub Secrets are MISSING.");
    process.exit(1); 
}

// --- FRIENDS TO TRACK ---
const friends = [
    { name: 'terrdog420', id: 'TJ' },
    { name: 'mjolnirgaming', id: 'Michael' },
    { name: 'raymystro', id: 'Ray' }
    // { name: 'phoenix_darkfire', id: 'Seth' } // PAUSED
];
const liveStates = new Map();

const app = express();
app.use(express.json());

// --- TWITCH CLIENT SETUP ---
const client = new tmi.Client({
    identity: { 
        username: CHAT_CHANNEL, 
        password: TWITCH_TOKEN.startsWith('oauth:') ? TWITCH_TOKEN : `oauth:${TWITCH_TOKEN}` 
    },
    channels: [CHAT_CHANNEL]
});

// --- HELPER: DISCORD WEBHOOK ---
async function sendToDiscord(user, platform, message) {
    try {
        await axios.post(DISCORD_WEBHOOK, {
            content: `**[${platform}] ${user}:** ${message}`
        });
    } catch (err) { 
        console.log(`❌ Discord Mirror Failed: ${err.response?.data?.message || err.message}`); 
    }
}

// --- TWITCH CHAT LISTENER ---
// Listens to your Twitch chat and mirrors to Discord
client.on('message', (channel, tags, message, self) => {
    if (self) return; 
    const user = tags['display-name'] || tags.username;
    console.log(`💬 [Twitch] ${user}: ${message}`);
    sendToDiscord(user, 'Twitch', message);
});

// --- SHOUTOUT LOGIC ---
async function checkFriendStreams() {
    const userLogins = friends.map(f => f.name).join('&user_login=');
    const url = `https://api.twitch.tv/helix/streams?user_login=${userLogins}`;

    try {
        const response = await axios.get(url, {
            headers: {
                'Client-ID': TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${TWITCH_TOKEN.replace('oauth:', '')}`
            }
        });

        const liveStreams = response.data.data || [];
        const currentLiveLogins = liveStreams.map(s => s.user_login.toLowerCase());

        liveStreams.forEach(stream => {
            const login = stream.user_login.toLowerCase();
            if (!liveStates.get(login)) {
                const msg = `📣 SHOUTOUT: My friend ${stream.user_name} is LIVE playing ${stream.game_name}! Go show love at https://twitch.tv/${login} 🐺`;
                client.say(CHAT_CHANNEL, msg);
                sendToDiscord('System', 'Shoutout', msg);
                liveStates.set(login, true);
            }
        });

        friends.forEach(f => {
            if (!currentLiveLogins.includes(f.name.toLowerCase())) {
                liveStates.set(f.name.toLowerCase(), false);
            }
        });
    } catch (err) { console.log(`> Shoutout check failed: ${err.message}`); }
}

// --- STARTUP SEQUENCE ---
client.connect()
    .then(() => {
        console.log("🚀 Twitch Connected Successfully.");
        client.say(CHAT_CHANNEL, "Werewolf Multi-Stream Relay is ONLINE. 🐺");
        
        try {
            const tiktok = new WebcastPushConnection(TT_USER);
            tiktok.connect()
                .then(() => console.log(`📡 TikTok Bridge Active`))
                .catch(() => console.log("TikTok Offline (Waiting for stream)"));
                
            // Listen for TikTok comments and relay to Twitch & Discord
            tiktok.on('chat', data => {
                sendToDiscord(data.uniqueId, 'TikTok', data.comment);
                client.say(CHAT_CHANNEL, `[TikTok] ${data.uniqueId}: ${data.comment}`);
            });
        } catch (e) { console.log("TikTok initialization skipped."); }

        // Monitor friends every 5 minutes
        setInterval(checkFriendStreams, 300000);

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => console.log(`✅ Bridge active on port ${PORT}`));
    })
    .catch((err) => {
        console.error("❌ TWITCH LOGIN FAILED:", err);
    });

// --- BRIDGE ENDPOINT (For YouTube/Footer Bridge) ---
app.post('/api/bridge', (req, res) => {
    const { username, message, platform } = req.body;
    client.say(CHAT_CHANNEL, `[${platform}] ${username}: ${message}`);
    sendToDiscord(username, platform, message);
    res.status(200).send("Relayed");
});
