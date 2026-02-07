// ==========================================
// WEREWOLF MULTI-STREAM RELAY ENGINE
// ==========================================
// Standard: Full Code Mandate - Kevin & Scott
// Updated: 2026-02-06
// Fix: Added error handling for "Login authentication failed"

const tmi = require('tmi.js');
const axios = require('axios');
const express = require('express');
const { TikTokConnectionWrapper } = require('tiktok-live-connector');

// --- CONFIG & SECRETS ---
// These pull from your GitHub Settings > Secrets
const CHAT_CHANNEL = 'werewolf3788';
const TWITCH_TOKEN = process.env.TWITCH_OAUTH; 
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
const TT_USER = 'k082412';

// --- FRIENDS TO TRACK ---
const friends = [
    { name: 'terrdog420', id: 'TJ' },
    { name: 'mjolnirgaming', id: 'Michael' },
    { name: 'raymystro', id: 'Ray' }
    // { name: 'phoenix_darkfire', id: 'Seth' } // PAUSED: Not currently speaking
];
const liveStates = new Map();

const app = express();
app.use(express.json());

// --- TWITCH CLIENT SETUP ---
const client = new tmi.Client({
    identity: { 
        username: CHAT_CHANNEL, 
        // Force 'oauth:' prefix if missing
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
    } catch (err) { console.log("Discord Webhook Error: Check your URL secret."); }
}

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
// Handles login errors gracefully to prevent process crashes
client.connect()
    .then(() => {
        console.log("🚀 Twitch Connected.");
        client.say(CHAT_CHANNEL, "Werewolf Multi-Stream Relay is ONLINE. 🐺");
        
        const tiktok = new TikTokConnectionWrapper(TT_USER);
        tiktok.connect().catch(() => console.log("TikTok Offline (Bridge waiting)"));

        // Monitor friend status every 5 minutes
        setInterval(checkFriendStreams, 300000);

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => console.log(`✅ Bridge active on port ${PORT}`));
    })
    .catch((err) => {
        console.error("❌ TWITCH LOGIN FAILED:", err);
        console.log("Action: Regenerate your token at twitchapps.com/tmi/ and update GitHub Secrets.");
    });

// --- BRIDGE ENDPOINT ---
app.post('/api/bridge', (req, res) => {
    const { username, message, platform } = req.body;
    // Post to Twitch for PlayStation visibility
    client.say(CHAT_CHANNEL, `[${platform}] ${username}: ${message}`);
    // Mirror to Discord logs
    sendToDiscord(username, platform, message);
    res.status(200).send("Relayed");
});
