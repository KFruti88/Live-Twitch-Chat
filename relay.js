/* * SHARING NOTE FOR FRIENDS (Phoenix_Darkfire, MjolnirGaming, Raymystyro):
 * 1. Change 'TWITCH_CHANNEL' to your handle.
 * 2. Change 'YT_CHANNEL_ID' to your UC... ID.
 * 3. This script auto-retries every 30s until you go live on PlayStation.
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
        password: process.env.TWITCH_ACCESS_TOKEN.startsWith('oauth:') ? 
                  process.env.TWITCH_ACCESS_TOKEN : `oauth:${process.env.TWITCH_ACCESS_TOKEN}`
    },
    channels: [TWITCH_CHANNEL]
});

// 3. YOUTUBE SETUP (With Browser Headers to prevent blocking)
const ytChat = new LiveChat({ 
    channelId: YT_CHANNEL_ID,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
});

// 4. THE AUTO-START LOGIC
async function startYouTubeRelay() {
    try {
        console.log(`[🔍] Bot is looking for your stream on ${YT_CHANNEL_ID}...`);
        const ok = await ytChat.start();
        if (ok) {
            console.log("[✔] Connected! YouTube messages will now appear on your PlayStation TV.");
        }
    } catch (err) {
        // Keeps trying until you hit 'Go Live' in Lightstream/YouTube
        console.log("[!] YouTube hasn't detected your stream yet. Retrying in 30s...");
        setTimeout(startYouTubeRelay, 30000); 
    }
}

// 5. THE MAGIC: YouTube -> Twitch Overlay on TV
ytChat.on("chat", (chatItem) => {
    const username = chatItem.author.name;
    const message = chatItem.message[0].text;
    const combinedMsg = `[YT] ${username}: ${message}`;

    console.log(`[LISTEN] YouTube heard: ${username}: ${message}`);

    // This puts the message on your TV via Twitch chat overlay/TTS
    twitchClient.say(TWITCH_CHANNEL, combinedMsg).catch(e => console.error("Twitch Sync Error:", e.message));

    // Also send to Discord/WordPress Bridge
    relayToBridge(username, message, 'YouTube');
});

// Relay function for Discord
async function relayToBridge(username, message, platform) {
    try {
        await fetch(WP_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Twitch-Client-ID': process.env.TWITCH_CLIENT_ID,
                'X-Twitch-Token': process.env.TWITCH_ACCESS_TOKEN 
            },
            body: JSON.stringify({ username, message, platform })
        });
    } catch (e) { /* Silent fail to keep bot running */ }
}

// 6. START
twitchClient.connect().then(() => {
    console.log("[✔] Twitch Connected successfully.");
    startYouTubeRelay();
}).catch(err => console.error("Twitch Login Failed. Check your Token in GitHub Secrets!", err));
