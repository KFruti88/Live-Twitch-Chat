const io = require('socket.io-client');
const fetch = require('node-fetch');

// 1. CONFIGURATION
// Find your token at: https://streamlabs.com/dashboard#/settings/api-settings -> API Tokens
const STREAMLABS_TOKEN = 'YOUR_SOCKET_API_TOKEN_HERE'; 
const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1412973382433247252/fFwKe5xeW-S6VgWaPionj0A-ieKu3h_qFLaDZBl2JKobFispq0fBg_5_y8n1cWHwlGpY';

// 2. CONNECT TO STREAMLABS
const streamlabs = io(`https://sockets.streamlabs.com?token=${STREAMLABS_TOKEN}`, {
    transports: ['websocket']
});

streamlabs.on('connect', () => {
    console.log("[✔] Connected to Streamlabs Universal Feed!");
});

// 3. THE RELAY ENGINE (Listens to ALL platforms at once)
streamlabs.on('event', (eventData) => {
    // We are looking for 'chat' messages from any platform
    if (eventData.type === 'message') {
        const platform = eventData.for || 'Stream'; // e.g., 'youtube_account', 'twitch_account'
        const username = eventData.message[0].from;
        const text = eventData.message[0].text;

        // Skip our own bot's relay messages to prevent loops
        if (text.startsWith('[YT]') || text.startsWith('[TW]') || text.startsWith('[TR]')) return;

        const formattedMsg = `[${platform.split('_')[0].toUpperCase()}] ${username}: ${text}`;
        console.log(`[RELAY] ${formattedMsg}`);

        // Send to Discord
        relayToDiscord(formattedMsg);
    }
});

async function relayToDiscord(content) {
    try {
        await fetch(DISCORD_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: `**${content}**` })
        });
    } catch (e) { console.error("Discord Error"); }
}
