// ==========================================
// WEREWOLF MULTI-STREAM RELAY ENGINE
// ==========================================
// Standard: Full Code Mandate - Kevin & Scott
// Updated: 2026-02-06
// Features: Twitch/TikTok Relay + Discord Remote Control

const tmi = require('tmi.js');
const axios = require('axios');
const express = require('express');
const { WebcastPushConnection } = require('tiktok-live-connector');
const { Client, GatewayIntentBits } = require('discord.js'); // Discord Bot Integration

// --- CONFIG & SECRETS ---
const CHAT_CHANNEL = 'werewolf3788';
const TWITCH_TOKEN = process.env.TWITCH_OAUTH; 
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN; 
const TT_USER = 'k082412';

// --- CRITICAL SECRET CHECK ---
if (!TWITCH_TOKEN || !TWITCH_CLIENT_ID || !DISCORD_WEBHOOK) {
    console.error("❌ ERROR: Missing GitHub Secrets (Check your Settings).");
    process.exit(1); 
}

// --- FRIENDS TO TRACK ---
const friends = [
    { name: 'terrdog420', id: 'TJ' },
    { name: 'mjolnirgaming', id: 'Michael' },
    { name: 'raymystro', id: 'Ray' }
    // { name: 'phoenix_darkfire', id: 'Seth' } // PAUSED
];
const liveStates = new Map();

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

// --- DISCORD BOT SETUP (For Remote Control) ---
const discordBot = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent 
    ] 
});

// --- HELPER: DISCORD WEBHOOK ---
async function sendToDiscord(user, platform, message) {
    try {
        await axios.post(DISCORD_WEBHOOK, {
            content: `**[${platform}] ${user}:** ${message}`
        });
    } catch (err) { console.log(`❌ Discord Mirror Failed`); }
}

// --- DISCORD COMMAND LISTENER (!send) ---
// This allows Mark or moderators to talk to your Twitch from Discord
discordBot.on('messageCreate', async (message) => {
    if (message.author.bot) return; 
    
    if (message.content.startsWith('!send ')) {
        const relayMessage = message.content.replace('!send ', '');
        const sender = message.author.username;
        
        // Push message to Twitch chat so it shows on PS5
        client.say(CHAT_CHANNEL, `[Discord] ${sender}: ${relayMessage}`);
        message.react('🐺'); // Shows the team the message was sent
    }
});

// --- TWITCH CHAT LISTENER ---
client.on('message', (channel, tags, message, self) => {
    if (self) return; 
    const user = tags['display-name'] || tags.username;
    sendToDiscord(user, 'Twitch', message);
});

// --- SHOUTOUT LOGIC ---
async function checkFriendStreams() {
    const userLogins = friends.map(f => f.name).join('&user_login=');
    const url = `https://api.twitch.tv/helix/streams?user_login=${userLogins}`;
    try {
        const response = await axios.get(url, {
            headers: {
                'Client-ID': TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${TWITCH_TOKEN.replace('oauth:', '')}`
            }
        });
        const liveStreams = response.data.data || [];
        const currentLiveLogins = liveStreams.map(s => s.user_login.toLowerCase());
        liveStreams.forEach(stream => {
            const login = stream.user_login.toLowerCase();
            if (!liveStates.get(login)) {
                const msg = `📣 SHOUTOUT: ${stream.user_name} is LIVE! Go show love at twitch.tv/${login} 🐺`;
                client.say(CHAT_CHANNEL, msg);
                sendToDiscord('System', 'Shoutout', msg);
                liveStates.set(login, true);
            }
        });
        friends.forEach(f => { if (!currentLiveLogins.includes(f.name.toLowerCase())) liveStates.set(f.name.toLowerCase(), false); });
    } catch (err) { console.log(`> Shoutout check failed`); }
}

// --- STARTUP SEQUENCE ---
client.connect()
    .then(() => {
        console.log("🚀 Twitch Connected.");
        client.say(CHAT_CHANNEL, "Werewolf Multi-Stream Relay is ONLINE. 🐺");
        
        if (DISCORD_BOT_TOKEN) {
            discordBot.login(DISCORD_BOT_TOKEN)
                .then(() => console.log("🐺 Discord Remote Control ACTIVE."))
                .catch(() => console.log("Discord Bot Token missing/invalid."));
        }

        try {
            const tiktok = new WebcastPushConnection(TT_USER);
            tiktok.connect().catch(() => console.log("TikTok Waiting (Go Live to connect)"));
            tiktok.on('chat', data => {
                sendToDiscord(data.uniqueId, 'TikTok', data.comment);
                client.say(CHAT_CHANNEL, `[TikTok] ${data.uniqueId}: ${data.comment}`);
            });
        } catch (e) { console.log("TikTok skipped."); }

        setInterval(checkFriendStreams, 300000); // Check friends every 5 mins
        app.listen(process.env.PORT || 3000, () => console.log(`✅ Bridge active`));
    })
    .catch((err) => { console.error("❌ TWITCH LOGIN FAILED:", err); });

app.post('/api/bridge', (req, res) => {
    const { username, message, platform } = req.body;
    client.say(CHAT_CHANNEL, `[${platform}] ${username}: ${message}`);
    sendToDiscord(username, platform, message);
    res.status(200).send("Relayed");
});
