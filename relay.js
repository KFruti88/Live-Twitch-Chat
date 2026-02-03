const tmi = require('tmi.js');
const { WebcastPushConnection } = require('tiktok-live-connector');

// --- Configuration ---
const CHAT_CHANNEL = 'werewolf3788'; 
const TWITCH_TOKEN = process.env.TWITCH_ACCESS_TOKEN;

// 1. Memory Cache (The "Don't Repeat Yourself" List)
const messageCache = new Set();

const client = new tmi.Client({
    identity: { username: CHAT_CHANNEL, password: `oauth:${TWITCH_TOKEN}` },
    channels: [CHAT_CHANNEL]
});

// 2. TikTok Relay with Smart Deduplication
const tiktok = new WebcastPushConnection('k082412');

tiktok.on('chat', data => {
    // Create a unique key for this message
    const msgKey = `${data.uniqueId}:${data.comment}`;

    // If we've seen this exact user say this exact thing recently, STOP.
    if (messageCache.has(msgKey)) return;

    // Otherwise, send it and add it to memory
    client.say(CHAT_CHANNEL, `[TT] ${data.uniqueId}: ${data.comment}`);
    messageCache.add(msgKey);

    // Forget the message after 60 seconds so they can say it again later if they want
    setTimeout(() => messageCache.delete(msgKey), 60000);
});

client.connect().then(() => {
    console.log("🚀 TikTok Relay Active (with De-Duplication)!");
    tiktok.connect().catch(() => console.log("TikTok Connection Waiting..."));
});
