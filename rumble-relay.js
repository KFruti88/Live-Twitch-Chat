const puppeteer = require('puppeteer');
const tmi = require('tmi.js');

const RUMBLE_URL = 'https://rumble.com/chat/popup/428374630';
const TWITCH_CHANNEL = 'werewolf3788';
const TWITCH_TOKEN = process.env.TWITCH_ACCESS_TOKEN;

const client = new tmi.Client({
    identity: { username: TWITCH_CHANNEL, password: `oauth:${TWITCH_TOKEN}` },
    channels: [TWITCH_CHANNEL]
});

async function start() {
    await client.connect();
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto(RUMBLE_URL, { waitUntil: 'networkidle2' });

    console.log("Watching Rumble...");

    // This detects new messages on Rumble using its 2026 class names
    await page.exposeFunction('sendToTwitch', (user, msg) => {
        client.say(TWITCH_CHANNEL, `[Rumble] ${user}: ${msg}`);
    });

    await page.evaluate(() => {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(m => m.addedNodes.forEach(node => {
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
start();
