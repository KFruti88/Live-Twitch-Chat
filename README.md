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
