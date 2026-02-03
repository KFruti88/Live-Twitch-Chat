app.post('/api/bridge', (req, res) => {
    const { user, text, service } = req.body;
    
    // 1. Identify where it came from
    let tag = service.toUpperCase();
    if (tag === 'YOUTUBE') tag = 'YT';

    // 2. Format the message
    const finalMessage = `[${tag}] ${user}: ${text}`;

    // 3. BROADCAST: Send to Twitch (so you see it)
    client.say(CHAT_CHANNEL, finalMessage);

    // 4. BROADCAST: Send to TikTok (if you want them to see it too)
    // tiktok.sendMessage(finalMessage); 

    // 5. BROADCAST: Send to Discord (so you don't miss it)
    sendToDiscord(tag, user, text);

    res.sendStatus(200);
});
