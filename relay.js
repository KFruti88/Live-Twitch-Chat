/* ==========================================================================
   WEREWOLF MASTER BROADCAST & RELAY ENGINE
   Standard: Full Code Mandate - Kevin & Scott
   Updated: 2026-02-07 (Twitch System Event & Multi-Broadcast)
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
const FB_ACCESS = process.env.FB_ACCESS_TOKEN; // Facebook Page Token
const TT_USER = 'k082412';
const authorizedUsers = ['1136876505142677504']; 

// Control Flags
let isLive = false; 

const app = express();
app.use(express.json());

// --- 1. TWITCH CONNECTION ---
const client = new tmi.Client({
    identity: { 
        username: CHAT_CHANNEL, 
        password: TWITCH_TOKEN.startsWith('oauth:') ? TWITCH_TOKEN : `oauth:${TWITCH_TOKEN}` 
    },
    channels: [CHAT_CHANNEL]
});

// --- 2. DISCORD CONNECTION ---
const discordBot = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

// --- 3. GLOBAL BROADCAST FUNCTION ---
/**
 * Sends a message to ALL platforms but ignores it in the Twitch listener 
 * to prevent infinite chat loops.
 */
async function broadcastToAll(message) {
    console.log(`📢 SYSTEM BROADCAST: ${message}`);

    // Mirror to Discord
    await axios.post(DISCORD_WEBHOOK, { content: `**[BROADCAST]** ${message}` }).catch(()=>{});

    // Mirror to Facebook
    if (FB_ACCESS) {
        axios.post(`https://graph.facebook.com/v18.0/me/feed?message=${encodeURIComponent(message)}&access_token=${FB_ACCESS}`).catch(()=>{});
    }

    // Mirror to YouTube/Trovo (Via API Bridge)
    if (process.env.WP_RELAY_URL) {
        axios.post(process.env.WP_RELAY_URL, { user: "System", text: message, service: "Broadcast" }).catch(()=>{});
    }
}

// --- 4. TIKTOK ENGINE (On-Hold) ---
const tiktok = new WebcastPushConnection(TT_USER);

function startTikTok() {
    if (!isLive) return;
    tiktok.connect().then(state => {
        console.log(`✅ TikTok Connected! Room: ${state.roomId}`);
        client.say(CHAT_CHANNEL, "🐺 [System] TikTok Bridge is now ACTIVE.");
    }).catch(err => {
        console.log("ℹ️ TikTok Offline: Retrying in 2 minutes...");
        setTimeout(startTikTok, 120000); 
    });
}

tiktok.on('chat', data => {
    client.say(CHAT_CHANNEL, `[TikTok] ${data.uniqueId}: ${data.comment}`);
    axios.post(DISCORD_WEBHOOK, { content: `**[TikTok] ${data.uniqueId}:** ${data.comment}` }).catch(()=>{});
});

// --- 5. TWITCH EVENT LISTENERS (The "Going Live" Triggers) ---

// Listener: Official Twitch "Go Live" Notice
client.on('notice', (channel, msgid, message) => {
    if (msgid === 'host_on' || message.toLowerCase().includes("is now live")) {
        if (!isLive) {
            isLive = true;
            broadcastToAll("🐺 THE PACK IS OFFICIALLY LIVE! Join the hunt at twitch.tv/werewolf3788");
            startTikTok();
        }
    }
});

// Listener: Manual /announce commands
client.on('announcement', (channel, userstate, message, self) => {
    if (self) return; 
    broadcastToAll(`📣 ANNOUNCEMENT: ${message}`);
});

// Listener: Chat Triggers & Loop Protection
client.on('message', (channel, tags, message, self) => {
    if (self) return;
    const msg = message.toLowerCase();

    // Trigger: Live Announcement Module
    if (tags.username === CHAT_CHANNEL && msg.includes("live announcement")) {
        if (!isLive) {
            isLive = true;
            broadcastToAll("🚀 Live Signal Detected! Syncing all platforms...");
            startTikTok();
        }
    }

    // Manual Command: !go-live
    if (tags.username === CHAT_CHANNEL && message === "!go-live") {
        isLive = true;
        startTikTok();
    }

    // Standard Mirror to Discord (Twitch -> Discord)
    axios.post(DISCORD_WEBHOOK, { content: `**[Twitch] ${tags['display-name']}:** ${message}` }).catch(()=>{});
});

// --- 6. YOUTUBE & TROVO API HUB (With Loop Protection) ---
app.post('/api/bridge', (req, res) => {
    const { user, text, service } = req.body;
    
    // PROTECT: Ignore messages we broadcasted ourselves to prevent infinite relay loops
    if (service === "Broadcast") return res.status(200).send("Filtered loop");

    if (user && text) {
        client.say(CHAT_CHANNEL, `[${service}] ${user}: ${text}`);
        axios.post(DISCORD_WEBHOOK, { content: `**[${service}] ${user}:** ${text}` }).catch(()=>{});
    }
    res.status(200).send("Relayed");
});

// --- 7. DISCORD REMOTE (!send) ---
discordBot.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('!send ')) return;
    if (authorizedUsers.length > 0 && !authorizedUsers.includes(message.author.id)) return;

    const relayMessage = message.content.replace('!send ', '');
    client.say(CHAT_CHANNEL, `[Discord] ${message.author.username}: ${relayMessage}`);
    message.react('🐺'); 
});

// --- 8. HEARTBEAT & STARTUP ---
setInterval(() => {
    const timestamp = new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York' });
    console.log(`💓 [${timestamp} EST] Bridge OK | TikTok Live: ${isLive}`);
}, 60000);

client.connect().then(() => {
    console.log("🚀 Twitch Connected.");
    if (DISCORD_BOT_TOKEN) discordBot.login(DISCORD_BOT_TOKEN).catch(()=>{});
    app.listen(process.env.PORT || 3000, () => console.log(`✅ API Bridge Active`));
}).catch(err => console.error("🛑 Master Failure:", err));

process.on('uncaughtException', (err) => {
    console.log('🛑 ERROR INTERCEPTED:', err.message);
});
