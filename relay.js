// --- CONFIG: FRIENDS TO TRACK ---
const friends = [
    { name: 'phoenix_darkfire', id: 'Seth' }, // Seth
    { name: 'terrdog420', id: 'TJ' },       // TJ
    { name: 'mjolnirgaming', id: 'Michael' }, // Michael
    { name: 'raymystro', id: 'Ray' }        // Ray
];

// State tracker to ensure we only shoutout ONCE per live session
const liveStates = new Map(); 

/**
 * Checks if friends are live and sends a shoutout
 */
async function checkFriendStreams() {
    const userLogins = friends.map(f => f.name).join('&user_login=');
    const url = `https://api.twitch.tv/helix/streams?user_login=${userLogins}`;

    try {
        const response = await axios.get(url, {
            headers: {
                'Client-ID': TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${TWITCH_TOKEN}`
            }
        });

        const liveStreams = response.data.data;
        const currentLiveLogins = liveStreams.map(s => s.user_login.toLowerCase());

        liveStreams.forEach(stream => {
            const login = stream.user_login.toLowerCase();
            
            // If they weren't live before, but are live now: SHOUTOUT!
            if (!liveStates.get(login)) {
                const msg = `📣 SHOUTOUT: My friend ${stream.user_name} just went LIVE playing ${stream.game_name}! Go show some love at https://twitch.tv/${login} 🐺`;
                client.say(CHAT_CHANNEL, msg);
                
                // Mirror to Discord too
                sendToDiscord('System', 'Shoutout', msg);
                liveStates.set(login, true);
            }
        });

        // Reset state for friends who went offline
        friends.forEach(f => {
            if (!currentLiveLogins.includes(f.name.toLowerCase())) {
                liveStates.set(f.name.toLowerCase(), false);
            }
        });

    } catch (err) {
        console.log(`> Shoutout check failed: ${err.message}`);
    }
}

// Run the check every 5 minutes (Twitch API cache is ~5 mins)
setInterval(checkFriendStreams, 300000);
