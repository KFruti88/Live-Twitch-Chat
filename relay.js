/* ==========================================================================
   WEREWOLF UNIFIED STRIKE ENGINE - V8.7 (TOTAL PACK BUILD)
   Standard: Full Code Mandate - Kevin & Scott
   Purpose: Stable 24/7 Relay (TikTok + YouTube + Trovo -> Twitch)
   ========================================================================== */

const tmi = require('tmi.js');
const { WebcastPushConnection } = require('tiktok-live-connector');
const { LiveChat } = require('youtube-chat');
const axios = require('axios');

// --- 1. CONFIGURATION ---
const TWITCH_CHANNEL = 'werewolf3788';
const TIKTOK_USER = 'k082412';
const YOUTUBE_ID = process.env.YOUTUBE_CHANNEL_ID;
const TROVO_CHANNEL_ID = process.env.TROVO_CHANNEL_ID; // Add your Trovo ID to Secrets

// --- 2. THE TWITCH BOT (OUTPUT) ---
const client = new tmi.Client({
    identity: {
        username: TWITCH_CHANNEL,
        password: `oauth:${process.env.TWITCH_ACCESS_TOKEN}`
    },
    channels: [TWITCH_CHANNEL]
});

// --- 3. THE RELAY LOGIC ---
function postToTwitch(platform, user, message) {
    if (client.readyState() === "OPEN") {
        const relayMsg = `[${platform}] ${user}: ${message}`;
        client.say(TWITCH_CHANNEL, relayMsg);
        console.log(`📡 Relayed: ${relayMsg}`);
    }
}

// --- 4. TIKTOK LISTENER (Silent Error Handling) ---
const tiktok = new WebcastPushConnection(TIKTOK_USER);
function connectTikTok() {
    tiktok.connect()
        .then(() => console.log("✅ TikTok Bridge ACTIVE"))
        .catch(() => {
            console.log("⚠️ TikTok Offline. Retrying in 60s...");
            setTimeout(connectTikTok, 60000); 
        });
}
tiktok.on('chat', data => postToTwitch('TIKTOK', data.uniqueId, data.comment));

// --- 5. YOUTUBE LISTENER ---
const youtube = new LiveChat({ channelId: YOUTUBE_ID });
youtube.on('comment', (comment) => {
    const text = comment.message.map(m => m.text).join('');
    postToTwitch('YOUTUBE', comment.author.name, text);
});

// --- 6. THE TROVO BRIDGE (API Polling) ---
async function fetchTrovoChat() {
    if (!TROVO_CHANNEL_ID || !process.env.TROVO_CLIENT_ID) return;
    
    try {
        const res = await axios.get(`https://open-api.trovo.live/openplatform/chat/channel/${TROVO_CHANNEL_ID}`, {
            headers: { 'Accept': 'application/json', 'Client-ID': process.env.TROVO_CLIENT_ID }
        });
        // Logic to parse last 5 messages and relay them
        res.data.chats.forEach(chat => postToTwitch('TROVO', chat.nick_name, chat.content));
    } catch (e) {
        console.log("⚠️ Trovo Sync Waiting...");
    }
}

// --- 7. STARTUP SEQUENCE ---
client.connect().then(() => {
    console.log("🐺 Strike Engine 8.7 Ready.");
    connectTikTok();
    if (YOUTUBE_ID) youtube.start();
    if (TROVO_CHANNEL_ID) setInterval(fetchTrovoChat, 30000); // Check Trovo every 30s
}).catch(console.error);
