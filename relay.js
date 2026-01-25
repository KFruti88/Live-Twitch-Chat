/* * SHARING NOTE FOR FRIENDS (Phoenix_Darkfire, MjolnirGaming, Raymystyro):
 * 1. Change 'TWITCH_CHANNEL' to your handle.
 * 2. Get your Socket API Token: https://streamlabs.com/dashboard#/settings/api-settings -> API Tokens
 * 3. Add 'STREAMLABS_TOKEN' and 'TWITCH_ACCESS_TOKEN' to your GitHub Secrets.
 * 4. This version handles all platforms (YT, TW, TR) through one Streamlabs pipe.
 */

const io = require('socket.io-client');
const tmi = require('tmi.js');
const fetch = require('node-fetch');

// 1. CONFIGURATION
const TWITCH_CHANNEL = 'werewolf3788'; 
const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1412973382433247252/fFwKe5xeW-S6VgWaPionj0A-ieKu3h_qFLaDZBl2JKobFispq0fBg_5_y8n1cWHwlGpY';

// 2. TWITCH SETUP (To post messages to your TV screen)
const twitchClient = new tmi.Client({
    options: { debug: false },
    connection: { secure: true, reconnect: true },
    identity: {
        username: TWITCH_CHANNEL,
        password: `oauth:${process.env.TWITCH_ACCESS_TOKEN}`
    },
    channels: [TWITCH_CHANNEL]
});

// 3. STREAMLABS SOCKET SETUP (The "Universal Pipe")
const streamlabs = io(`https://sockets.streamlabs.com?token=${process.env.STREAMLABS_TOKEN}`, {
    transports: ['websocket']
});

// 4. THE SYNC LOGIC
streamlabs.on('connect', () => {
    console.log("[✔] Connected to Streamlabs Universal Feed!");
});

streamlabs.on('event', (eventData) => {
    // Only process chat messages
    if (eventData.type === 'message') {
        const msgData = eventData.message[0];
        const platform = eventData.for || 'stream'; // e.g. 'youtube_account', 'twitch_account'
        const username = msgData.from;
        const text = msgData.text;

        // LOOP PREVENTION: Ignore messages that are already relays
        if (text.startsWith('[YT]') || text.startsWith('[TW]') || text.startsWith('[TR]')) return;

        // Format the tag (e.g., [YOUTUBE] or [TWITCH])
        const tag = platform.split('_')[0].toUpperCase().substring(0, 2); 
        const formattedMsg = `[${tag}] ${username}: ${text}`;

        console.log(`[RELAY] ${formattedMsg}`);

        // A. Post to Discord
        relayToDiscord(formattedMsg);

        // B. Post to Twitch (So it shows on your TV)
        // We only send it if it didn't ORIGINATE on Twitch to prevent double-display
        if (tag !== 'TW') {
            twitchClient.say(TWITCH_CHANNEL, formattedMsg).catch(() => {});
        }
    }
});

// 5. HELPERS
async function relayToDiscord(content) {
    try {
        await fetch(DISCORD_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: `**${content}**` })
        });
    } catch (e) { console.error("Discord Fail"); }
}

// 6. START
twitchClient.connect().then(() => {
    console.log("[✔] Twitch Proxy Online.");
}).catch(err => console.error("Twitch Connection Error:", err));
