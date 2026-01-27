# 🐺 werewolf3788's Stream Hub
A multi-platform chat relay that syncs **YouTube** and **Trovo** chats TO **Twitch** (primary chat) and Discord.

## 🎯 How It Works
- **Twitch is the PRIMARY chat** - All chats converge here
- **YouTube & Trovo → Twitch** - Messages from other platforms are forwarded to Twitch
- **No Message Looping** - Smart detection prevents messages from echoing
- **Streamlabs Integration** - Syncs automatically when your stream goes live
- **Discord Logging** - All messages logged to Discord for monitoring

This allows you to:
1. ✅ Use PlayStation overlays/TTS that read Twitch chat
2. ✅ View ONE chat instead of multiple windows
3. ✅ Have all your viewers across platforms interact in one place

## 🚀 Setup for Friends (Seth, TJ, Michael, Ray)
Follow these steps to set up your own version of this relay.

### 1. Get your Twitch Developer Credentials
* **Console:** [Twitch Developer Console](https://dev.twitch.tv/console)
  * Register a "New Application" to get your **Client ID**.
* **Token Generator:** [AntiScuff OAuth Token Generator](https://antiscuff.com/oauth/)
  * Use this to get your **Access Token** (OAuth).

### 2. Find your IDs
* **Twitch User ID:** [StreamWeasels ID Converter](https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/)
  * You need your numeric ID (e.g., `896952944`) for the WordPress bridge.
* **YouTube Channel ID:** Find this in your YouTube Studio settings (starts with `UC...`).

### 3. Add GitHub Secrets
In your GitHub repo, go to **Settings > Secrets and variables > Actions** and add:
* `TWITCH_ACCESS_TOKEN`: Your Token from the Generator (OAuth token).
* `STREAMLABS_TOKEN`: Get this from [Streamlabs Socket API Token](https://streamlabs.com/dashboard#/settings/api-settings) - Copy your "Socket API Token"
* `DISCORD_WEBHOOK`: Your private Discord channel webhook (optional, for logging).

### 4. Update the Code
Edit the `relay.js` file and change:
* `TWITCH_CHANNEL`: Change `'werewolf3788'` to your Twitch username (e.g., `'Phoenix_Darkfire'`)
* `DISCORD_WEBHOOK`: Replace with your Discord webhook URL (or remove if not using Discord logging)

### 5. How to Get Your IDs
### 5. How to Get Your IDs

**YouTube Channel ID:**
Go to Advanced Settings: Open your browser and go directly to youtube.com/account_advanced. (You must be signed in).

Copy the ID: You will see two IDs listed. Look for the one that says "Channel ID" and copy the long string of characters next to it.

Update relay.js: Paste that "UC..." string into your code where it says YOUR_YOUTUBE_CHANNEL_ID.

**Trovo Client ID:**
🛠️ How to get the ID
Log In: Use your Trovo account (the one you use for werewolf3788).

Create Application: Look for a button that says "New Application" or "Create App".

Fill the Info:

Name: You can just call it Werewolf Relay.

Redirect URL: You can just use http://localhost. (Since we aren't using a website for login, this doesn't matter much for our script).

Category: Usually "Chat Bot" or "Other".

Save & Copy: Once you hit save, you will see a Client ID (and a Client Secret). You only need the Client ID for the script we wrote.

## 🔧 How It Works Technically

### Message Flow
1. **Streamlabs** connects and monitors ALL your linked platforms (Twitch, YouTube, Trovo)
2. When a message arrives:
   - If from **YouTube or Trovo** → Forwarded to **Twitch chat** with `[YT]` or `[TR]` tag
   - If from **Twitch** → Only logged, NOT sent back to Twitch (prevents loops)
   - All messages → Logged to Discord for monitoring

### Loop Prevention
- Messages with existing tags `[YT]`, `[TW]`, `[TR]`, `[FB]` are blocked
- Messages with timestamp format `[HH:MM] [TAG]` are blocked  
- Duplicate detection within 30-second window
- Twitch messages are NEVER sent back to Twitch

### Connection Management
- Auto-reconnect for both Streamlabs and Twitch
- Status tracking shows when services are online
- Graceful shutdown on process termination

## 📋 Requirements
- Streamlabs account with YouTube and Trovo linked
- Twitch account with OAuth token
- GitHub Actions enabled (runs every 5 minutes)

## 🚨 Troubleshooting
- **No messages forwarding?** Check that Streamlabs Socket API Token is correct and YouTube/Trovo are linked in Streamlabs
- **Messages looping?** The relay has smart loop detection - this should not happen
- **Connection issues?** Check GitHub Actions logs for error messages
