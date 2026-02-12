/* ==========================================================================
   WEREWOLF UNIFIED STRIKE ENGINE - V8.6 (CRASH-PROOF BUILD)
   Standard: Full Code Mandate - Kevin & Scott
   Purpose: Stable 24/7 Relay (TikTok + YouTube -> Twitch)
   ========================================================================== */

const tmi = require('tmi.js');
const { WebcastPushConnection } = require('tiktok-live-connector');
const { LiveChat } = require('youtube-chat');

// --- 1. CONFIGURATION ---
const TWITCH_CHANNEL = 'werewolf3788';
const TIKTOK_USER = 'k082412';
const YOUTUBE_ID = process.env.YOUTUBE_CHANNEL_ID;

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

// --- 4. THE CRASH-PROOF TIKTOK BRIDGE ---
const tiktok = new WebcastPushConnection(TIKTOK_USER);

function connectTikTok() {
    console.log(`🐺 Attempting TikTok Sync for ${TIKTOK_USER}...`);
    tiktok.connect()
        .then(() => console.log("✅ TikTok Bridge ACTIVE"))
        .catch(err => {
            // SILENT ERROR: Logs the issue but DOES NOT crash the bot
            console.log("⚠️ TikTok is Offline/Unavailable. Retrying in 60s...");
            setTimeout(connectTikTok, 60000); 
        });
}

tiktok.on('chat', data => {
    postToTwitch('TIKTOK', data.uniqueId, data.comment);
});

// --- 5. YOUTUBE LISTENER (INPUT) ---
// This runs independently of the TikTok bridge
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
        console.log("🐺 Strike Engine 8.6 Ready.");
        connectTikTok(); // Start TikTok Listener
        
        if (YOUTUBE_ID) {
            youtube.start(); // Start YouTube Listener
            console.log("✅ YouTube Bridge ACTIVE");
        }
    })
    .catch(err => {
        console.error("❌ Twitch Connection Failed. Check your Token.");
        process.exit(1); // Only exit if the main output (Twitch) fails
    });
