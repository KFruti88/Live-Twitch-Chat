const tmi = require('tmi.js');
const io = require('socket.io-client');

// 1. Load Secrets from GitHub Environment
const config = {
    twitch: {
        channel: 'werewolf3788',
        username: 'werewolf3788',
        token: process.env.TWITCH_ACCESS_TOKEN // oauth token
    },
    streamlabsToken: process.env.STREAMLABS_TOKEN
};

// 2. Initialize Twitch Client
const client = new tmi.Client({
    options: { debug: true },
    connection: { reconnect: true, secure: true },
    identity: {
        username: config.twitch.username,
        password: `oauth:${config.twitch.token}`
    },
    channels: [config.twitch.channel]
});

// 3. Initialize Streamlabs Socket
const socket = io(`https://sockets.streamlabs.com?token=${config.streamlabsToken}`, {
    transports: ['websocket']
});

// 4. Logic: When a message arrives from the Wide-Net
socket.on('event', (eventData) => {
    // Standard Message or YouTube Comment
    if (eventData.type === 'message' || eventData.type === 'comment') {
        const msg = eventData.message[0];
        
        // Loop Killer: Don't relay if it's already a relayed message
        if (msg.text.startsWith('[YT]') || msg.text.startsWith('[TR]')) return;

        // Platform Detection
        let tag = 'Stream';
        if (eventData.for === 'youtube_account') tag = 'YT';
        else if (eventData.for === 'trovo_account') tag = 'TR';
        else if (eventData.for === 'facebook_account') tag = 'FB';

        const relayMessage = `[${tag}] ${msg.from}: ${msg.text}`;

        // Push to Twitch
        client.say(config.twitch.channel, relayMessage)
            .then(() => console.log(`✔ Relayed: ${relayMessage}`))
            .catch(err => console.error(`✖ Error: ${err}`));
    }
});

client.connect().then(() => console.log("🚀 Werewolf Relay Online!"));
