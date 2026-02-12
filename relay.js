/* ==========================================================================
   WEREWOLF MASTER ENGINE - V8.9 (TOTAL PACK + WATCHER)
   Standard: Full Code Mandate - Kevin & Scott
   Purpose: 24/7 Multi-Relay (TT + YT + Trovo -> Twitch -> Discord)
   ========================================================================== */

const tmi = require('tmi.js');
const { WebcastPushConnection } = require('tiktok-live-connector');
const { LiveChat } = require('youtube-chat');
const axios = require('axios');

// --- 1. CONFIGURATION ---
const TWITCH_CHANNEL = 'werewolf3788';
const TIKTOK_USER = 'k082412';
const YOUTUBE_ID = process.env.YOUTUBE_CHANNEL_ID;
const TROVO_CHANNEL_ID = process.env.TROVO_CHANNEL_ID;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL;

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

// --- 3. DISCORD PUSH ENGINE ---
async function sendToDiscord(user, message, color = 16736031) {
    if (!DISCORD_WEBHOOK) return;
    try {
        await axios.post(DISCORD_WEBHOOK, {
            username: "Werewolf Pack Relay",
            avatar_url: "https://raw.githubusercontent.com/KFruti88/Universal-Stream-Overlay/main/images/werewolf3788.png",
            embeds: [{
                description: `**${user}**: ${message}`,
                color: color,
                timestamp: new Date()
            }]
        });
    } catch (err) { console.error("❌ Discord Sync Failed."); }
}

// --- 4. MULTI-PLATFORM RELAY LOGIC ---
function relayToTwitch(platform, user, message) {
    if (client.readyState() === "OPEN") {
        const relayMsg = `[${platform}] ${user}: ${message}`;
        client.say(TWITCH_CHANNEL, relayMsg);
        console.log(`📡 Inbound: ${relayMsg}`);
    }
}

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
youtube.on('comment', (comment) => {
    const text = comment.message.map(m => m.text).join('');
    relayToTwitch('YOUTUBE', comment.author.name, text);
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

// --- 8. TWITCH EVENT HANDSHAKE ---
client.on('message', (channel, tags, message, self) => {
    const user = tags['display-name'] || tags.username;
    const userColor = tags.color ? parseInt(tags.color.replace('#', ''), 16) : 16736031;
    
    // Everything that happens on Twitch goes to Discord
    sendToDiscord(user, message, userColor);
});

// --- 9. STARTUP SEQUENCE ---
console.log("🐺 Werewolf Master Engine V8.9: INITIATING...");
client.connect().then(() => {
    console.log("✅ Engine Hub: Twitch Online.");
    connectTikTok();
    if (YOUTUBE_ID) youtube.start();
    if (TROVO_CHANNEL_ID) setInterval(fetchTrovoChat, 30000);
    sendToDiscord("SYSTEM", "Master Engine V8.9 is now ONLINE.");
}).catch(console.error);

setInterval(() => console.log("💓 Heartbeat: Master Relay Active..."), 600000);
