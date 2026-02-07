/* ==========================================================================
   WEREWOLF MULTI-STREAM RELAY ENGINE
   Standard: Full Code Mandate - Kevin & Scott
   Updated: 2026-02-07 (Unified TikTok On-Hold + 4-Platform Bridge)
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

let isLive = false; // Flag to hold TikTok until Twitch is live

const app = express();
app.use(express.json());

// --- TWITCH CLIENT SETUP ---
const client = new tmi.Client({
    identity: { 
        username: CHAT_CHANNEL, 
        password: TWITCH_TOKEN.startsWith('oauth:') ? TWITCH_TOKEN : `oauth:${TWITCH_TOKEN}` 
    },
    channels: [CHAT_CHANNEL]
});

// --- DISCORD BOT SETUP ---
const discordBot = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

// --- HEARTBEAT ENGINE ---
// Prevents GitHub Action Timeout and logs TikTok status.
setInterval(() => {
    const timestamp = new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York' });
    const ttStatus = isLive ? "ACTIVE" : "ON HOLD (Waiting for Twitch Live)";
    console.log(`💓 [${timestamp} EST] Relay Active | TikTok: ${ttStatus}`);
}, 60000);

async function sendToDiscord(user, platform, message) {
    try {
        await axios.post(DISCORD_WEBHOOK, { content: `**[${platform}] ${user}:** ${message}` });
    } catch (err) { console.log(`❌ Discord Mirror Failed`); }
}

// --- 🎵 TIKTOK ENGINE (ON HOLD LOGIC) ---
const tiktok = new WebcastPushConnection(TT_USER);

function startTikTok() {
    if (!isLive) return; 
    
    console.log(`📡 TikTok: Attempting to connect to ${TT_USER}...`);
    tiktok.connect().then(state => {
        console.log(`✅ TikTok Connected to Room: ${state.roomId}`);
        client.say(CHAT_CHANNEL, "🐺 [System] TikTok Bridge is now LIVE.");
    }).catch(err => {
        console.log("ℹ️ TikTok connection pending... Retrying in 2 mins.");
        setTimeout(startTikTok, 120000); 
    });
}

tiktok.on('chat', data => {
    client.say(CHAT_CHANNEL, `[TikTok] ${data.uniqueId}: ${data.comment}`);
    sendToDiscord(data.uniqueId, 'TikTok', data.comment);
});

// --- 📺 TWITCH LIVE ANNOUNCEMENT & CHAT MODULE ---
client.on('messagelog', (channel, username, method, message, userstate) => {
    // Release TikTok hold when the "Live Announcement" fires
    if (username === CHAT_CHANNEL && message.toLowerCase().includes("live announcement")) {
        if (!isLive) {
            isLive = true;
            console.log("🚀 LIVE DETECTED: Releasing TikTok from Hold...");
            startTikTok();
        }
    }
});

client.on('message', (channel, tags, message, self) => {
    if (self) return;
    
    // Manual Release Fallback
    if (tags.username === CHAT_CHANNEL && message === "!go-live") {
        isLive = true;
        startTikTok();
    }

    // Mirror native Twitch chat to Discord
    sendToDiscord(tags['display-name'] || tags.username, 'Twitch', message);
});

// --- 📺 YOUTUBE & TROVO BRIDGE ENDPOINT ---
app.post('/api/bridge', (req, res) => {
    const { user, text, service } = req.body;
    if (!user || !text) return res.status(400).send("Missing Data");

    console.log(`📡 [${service}] ${user}: ${text}`);
    client.say(CHAT_CHANNEL, `[${service}] ${user}: ${text}`);
    sendToDiscord(user, service, text);
    res.status(200).send("Relayed");
});

// --- 🐺 DISCORD REMOTE CONTROL (!send) ---
discordBot.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('!send ')) return;
    if (authorizedUsers.length > 0 && !authorizedUsers.includes(message.author.id)) return;

    const relayMessage = message.content.replace('!send ', '');
    client.say(CHAT_CHANNEL, `[Discord] ${message.author.username}: ${relayMessage}`);
    message.react('🐺'); 
});

// --- 🚀 STARTUP SEQUENCE ---
client.connect().then(() => {
    console.log("🚀 Twitch Connected Successfully.");
    
    if (DISCORD_BOT_TOKEN) {
        discordBot.login(DISCORD_BOT_TOKEN)
            .then(() => console.log("🐺 Discord Remote Control ACTIVE."))
            .catch(() => console.log("⚠️ Discord Token Error. Check Secrets."));
    }
    
    // Start Express API for YouTube/Trovo
    app.listen(process.env.PORT || 3000, () => {
        console.log(`✅ Bridge active (TikTok on Standby until Live Announcement)`);
    });
}).catch(err => console.error("🛑 Master Relay Failed:", err));
