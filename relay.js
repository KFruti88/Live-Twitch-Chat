// ==========================================
// WEREWOLF MULTI-STREAM RELAY ENGINE
// ==========================================
// Standard: Full Code Mandate - Kevin & Scott
// Updated: 2026-02-06
// Features: Twitch/TikTok Relay + Discord Remote Control + Security Check

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
// PASTE YOUR NUMERIC ID HERE. If you leave this empty [], anyone can use !send
const authorizedUsers = ['1136876505142677504']; 

const app = express();
app.use(express.json());

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

async function sendToDiscord(user, platform, message) {
    try {
        await axios.post(DISCORD_WEBHOOK, { content: `**[${platform}] ${user}:** ${message}` });
    } catch (err) { console.log(`❌ Discord Mirror Failed`); }
}

// --- DISCORD COMMAND LISTENER (!send) ---
discordBot.on('messageCreate', async (message) => {
    if (message.author.bot) return; 

    // DEBUG: Logs what the bot hears to the GitHub Action console
    console.log(`🔍 [Discord Debug] ${message.author.username} sent: "${message.content}"`);
    
    if (message.content.startsWith('!send ')) {
        // SECURITY: If the list isn't empty, only allow IDs in the list
        if (authorizedUsers.length > 0 && !authorizedUsers.includes(message.author.id)) {
            console.log(`🚫 Security: Ignored !send from unauthorized user: ${message.author.username}`);
            return;
        }

        const relayMessage = message.content.replace('!send ', '');
        
        // Push message to Twitch so you see it on the PlayStation
        client.say(CHAT_CHANNEL, `[Discord] ${message.author.username}: ${relayMessage}`);
        console.log(`📡 SUCCESS: Relayed "${relayMessage}" to Twitch`);
        message.react('🐺'); 
    }
});

// --- TWITCH CHAT LISTENER ---
client.on('message', (channel, tags, message, self) => {
    if (self) return; 
    sendToDiscord(tags['display-name'] || tags.username, 'Twitch', message);
});

// --- SHOUTOUT LOGIC ---
async function checkFriendStreams() {
    const userLogins = ['terrdog420', 'mjolnirgaming', 'raymystro'].join('&user_login=');
    try {
        const response = await axios.get(`https://api.twitch.tv/helix/streams?user_login=${userLogins}`, {
            headers: { 'Client-ID': TWITCH_CLIENT_ID, 'Authorization': `Bearer ${TWITCH_TOKEN.replace('oauth:', '')}` }
        });
        const liveStreams = response.data.data || [];
        liveStreams.forEach(stream => {
            // Future logic for friend alerts can go here
        });
    } catch (err) { console.log(`> Shoutout failed`); }
}

// --- STARTUP SEQUENCE ---
client.connect().then(() => {
    console.log("🚀 Twitch Connected Successfully.");
    
    if (DISCORD_BOT_TOKEN) {
        discordBot.login(DISCORD_BOT_TOKEN)
            .then(() => console.log("🐺 Discord Remote Control ACTIVE."))
            .catch(() => console.log("Discord Token Error. Check GitHub Secrets."));
    }
    
    try {
        const tiktok = new WebcastPushConnection(TT_USER);
        tiktok.connect().catch(() => console.log("TikTok Waiting (Go Live to connect)"));
        tiktok.on('chat', data => {
            sendToDiscord(data.uniqueId, 'TikTok', data.comment);
            client.say(CHAT_CHANNEL, `[TikTok] ${data.uniqueId}: ${data.comment}`);
        });
    } catch (e) { console.log("TikTok initialization skipped."); }

    setInterval(checkFriendStreams, 300000);
    app.listen(process.env.PORT || 3000, () => console.log(`✅ Bridge active`));
}).catch(err => console.error(err));

// --- BRIDGE ENDPOINT ---
app.post('/api/bridge', (req, res) => {
    client.say(CHAT_CHANNEL, `[${req.body.platform}] ${req.body.username}: ${req.body.message}`);
    sendToDiscord(req.body.username, req.body.platform, req.body.message);
    res.status(200).send("Relayed");
});
