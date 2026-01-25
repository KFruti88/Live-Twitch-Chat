/* * SHARING NOTE FOR FRIENDS (Phoenix_Darkfire, MjolnirGaming, Raymystyro):
 * 1. This is the IDLE version—it stays connected and waits for you to go live.
 * 2. It syncs all platforms to your Twitch chat for on-screen TV viewing.
 * 3. Timezone set to America/New_York (Gainesville).
 */

const io = require('socket.io-client');
const tmi = require('tmi.js');
const fetch = require('node-fetch');

// 1. CONFIG
const TWITCH_CHANNEL = 'werewolf3788'; 
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

// 3. STREAMLABS SOCKET (The Idle Connection)
const streamlabs = io(`https://sockets.streamlabs.com?token=${process.env.STREAMLABS_TOKEN}`, {
    transports: ['websocket']
});

// 4. THE DISPATCHER
async function broadcast(username, message, rawPlatform) {
    // Prevent Echo/Loop: Ignore messages already tagged by the bot
    if (message.startsWith('[YT]') || message.startsWith('[TW]') || message.startsWith('[TR]') || message.startsWith('[FB]')) return;

    // Gainesville/NY Timestamp
    const time = new Date().toLocaleTimeString("en-US", {
        timeZone: "America/New_York",
        hour: '2-digit',
        minute: '2-digit'
    });

    let tag = '??';
    if (rawPlatform.includes('youtube')) tag = 'YT';
    if (rawPlatform.includes('twitch')) tag = 'TW';
    if (rawPlatform.includes('trovo')) tag = 'TR';
    if (rawPlatform.includes('facebook')) tag = 'FB';

    const formattedMsg = `[${time}] [${tag}] ${username}: ${message}`;
    console.log(`[IDLE LOG] ${formattedMsg}`);

    // A. Send to Discord
    relayToDiscord(formattedMsg);

    // B. Send to Twitch (Injects into your TV overlay/TTS)
    if (tag !== 'TW') {
        twitchClient.say(TWITCH_CHANNEL, formattedMsg).catch(() => {});
    }
}

// 5. EVENT LISTENERS
streamlabs.on('connect', () => {
    console.log("[✔] Socket IDLE: Waiting for chat activity...");
});

streamlabs.on('event', (eventData) => {
    if (eventData.type === 'message' || eventData.message) {
        const msg = eventData.message[0];
        if (!msg || !msg.text) return;
        broadcast(msg.from, msg.text, eventData.for || 'stream');
    }
});

async function relayToDiscord(content) {
    try {
        await fetch(DISCORD_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: `**${content}**` })
        });
    } catch (e) {}
}

// 6. START
twitchClient.connect().then(() => {
    console.log("[✔] Twitch Proxy Online. Watching Streamlabs feed.");
});
