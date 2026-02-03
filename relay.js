const tmi = require('tmi.js');
const io = require('socket.io-client');

// Configuration
const TWITCH_CHANNEL = 'werewolf3788'; 
// These come from your GitHub Secrets for security
const STREAMLABS_TOKEN = process.env.STREAMLABS_TOKEN; 
const TWITCH_AUTH = process.env.TWITCH_AUTH; 

const twitchClient = new tmi.Client({
    options: { debug: true },
    identity: {
        username: TWITCH_CHANNEL,
        password: `oauth:${TWITCH_AUTH}`
    },
    channels: [TWITCH_CHANNEL]
});

// Connect to Streamlabs Socket (catches YouTube/FB/Trovo)
const socket = io(`https://sockets.streamlabs.com?token=${STREAMLABS_TOKEN}`, {
    transports: ['websocket']
});

socket.on('connect', () => console.log("Connected to Streamlabs Wide-Net"));

socket.on('event', (eventData) => {
    let msgData = null;
    let platform = "??";

    // Detect YouTube or other platform messages
    if (eventData.type === 'message' || eventData.type === 'comment') {
        msgData = eventData.message[0];
        platform = eventData.for === 'youtube_account' ? 'YT' : 'Stream';
    }

    if (msgData && msgData.text) {
        // Prevent looping: Don't relay messages that are already tags
        if (!msgData.text.startsWith('[YT]') && !msgData.text.startsWith('[TW]')) {
            const formattedMessage = `[${platform}] ${msgData.from}: ${msgData.text}`;
            
            // PUSH TO TWITCH CHAT
            twitchClient.say(TWITCH_CHANNEL, formattedMessage)
                .then(() => console.log(`Relayed: ${formattedMessage}`))
                .catch(err => console.error(err));
        }
    }
});

twitchClient.connect();
