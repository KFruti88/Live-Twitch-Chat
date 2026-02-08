/* ==========================================================================
   WEREWOLF MASTER ENGINE - V4.6 (THE ULTIMATE PROOF BUILD)
   Standard: Full Code Mandate - Kevin & Scott
   Updated: 2026-02-08
   Targets: Twitch, TikTok, YouTube, Trovo, Discord, Rank Overlay
   ========================================================================== */

const tmi = require('tmi.js');
const axios = require('axios');
const express = require('express');
const cors = require('cors');
const { WebcastPushConnection } = require('tiktok-live-connector');
const { Client, GatewayIntentBits } = require('discord.js');

// --- CONFIG & SECRETS ---
const CHAT_CHANNEL = 'werewolf3788';
const TWITCH_TOKEN = process.env.TWITCH_OAUTH; 
const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const BROADCASTER_ID = process.env.TWITCH_BROADCASTER_ID;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN; 
const TT_USER = 'k082412';

// --- LIVE MEMORY & TRACKERS ---
let isLive = false; 
let rankData = { diamond: 0, gold: 0, silver: 0, bronze: 0 }; 
const welcomedUsers = new Set(); 
const lurkerTimers = new Map(); 
const notifiedLurkers = new Set(); 

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' })); 

// --- 1. THE PROOF API (For Your Overlay) ---
// Your website pings this to get the numbers
app.get('/api/ranks', (req, res) => {
    res.json(rankData);
});

// Health check for WordPress status light
app.get('/', (req, res) => {
    res.status(200).send("Werewolf Relay Engine: ONLINE 🐺");
});

// --- 2. CONNECTIONS ---
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

// --- 3. 🕵️‍♂️ STEALTH LURKER TRACKER ---
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
                client.action(CHAT_CHANNEL, `[STEALTH ALERT] 🌑 ${name} has been lurking for ${timeElapsed} minutes.`);
                notifiedLurkers.add(name);
            }
        });
    } catch (err) { console.log("⚠️ Tracker Scan Failed."); }
}

// --- 4. TWITCH COMMANDS & EVENT LISTENERS ---
client.on('message', (channel, tags, message, self) => {
    if (self) return;
    const username = tags['display-name'] || tags.username;
    const msg = message.toLowerCase();

    // RANK LOGIC: The proof that commands update memory
    if (tags.username === CHAT_CHANNEL) {
        if (msg === '!diamond') rankData.diamond++;
        if (msg === '!gold') rankData.gold++;
        if (msg === '!silver') rankData.silver++;
        if (msg === '!bronze') rankData.bronze++;
        if (msg === '!resetranks') rankData = { diamond: 0, gold: 0, silver: 0, bronze: 0 };
    }

    // AUTO-WELCOME
    if (isLive && !welcomedUsers.has(username)) {
        client.say(CHAT_CHANNEL, `Welcome to the pack, ${username}! 🐺 Enjoy the hunt!`);
        welcomedUsers.add(username);
        lurkerTimers.delete(username);
        notifiedLurkers.delete(username);
    }

    // Manual Live Switch
    if (tags.username === CHAT_CHANNEL && (msg === "!go-live" || msg.includes("live announcement"))) {
        isLive = true;
        welcomedUsers.clear();
        lurkerTimers.clear();
        notifiedLurkers.clear();
        startTikTok();
    }

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
    if (user && text) {
        client.say(CHAT_CHANNEL, `[${service}] ${user}: ${text}`);
        axios.post(DISCORD_WEBHOOK, { content: `**[${service}] ${user}:** ${text}` }).catch(()=>{});
    }
    res.status(200).send("Relayed");
});

// --- 6. STARTUP ---
setInterval(checkNewLurkers, 120000); 
client.connect().then(() => {
    if (DISCORD_BOT_TOKEN) discordBot.login(DISCORD_BOT_TOKEN).catch(()=>{});
    app.listen(process.env.PORT || 3000, () => console.log(`✅ Ultimate Engine Online.`));
});

process.on('uncaughtException', (err) => console.log('🛑 ERROR:', err.message));
