const tmi = require('tmi.js');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { WebcastPushConnection } = require('tiktok-live-connector');

puppeteer.use(StealthPlugin());

const CHAT_CHANNEL = 'werewolf3788'; 
const TWITCH_TOKEN = process.env.TWITCH_ACCESS_TOKEN;
const RESTREAM_EMBED_URL = 'https://chat.restream.io/embed?token=b0d2cd37-012a-4cf4-87e9-f11c33996451';

// Memory Cache to stop duplicates
const messageCache = new Set();
const cleanCache = (key) => setTimeout(() => messageCache.delete(key), 60000);

const client = new tmi.Client({
    identity: { username: CHAT_CHANNEL, password: `oauth:${TWITCH_TOKEN}` },
    channels: [CHAT_CHANNEL]
});

// 1. TikTok Setup (Keep separate as it's usually not in Restream)
const tiktok = new WebcastPushConnection('k082412');
tiktok.on('chat', data => {
    const key = `TT:${data.uniqueId}:${data.comment}`;
    if (messageCache.has(key)) return;
    client.say(CHAT_CHANNEL, `[TT] ${data.uniqueId}: ${data.comment}`);
    messageCache.add(key);
    cleanCache(key);
});

// 2. Ghost Browser for Restream (Covers YT, FB, etc.)
async function startRestreamRelay() {
    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });

    try {
        const page = await browser.newPage();
        await page.goto(RESTREAM_EMBED_URL, { waitUntil: 'networkidle2', timeout: 60000 });
        
        // Wait for the Restream chat container
        await page.waitForSelector('.chat-container', { timeout: 30000 });
        console.log(`📡 Watching Restream Wide-Net...`);

        await page.exposeFunction('relay', (u, m, p) => {
            const key = `RS:${u}:${m}`;
            if (messageCache.has(key)) return;
            
            // Format: [Platform] User: Message
            client.say(CHAT_CHANNEL, `[${p}] ${u}: ${m}`);
            
            messageCache.add(key);
            cleanCache(key);
        });

        await page.evaluate(() => {
            const observer = new MutationObserver(mutations => {
                mutations.forEach(mu => mu.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.classList.contains('message-item')) {
                        const u = node.querySelector('.message-sender')?.innerText || "Viewer";
                        const m = node.querySelector('.message-text')?.innerText;
                        
                        // Restream usually has an icon or class indicating the source platform
                        let p = "Stream";
                        if (node.classList.contains('youtube')) p = "YT";
                        else if (node.classList.contains('facebook')) p = "FB";
                        else if (node.classList.contains('twitch')) return; // Avoid Twitch-to-Twitch loops

                        if (m) window.relay(u.trim(), m.trim(), p);
                    }
                }));
            });
            observer.observe(document.querySelector('.messages-list'), { childList: true, subtree: true });
        });
    } catch (e) {
        console.log(`✖ Restream Error: ${e.message}`);
    }
}

client.connect().then(() => {
    console.log("🚀 All-In-One Relay Active via Restream!");
    tiktok.connect().catch(() => {});
    startRestreamRelay();
});
