const tmi = require('tmi.js');
const io = require('socket.io-client');

// --- Configuration ---
const CHAT_CHANNEL = 'werewolf3788'; 
const STREAMLABS_TOKEN = process.env.STREAMLABS_TOKEN;
const TWITCH_TOKEN = process.env.TWITCH_ACCESS_TOKEN;

// 1. Setup Twitch Bot
const client = new tmi.Client({
    options: { debug: false },
    identity: {
        username: CHAT_CHANNEL,
        password: `oauth:${TWITCH_TOKEN}`
    },
    channels: [CHAT_CHANNEL]
});

// 2. Setup Streamlabs Socket (The "Wide-Net")
const socket = io(`https://sockets.streamlabs.com?token=${STREAMLABS_TOKEN}`, {
    transports: ['websocket']
});

// 3. The Relay Function
socket.on('event', (eventData) => {
    // Only process chat messages or comments
    if (eventData.type === 'message' || eventData.type === 'comment') {
        const msg = eventData.message[0];
        
        // Loop Killer: Stop the bot from relaying its own messages
        if (msg.text.startsWith('[YT]') || msg.text.startsWith('[FB]') || msg.text.startsWith('[TR]')) return;

        // Detect Source Platform
        let tag = '??';
        if (eventData.for === 'youtube_account') tag = 'YT';
        else if (eventData.for === 'facebook_account') tag = 'FB';
        else if (eventData.for === 'trovo_account') tag = 'TR';
        
        // Only relay if it's NOT from Twitch (to avoid doubling Twitch chat)
        if (tag !== '??') {
            const formattedMsg = `[${tag}] ${msg.from}: ${msg.text}`;
            client.say(CHAT_CHANNEL, formattedMsg)
                .then(() => console.log(`✔ Relayed: ${formattedMsg}`))
                .catch(err => console.error(`✖ Failed: ${err}`));
        }
    }
});

// 4. Start the Engines
client.connect().then(() => console.log("🚀 Werewolf Relay: Connected to Twitch"));
socket.on('connect', () => console.log("📡 Werewolf Relay: Connected to Streamlabs Wide-Net"));
