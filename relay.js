/* * SHARING NOTE FOR FRIENDS (Seth, Michael, TJ/Dark Terror, Ray):
 * 1. This is the WIDE NET version—specifically tuned to catch YouTube comments.
 * 2. Timezone locked to America/New_York (EST).
 * 3. Keeps your TV overlay synced across all platforms.
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

// 3. STREAMLABS SOCKET
const streamlabs = io(`https://sockets.streamlabs.com?token=${process.env.STREAMLABS_TOKEN}`, {
    transports: ['websocket']
});

// 4. THE DISPATCHER (EST Timezone + Loop Killer)
async function broadcast(username, message, rawPlatform) {
    if (message.startsWith('[YT]') || message.startsWith('[TW]') || message.startsWith('[TR]') || message.startsWith('[FB]')) return;

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
    console.log(`[WEREWOLF3788 SYNC] ${formattedMsg}`);

    relayToDiscord(formattedMsg);

    if (tag !== 'TW') {
        twitchClient.say(TWITCH_CHANNEL, formattedMsg).catch(() => {});
    }
}

// 5. WIDE-NET EVENT LISTENERS
streamlabs.on('connect', () => console.log("[✔] Socket Online: Wide-Net monitoring active."));

streamlabs.on('event', (eventData) => {
    let msgData = null;

    // Standard message type (Twitch/Trovo)
    if (eventData.type === 'message') {
        msgData = eventData.message[0];
    } 
    // YouTube specific 'comment' type
    else if (eventData.type === 'comment' || (eventData.for === 'youtube_account' && eventData.message)) {
        msgData = eventData.message[0];
    }

    if (msgData && msgData.text) {
        broadcast(msgData.from, msgData.text, eventData.for || 'stream');
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
    console.log("[✔] WEREWOLF3788 Proxy Online. EST Active.");
});
