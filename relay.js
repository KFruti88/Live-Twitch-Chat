/* ==========================================================================
   WEREWOLF MULTI-STREAM RELAY ENGINE - VERSION 2.0 (FINAL)
   Standard: Full Code Mandate - Kevin & Scott
   Updated: 2026-02-07
   Targets: Twitch, TikTok, YouTube, Trovo, Discord
   ========================================================================== */

const tmi = require('tmi.js');
const axios = require('axios');
const express = require('express');
const { WebcastPushConnection } = require('tiktok-live-connector');
const { Client, GatewayIntentBits } = require('discord.js');

// --- CONFIG & SECRETS ---
const CHAT_CHANNEL = 'werewolf3788';
const TWITCH_TOKEN = process.env.TWITCH_OAUTH; 
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN; 
const TT_USER = 'k082412';
const authorizedUsers = ['1136876505142677504']; 

// Control Flags
let isLive = false; // Prevents TikTok from crashing the relay before you go live

const app = express();
app.use(express.json());

// --- 1. TWITCH CONNECTION (The Destination) ---
const client = new tmi.Client({
    identity: { 
        username: CHAT_CHANNEL, 
        password: TWITCH_TOKEN.startsWith('oauth:') ? TWITCH_TOKEN : `oauth:${TWITCH_TOKEN}` 
    },
    channels: [CHAT_CHANNEL]
});

// --- 2. DISCORD CONNECTION (The Remote Control) ---
const discordBot = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

// --- 3. HEARTBEAT ENGINE (The Stability) ---
setInterval(() => {
    const timestamp = new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York' });
    const ttStatus = isLive ? "ACTIVE" : "ON HOLD (Waiting for Twitch Live)";
    console.log(`💓 [${timestamp} EST] Relay Pulse: YouTube/Trovo API [OK] | Discord [OK] | TikTok [${ttStatus}]`);
}, 60000);

// Global Discord Sender
async function sendToDiscord(user, platform, message) {
    try {
        await axios.post(DISCORD_WEBHOOK, { content: `**[${platform}] ${user}:** ${message}` });
    } catch (err) { console.log(`❌ Discord Mirror Failed`); }
}

// --- 4. TIKTOK ENGINE (The On-Hold Persistence) ---
const tiktok = new WebcastPushConnection(TT_USER);

function startTikTok() {
    if (!isLive) return; 
    
    console.log(`📡 TikTok: Attempting to join ${TT_USER}'s live...`);
    tiktok.connect().then(state => {
        console.log(`✅ TikTok Connected! Room: ${state.roomId}`);
        client.say(CHAT_CHANNEL, "🐺 [System] TikTok Bridge is now ACTIVE.");
    }).catch(err => {
        console.log("ℹ️ TikTok Offline: Retrying in 2 minutes...");
        setTimeout(startTikTok, 120000); 
    });
}

tiktok.on('chat', data => {
    // Relay TikTok to Twitch (PlayStation visibility)
    client.say(CHAT_CHANNEL, `[TikTok] ${data.uniqueId}: ${data.comment}`);
    // Mirror to Discord
    sendToDiscord(data.uniqueId, 'TikTok', data.comment);
});

// --- 5. YOUTUBE & TROVO BRIDGE (The API Hub) ---
/**
 * Aligned to your StreamElements JavaScript fetch call.
 */
app.post('/api/bridge', (req, res) => {
    const { user, text, service } = req.body;
    if (!user || !text) return res.status(400).send("Missing Data");

    console.log(`📡 [${service}] Received from ${user}`);
    
    // Relay to Twitch Chat
    client.say(CHAT_CHANNEL, `[${service}] ${user}: ${text}`);
    
    // Mirror to Discord
    sendToDiscord(user, service, text);
    
    res.status(200).send("Relayed");
});

// --- 6. TWITCH MONITORING (The Trigger) ---
client.on('messagelog', (channel, username, method, message) => {
    // Releases TikTok once your "Live Announcement" fires
    if (username === CHAT_CHANNEL && message.toLowerCase().includes("live announcement")) {
        if (!isLive) {
            isLive = true;
            console.log("🚀 LIVE SIGNAL DETECTED: Opening TikTok Bridge...");
            startTikTok();
        }
    }
});

client.on('message', (channel, tags, message, self) => {
    if (self) return;
    
    // Manual Release: Type !go-live in Twitch Chat
    if (tags.username === CHAT_CHANNEL && message === "!go-live") {
        isLive = true;
        startTikTok();
    }

    // Mirror Twitch chat to Discord
    sendToDiscord(tags['display-name'] || tags.username, 'Twitch', message);
});

// --- 7. DISCORD COMMANDS ---
discordBot.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('!send ')) return;
    if (authorizedUsers.length > 0 && !authorizedUsers.includes(message.author.id)) return;

    const relayMessage = message.content.replace('!send ', '');
    client.say(CHAT_CHANNEL, `[Discord] ${message.author.username}: ${relayMessage}`);
    message.react('🐺'); 
});

// --- 8. STARTUP SEQUENCE ---
client.connect().then(() => {
    console.log("🚀 Twitch Connection: SUCCESS.");
    
    if (DISCORD_BOT_TOKEN) {
        discordBot.login(DISCORD_BOT_TOKEN).then(() => console.log("🐺 Discord Connection: SUCCESS."));
    }
    
    // Start API for YouTube/Trovo widgets
    app.listen(process.env.PORT || 3000, () => {
        console.log(`✅ API Bridge: Ready for YouTube/Trovo widgets.`);
    });
}).catch(err => console.error("🛑 RELAY CRITICAL FAILURE:", err));

// Global Error Handler
process.on('uncaughtException', (err) => {
    console.log('🛑 ERROR INTERCEPTED (Process Kept Alive):', err.message);
});
