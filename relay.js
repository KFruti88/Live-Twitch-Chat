const tmi = require('tmi.js');
const fetch = require('node-fetch');

// 1. CONFIGURATION
const WP_URL = "https://werewolf.ourflora.com/wp-json/stream-bridge/v1/relay";
const TWITCH_CHANNEL = 'werewolf3788';

// 2. INITIALIZE TWITCH CLIENT
const client = new tmi.Client({
    connection: {
        secure: true,
        reconnect: true
    },
    channels: [ TWITCH_CHANNEL ]
});

client.connect().catch(console.error);

// 3. MESSAGE HANDLER
client.on('message', (channel, tags, message, self) => {
    // Ignore messages from the bot itself to prevent infinite loops
    if (self) return;

    console.log(`[*] Twitch Message from ${tags['display-name']}: ${message}`);

    // PUSH TO WORDPRESS BRIDGE
    fetch(WP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: tags['display-name'],
            message: message,
            platform: 'Twitch'
        })
    })
    .then(res => {
        if (res.ok) console.log("Successfully relayed to WordPress -> Discord");
        else console.log("WordPress returned an error.");
    })
    .catch(err => console.error("Relay Network Error:", err));
});
