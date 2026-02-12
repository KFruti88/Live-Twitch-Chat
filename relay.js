/* ==========================================================================
   WEREWOLF MASTER ENGINE - V10.3 (AUTO-IGNITION)
   Standard: Full Code Mandate - Kevin Frutiger
   Purpose: No-PC, No-Phone. Triggers via Twitch Bot Activity.
   ========================================================================== */

const tmi = require('tmi.js');
const { WebcastPushConnection } = require('tiktok-live-connector');
const axios = require('axios');
const WebSocket = require('ws');

// --- 1. CONFIGURATION ---
const TWITCH_CHANNEL = 'werewolf3788';
const TIKTOK_USER = 'k082412';
const YT_VIDEO_ID = process.env.YOUTUBE_LIVE_ID; 
const YT_API_KEY = process.env.YOUTUBE_API_KEY;  
const TROVO_ID = '233976038';

let bridgesActive = false;

// --- 2. TWITCH HUB (The Listener & Loudspeaker) ---
const client = new tmi.Client({
    options: { debug: false },
    connection: { reconnect: true },
    identity: { username: TWITCH_CHANNEL, password: `oauth:${process.env.TWITCH_ACCESS_TOKEN}` },
    channels: [TWITCH_CHANNEL]
});

function relay(platform, user, msg) {
    if (client.readyState() === "OPEN") {
        client.say(TWITCH_CHANNEL, `[${platform}] ${user}: ${msg}`);
        console.log(`📡 PS5 RELAY: [${platform}] ${user}`);
    }
}

// --- 3. AUTO-START LOGIC (The "Bot Listener") ---
client.on('message', (channel, tags, message, self) => {
    if (bridgesActive) return; // Don't start twice

    const isSeryBot = tags.username === 'sery_bot';
    const isStreamElements = tags.username === 'streamelements';
    const isManual = message === '!start';

    if (isSeryBot || isStreamElements || isManual) {
        bridgesActive = true;
        relay('SYSTEM', 'ENGINE', 'Ignition Detected. Booting Multi-Relay...');
        startTikTok();
        startTrovo();
        getYouTubeChat();
    }
});

// --- 4. THE BRIDGES (YouTube, TikTok, Trovo) ---
async function getYouTubeChat() {
    if (!YT_API_KEY || !YT_VIDEO_ID) return;
    try {
        const videoInfo = await axios.get(`https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${YT_VIDEO_ID}&key=${YT_API_KEY}`);
        const chatId = videoInfo.data.items[0]?.liveStreamingDetails?.activeLiveChatId;
        if (chatId) {
            const chatRes = await axios.get(`https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${chatId}&part=snippet,authorDetails&key=${YT_API_KEY}`);
            chatRes.data.items.forEach(item => {
                relay('YT', item.authorDetails.displayName, item.snippet.displayMessage);
            });
        }
    } catch (e) { console.log("YT Waiting..."); }
    setTimeout(getYouTubeChat, 15000); 
}

const tiktok = new WebcastPushConnection(TIKTOK_USER);
function startTikTok() {
    tiktok.connect().then(() => console.log("✅ TT Connected")).catch(() => setTimeout(startTikTok, 60000));
}
tiktok.on('chat', data => relay('TT', data.uniqueId, data.comment));

async function startTrovo() {
    try {
        const res = await axios.get(`https://open-api.trovo.live/openplatform/chat/channel-token/${TROVO_ID}`, {
            headers: { 'Accept': 'application/json', 'Client-ID': process.env.TROVO_CLIENT_ID }
        });
        const ws = new WebSocket('wss://open-chat.trovo.live/chat');
        ws.on('open', () => {
            ws.send(JSON.stringify({ type: "AUTH", nonce: "a", data: { token: res.data.token } }));
            setInterval(() => ws.send(JSON.stringify({ type: "PING" })), 30000);
            console.log("✅ TV Connected");
        });
        ws.on('message', data => {
            const msg = JSON.parse(data);
            if (msg.type === "CHAT") msg.data.chats.forEach(c => relay('TV', c.nick_name, c.content));
        });
    } catch (e) { setTimeout(startTrovo, 30000); }
}

// --- 5. STARTUP ---
client.connect().then(() => {
    console.log("🐺 Engine V10.3: Waiting for Bot Ignition...");
}).catch(console.error);
