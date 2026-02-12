/* ==========================================================================
   WEREWOLF MASTER ENGINE - V10.1 (PS5 SIDEBAR LOCK)
   Standard: Full Code Mandate - Kevin Frutiger
   Purpose: No-PC, No-Phone, Direct API-to-Twitch Relay
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

// --- 2. TWITCH HUB (Your PS5 Monitor) ---
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

// --- 3. YOUTUBE (VIP API METHOD) ---
let nextYTPage = '';
async function getYouTubeChat() {
    if (!YT_API_KEY || !YT_VIDEO_ID) return;
    try {
        const videoInfo = await axios.get(`https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${YT_VIDEO_ID}&key=${YT_API_KEY}`);
        const chatId = videoInfo.data.items[0]?.liveStreamingDetails?.activeLiveChatId;
        
        if (chatId) {
            const chatRes = await axios.get(`https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${chatId}&part=snippet,authorDetails&key=${YT_API_KEY}${nextYTPage ? `&pageToken=${nextYTPage}` : ''}`);
            nextYTPage = chatRes.data.nextPageToken;
            chatRes.data.items.forEach(item => {
                if (item.snippet.hasDisplayContent) relay('YT', item.authorDetails.displayName, item.snippet.displayMessage);
            });
        }
    } catch (e) { console.log(`⚠️ YT Waiting...`); }
    setTimeout(getYouTubeChat, 10000); 
}

// --- 4. TIKTOK & TROVO ---
const tiktok = new WebcastPushConnection(TIKTOK_USER);
function startTT() { tiktok.connect().catch(() => setTimeout(startTT, 60000)); }
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
            console.log("✅ Trovo: Linked");
        });
        ws.on('message', data => {
            const msg = JSON.parse(data);
            if (msg.type === "CHAT") msg.data.chats.forEach(c => relay('TV', c.nick_name, c.content));
        });
    } catch (e) { setTimeout(startTrovo, 30000); }
}

// --- 5. STARTUP ---
client.connect().then(() => {
    console.log("🐺 Engine V10.1: Messages locked to PS5 Sidebar.");
    startTT();
    startTrovo();
    getYouTubeChat();
}).catch(console.error);
