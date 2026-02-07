/* ==========================================================================
   WEREWOLF MULTI-STREAM RELAY ENGINE
   Standard: Full Code Mandate - Kevin & Scott
   Updated: 2026-02-07 (Unified TikTok + YouTube + Trovo + Discord)
   Features: Unified 4-Platform Relay + PlayStation Chat Sync + Heartbeat
   ========================================================================== */

const tmi = require('tmi.js');
const axios = require('axios');
const express = require('express');
const { WebcastPushConnection } = require('tiktok-live-connector');
const { Client, GatewayIntentBits } = require('discord.js');

// --- CONFIG & SECRETS ---
const CHAT_CHANNEL = 'werewolf3788';
const TWITCH_TOKEN = process.env.TWITCH_OAUTH; 
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN; 
const TT_USER = 'k082412';

// --- THE PACK (AUTHORIZED IDs) ---
const authorizedUsers = ['1136876505142677504']; 

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
// Keeps GitHub Actions alive and logs status every 60 seconds.
setInterval(() => {
    const timestamp = new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York' });
    console.log(`💓 [${timestamp} EST] Relay Active: Monitoring Twitch, TikTok, YouTube, & Trovo...`);
}, 60000);

async function sendToDiscord(user, platform, message) {
    try {
        await axios.post(DISCORD_WEBHOOK, { content: `**[${platform}] ${user}:** ${message}` });
    } catch (err) { console.log(`❌ Discord Mirror Failed`); }
}

// --- 📺 YOUTUBE & TROVO BRIDGE ENDPOINT ---
/**
 * Aligned to your StreamElements JavaScript:
 * Expects: { user: "Name", text: "Message", service: "YouTube/Trovo" }
 */
app.post('/api/bridge', (req, res) => {
    const { user, text, service } = req.body;
    
    if (!user || !text) return res.status(400).send("Missing Data");

    console.log(`📡 [${service}] ${user}: ${text}`);
    
    // Relay to Twitch Chat (Displays on PlayStation screen)
    client.say(CHAT_CHANNEL, `[${service}] ${user}: ${text}`);
    
    // Relay to Discord Mirror
    sendToDiscord(user, service, text);
    
    res.status(200).send("Relayed to Twitch");
});

// --- 🐺 DISCORD REMOTE CONTROL (!send) ---
discordBot.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('!send ')) return;
    
    // Security check for authorized users
    if (authorizedUsers.length > 0 && !authorizedUsers.includes(message.author.id)) {
        console.log(`🚫 Unauthorized !send attempt by: ${message.author.username}`);
        return;
    }

    const relayMessage = message.content.replace('!send ', '');
    client.say(CHAT_CHANNEL, `[Discord] ${message.author.username}: ${relayMessage}`);
    console.log(`📡 SUCCESS: Relayed Discord message to Twitch`);
    message.react('🐺'); 
});

// --- 🎵 TIKTOK LIVE ENGINE (Hardened Loop) ---
const tiktok = new WebcastPushConnection(TT_USER);

function startTikTok() {
    tiktok.connect().then(state => {
        console.log(`✅ Connected to TikTok Room: ${state.roomId}`);
    }).catch(err => {
        console.log("ℹ️ TikTok Offline: Checking again in 2 minutes...");
        setTimeout(startTikTok, 120000); 
    });
}

tiktok.on('chat', data => {
    console.log(`🎵 [TikTok] ${data.uniqueId}: ${data.comment}`);
    client.say(CHAT_CHANNEL, `[TikTok] ${data.uniqueId}: ${data.comment}`);
    sendToDiscord(data.uniqueId, 'TikTok', data.comment);
});

// --- TWITCH NATIVE LISTENER ---
// Mirrors your own Twitch chat back to Discord
client.on('message', (channel, tags, message, self) => {
    if (self) return; 
    sendToDiscord(tags['display-name'] || tags.username, 'Twitch', message);
});

// --- 🚀 STARTUP SEQUENCE ---
client.connect().then(() => {
    console.log("🚀 Twitch Bridge: ONLINE.");
    
    if (DISCORD_BOT_TOKEN) {
        discordBot.login(DISCORD_BOT_TOKEN)
            .then(() => console.log("🐺 Discord Remote Control: ACTIVE."))
            .catch(() => console.log("⚠️ Discord Token Error."));
    }
    
    startTikTok();

    app.listen(process.env.PORT || 3000, () => {
        console.log(`✅ Bridge active and listening on port ${process.env.PORT || 3000}`);
    });
}).catch(err => console.error("🛑 Master Relay Failed to Start:", err));
