const tmi = require('tmi.js');
const { WebcastPushConnection } = require('tiktok-live-connector');
const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// --- CONFIG ---
const CHAT_CHANNEL = 'werewolf3788'; 
const TWITCH_TOKEN = process.env.TWITCH_ACCESS_TOKEN;
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const BROADCASTER_ID = process.env.TWITCH_BROADCASTER_ID || '896952944';
const WP_RELAY_URL = process.env.WP_RELAY_URL;
const TT_USER = 'k082412';

// Track stream start time
const streamStartTime = new Date(); // Captures when the bot turns on

const client = new tmi.Client({
    identity: { username: CHAT_CHANNEL, password: `oauth:${TWITCH_TOKEN}` },
    channels: [CHAT_CHANNEL]
});

/**
 * Calculates how long the stream has been running
 */
function getUptime() {
    const now = new Date();
    const diff = Math.abs(now - streamStartTime);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours} hours and ${mins} minutes`;
}

/**
 * Hourly Update Loop
 * Checks every minute to see if it's the top of the hour (:00)
 */
setInterval(() => {
    const now = new Date();
    if (now.getMinutes() === 0) { // On the hour
        const currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const uptime = getUptime();
        const hourlyMsg = `🕒 Hourly Update: The time is ${currentTime}. We have been live for ${uptime}! 🐺`;
        
        client.say(CHAT_CHANNEL, hourlyMsg);
        console.log(`> Sent hourly update at ${currentTime}`);
    }
}, 60000); // Check every 60 seconds

// --- REMAINING RELAY LOGIC (TikTok, Bridge, etc.) ---
// [Keep the previous logic for forwardToWordPress, sendToDiscord, etc. here]

client.connect().then(() => {
    console.log("🚀 Twitch Connected.");
    
    // Initial Live Message
    const liveMsg = "Werewolf is now LIVE! Relaying YouTube/Trovo chat here for PlayStation view! 🐺";
    client.say(CHAT_CHANNEL, liveMsg);
    
    tiktok.connect().catch(() => console.log("TikTok Connection Failed"));
    app.listen(process.env.PORT || 3000);
});
