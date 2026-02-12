/* ==========================================================================
   WEREWOLF MASTER ENGINE - V9.7 (FINAL LOCK)
   Standard: Full Code Mandate - Kevin & Scott
   Purpose: 24/7 Multi-Relay (Direct Target Lock for YT & Trovo)
   ========================================================================== */

const tmi = require('tmi.js');
const { WebcastPushConnection } = require('tiktok-live-connector');
const { LiveChat } = require('youtube-chat');
const axios = require('axios');

// --- 1. CONFIGURATION ---
const TWITCH_CHANNEL = 'werewolf3788';
const TIKTOK_USER = 'k082412';
// SECRETS
const YOUTUBE_ID = process.env.YOUTUBE_CHANNEL_ID; 
const YOUTUBE_VIDEO_ID = process.env.YOUTUBE_LIVE_ID; // Force Connect to this Video
const TROVO_CHANNEL_ID = process.env.TROVO_CHANNEL_ID;
const TROVO_CLIENT_ID = process.env.TROVO_CLIENT_ID;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL;

// --- 2. TWITCH HUB (OUTPUT) ---
const client = new tmi.Client({
    options: { debug: false },
    connection: { reconnect: true },
    identity: {
        username: TWITCH_CHANNEL,
        password: `oauth:${process.env.TWITCH_ACCESS_TOKEN}`
    },
    channels: [TWITCH_CHANNEL]
});

// --- 3. RELAY FUNCTION ---
function relayToTwitch(platform, user, message) {
    if (client.readyState() === "OPEN") {
        client.say(TWITCH_CHANNEL, `[${platform}] ${user}: ${message}`);
        console.log(`✅ RELAY SUCCESS: [${platform}] ${user} -> Twitch`);
    } else {
        console.log(`❌ RELAY FAILED: Twitch Client not OPEN.`);
    }
}

// --- 4. YOUTUBE BRIDGE (DIRECT LOCK) ---
// If YOUTUBE_LIVE_ID is set, we ignore the channel scan and lock on instantly
const ytConfig = YOUTUBE_VIDEO_ID ? { liveId: YOUTUBE_VIDEO_ID } : { channelId: YOUTUBE_ID };
const youtube = new LiveChat(ytConfig);

youtube.on('start', (liveId) => {
    console.log(`📹 YouTube: LOCKED onto Video ID: ${liveId}`);
});

youtube.on('chat', (chatItem) => {
    const user = chatItem.author.name;
    const text = chatItem.message.map(m => m.text || m.emojiText).join('');
    console.log(`📨 YouTube Incoming: ${user}: ${text}`);
    relayToTwitch('YOUTUBE', user, text);
});

youtube.on('error', (err) => {
    console.log(`⚠️ YouTube Status: ${err.message}`);
    // Only retry if we aren't hard-locked to a dead ID
    if (!YOUTUBE_VIDEO_ID) setTimeout(() => youtube.start(), 60000);
});

// --- 5. TIKTOK BRIDGE ---
const tiktok = new WebcastPushConnection(TIKTOK_USER);
function connectTikTok() {
    tiktok.connect()
        .then(() => console.log("✅ TikTok Bridge ACTIVE"))
        .catch((err) => {
            console.log(`⚠️ TikTok Offline/Blocked. Retrying in 60s...`);
            setTimeout(connectTikTok, 60000); 
        });
}
tiktok.on('chat', data => {
    console.log(`📨 TikTok Incoming: ${data.uniqueId}`);
    relayToTwitch('TIKTOK', data.uniqueId, data.comment);
});

// --- 6. TROVO BRIDGE ---
async function fetchTrovoChat() {
    if (!TROVO_CHANNEL_ID) {
        console.log("❌ CRITICAL: Missing TROVO_CHANNEL_ID Secret!");
        return;
    }
    try {
        const res = await axios.get(`https://open-api.trovo.live/openplatform/chat/channel/${TROVO_CHANNEL_ID}`, {
            headers: { 'Accept': 'application/json', 'Client-ID': TROVO_CLIENT_ID }
        });
        if (res.data && res.data.chats) {
            res.data.chats.forEach(chat => relayToTwitch('TROVO', chat.nick_name, chat.content));
        }
    } catch (e) { 
        console.log(`⚠️ Trovo Error: ${e.response?.status || "Check Channel ID"}`); 
    }
}

// --- 7. DISCORD WATCHER ---
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

// --- 8. STARTUP ---
console.log("🐺 Werewolf Master Engine V9.7: FINAL LOCK MODE");

client.connect().then(() => {
    console.log("✅ Engine Hub: Twitch Online.");
    
    // START BRIDGES
    connectTikTok();
    
    if (YOUTUBE_VIDEO_ID) {
        console.log(`🎯 YouTube Mode: DIRECT LOCK (ID: ${YOUTUBE_VIDEO_ID})`);
        youtube.start();
    } else if (YOUTUBE_ID) {
        console.log("🔍 YouTube Mode: CHANNEL SCAN (This may take 5-10m)");
        youtube.start();
    }
    
    if (TROVO_CHANNEL_ID) {
        console.log(`✅ Trovo Polling Started for Channel ID: ${TROVO_CHANNEL_ID}`);
        setInterval(fetchTrovoChat, 30000);
    } else {
        console.log("❌ Trovo Disabled: No Channel ID found.");
    }

}).catch(console.error);
