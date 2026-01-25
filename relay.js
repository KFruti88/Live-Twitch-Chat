/* * SHARING NOTE FROM WEREWOLF3788:
 * 1. Seth, Michael, TJ (Dark Terror), Ray: Fork this to sync your own chats!
 * 2. Add 'STREAMLABS_TOKEN' and 'TWITCH_ACCESS_TOKEN' to your GitHub Secrets.
 * 3. This version stays IDLE and waits for your Streamlabs socket to pulse.
 */

const io = require('socket.io-client');
const tmi = require('tmi.js');
const fetch = require('node-fetch');

// 1. CONFIG
const TWITCH_CHANNEL = 'werewolf3788'; 
const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1412973382433247252/fFwKe5xeW-S6VgWaPionj0A-ieKu3h_qFLaDZBl2JKobFispq0fBg_5_y8n1cWHwlGpY';

// 2. TWITCH SETUP (The "TV Injector")
const twitchClient = new tmi.Client({
    options: { debug: false },
    connection: { secure: true, reconnect: true },
    identity: {
        username: TWITCH_CHANNEL,
        password: `oauth:${process.env.TWITCH_ACCESS_TOKEN}`
    },
    channels: [TWITCH_CHANNEL]
});

// 3. STREAMLABS SOCKET (The Universal Switch)
const streamlabs = io(`https://sockets.streamlabs.com?token=${process.env.STREAMLABS_TOKEN}`, {
    transports: ['websocket']
});

// 4. THE DISPATCHER (With NY/Gainesville Time)
async function broadcast(username, message, rawPlatform) {
    // A. STOP LOOPS: Ignore messages that already have our relay tags
    if (message.startsWith('[YT]') || message.startsWith('[TW]') || message.startsWith('[TR]') || message.startsWith('[FB]')) return;

    // B. GET LOCAL TIME (EST)
    const time = new Date().toLocaleTimeString("en-US", {
        timeZone: "America/New_York",
        hour: '2-digit',
        minute: '2-digit'
    });

    // C. IDENTIFY SOURCE
    let tag = '??';
    if (rawPlatform.includes('youtube')) tag = 'YT';
    if (rawPlatform.includes('twitch')) tag = 'TW';
    if (rawPlatform.includes('trovo')) tag = 'TR';
    if (rawPlatform.includes('facebook')) tag = 'FB';

    const formattedMsg = `[${time}] [${tag}] ${username}: ${message}`;
    console.log(`[WEREWOLF3788 SYNC] ${formattedMsg}`);

    // D. RELAY TO DISCORD
    relayToDiscord(formattedMsg);

    // E. RELAY TO TWITCH (Puts it on your Xbox/PlayStation TV Screen)
    if (tag !== 'TW') {
        twitchClient.say(TWITCH_CHANNEL, formattedMsg).catch(() => {});
    }
}

// 5. EVENT LISTENERS
streamlabs.on('connect', () => console.log("[✔] WEREWOLF3788 Socket IDLE: Waiting for stream activity..."));

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
    console.log("[✔] WEREWOLF3788 Proxy Online. EST Timezone Active.");
});
