/* * SHARING NOTE FOR FRIENDS (Phoenix_Darkfire, MjolnirGaming, Raymystyro):
 * 1. Change 'TWITCH_CHANNEL' to your handle.
 * 2. Change 'YT_CHANNEL_ID' to your UC... ID.
 * 3. Ensure your 'TWITCH_ACCESS_TOKEN' in GitHub Secrets has 'chat:edit' permissions.
 */

const tmi = require('tmi.js');
const { LiveChat } = require('youtube-chat');
const fetch = require('node-fetch');

// 1. CONFIGURATION
const TWITCH_CHANNEL = 'werewolf3788'; 
const YT_CHANNEL_ID = 'UCYrxPkCw_Q2Fw02VFfumfyQ'; // Your verified ID
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

// 3. RELAY FUNCTION (To WordPress/Discord)
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
            console.log(`[${platform}] WordPress Error: ${response.statusText} (${response.status})`);
        }
    } catch (err) {
        console.error(`[${platform}] Relay Network Error:`, err);
    }
}

// 4. TWITCH LISTENER
twitchClient.on('message', (channel, tags, message, self) => {
    if (self) return; 
    relayMessage(tags['display-name'], message, 'Twitch');
});

// 5. YOUTUBE LISTENER (With User-Agent fix)
const ytChat = new LiveChat({ 
    channelId: YT_CHANNEL_ID,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
});

ytChat.on("chat", (chatItem) => {
    const username = chatItem.author.name;
    const message = chatItem.message[0].text;

    console.log(`[LISTEN] YouTube heard: "${message}" from ${username}`);

    // A. Relay to WordPress (Discord)
    relayMessage(username, message, 'YouTube');

    // B. Sync YouTube Message into Twitch Chat
    twitchClient.say(TWITCH_CHANNEL, `[YT] ${username}: ${message}`)
        .then(() => console.log("[SYNC] YouTube message sent to Twitch chat"))
        .catch(err => console.error("[SYNC] Twitch Sync Error:", err.message));
});

// 6. START THE HUB (With Startup Delay)
twitchClient.connect()
    .then(() => {
        console.log(`[✔] Twitch Connected as ${TWITCH_CHANNEL}`);
        console.log("[WAIT] Letting Twitch settle for 3 seconds...");
        
        // Delay starting YouTube to prevent sync errors
        setTimeout(() => {
            ytChat.start()
                .then(() => {
                    console.log(`[✔] YouTube Listener Started for ${YT_CHANNEL_ID}`);
                    console.log("[✔] Relay is Live and Listening!");
                })
                .catch(err => console.error("YouTube Start Error:", err));
        }, 3000);
    })
    .catch(err => {
        console.error("Critical Startup Error:", err);
    });
