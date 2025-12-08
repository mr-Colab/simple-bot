# 🎨 Dashboard Guide - LD7 V1 Multi-User Bot

## 📖 Overview

This guide explains the new ultra-stylish dashboard and enhanced multi-user features of your WhatsApp bot.

---

## 🚀 Quick Start

### Starting the Multi-User Bot

```bash
# Install dependencies (if not already done)
npm install

# Start multi-user mode
npm run multi

# Or with PM2
npm run multi:pm2
```

The dashboard will be available at: **http://localhost:8000**

---

## 🎯 Connecting a New Bot

### Step 1: Open Dashboard
Navigate to `http://localhost:8000` in your browser

### Step 2: Enter Phone Number
- Enter the phone number **with country code**
- **No spaces or special characters**
- Example: `1234567890` for country code 1 and number 234567890

### Step 3: Get Pairing Code
- Click "**Connect Bot & Get Pairing Code**"
- A pairing code will appear on screen (8 characters)

### Step 4: Link in WhatsApp
1. Open WhatsApp on your phone
2. Go to **Settings** → **Linked Devices**
3. Tap "**Link a Device**"
4. Tap "**Link with phone number instead**"
5. Enter the pairing code shown on dashboard

### Step 5: Done! 🎉
Your bot will connect automatically and join the default group!

---

## 📊 Dashboard Features

### Statistics Cards
- **Connected Bots**: Shows how many bots are currently active
- **Total Users**: Shows total number of registered users

### Bot Management
Each connected bot shows:
- **Phone Number**: The bot's WhatsApp number
- **Status**: Online (green) or Offline (red)
- **Name**: WhatsApp account name
- **Actions**:
  - **Start**: Restart an offline bot
  - **Stop**: Temporarily stop a bot
  - **Delete**: Permanently remove bot and session

---

## 🤖 Bot Commands

### Statistics Commands

```
.menu
```
Shows the full menu with:
- Active bots count
- Multi-user status
- Memory usage
- Uptime
- All available commands

```
.alive
```
Quick status check showing:
- Connected bots count
- Bot uptime
- Memory usage
- Response time

```
.bot_stats
```
Detailed statistics:
- Uptime
- Memory usage (used/total)
- Active bots count
- Multi-user status
- Bot version

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# GitHub Backup (Optional)
GITHUB_TOKEN=your_personal_access_token
GITHUB_OWNER=your_github_username
GITHUB_REPO=your_repo_name

# Bot Settings
PORT=8000

# Database (if using PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

### Group Invite Link

The default group invite link is set to:
```
https://chat.whatsapp.com/C5KEaVREff12xkkcfm01Lj
```

To change it, edit `pair.js`:
```javascript
GROUP_INVITE_LINK: 'https://chat.whatsapp.com/YOUR_INVITE_CODE'
```

---

## 🎨 Design Features

### Modern Gradient Theme
- **Colors**: Purple/Blue gradient scheme
- **Animations**: Smooth fadeIn and pulse effects
- **Glass-morphism**: Frosted glass effect on cards
- **Responsive**: Works on desktop, tablet, and mobile

### Interactive Elements
- **Hover Effects**: Cards lift and glow on hover
- **Smooth Transitions**: All interactions are buttery smooth
- **Custom Scrollbar**: Styled to match the theme
- **Gradient Buttons**: Eye-catching call-to-action buttons

---

## 🔒 Security Best Practices

1. **Never commit `.env` file** to version control
2. **Use environment variables** for sensitive data
3. **Set strong GitHub tokens** if using backup feature
4. **Regularly update** dependencies
5. **Monitor active sessions** via dashboard

---

## 🐛 Troubleshooting

### Bot Won't Connect
- ✅ Check phone number format (country code + number, no spaces)
- ✅ Ensure WhatsApp is installed on phone
- ✅ Verify internet connection
- ✅ Try generating a new pairing code

### Dashboard Not Loading
- ✅ Check if port 8000 is available
- ✅ Ensure `npm run multi` is running
- ✅ Check console for error messages
- ✅ Try accessing via `http://127.0.0.1:8000`

### Statistics Not Updating
- ✅ Refresh the page
- ✅ Check browser console for errors
- ✅ Ensure bots are actually connected
- ✅ Auto-refresh happens every 5 seconds

### GitHub Backup Failing
- ✅ This is optional - bot works without it
- ✅ Check `GITHUB_TOKEN` is set correctly
- ✅ Verify repository permissions
- ✅ Check if repo exists

---

## 💡 Tips & Tricks

### Multiple Bots
You can run multiple bots simultaneously:
- Each bot operates independently
- Statistics aggregate all connected bots
- Each bot can be managed separately

### Auto-Generated User IDs
User IDs are automatically generated as:
```
bot_[phone_number]
```
Example: `bot_1234567890`

### Session Backup
- Sessions are saved locally in `lib/sessions/`
- Optionally backed up to GitHub (if configured)
- Restored automatically on restart

### Performance
- Dashboard auto-refreshes every 5 seconds
- Each bot uses minimal memory (~100-150MB)
- Supports dozens of concurrent bots

---

## 📚 Additional Resources

- **Main Repository**: [mr-Colab/simple-bot](https://github.com/mr-Colab/simple-bot)
- **Issues**: Report bugs or request features on GitHub
- **WhatsApp Channel**: https://whatsapp.com/channel/0029VbB3YxTDJ6H15SKoBv3S

---

## 🎉 Enjoy Your Enhanced Bot!

Your WhatsApp bot now has a professional, ultra-stylish dashboard with real-time statistics and simplified management. Connect multiple bots and manage them all from one beautiful interface!

**Happy Botting! 🤖✨**
