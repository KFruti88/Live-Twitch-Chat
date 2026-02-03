const tmi = require('tmi.js');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { WebcastPushConnection } = require('tiktok-live-connector');

puppeteer.use(StealthPlugin());

// --- YOUR PERSONAL CONFIG ---
const CHAT_CHANNEL = 'werewolf3788'; 
const TWITCH_TOKEN = process.env.TWITCH_ACCESS_TOKEN;

// Permanent links to YOUR personal chats
const YT_LIVE_URL = 'https://www.youtube.com/@werewolf3788/live';
const RUMBLE_URL = 'https://rumble.com/chat/popup/428374630';
const KICK_URL = 'https://kick.com/popout/werewolf71888/chat';
const TT_USER = 'k082412';

const messageCache = new Set();
const cleanCache = (key) => setTimeout(() => messageCache.delete(key), 60000);

const client = new tmi.Client({
    identity: { username: CHAT_CHANNEL, password: `oauth:${TWITCH_TOKEN}` },
    channels: [CHAT_CHANNEL]
});

// 1. TikTok (Direct Connection - Most Reliable)
const tiktok = new WebcastPushConnection(TT_USER);
tiktok.on('chat', data => {
    const key = `TT:${data.uniqueId}:${data.comment}`;
    if (messageCache.has(key)) return;
    client.say(CHAT_CHANNEL, `[TT] ${data.uniqueId}: ${data.comment}`);
    messageCache.add(key);
    cleanCache(key);
});

// 2. Ghost Browser Watcher (YouTube, Rumble, Kick)
async function startDirectRelays() {
    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'] 
    });

    const watch = async (url, tag, listSel, itemSel, userSel, msgSel) => {
        try {
            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
            
            // Wait for the chat box to appear
            await page.waitForSelector(listSel, { timeout: 30000 });
            console.log(`📡 Directly monitoring ${tag}...`);

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
                            const item = node.matches(iS) ? node : node.querySelector(iS);
                            if (item) {
                                const u = item.querySelector(uS)?.innerText || "Viewer";
                                const m = item.querySelector(mS)?.innerText;
                                if (m) window.relay(u.trim(), m.trim());
                            }
                        }
                    }));
                });
                observer.observe(document.querySelector(lS), { childList: true, subtree: true });
            }, listSel, itemSel, userSel, msgSel);
        } catch (e) { console.log(`✖ ${tag} is not live or blocked.`); }
    };

    // YouTube Direct
    await watch(YT_LIVE_URL, 'YT', '#chat-messages', 'yt-live-chat-text-message-renderer', '#author-name', '#message');
    // Rumble Direct
    await watch(RUMBLE_URL, 'Rumble', '.chat-history--list', '.chat-history--item', '.chat-history--user', '.chat-history--message');
    // Kick Direct
    await watch(KICK_URL, 'Kick', '#chat-list-content', '.chat-entry', '.chat-entry-username', '.chat-entry-content');
}

client.connect().then(() => {
    console.log("🚀 Direct Source Relay Active!");
    tiktok.connect().catch(() => {});
    startDirectRelays();
});
