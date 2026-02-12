/* ==========================================================================
   WEREWOLF MASTER ENGINE - V9.5 (TRUTH SERUM BUILD)
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
// Secrets must be set in GitHub
const YOUTUBE_ID = process.env.YOUTUBE_CHANNEL_ID; 
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

// --- 3. RELAY FUNCTION (The "Loudspeaker") ---
function relayToTwitch(platform, user, message) {
    if (client.readyState() === "OPEN") {
        const relayMsg = `[${platform}] ${user}: ${message}`;
        client.say(TWITCH_CHANNEL, relayMsg);
        console.log(`✅ RELAY SUCCESS: [${platform}] ${user} -> Twitch`);
    } else {
        console.log(`❌ RELAY FAILED: Twitch Client not OPEN. (Status: ${client.readyState()})`);
    }
}

// --- 4. YOUTUBE BRIDGE (Verbose Mode) ---
const youtube = new LiveChat({ channelId: YOUTUBE_ID });

youtube.on('start', (liveId) => {
    console.log(`📹 YouTube: Stream Found! (Video ID: ${liveId})`);
});

youtube.on('chat', (chatItem) => {
    // This catches the standard chat event
    const user = chatItem.author.name;
    const text = chatItem.message.map(m => m.text || m.emojiText).join('');
    console.log(`📨 YouTube Incoming: ${user}: ${text}`);
    relayToTwitch('YOUTUBE', user, text);
});

youtube.on('error', (err) => {
    console.log(`⚠️ YouTube Error: ${err.message}`);
    // Auto-restart listener on error
    setTimeout(() => youtube.start(), 60000);
});

// --- 5. TIKTOK BRIDGE (Re-Added) ---
const tiktok = new WebcastPushConnection(TIKTOK_USER);
function connectTikTok() {
    tiktok.connect()
        .then(() => console.log("✅ TikTok Bridge ACTIVE"))
        .catch((err) => {
            console.log(`⚠️ TikTok Status: Offline or Blocked (${err.message}). Retrying...`);
            setTimeout(connectTikTok, 60000); 
        });
}
tiktok.on('chat', data => {
    console.log(`📨 TikTok Incoming: ${data.uniqueId}`);
    relayToTwitch('TIKTOK', data.uniqueId, data.comment);
});

// --- 6. TROVO BRIDGE (Debug Mode) ---
async function fetchTrovoChat() {
    if (!TROVO_CHANNEL_ID || !TROVO_CLIENT_ID) {
        console.log("❌ Trovo Config Missing: Check Secrets.");
        return;
    }
    try {
        const res = await axios.get(`https://open-api.trovo.live/openplatform/chat/channel/${TROVO_CHANNEL_ID}`, {
            headers: { 
                'Accept': 'application/json', 
                'Client-ID': TROVO_CLIENT_ID 
            }
        });
        
        // LOG RAW DATA to prove connection
        // console.log(`🔍 Trovo Ping: ${res.status} (Chats: ${res.data?.chats?.length || 0})`);

        if (res.data && res.data.chats) {
            res.data.chats.forEach(chat => {
                // Deduplicate logic could go here, but for now we force relay to prove it works
                relayToTwitch('TROVO', chat.nick_name, chat.content);
            });
        }
    } catch (e) { 
        console.log(`⚠️ Trovo Error: ${e.response?.status || e.message}`); 
    }
}

// --- 7. DISCORD WATCHER (Embeds) ---
client.on('message', (channel, tags, message, self) => {
    if (!DISCORD_WEBHOOK) return;
    const user = tags['display-name'] || tags.username;
    const color = tags.color ? parseInt(tags.color.replace('#', ''), 16) : 16736031;
    
    axios.post(DISCORD_WEBHOOK, {
        username: "Werewolf Pack Relay",
        avatar_url: "https://raw.githubusercontent.com/KFruti88/Universal-Stream-Overlay/main/images/werewolf3788.png",
        embeds: [{ description: `**${user}**: ${message}`, color: color, timestamp: new Date() }]
    }).catch(err => console.log("❌ Discord Webhook Failed"));
});

// --- 8. STARTUP ---
console.log("🐺 Werewolf Master Engine V9.5: TRUTH SERUM MODE");
console.log(`ℹ️ Config Check: YT=${!!YOUTUBE_ID}, TrovoID=${!!TROVO_CHANNEL_ID}, TrovoClient=${!!TROVO_CLIENT_ID}`);

client.connect().then(() => {
    console.log("✅ Engine Hub: Twitch Online.");
    
    // Start Listeners
    connectTikTok();
    
    if (YOUTUBE_ID) {
        console.log(`Attempting YouTube Connection for Channel: ${YOUTUBE_ID}`);
        youtube.start().then(() => console.log("✅ YouTube Bridge STARTUP SUCCESS")).catch(e => console.log(`❌ YouTube Startup Failed: ${e}`));
    }
    
    if (TROVO_CHANNEL_ID) {
        console.log("✅ Trovo Polling Started (30s interval)");
        setInterval(fetchTrovoChat, 30000);
    }

}).catch(console.error);
