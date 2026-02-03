const tmi = require('tmi.js');
const io = require('socket.io-client');
const puppeteer = require('puppeteer');
const { WebcastPushConnection } = require('tiktok-live-connector');

// --- PERMANENT CONFIGURATION ---
const CHAT_CHANNEL = 'werewolf3788'; 
const TIKTOK_USERNAME = 'k082412'; 
const TWITCH_TOKEN = process.env.TWITCH_ACCESS_TOKEN;
const STREAMLABS_TOKEN = process.env.STREAMLABS_TOKEN;

// URLs for the Ghost Browsers
const KICK_URL = 'https://kick.com/popout/werewolf71888/chat';
const RUMBLE_URL = 'https://rumble.com/chat/popup/428374630';
const TROVO_URL = 'https://trovo.live/chat/Werewolf3788';
const YT_LIVE_URL = 'https://www.youtube.com/@werewolf3788/live';

// 1. Setup Twitch Bot
const client = new tmi.Client({
    identity: { username: CHAT_CHANNEL, password: `oauth:${TWITCH_TOKEN}` },
    channels: [CHAT_CHANNEL]
});

// 2. Setup Streamlabs (Automated YT/FB via Socket)
const socket = io(`https://sockets.streamlabs.com?token=${STREAMLABS_TOKEN}`, { transports: ['websocket'] });

socket.on('event', (eventData) => {
    if (eventData.type === 'message' || eventData.type === 'comment') {
        const msg = eventData.message[0];
        if (/^\[(YT|FB|TR|TT|Rumble|Kick)\]/.test(msg.text)) return; // Loop Killer

        let tag = eventData.for === 'youtube_account' ? 'YT' : (eventData.for === 'facebook_account' ? 'FB' : null);
        if (tag) client.say(CHAT_CHANNEL, `[${tag}] ${msg.from}: ${msg.text}`);
    }
});

// 3. Setup TikTok Relay
const tiktokConn = new WebcastPushConnection(TIKTOK_USERNAME);
tiktokConn.on('chat', (data) => {
    client.say(CHAT_CHANNEL, `[TT] ${data.uniqueId}: ${data.comment}`);
});

// 4. Ghost Browser for Kick, Rumble, & Trovo
async function startGhostRelays() {
    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });

    const watchPage = async (url, tag, listSel, itemSel, userSel, msgSel) => {
        try {
            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
            await page.goto(url, { waitUntil: 'networkidle2' });
            
            console.log(`📡 Watching ${tag}...`);

            await page.exposeFunction('relay', (u, m) => client.say(CHAT_CHANNEL, `[${tag}] ${u}: ${m}`));

            await page.evaluate((lS, iS, uS, mS) => {
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach(mu => mu.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            const item = node.matches(iS) ? node : node.querySelector(iS);
                            if (item) {
                                const user = item.querySelector(uS)?.innerText || "Viewer";
                                const text = item.querySelector(mS)?.innerText;
                                if (text) window.relay(user.trim(), text.trim());
                            }
                        }
                    }));
                });
                const list = document.querySelector(lS);
                if (list) observer.observe(list, { childList: true, subtree: true });
            }, listSel, itemSel, userSel, msgSel);
        } catch (e) { console.error(`✖ ${tag} Error:`, e); }
    };

    // START KICK (Selectors for 2026 Kick layout)
    await watchPage(KICK_URL, 'Kick', '#chat-list-content', '.chat-entry', '.chat-entry-username', '.chat-entry-content');

    // START RUMBLE
    await watchPage(RUMBLE_URL, 'Rumble', '.chat-history--list', '.chat-history--item', '.chat-history--user', '.chat-history--message');

    // START TROVO
    await watchPage(TROVO_URL, 'TR', '.chat-list', '.chat-item', '.nick-name', '.content');
}

// 5. Connect Everything
client.connect().then(() => {
    tiktokConn.connect().catch(e => console.log("TikTok offline."));
    startGhostRelays();
});
