/**
 * WEREWOLF STREAM HUB - Node.js Proxy
 * Prevents loops and syncs YouTube/Trovo/FB to Twitch.
 */
const io = require('socket.io-client');
const tmi = require('tmi.js');
const fetch = require('node-fetch');

const TWITCH_CHANNEL = 'werewolf3788'; 
const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1412973382433247252/fFwKe5xeW-S6VgWaPionj0A-ieKu3h_qFLaDZBl2JKobFispq0fBg_5_y8n1cWHwlGpY';

const twitchClient = new tmi.Client({
    options: { debug: false },
    connection: { secure: true, reconnect: true },
    identity: {
        username: TWITCH_CHANNEL,
        password: `oauth:${process.env.TWITCH_ACCESS_TOKEN}`
    },
    channels: [TWITCH_CHANNEL]
});

const streamlabs = io(`https://sockets.streamlabs.com?token=${process.env.STREAMLABS_TOKEN}`, {
    transports: ['websocket']
});

async function broadcast(username, message, rawPlatform) {
    // LOOP KILLER: If message already has a platform tag, stop here.
    if (/^\[(YT|TW|TR|FB)\]/.test(message)) return;

    const time = new Date().toLocaleTimeString("en-US", {
        timeZone: "America/New_York",
        hour: '2-digit',
        minute: '2-digit'
    });

    let tag = '??';
    if (rawPlatform.includes('youtube')) tag = 'YT';
    else if (rawPlatform.includes('twitch')) tag = 'TW';
    else if (rawPlatform.includes('trovo')) tag = 'TR';
    else if (rawPlatform.includes('facebook')) tag = 'FB';

    const formattedMsg = `[${tag}] ${username}: ${message}`;
    
    // Relay to Discord
    relayToDiscord(`[${time}] ${formattedMsg}`);

    // Push to Twitch ONLY if it didn't come from Twitch
    if (tag !== 'TW') {
        twitchClient.say(TWITCH_CHANNEL, formattedMsg).catch(() => {});
    }
}

streamlabs.on('event', (eventData) => {
    let msgData = null;
    if (eventData.type === 'message' || eventData.type === 'comment') {
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

twitchClient.connect();
