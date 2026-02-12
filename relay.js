/* ==========================================================================
   WEREWOLF MASTER ENGINE - V9.8 (SOCKET REVOLUTION)
   Standard: Full Code Mandate - Kevin & Scott
   Purpose: 24/7 Multi-Relay (Trovo WebSocket + YT Direct Lock)
   ========================================================================== */

const tmi = require('tmi.js');
const { WebcastPushConnection } = require('tiktok-live-connector');
const { LiveChat } = require('youtube-chat');
const axios = require('axios');
const WebSocket = require('ws'); // Standard in Node environment

// --- 1. CONFIGURATION ---
const TWITCH_CHANNEL = 'werewolf3788';
const TIKTOK_USER = 'k082412';
// SECRETS
const YOUTUBE_ID = process.env.YOUTUBE_CHANNEL_ID; 
const YOUTUBE_VIDEO_ID = process.env.YOUTUBE_LIVE_ID;
const TROVO_CHANNEL_ID = process.env.TROVO_CHANNEL_ID;
const TROVO_CLIENT_ID = process.env.TROVO_CLIENT_ID;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL;

// --- 2. TWITCH HUB ---
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
        console.log(`✅ RELAY: [${platform}] ${user} -> Twitch`);
    }
}

// --- 4. YOUTUBE BRIDGE (DIRECT LOCK) ---
const ytConfig = YOUTUBE_VIDEO_ID ? { liveId: YOUTUBE_VIDEO_ID } : { channelId: YOUTUBE_ID };
const youtube = new LiveChat(ytConfig);

youtube.on('start', (liveId) => console.log(`📹 YouTube: LOCKED onto Stream ${liveId}`));
youtube.on('chat', (item) => {
    const text = item.message.map(m => m.text || m.emojiText).join('');
    relayToTwitch('YOUTUBE', item.author.name, text);
});
youtube.on('error', (err) => {
    console.log(`⚠️ YouTube Status: ${err.message}`);
    // If locked to a video ID, we don't restart automatically to avoid ban loops
    if (!YOUTUBE_VIDEO_ID) setTimeout(() => youtube.start(), 60000);
});

// --- 5. TIKTOK BRIDGE ---
const tiktok = new WebcastPushConnection(TIKTOK_USER);
function connectTikTok() {
    tiktok.connect().catch(e => { 
        console.log("⚠️ TikTok Wait..."); 
        setTimeout(connectTikTok, 60000); 
    });
}
tiktok.on('chat', data => relayToTwitch('TIKTOK', data.uniqueId, data.comment));

// --- 6. TROVO BRIDGE (WEBSOCKET MODE) ---
async function connectTrovo() {
    if (!TROVO_CHANNEL_ID || !TROVO_CLIENT_ID) {
        console.log("❌ Trovo Disabled: Missing Secrets.");
        return;
    }

    try {
        // Step A: Get a Chat Token via REST
        console.log(`🔌 Trovo: Fetching Token for Room ${TROVO_CHANNEL_ID}...`);
        const tokenRes = await axios.get(`https://open-api.trovo.live/openplatform/chat/channel-token/${TROVO_CHANNEL_ID}`, {
            headers: { 'Accept': 'application/json', 'Client-ID': TROVO_CLIENT_ID }
        });
        
        const chatToken = tokenRes.data.token;
        if (!chatToken) throw new Error("No Token Returned");

        // Step B: Connect to WebSocket
        const ws = new WebSocket('wss://open-chat.trovo.live/chat');

        ws.on('open', () => {
            console.log("✅ Trovo Socket: Connected. Authenticating...");
            ws.send(JSON.stringify({ 
                type: "AUTH", 
                nonce: "auth", 
                data: { token: chatToken } 
            }));
            
            // Keep-Alive Ping (Every 30s)
            setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: "PING", nonce: "ping" }));
                }
            }, 30000);
        });

        ws.on('message', (data) => {
            try {
                const msg = JSON.parse(data);
                if (msg.type === "CHAT") {
                    const chats = msg.data.chats;
                    if (chats) {
                        chats.forEach(c => relayToTwitch('TROVO', c.nick_name, c.content));
                    }
                }
            } catch (e) { /* Ignore parsing errors */ }
        });

        ws.on('close', () => {
            console.log("⚠️ Trovo Socket Closed. Reconnecting in 10s...");
            setTimeout(connectTrovo, 10000);
        });

    } catch (e) {
        console.log(`❌ Trovo Connection Failed: ${e.message}`);
        setTimeout(connectTrovo, 30000);
    }
}

// --- 7. STARTUP ---
client.connect().then(() => {
    console.log("🐺 Engine V9.8 Online (Socket Edition).");
    
    // START BRIDGES
    connectTikTok();
    connectTrovo(); // New WebSocket Logic
    
    if (YOUTUBE_VIDEO_ID || YOUTUBE_ID) {
        console.log(`🎯 YouTube Mode: ${YOUTUBE_VIDEO_ID ? "DIRECT LOCK" : "SCAN"}`);
        youtube.start();
    }

}).catch(console.error);
