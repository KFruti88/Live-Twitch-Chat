/* * SHARING NOTE FOR FRIENDS (Phoenix_Darkfire, MjolnirGaming, Raymystyro):
 * 1. Change the 'TWITCH_CHANNEL' below to your channel name.
 * 2. Change 'YOUR_YOUTUBE_CHANNEL_ID' to your UC... ID.
 * 3. This code will automatically use the Discord Webhook you put in GitHub Secrets!
 */
// --- 3. TROVO LISTENER (WAITING FOR APPROVAL) ---
/* const trovo = new Trovo.Client({
    clientId: 'YOUR_TROVO_CLIENT_ID' 
});
trovo.chat.connect();
... 
*/
const tmi = require('tmi.js');
const fetch = require('node-fetch');
const { YoutubeChat } = require('youtube-chat');
const Trovo = require('trovo.js');

// 1. CONFIGURATION
const WP_URL = "https://werewolf.ourflora.com/wp-json/stream-bridge/v1/relay";

// --- 2. TWITCH LISTENER ---
const twitchClient = new tmi.Client({
    connection: { secure: true, reconnect: true },
    channels: ['werewolf3788']
});
twitchClient.connect().catch(console.error);

twitchClient.on('message', (channel, tags, message, self) => {
    if (self) return;
    relayMessage(tags['display-name'], message, 'Twitch');
});

// --- 3. YOUTUBE LISTENER ---
// Replace with your actual UC... Channel ID
const ytChat = new YoutubeChat('YOUR_YOUTUBE_CHANNEL_ID'); 
ytChat.on('message', msg => {
    relayMessage(msg.author.name, msg.text, 'YouTube');
});
ytChat.connect().catch(err => console.error("YouTube Connect Error:", err));

// --- 4. TROVO LISTENER ---
// Requires a Trovo Client ID from developer.trovo.live
const trovo = new Trovo.Client({
    clientId: 'YOUR_TROVO_CLIENT_ID' 
});
trovo.chat.connect();
trovo.chat.on('message', message => {
    relayMessage(message.author.name, message.content, 'Trovo');
});

// --- 5. THE SHARED RELAY FUNCTION ---
// This pushes all messages to your WordPress bridge using GitHub Secrets
function relayMessage(username, message, platform) {
    console.log(`[*] ${platform} Message from ${username}: ${message}`);

    fetch(WP_URL, {
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
    })
    .then(res => {
        if (res.ok) console.log(`[${platform}] Successfully relayed to WordPress`);
        else console.log(`[${platform}] WordPress returned an error.`);
    })
    .catch(err => console.error(`[${platform}] Relay Network Error:`, err));
}
