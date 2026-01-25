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
const YT_CHANNEL_ID = 'UCYrxPkCw_Q2Fw02VFfumfyQ'; 

// 2. TWITCH SETUP
const twitchClient = new tmi.Client({
    options: { debug: true },
    connection: { secure: true, reconnect: true },
    identity: {
        username: TWITCH_CHANNEL,
        password: `oauth:${process.env.TWITCH_ACCESS_TOKEN}`
    },
    channels: [TWITCH_CHANNEL]
});

// 3. THE "SILENT WATCH" ENGINE
let ytChat;
let isYtConnected = false;

async function monitorYouTube() {
    if (isYtConnected) return; 

    console.log(`[🔍] Monitoring ${YT_CHANNEL_ID}... (Waiting for PlayStation to go Live)`);
    
    try {
        ytChat = new LiveChat({ 
            channelId: YT_CHANNEL_ID,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        const connected = await ytChat.start();
        
        if (connected) {
            isYtConnected = true;
            console.log("[✔] YouTube Stream Found! Messages are now syncing to your TV.");
            
            ytChat.on("chat", (chatItem) => {
                const username = chatItem.author.name;
                const message = chatItem.message[0].text;
                const combinedMsg = `[YT] ${username}: ${message}`;

                console.log(`[LISTEN] ${username}: ${message}`);

                // Send to Twitch (Shows on your PlayStation TV screen)
                twitchClient.say(TWITCH_CHANNEL, combinedMsg).catch(() => {});
                
                // Send directly to Discord
                relayToDiscord(username, message, 'YouTube');
            });

            ytChat.on("error", () => {
                console.log("[!] Stream ended or lost. Returning to Silent Watch...");
                isYtConnected = false;
                monitorYouTube();
            });
        }
    } catch (err) {
        // Quietly retry once a minute if not live
        setTimeout(monitorYouTube, 60000); 
    }
}

// 4. DIRECT DISCORD RELAY (Bypasses WordPress to fix the 404)
async function relayToDiscord(username, message, platform) {
    const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1412973382433247252/fFwKe5xeW-S6VgWaPionj0A-ieKu3h_qFLaDZBl2JKobFispq0fBg_5_y8n1cWHwlGpY';
    
    try {
        const response = await fetch(DISCORD_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: `**[${platform}] ${username}**: ${message}`
            })
        });

        if (response.ok) {
            console.log(`[✔] Direct Discord Relay Success: ${username}`);
        } else {
            console.log(`[!] Discord Webhook Error: ${response.status}`);
        }
    } catch (e) {
        console.error("Direct Discord Error:", e.message);
    }
}

// 5. TWITCH LISTENER (Relays Twitch chat to Discord as well)
twitchClient.on('message', (channel, tags, message, self) => {
    if (self) return;
    relayToDiscord(tags['display-name'], message, 'Twitch');
});

// 6. BOOT UP
twitchClient.connect().then(() => {
    console.log("[✔] Twitch Connected. Bot is now in 'Silent Watch' mode.");
    monitorYouTube();
}).catch(err => console.error("Twitch Login Failed! Update your Secret Token.", err));
