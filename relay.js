/* ==========================================================================
   WEREWOLF MASTER ENGINE - V9.0 (THE TOTAL PACK)
   Standard: Full Code Mandate - Kevin & Scott
   Purpose: 24/7 Multi-Relay (TT + YT + Trovo + FB -> Twitch -> Discord)
   ========================================================================== */

const tmi = require('tmi.js');
const { WebcastPushConnection } = require('tiktok-live-connector');
const { LiveChat } = require('youtube-chat');
const express = require('express'); // Required for Facebook Gate
const axios = require('axios');

// --- 1. CONFIGURATION ---
const TWITCH_CHANNEL = 'werewolf3788';
const TIKTOK_USER = 'k082412';
const YOUTUBE_ID = process.env.YOUTUBE_CHANNEL_ID;
const TROVO_CHANNEL_ID = process.env.TROVO_CHANNEL_ID;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL;

const app = express();
app.use(express.json());

// --- 2. THE TWITCH BOT (CORE HUB) ---
const client = new tmi.Client({
    options: { debug: false },
    connection: { reconnect: true },
    identity: {
        username: TWITCH_CHANNEL,
        password: `oauth:${process.env.TWITCH_ACCESS_TOKEN}`
    },
    channels: [TWITCH_CHANNEL]
});

// --- 3. THE RELAY LOGIC (Inbound -> Twitch) ---
function relayToTwitch(platform, user, message) {
    if (client.readyState() === "OPEN") {
        const relayMsg = `[${platform}] ${user}: ${message}`;
        client.say(TWITCH_CHANNEL, relayMsg);
        console.log(`📡 Inbound: ${relayMsg}`);
    }
}

// --- 4. THE UNIVERSAL GATE (Facebook Bridge) ---
// Post comments here to relay them from Facebook
app.post('/api/bridge', (req, res) => {
    const { user, text, platform } = req.body;
    if (user && text) {
        relayToTwitch(platform || 'FACEBOOK', user, text);
    }
    res.sendStatus(200);
});

// --- 5. TIKTOK BRIDGE (Isolated Loop) ---
const tiktok = new WebcastPushConnection(TIKTOK_USER);
function connectTikTok() {
    tiktok.connect()
        .then(() => console.log("✅ TikTok Bridge ACTIVE"))
        .catch(() => {
            console.log("⚠️ TikTok Offline. Retrying in 60s...");
            setTimeout(connectTikTok, 60000); 
        });
}
tiktok.on('chat', data => relayToTwitch('TIKTOK', data.uniqueId, data.comment));

// --- 6. YOUTUBE BRIDGE ---
const youtube = new LiveChat({ channelId: YOUTUBE_ID });
youtube.on('message', (msg) => {
    const user = msg.author.name;
    const text = msg.message.map(part => part.text).join('');
    relayToTwitch('YOUTUBE', user, text);
});

// --- 7. TROVO BRIDGE (API Polling) ---
async function fetchTrovoChat() {
    if (!TROVO_CHANNEL_ID || !process.env.TROVO_CLIENT_ID) return;
    try {
        const res = await axios.get(`https://open-api.trovo.live/openplatform/chat/channel/${TROVO_CHANNEL_ID}`, {
            headers: { 'Accept': 'application/json', 'Client-ID': process.env.TROVO_CLIENT_ID }
        });
        res.data.chats.forEach(chat => relayToTwitch('TROVO', chat.nick_name, chat.content));
    } catch (e) { console.log("⚠️ Trovo Sync Waiting..."); }
}

// --- 8. TWITCH -> DISCORD WATCHER ---
client.on('message', (channel, tags, message, self) => {
    if (!DISCORD_WEBHOOK) return;
    const user = tags['display-name'] || tags.username;
    const color = tags.color ? parseInt(tags.color.replace('#', ''), 16) : 16736031;

    axios.post(DISCORD_WEBHOOK, {
        username: "Werewolf Pack Relay",
        avatar_url: "https://raw.githubusercontent.com/KFruti88/Universal-Stream-Overlay/main/images/werewolf3788.png",
        embeds: [{ description: `**${user}**: ${message}`, color: color, timestamp: new Date() }]
    }).catch(() => {});
});

// --- 9. STARTUP SEQUENCE ---
console.log("🐺 Werewolf Master Engine V9.0: INITIATING...");
client.connect().then(() => {
    console.log("✅ Engine Hub: Twitch Online.");
    connectTikTok();
    if (YOUTUBE_ID) {
        youtube.start();
        console.log("✅ YouTube Bridge ACTIVE");
    }
    if (TROVO_CHANNEL_ID) setInterval(fetchTrovoChat, 30000);
    
    // Start the API server for Facebook Bridge
    app.listen(process.env.PORT || 3000, () => console.log("✅ Universal Gate Ready."));
}).catch(console.error);
