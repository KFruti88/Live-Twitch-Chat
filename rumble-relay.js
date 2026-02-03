const puppeteer = require('puppeteer');
const tmi = require('tmi.js');

// CONFIG
const RUMBLE_URL = 'https://rumble.com/chat/popup/428374630';
const TWITCH_CHANNEL = 'werewolf3788';
const TWITCH_TOKEN = process.env.TWITCH_ACCESS_TOKEN;

const client = new tmi.Client({
    identity: { username: TWITCH_CHANNEL, password: `oauth:${TWITCH_TOKEN}` },
    channels: [TWITCH_CHANNEL]
});

async function startRumbleRelay() {
    await client.connect();
    console.log("🚀 Twitch Connected. Opening Rumble Ghost Browser...");

    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto(RUMBLE_URL);

    // This part "watches" the Rumble chat for new messages
    page.on('console', async (msg) => {
        const text = msg.text();
        if (text.startsWith("MSG:")) {
            const chatContent = text.replace("MSG:", "");
            client.say(TWITCH_CHANNEL, `[Rumble] ${chatContent}`);
        }
    });

    // Injects a script into the Rumble page to detect new chat entries
    await page.evaluate(() => {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.classList && node.classList.contains('chat-history--message')) {
                        const user = node.querySelector('.chat-history--user')?.innerText;
                        const msg = node.querySelector('.chat-history--message-text')?.innerText;
                        console.log(`MSG:${user}: ${msg}`);
                    }
                }
            }
        });
        observer.observe(document.querySelector('.chat-history'), { childList: true });
    });
}

startRumbleRelay();
