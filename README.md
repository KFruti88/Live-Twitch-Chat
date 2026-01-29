# werewolf3788's Stream Hub
This project relays chat from Twitch, YouTube, and Trovo to Discord.

## How to use for your own stream:
1. Fork this repository.
2. Add `TWITCH_CLIENT_ID` and `TWITCH_ACCESS_TOKEN` to your GitHub Secrets.
3. Update `relay.js` with your channel name.
# 🐺 werewolf3788's Stream Hub
A multi-platform chat relay that syncs Twitch, YouTube, and Trovo to Discord.

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
* `TWITCH_CLIENT_ID`: Your Client ID from the Dev Console.
* `TWITCH_ACCESS_TOKEN`: Your Token from the Generator.
* `DISCORD_WEBHOOK`: Your private Discord channel webhook.

### 4. Update the Code
Edit the `relay.js` file and change the `TWITCH_CHANNEL` to your handle (e.g., `Phoenix_Darkfire`).
Go to Advanced Settings: Open your browser and go directly to youtube.com/account_advanced. (You must be signed in).

Copy the ID: You will see two IDs listed. Look for the one that says "Channel ID" and copy the long string of characters next to it.

Update relay.js: Paste that "UC..." string into your code where it says YOUR_YOUTUBE_CHANNEL_ID.
🛠️ How to get the ID
Log In: Use your Trovo account (the one you use for werewolf3788).

Create Application: Look for a button that says "New Application" or "Create App".

Fill the Info:

Name: You can just call it Werewolf Relay.

Redirect URL: You can just use http://localhost. (Since we aren't using a website for login, this doesn't matter much for our script).

Category: Usually "Chat Bot" or "Other".

Save & Copy: Once you hit save, you will see a Client ID (and a Client Secret). You only need the Client ID for the script we wrote.

## ⚙️ 5. GitHub Priority: Compatibility & Caching
> **MANDATORY:** These rules override all other styling or logic requests.

- **Universal Rendering:** - Master container MUST be `width: 90%; margin: auto;`.
    - Height MUST be `height: auto;` to scale with the dynamic row count of the Google Sheet.
    - Use `display: grid;` with `auto-fit` to ensure cards never overlap or run off-screen on any device (iPhone to 4K TV).
  
- **Priority Caching (Cache Busting):**
    - Every `<link>` for CSS and every `<script>` tag MUST include a version query string.
    - Format: `filename.extension?v=[TIMESTAMP_OR_VERSION]` (e.g., `style.css?v=1.24`).
    - **Reason:** This ensures GitHub Pages reflects real-time changes without requiring a manual cache clear.

- **Cross-Browser Standards:**
    - Use `-webkit-` prefixes for Safari/iOS compatibility.
    - No fixed pixel heights on cards; use `min-height` or `flex-grow` to allow content to breathe.



