/* ==========================================================================
   WEREWOLF MASTER ENGINE - VERSION 4.0 (THE FINAL RELAY)
   Standard: Full Code Mandate - Kevin & Scott
   Updated: 2026-02-07 (Individual Stealth Alerts + Multi-Broadcast)
   ========================================================================== */

const tmi = require('tmi.js');
const axios = require('axios');
const express = require('express');
const { WebcastPushConnection } = require('tiktok-live-connector');
const { Client, GatewayIntentBits } = require('discord.js');

// --- CONFIG & SECRETS ---
const CHAT_CHANNEL = 'werewolf3788';
const TWITCH_TOKEN = process.env.TWITCH_OAUTH; 
const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const BROADCASTER_ID = process.env.TWITCH_BROADCASTER_ID;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN; 
const FB_ACCESS = process.env.FB_ACCESS_TOKEN; 
const TT_USER = 'k082412';
const authorizedUsers = ['1136876505142677504']; 

// --- STATE TRACKERS ---
let isLive = false; 
const welcomedUsers = new Set(); 
const lurkerTimers = new Map(); 
const notifiedLurkers = new Set(); 

const app = express();
app.use(express.json());

// --- 1. CONNECTIONS (Twitch & Discord) ---
const client = new tmi.Client({
    identity: { 
        username: CHAT_CHANNEL, 
        password: TWITCH_TOKEN.startsWith('oauth:') ? TWITCH_TOKEN : `oauth:${TWITCH_TOKEN}` 
    },
    channels: [CHAT_CHANNEL]
});

const discordBot = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

// --- 2. GLOBAL BROADCAST ENGINE ---
async function broadcastToAll(message) {
    console.log(`📢 SYSTEM BROADCAST: ${message}`);
    await axios.post(DISCORD_WEBHOOK, { content: `**[BROADCAST]** ${message}` }).catch(()=>{});
    if (FB_ACCESS) {
        axios.post(`https://graph.facebook.com/v18.0/me/feed?message=${encodeURIComponent(message)}&access_token=${FB_ACCESS}`).catch(()=>{});
    }
    if (process.env.WP_RELAY_URL) {
        axios.post(process.env.WP_RELAY_URL, { user: "Werewolf-Bot", text: message, service: "Broadcast" }).catch(()=>{});
    }
}

// --- 3. 🕵️‍♂️ STEALTH LURKER TRACKER (Twitch Chat Pings) ---
async function checkNewLurkers() {
    if (!isLive) return;

    try {
        const response = await axios.get(`https://api.twitch.tv/helix/chat/chatters?broadcaster_id=${BROADCASTER_ID}&moderator_id=${BROADCASTER_ID}`, {
            headers: { 'Client-ID': CLIENT_ID, 'Authorization': `Bearer ${TWITCH_TOKEN.replace('oauth:', '')}` }
        });

        const chatters = response.data.data;
        const now = Date.now();

        chatters.forEach((chatter) => {
            const name = chatter.user_name;
            if (name === CHAT_CHANNEL || welcomedUsers.has(name)) return;

            if (!lurkerTimers.has(name)) lurkerTimers.set(name, now);

            const timeElapsed = Math.floor((now - lurkerTimers.get(name)) / 60000);
            if (timeElapsed >= 5 && !notifiedLurkers.has(name)) {
                // ALERT: Sent as a colored '/me' message for visibility
                client.action(CHAT_CHANNEL, `[STEALTH ALERT] 🌑 ${name} has been lurking for ${timeElapsed} minutes.`);
                notifiedLurkers.add(name);
            }
        });
    } catch (err) { console.log("⚠️ Lurker Scan Failed."); }
}

// --- 4. TWITCH EVENT LISTENERS ---
client.on('notice', (channel, msgid, message) => {
    if (msgid === 'host_on' || message.toLowerCase().includes("is now live")) {
        if (!isLive) {
            isLive = true;
            broadcastToAll("🐺 THE PACK IS LIVE! twitch.tv/werewolf3788");
            startTikTok();
        }
    }
});

client.on('message', (channel, tags, message, self) => {
    if (self) return;
    const username = tags['display-name'] || tags.username;

    // AUTO-WELCOME
    if (isLive && !welcomedUsers.has(username)) {
        client.say(CHAT_CHANNEL, `Welcome to the pack, ${username}! 🐺 Enjoy the hunt!`);
        welcomedUsers.add(username);
        lurkerTimers.delete(username);
        notifiedLurkers.delete(username);
    }

    // Manual Live Trigger
    if (tags.username === CHAT_CHANNEL && message === "!go-live") {
        isLive = true;
        welcomedUsers.clear();
        lurkerTimers.clear();
        notifiedLurkers.clear();
        startTikTok();
    }

    // Mirror to Discord
    axios.post(DISCORD_WEBHOOK, { content: `**[Twitch] ${username}:** ${message}` }).catch(()=>{});
});

// --- 5. TIKTOK & BRIDGE API ---
const tiktok = new WebcastPushConnection(TT_USER);
function startTikTok() {
    if (!isLive) return;
    tiktok.connect().catch(() => setTimeout(startTikTok, 120000));
}

tiktok.on('chat', data => {
    client.say(CHAT_CHANNEL, `[TikTok] ${data.uniqueId}: ${data.comment}`);
    axios.post(DISCORD_WEBHOOK, { content: `**[TikTok] ${data.uniqueId}:** ${data.comment}` }).catch(()=>{});
});

app.post('/api/bridge', (req, res) => {
    const { user, text, service } = req.body;
    if (service === "Broadcast") return res.status(200).send("Filtered");
    if (user && text) {
        client.say(CHAT_CHANNEL, `[${service}] ${user}: ${text}`);
        axios.post(DISCORD_WEBHOOK, { content: `**[${service}] ${user}:** ${text}` }).catch(()=>{});
    }
    res.status(200).send("Relayed");
});

// --- 6. STARTUP & HEARTBEAT ---
setInterval(checkNewLurkers, 120000); // Check for lurkers every 2 mins
setInterval(() => {
    console.log(`💓 [${new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York' })} EST] Engine 4.0 Active.`);
}, 60000);

client.connect().then(() => {
    if (DISCORD_BOT_TOKEN) discordBot.login(DISCORD_BOT_TOKEN).catch(()=>{});
    app.listen(process.env.PORT || 3000, () => console.log(`✅ Master Engine 4.0 Online.`));
});

process.on('uncaughtException', (err) => console.log('🛑 ERROR:', err.message));
