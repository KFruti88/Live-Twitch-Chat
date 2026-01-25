/* * SHARING NOTE FOR FRIENDS (Phoenix_Darkfire, MjolnirGaming, Raymystyro):
 * 1. Change 'TWITCH_CHANNEL' to your handle.
 * 2. Change 'YT_CHANNEL_ID' to your UC... ID.
 * 3. Ensure your 'TWITCH_ACCESS_TOKEN' in GitHub Secrets has 'chat:edit' permissions.
 */

const tmi = require('tmi.js');
const { LiveChat } = require('youtube-chat');
const fetch = require('node-fetch');

// 1. CONFIGURATION
const TWITCH_CHANNEL = 'werewolf3788'; // Change for friends
const YT_CHANNEL_ID = 'YOUR_YOUTUBE_CHANNEL_ID'; // Replace with your UC... ID
const WP_URL = "https://werewolf.ourflora.com/wp-json/stream-bridge/v1/relay";

// 2. TWITCH CLIENT SETUP
const twitchClient = new tmi.Client({
    options: { debug: true },
    connection: { secure: true, reconnect: true },
    identity: {
        username: TWITCH_CHANNEL,
        password: `oauth:${process.env.TWITCH_ACCESS_TOKEN}`
    },
    channels: [TWITCH_CHANNEL]
});

// 3. RELAY FUNCTION (Pushes to WordPress/Discord)
async function relayMessage(username, message, platform) {
    console.log(`[*] ${platform} Message from ${username}: ${message}`);

    try {
        const response = await fetch(WP_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Twitch-Client-ID': process.env.TWITCH_CLIENT_ID,
                'X-Twitch-Token': process.env.TWITCH_ACCESS_TOKEN 
            },
            body: JSON.stringify({
                username: username,
                message: message,
                platform: platform
            })
        });

        if (response.ok) {
            console.log(`[${platform}] Successfully relayed to WordPress/Discord`);
        } else {
            console.log(`[${platform}] WordPress Error: ${response.statusText}`);
        }
    } catch (err) {
        console.error(`[${platform}] Relay Network Error:`, err);
    }
}

// --- 4. TWITCH LISTENER ---
twitchClient.on('message', (channel, tags, message, self) => {
    if (self) return; // Ignore the bot's own messages
    relayMessage(tags['display-name'], message, 'Twitch');
});

// --- 5. YOUTUBE LISTENER & SYNC TO TWITCH ---
const ytChat = new LiveChat({ channelId: YT_CHANNEL_ID });

ytChat.on("chat", (chatItem) => {
    const username = chatItem.author.name;
    const message = chatItem.message[0].text;

    // A. Relay to WordPress (Discord)
    relayMessage(username, message, 'YouTube');

    // B. Sync YouTube Message into Twitch Chat
    // This allows Twitch viewers to see what YouTube viewers are saying
    twitchClient.say(TWITCH_CHANNEL, `[YT] ${username}: ${message}`)
        .catch(err => console.error("Twitch Sync Error:", err));
});

// --- 6. START THE HUB ---
twitchClient.connect()
    .then(() => {
        console.log(`[✔] Twitch Connected as ${TWITCH_CHANNEL}`);
        return ytChat.start();
    })
    .then(() => {
        console.log(`[✔] YouTube Listener Started for ${YT_CHANNEL_ID}`);
    })
    .catch(err => {
        console.error("Critical Startup Error:", err);
    });

// --- TROVO SECTION (PAUSED FOR 2-WEEK REVIEW) ---
/* const Trovo = require('trovo.js');
const trovo = new Trovo.Client({ clientId: 'YOUR_TROVO_CLIENT_ID' });
trovo.chat.connect();
trovo.chat.on('message', message => {
    relayMessage(message.author.name, message.content, 'Trovo');
});
*/
