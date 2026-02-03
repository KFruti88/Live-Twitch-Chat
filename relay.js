const tmi = require('tmi.js');
const io = require('socket.io-client');
const puppeteer = require('puppeteer');

// --- Configuration ---
const CHAT_CHANNEL = 'werewolf3788'; 
const STREAMLABS_TOKEN = process.env.STREAMLABS_TOKEN;
const TWITCH_TOKEN = process.env.TWITCH_ACCESS_TOKEN;
const RUMBLE_URL = 'https://rumble.com/chat/popup/428374630';

// 1. Setup Twitch Bot
const client = new tmi.Client({
    identity: {
        username: CHAT_CHANNEL,
        password: `oauth:${TWITCH_TOKEN}`
    },
    channels: [CHAT_CHANNEL]
});

// 2. Setup Streamlabs (YT / FB / TR)
const socket = io(`https://sockets.streamlabs.com?token=${STREAMLABS_TOKEN}`, {
    transports: ['websocket']
});

// --- Logic for Streamlabs ---
socket.on('event', (eventData) => {
    if (eventData.type === 'message' || eventData.type === 'comment') {
        const msg = eventData.message[0];
        if (/^\[(YT|FB|TR|Rumble)\]/.test(msg.text)) return; // Loop Killer

        let tag = '??';
        if (eventData.for === 'youtube_account') tag = 'YT';
        else if (eventData.for === 'facebook_account') tag = 'FB';
        else if (eventData.for === 'trovo_account') tag = 'TR';
        
        if (tag !== '??') {
            client.say(CHAT_CHANNEL, `[${tag}] ${msg.from}: ${msg.text}`);
        }
    }
});

// --- Logic for Rumble (Ghost Browser) ---
async function startRumbleWatcher() {
    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    await page.goto(RUMBLE_URL, { waitUntil: 'networkidle2' });

    console.log("📡 Ghost Browser: Watching Rumble Chat...");

    // This function runs every time a new message appears in the Rumble DOM
    await page.exposeFunction('sendToTwitch', (user, message) => {
        client.say(CHAT_CHANNEL, `[Rumble] ${user}: ${message}`);
    });

    await page.evaluate(() => {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mu => mu.addedNodes.forEach(node => {
                // Selector for Rumble's 2026 chat message container
                if (node.classList?.contains('chat-history--item')) {
                    const user = node.querySelector('.chat-history--user')?.innerText;
                    const text = node.querySelector('.chat-history--message')?.innerText;
                    if (user && text) window.sendToTwitch(user, text);
                }
            }));
        });
        observer.observe(document.querySelector('.chat-history--list'), { childList: true });
    });
}

// 4. Connect Everything
client.connect().then(() => {
    console.log("🚀 Relay Active: Connected to Twitch");
    startRumbleWatcher();
});
