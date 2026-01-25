const tmi = require('tmi.js');
const { LiveChat } = require('youtube-chat');
const fetch = require('node-fetch');

// 1. CONFIG
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

// 3. THE "SILENT WATCH" ENGINE
let ytChat;
let isYtConnected = false;

async function monitorYouTube() {
    if (isYtConnected) return; // Don't try to connect if we already are

    console.log(`[🔍] Monitoring ${YT_CHANNEL_ID}... (Waiting for PlayStation to go Live)`);
    
    try {
        ytChat = new LiveChat({ channelId: YT_CHANNEL_ID });
        
        // This is the trick: we "start" it inside a controlled block
        const connected = await ytChat.start();
        
        if (connected) {
            isYtConnected = true;
            console.log("[✔] YouTube Stream Found! Messages are now syncing to your TV.");
            
            ytChat.on("chat", (chatItem) => {
                const username = chatItem.author.name;
                const message = chatItem.message[0].text;
                const combinedMsg = `[YT] ${username}: ${message}`;

                // Send to Twitch so it shows on your TV
                twitchClient.say(TWITCH_CHANNEL, combinedMsg).catch(() => {});
                
                // Send to Discord
                relayToBridge(username, message, 'YouTube');
            });

            ytChat.on("error", () => {
                console.log("[!] Stream ended or lost. Returning to Silent Watch...");
                isYtConnected = false;
                monitorYouTube();
            });
        }
    } catch (err) {
        // Instead of a "Fatal Error", we just log a quiet retry
        setTimeout(monitorYouTube, 60000); // Check once every minute
    }
}

async function relayToBridge(username, message, platform) {
    try {
        await fetch(WP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, message, platform })
        });
    } catch (e) {}
}

// 4. BOOT UP
twitchClient.connect().then(() => {
    console.log("[✔] Twitch Connected. Bot is now in 'Silent Watch' mode.");
    monitorYouTube();
});
