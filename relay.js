/* ==========================================================================
   WEREWOLF UNIFIED STRIKE ENGINE - V8.6 (DIRECT-LINK BUILD)
   Standard: Full Code Mandate (No Snippets) - Kevin & Scott
   Purpose: Stable 24/7 Chat Relay (TikTok + YouTube -> Twitch Chat)
   ========================================================================== */

const tmi = require('tmi.js');
const { WebcastPushConnection } = require('tiktok-live-connector');
const { LiveChat } = require('youtube-chat');

// --- 1. CONFIGURATION ---
const TWITCH_CHANNEL = 'werewolf3788';
const TIKTOK_USER = 'k082412';
const YOUTUBE_ID = process.env.YOUTUBE_CHANNEL_ID; // Your UC... ID from Secrets

// --- 2. THE TWITCH BOT (OUTPUT) ---
const client = new tmi.Client({
    identity: {
        username: TWITCH_CHANNEL,
        // Using the fresh token from twitchtokengenerator.com
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

// --- 4. TIKTOK LISTENER (INPUT) ---
const tiktok = new WebcastPushConnection(TIKTOK_USER);

function startTikTok() {
    tiktok.connect()
        .then(() => console.log("✅ TikTok Bridge ACTIVE"))
        .catch(() => {
            console.log("🔄 TikTok retry in 60s...");
            setTimeout(startTikTok, 60000);
        });
}

tiktok.on('chat', data => {
    postToTwitch('TIKTOK', data.uniqueId, data.comment);
});

// --- 5. YOUTUBE LISTENER (INPUT) ---
const youtube = new LiveChat({ channelId: YOUTUBE_ID });

youtube.on('comment', (comment) => {
    const text = comment.message.map(m => m.text).join('');
    postToTwitch('YOUTUBE', comment.author.name, text);
});

youtube.on('error', (err) => {
    console.log("⚠️ YouTube Sync Error. Retrying...");
    setTimeout(() => youtube.start(), 60000);
});

// --- 6. STARTUP SEQUENCE ---
client.connect()
    .then(() => {
        console.log("🐺 Strike Engine 8.6: Twitch Bot Connected.");
        startTikTok();
        // Only start YouTube if ID is present
        if (YOUTUBE_ID) {
            youtube.start();
            console.log("✅ YouTube Bridge ACTIVE");
        }
    })
    .catch(console.error);
