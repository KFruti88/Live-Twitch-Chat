/* * SHARING NOTE FOR FRIENDS (Phoenix_Darkfire, MjolnirGaming, Raymystyro):
 * 1. Change 'TWITCH_CHANNEL' to your handle.
 * 2. Change 'YT_CHANNEL_ID' to your UC... ID.
 * 3. Ensure your 'TWITCH_ACCESS_TOKEN' in GitHub Secrets has 'chat:edit' permissions.
 */

const tmi = require('tmi.js');
const { LiveChat } = require('youtube-chat');
const fetch = require('node-fetch');

// 1. CONFIGURATION
const TWITCH_CHANNEL = 'werewolf3788'; 
const YT_CHANNEL_ID = 'UCYrxPkCw_Q2Fw02VFfumfyQ'; 
const WP_URL = "https://werewolf.ourflora.com/wp-json/stream-bridge/v1/relay";

// 2. TWITCH SETUP
const twitchClient = new tmi.Client({
    options: { debug: true },
    connection: { secure: true, reconnect: true },
    identity: {
        username: TWITCH_CHANNEL,
        password: `oauth:${process.env.TWITCH_ACCESS_TOKEN}`
    },
    channels: [TWITCH_CHANNEL]
});

// 3. RELAY FUNCTION (Pushes to WordPress/Discord)
async function relayMessage(username, message, platform) {
    try {
        const response = await fetch(WP_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Twitch-Client-ID': process.env.TWITCH_CLIENT_ID,
                'X-Twitch-Token': process.env.TWITCH_ACCESS_TOKEN 
            },
            body: JSON.stringify({ username, message, platform })
        });
        
        if (response.ok) {
            console.log(`[${platform}] Relayed: ${username}`);
        } else {
            console.log(`[${platform}] WordPress Error: ${response.status}`);
        }
    } catch (err) {
        console.error(`[${platform}] Relay Error:`, err.message);
    }
}

// 4. TWITCH LISTENER
twitchClient.on('message', (channel, tags, message, self) => {
    if (self) return;
    relayMessage(tags['display-name'], message, 'Twitch');
});

// 5. AUTO-CONNECTING YOUTUBE ENGINE
const ytChat = new LiveChat({ 
    channelId: YT_CHANNEL_ID,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
});

// This function keeps trying until it finds your live stream automatically
async function startYouTube() {
    try {
        await ytChat.start();
        console.log(`[✔] YouTube Connected to channel: ${YT_CHANNEL_ID}`);
        console.log("[✔] Relay is Live and Listening!");
    } catch (err) {
        console.log(`[!] Waiting for live stream on ${YT_CHANNEL_ID}... Retrying in 30s.`);
        setTimeout(startYouTube, 30000); // Wait 30 seconds and try again
    }
}

ytChat.on("chat", (chatItem) => {
    const username = chatItem.author.name;
    const message = chatItem.message[0].text;
    console.log(`[YT] ${username}: ${message}`);
    
    // A. Relay to WordPress (Discord)
    relayMessage(username, message, 'YouTube');
    
    // B. Sync YouTube Message into Twitch Chat
    twitchClient.say(TWITCH_CHANNEL, `[YT] ${username}: ${message}`).catch(() => {});
});

// 6. START EVERYTHING
twitchClient.connect().then(() => {
    console.log("[✔] Twitch Connected");
    startYouTube();
}).catch(err => console.error("Twitch Connection Failed:", err));
