/* * SHARING NOTE FOR FRIENDS (Seth, Michael, TJ/Dark Terror, Ray):
 * 1. This is the WIDE NET version—specifically tuned to catch YouTube comments.
 * 2. Timezone locked to America/New_York (EST).
 * 3. Keeps your TV overlay synced across all platforms.
 * 4. Forwards YouTube and Trovo chats TO Twitch (Twitch is PRIMARY).
 * 5. Prevents message looping with smart prefix detection.
 */

const io = require('socket.io-client');
const tmi = require('tmi.js');
const fetch = require('node-fetch');

// 1. CONFIG
const TWITCH_CHANNEL = 'werewolf3788'; 
const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1412973382433247252/fFwKe5xeW-S6VgWaPionj0A-ieKu3h_qFLaDZBl2JKobFispq0fBg_5_y8n1cWHwlGpY';

// Track connection states
let isStreamlabsConnected = false;
let isTwitchConnected = false;
let messageCache = new Set(); // Prevent duplicate messages within a time window

// 2. TWITCH SETUP
const twitchClient = new tmi.Client({
    options: { debug: false },
    connection: { secure: true, reconnect: true },
    identity: {
        username: TWITCH_CHANNEL,
        password: `oauth:${process.env.TWITCH_ACCESS_TOKEN}`
    },
    channels: [TWITCH_CHANNEL]
});

// 3. STREAMLABS SOCKET with auto-reconnect
const streamlabs = io(`https://sockets.streamlabs.com?token=${process.env.STREAMLABS_TOKEN}`, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity
});

// 4. THE DISPATCHER (EST Timezone + Loop Killer)
async function broadcast(username, message, rawPlatform) {
    // ENHANCED LOOP PREVENTION: Check for existing format tags
    if (message.startsWith('[YT]') || message.startsWith('[TW]') || 
        message.startsWith('[TR]') || message.startsWith('[FB]') ||
        message.match(/^\[\d{2}:\d{2}\]\s\[/)) { // Also catch [HH:MM] [TAG] format
        console.log(`[LOOP BLOCKED] Prevented relay of already-formatted message: ${message.substring(0, 50)}...`);
        return;
    }

    // Create unique message ID for deduplication
    const messageId = `${username}:${message}:${Date.now() / 10000 | 0}`; // 10-second window
    if (messageCache.has(messageId)) {
        console.log(`[DUPLICATE BLOCKED] Message already processed: ${username}`);
        return;
    }
    messageCache.add(messageId);
    setTimeout(() => messageCache.delete(messageId), 30000); // Clear after 30 seconds

    const time = new Date().toLocaleTimeString("en-US", {
        timeZone: "America/New_York",
        hour: '2-digit',
        minute: '2-digit'
    });

    let tag = '??';
    if (rawPlatform.includes('youtube')) tag = 'YT';
    if (rawPlatform.includes('twitch')) tag = 'TW';
    if (rawPlatform.includes('trovo')) tag = 'TR';
    if (rawPlatform.includes('facebook')) tag = 'FB';

    const formattedMsg = `[${time}] [${tag}] ${username}: ${message}`;
    console.log(`[WEREWOLF3788 SYNC] ${formattedMsg}`);

    // Always relay to Discord
    relayToDiscord(formattedMsg);

    // ONLY forward YouTube and Trovo messages TO Twitch (not Twitch messages back to Twitch)
    if (tag !== 'TW' && isTwitchConnected) {
        try {
            await twitchClient.say(TWITCH_CHANNEL, formattedMsg);
            console.log(`[✔ TO TWITCH] ${tag} message forwarded to Twitch chat`);
        } catch (error) {
            console.error(`[✘ TWITCH ERROR] Failed to send to Twitch:`, error.message);
        }
    }
}

// 5. STREAMLABS EVENT LISTENERS with enhanced connection management
streamlabs.on('connect', () => {
    isStreamlabsConnected = true;
    console.log("[✔ STREAMLABS ONLINE] Wide-Net monitoring active. Ready to sync chats when stream starts.");
    relayToDiscord("🟢 **System Alert:** Streamlabs connected - Ready to relay YouTube & Trovo → Twitch");
});

streamlabs.on('disconnect', () => {
    isStreamlabsConnected = false;
    console.log("[⚠ STREAMLABS OFFLINE] Connection lost. Auto-reconnect enabled.");
});

streamlabs.on('reconnect', (attemptNumber) => {
    console.log(`[🔄 STREAMLABS] Reconnection attempt #${attemptNumber}`);
});

streamlabs.on('reconnect_error', (error) => {
    console.error(`[✘ STREAMLABS] Reconnection error:`, error.message);
});

streamlabs.on('event', (eventData) => {
    if (!isStreamlabsConnected) {
        console.log("[⚠ WARNING] Received event while not marked as connected");
    }

    let msgData = null;

    // Standard message type (Twitch/Trovo)
    if (eventData.type === 'message') {
        msgData = eventData.message[0];
    } 
    // YouTube specific 'comment' type
    else if (eventData.type === 'comment' || (eventData.for === 'youtube_account' && eventData.message)) {
        msgData = eventData.message[0];
    }

    if (msgData && msgData.text) {
        const platform = eventData.for || 'stream';
        console.log(`[📨 STREAMLABS EVENT] Platform: ${platform}, User: ${msgData.from}`);
        broadcast(msgData.from, msgData.text, platform);
    }
});

async function relayToDiscord(content) {
    try {
        await fetch(DISCORD_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: `**${content}**` })
        });
    } catch (e) {
        console.error('[✘ DISCORD ERROR]', e.message);
    }
}

// 7. TWITCH CLIENT EVENT HANDLERS
twitchClient.on('connected', (address, port) => {
    isTwitchConnected = true;
    console.log(`[✔ TWITCH ONLINE] Connected to ${address}:${port} - Ready to receive forwarded chats`);
});

twitchClient.on('disconnected', (reason) => {
    isTwitchConnected = false;
    console.log(`[⚠ TWITCH OFFLINE] Disconnected: ${reason}`);
});

twitchClient.on('reconnect', () => {
    console.log('[🔄 TWITCH] Attempting to reconnect...');
});

twitchClient.on('message', (channel, tags, message, self) => {
    // Listen to Twitch messages but DON'T relay them back
    // This helps us monitor what's happening in the chat
    if (self) return; // Ignore our own messages
    
    // Only log Twitch messages, don't relay them
    const username = tags['display-name'] || tags['username'];
    console.log(`[🎮 TWITCH CHAT] ${username}: ${message}`);
});

// 8. START ALL SERVICES
twitchClient.connect().then(() => {
    console.log("[✔] WEREWOLF3788 Proxy Online. EST Active.");
    console.log("[ℹ] YouTube & Trovo messages will be forwarded TO Twitch");
    console.log("[ℹ] Twitch is the PRIMARY chat - no loopback");
}).catch((error) => {
    console.error("[✘ TWITCH START ERROR]", error);
    process.exit(1);
});

// Keep the process running and handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n[⚠] Shutting down gracefully...');
    streamlabs.close();
    twitchClient.disconnect();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n[⚠] Received SIGTERM, shutting down...');
    streamlabs.close();
    twitchClient.disconnect();
    process.exit(0);
});
