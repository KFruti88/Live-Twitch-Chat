const tmi = require('tmi.js');
const io = require('socket.io-client');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { WebcastPushConnection } = require('tiktok-live-connector');

puppeteer.use(StealthPlugin());

const CHAT_CHANNEL = 'werewolf3788'; 
const TWITCH_TOKEN = process.env.TWITCH_ACCESS_TOKEN;
const STREAMLABS_TOKEN = process.env.STREAMLABS_TOKEN;

const messageCache = new Set();
const cleanCache = (key) => setTimeout(() => messageCache.delete(key), 60000);

const client = new tmi.Client({
    identity: { username: CHAT_CHANNEL, password: `oauth:${TWITCH_TOKEN}` },
    channels: [CHAT_CHANNEL]
});

// 1. TIKTOK (Working)
const tiktok = new WebcastPushConnection('k082412');
tiktok.on('chat', data => {
    const key = `TT:${data.uniqueId}:${data.comment}`;
    if (messageCache.has(key)) return;
    client.say(CHAT_CHANNEL, `[TT] ${data.uniqueId}: ${data.comment}`);
    messageCache.add(key);
    cleanCache(key);
});

// 2. FACEBOOK & YOUTUBE (Via Streamlabs Socket - No browser needed)
const socket = io(`https://sockets.streamlabs.com?token=${STREAMLABS_TOKEN}`, { transports: ['websocket'] });
socket.on('event', (eventData) => {
    if (eventData.type === 'message' || eventData.type === 'comment') {
        const msg = eventData.message[0];
        const key = `SL:${msg.from}:${msg.text}`;
        if (messageCache.has(key) || /^\[(YT|FB|TT|Rumble|Kick)\]/.test(msg.text)) return;

        let tag = eventData.for === 'youtube_account' ? 'YT' : (eventData.for === 'facebook_account' ? 'FB' : null);
        if (tag) {
            client.say(CHAT_CHANNEL, `[${tag}] ${msg.from}: ${msg.text}`);
            messageCache.add(key);
            cleanCache(key);
        }
    }
});

// 3. RUMBLE & KICK (Stealth Browser)
async function startStealthRelays() {
    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] 
    });

    const watch = async (url, tag, listSel, itemSel, userSel, msgSel) => {
        try {
            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
            await page.waitForSelector(listSel, { timeout: 30000 });
            
            await page.exposeFunction('relay', (u, m) => {
                const key = `${tag}:${u}:${m}`;
                if (messageCache.has(key)) return;
                client.say(CHAT_CHANNEL, `[${tag}] ${u}: ${m}`);
                messageCache.add(key);
                cleanCache(key);
            });

            await page.evaluate((lS, iS, uS, mS) => {
                const observer = new MutationObserver(mutations => {
                    mutations.forEach(mu => mu.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            const u = node.querySelector(uS)?.innerText;
                            const m = node.querySelector(mS)?.innerText;
                            if (u && m) window.relay(u.trim(), m.trim());
                        }
                    }));
                });
                observer.observe(document.querySelector(lS), { childList: true, subtree: true });
            }, listSel, itemSel, userSel, msgSel);
        } catch (e) { console.log(`✖ ${tag} Browser Error: Check if live.`); }
    };

    await watch('https://rumble.com/chat/popup/428374630', 'Rumble', '.chat-history--list', '.chat-history--item', '.chat-history--user', '.chat-history--message');
    await watch('https://kick.com/popout/werewolf71888/chat', 'Kick', '#chat-list-content', '.chat-entry', '.chat-entry-username', '.chat-entry-content');
}

client.connect().then(() => {
    console.log("🚀 Multi-Core Relay Online!");
    tiktok.connect().catch(() => {});
    startStealthRelays();
});
