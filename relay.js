/* ==========================================================================
   WEREWOLF MASTER ENGINE - V10.2 (THE LOUDMOUTH EDITION)
   Standard: Full Code Mandate - Kevin Frutiger
   Purpose: No-PC, No-Phone, Direct API Relay with Status Heartbeats
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

// --- 2. TWITCH HUB (PS5 Sidebar) ---
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

// --- 3. YOUTUBE (PARTNER KEY LOCK) ---
let nextYTPage = '';
async function getYouTubeChat() {
    if (!YT_API_KEY || !YT_VIDEO_ID) {
        console.log("⚠️ YT: Missing API Key or Live ID. Skipping.");
        return;
    }
    try {
        const videoInfo = await axios.get(`https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${YT_VIDEO_ID}&key=${YT_API_KEY}`);
        const chatId = videoInfo.data.items[0]?.liveStreamingDetails?.activeLiveChatId;
        
        if (chatId) {
            console.log("✅ YT: Chat ID Found. Listening...");
            const chatRes = await axios.get(`https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${chatId}&part=snippet,authorDetails&key=${YT_API_KEY}${nextYTPage ? `&pageToken=${nextYTPage}` : ''}`);
            nextYTPage = chatRes.data.nextPageToken;
            chatRes.data.items.forEach(item => {
                if (item.snippet.hasDisplayContent) relay('YT', item.authorDetails.displayName, item.snippet.displayMessage);
            });
        } else { console.log("⏳ YT: Stream is not 'Live' yet."); }
    } catch (e) { console.log(`❌ YT Error: ${e.response?.status || e.message}`); }
    setTimeout(getYouTubeChat, 15000); 
}

// --- 4. TIKTOK (LIVE SNIFFER) ---
const tiktok = new WebcastPushConnection(TIKTOK_USER);
function startTT() {
    console.log(`🔎 TT: Searching for ${TIKTOK_USER}...`);
    tiktok.connect()
        .then(() => console.log("✅ TT: Connection Success!"))
        .catch(e => {
            console.log(`⚠️ TT: ${e.message}. Retrying...`);
            setTimeout(startTT, 60000);
        });
}
tiktok.on('chat', data => relay('TT', data.uniqueId, data.comment));

// --- 5. TROVO (SOCKET BRIDGE) ---
async function startTrovo() {
    console.log("🔌 TV: Requesting Socket Token...");
    try {
        const res = await axios.get(`https://open-api.trovo.live/openplatform/chat/channel-token/${TROVO_ID}`, {
            headers: { 'Accept': 'application/json', 'Client-ID': process.env.TROVO_CLIENT_ID }
        });
        const ws = new WebSocket('wss://open-chat.trovo.live/chat');
        ws.on('open', () => {
            ws.send(JSON.stringify({ type: "AUTH", nonce: "a", data: { token: res.data.token } }));
            setInterval(() => ws.send(JSON.stringify({ type: "PING" })), 30000);
            console.log("✅ TV: Socket Connected.");
        });
        ws.on('message', data => {
            const msg = JSON.parse(data);
            if (msg.type === "CHAT") msg.data.chats.forEach(c => relay('TV', c.nick_name, c.content));
        });
    } catch (e) { 
        console.log(`❌ TV Error: ${e.message}`);
        setTimeout(startTrovo, 30000); 
    }
}

// --- 6. STARTUP ---
client.connect().then(() => {
    console.log("🐺 Engine V10.2: ACTIVE.");
    client.say(TWITCH_CHANNEL, "🐺 Werewolf Master Engine V10.2: System Startup. The Pack is Live!");
    startTT();
    startTrovo();
    getYouTubeChat();
}).catch(console.error);
