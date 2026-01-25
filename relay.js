/* * SHARING NOTE FOR FRIENDS (Phoenix_Darkfire, MjolnirGaming, Raymystyro):
 * 1. Change 'TWITCH_CHANNEL' to your handle.
 * 2. This bot acts as a Central Dispatcher to prevent loops.
 */

const tmi = require('tmi.js');
const { LiveChat } = require('youtube-chat');
const fetch = require('node-fetch');

// 1. CONFIGURATION
const TWITCH_CHANNEL = 'werewolf3788'; 
const YT_CHANNEL_ID = 'UCYrxPkCw_Q2Fw02VFfumfyQ'; 
const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1412973382433247252/fFwKe5xeW-S6VgWaPionj0A-ieKu3h_qFLaDZBl2JKobFispq0fBg_5_y8n1cWHwlGpY';

// 2. TWITCH SETUP
const twitchClient = new tmi.Client({
    options: { debug: false },
    connection: { secure: true, reconnect: true },
    identity: {
        username: TWITCH_CHANNEL,
        password: `oauth:${process.env.TWITCH_ACCESS_TOKEN}`
    },
    channels: [TWITCH_CHANNEL]
});

// 3. CENTRAL DISPATCHER (The Loop-Killer)
async function broadcast(username, message, sourcePlatform) {
    // A. STOP THE LOOP: If it's already a relay message, exit now.
    if (message.startsWith('[YT]') || message.startsWith('[TW]') || message.startsWith('[TR]')) {
        return; 
    }

    const relayMessage = `[${sourcePlatform}] ${username}: ${message}`;
    console.log(`[DISPATCH] From ${sourcePlatform}: ${username}`);

    // B. SEND TO TWITCH (Shows on your TV Overlay)
    if (sourcePlatform !== 'TW') {
        twitchClient.say(TWITCH_CHANNEL, relayMessage).catch(() => {});
    }

    // C. SEND TO DISCORD
    relayToDiscord(relayMessage);

    // NOTE: Posting TO YouTube or Trovo requires extra API Keys (Google/Trovo Dev)
}

// 4. THE "LIGHTSTREAM" TRIGGER (Silent Watch)
let ytChat;
let isLive = false;

async function monitorLiveStatus() {
    if (isLive) return;

    console.log(`[🔍] Watching Lightstream feed via YouTube (${YT_CHANNEL_ID})...`);
    
    try {
        ytChat = new LiveChat({ channelId: YT_CHANNEL_ID });
        const connected = await ytChat.start();
        
        if (connected) {
            isLive = true;
            console.log("[✔] Lightstream detected! Syncing all platforms.");
            
            ytChat.on("chat", (chatItem) => {
                broadcast(chatItem.author.name, chatItem.message[0].text, 'YT');
            });

            ytChat.on("error", () => {
                isLive = false;
                monitorLiveStatus();
            });
        }
    } catch (err) {
        setTimeout(monitorLiveStatus, 60000); // Check every minute
    }
}

// 5. LISTENERS
twitchClient.on('message', (channel, tags, message, self) => {
    if (self) return;
    broadcast(tags['display-name'], message, 'TW');
});

// 6. HELPERS
async function relayToDiscord(content) {
    try {
        await fetch(DISCORD_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: `**${content}**` })
        });
    } catch (e) {}
}

// 7. START
twitchClient.connect().then(() => {
    console.log("[✔] Dispatcher Online.");
    monitorLiveStatus();
});
