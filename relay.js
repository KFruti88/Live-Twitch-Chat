const tmi = require('tmi.js');
const io = require('socket.io-client');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { WebcastPushConnection } = require('tiktok-live-connector');

puppeteer.use(StealthPlugin());

const CHAT_CHANNEL = 'werewolf3788'; 
const TWITCH_TOKEN = process.env.TWITCH_ACCESS_TOKEN;
const STREAMLABS_TOKEN = process.env.STREAMLABS_TOKEN;

const client = new tmi.Client({
    identity: { username: CHAT_CHANNEL, password: `oauth:${TWITCH_TOKEN}` },
    channels: [CHAT_CHANNEL]
});

// --- Streamlabs Reconnection Logic ---
const socket = io(`https://sockets.streamlabs.com?token=${STREAMLABS_TOKEN}`, { 
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 5000 
});

socket.on('event', (eventData) => {
    if (eventData.type === 'message' || eventData.type === 'comment') {
        const msg = eventData.message[0];
        if (/^\[(YT|FB|TR|TT|Rumble|Kick)\]/.test(msg.text)) return;
        let tag = eventData.for === 'youtube_account' ? 'YT' : (eventData.for === 'facebook_account' ? 'FB' : null);
        if (tag) client.say(CHAT_CHANNEL, `[${tag}] ${msg.from}: ${msg.text}`);
    }
});

// --- TikTok Relay ---
const tiktok = new WebcastPushConnection('k082412');
tiktok.on('chat', data => client.say(CHAT_CHANNEL, `[TT] ${data.uniqueId}: ${data.comment}`));

// --- Ghost Browser (Rumble, Kick, Trovo) ---
async function startGhostRelays() {
    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'] 
    });

    const watch = async (url, tag, listSel, itemSel, userSel, msgSel) => {
        try {
            const page = await browser.newPage();
            // Set a massive timeout because GitHub Runners can be slow
            await page.setDefaultNavigationTimeout(60000); 
            await page.goto(url, { waitUntil: 'networkidle2' });
            
            // Wait for the chat list to exist
            await page.waitForSelector(listSel, { timeout: 30000 });
            console.log(`📡 Watching ${tag}...`);

            await page.exposeFunction('relay', (u, m) => client.say(CHAT_CHANNEL, `[${tag}] ${u}: ${m}`));
            
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
                // Target the PARENT of the chat list for better detection
                observer.observe(document.querySelector(lS), { childList: true, subtree: true });
            }, listSel, itemSel, userSel, msgSel);
        } catch (e) { console.error(`✖ ${tag} Error:`, e.message); }
    };

    // Kick and Rumble often use nested frames, so we target the broad list selectors
    await watch('https://rumble.com/chat/popup/428374630', 'Rumble', '.chat-history--list', '.chat-history--item', '.chat-history--user', '.chat-history--message');
    await watch('https://kick.com/popout/werewolf71888/chat', 'Kick', '#chat-list-content', '.chat-entry', '.chat-entry-username', '.chat-entry-content');
}

client.connect().then(() => {
    console.log("🚀 Relay Master Online!");
    tiktok.connect().catch(() => console.log("TikTok Offline"));
    startGhostRelays();
});
