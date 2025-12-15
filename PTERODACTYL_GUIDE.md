# 🦖 Pterodactyl Panel Deployment Guide

This guide explains how to deploy **LD7 V1 WhatsApp Multi-User Bot** on a Pterodactyl Panel.

---

## 📋 Prerequisites

1. **Pterodactyl Panel** installed and configured
2. **Node.js 20** (or use the provided egg)
3. **PostgreSQL Database** (optional, for session backup)
4. **Port allocation** for the web dashboard (default: 8000)

---

## 🚀 Quick Start

### Option 1: Using the Pre-built Egg

1. **Import the Egg**
   - Go to your Pterodactyl Admin Panel
   - Navigate to **Nests** → Select or create a nest
   - Click **Import Egg**
   - Upload the `pterodactyl-egg.json` file from this repository

2. **Create a New Server**
   - Go to **Servers** → **Create New**
   - Select the "LD7 V1 WhatsApp Bot" egg
   - Configure the server resources (recommended: 1GB RAM, 1 CPU)
   - Set the port allocation (default: 8000)

3. **Configure Environment Variables**
   - `PORT`: Dashboard port (match your allocation, e.g., 8000)
   - `ENDPOINT_URL`: Your public URL (e.g., `http://your-panel-ip:8000`)
   - `DATABASE_URL`: PostgreSQL connection string (optional)

4. **Start the Server**
   - Click **Start** in the Pterodactyl console
   - Wait for "Dashboard running at" message
   - Access the dashboard via your ENDPOINT_URL

### Option 2: Manual Setup

1. **Create a Generic Node.js Server** in Pterodactyl

2. **Clone the Repository**
   ```bash
   git clone https://github.com/mr-Colab/simple-bot.git
   cd simple-bot
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Set Environment Variables** in the Pterodactyl Startup tab:
   - `PORT=8000`
   - `PTERODACTYL=true`
   - `ENDPOINT_URL=http://your-ip:8000`

5. **Set Startup Command**
   ```
   npm run multi
   ```

---

## ⚙️ Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Dashboard port | Yes | `8000` |
| `PTERODACTYL` | Enable Pterodactyl mode | Auto-detected | `true` |
| `ENDPOINT_URL` | Public URL for keep-alive | Recommended | - |
| `DATABASE_URL` | PostgreSQL URL for backup | No | SQLite |
| `PHONE_NUMBER` | WhatsApp number (single-user) | No | - |
| `HANDLERS` | Command prefix | No | `.` |
| `SUDO` | Admin numbers (comma-separated) | No | - |
| `WORK_TYPE` | `public` or `private` | No | `public` |

---

## 🌐 Accessing the Dashboard

Once deployed, the dashboard will be available at:

```
http://your-panel-ip:allocated-port
```

For example: `http://192.168.1.100:8000`

### Dashboard Features:
- **Connect New Bots**: Enter phone number to get pairing code
- **View Connected Bots**: See all active WhatsApp connections
- **Manage Sessions**: Start, stop, or delete bot sessions
- **Real-time Stats**: Active bots count, memory usage

---

## 🔗 Setting Up the Endpoint URL

For users to connect via the dashboard, you need a publicly accessible URL.

### Option 1: Direct IP Access
If your Pterodactyl server has a public IP:
```
ENDPOINT_URL=http://your-public-ip:8000
```

### Option 2: Reverse Proxy (Recommended)
Set up Nginx or Caddy as a reverse proxy:

**Nginx Example:**
```nginx
server {
    listen 80;
    server_name bot.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then set:
```
ENDPOINT_URL=http://bot.yourdomain.com
```

### Option 3: Cloudflare Tunnel
Use Cloudflare Tunnel for secure access without exposing ports.

---

## 📊 Database Configuration

### PostgreSQL (Recommended for production)

1. Create a PostgreSQL database
2. Set the connection URL:
   ```
   DATABASE_URL=postgresql://username:password@host:5432/database_name
   ```

Sessions will be automatically backed up to the database.

### SQLite (Default)
If no `DATABASE_URL` is set, SQLite is used automatically.

---

## 🔧 Troubleshooting

### Bot won't start
- Check the console for error messages
- Ensure Node.js 20 is installed
- Verify `npm install` completed successfully

### Can't access dashboard
- Verify the port allocation in Pterodactyl
- Check firewall rules allow the port
- Ensure `ENDPOINT_URL` matches your setup

### Sessions not persisting
- Configure `DATABASE_URL` for PostgreSQL backup
- Check database connectivity
- Verify disk space for local session files

### Pairing code not working
- Enter phone number with country code (no spaces)
- Ensure WhatsApp is installed on the phone
- Try generating a new pairing code

---

## 🔒 Security Recommendations

1. **Use HTTPS** - Set up SSL with a reverse proxy
2. **Strong Database Password** - Use complex passwords
3. **Limit Port Exposure** - Use firewall rules
4. **Regular Updates** - Keep the bot updated
5. **Monitor Sessions** - Review active connections regularly

---

## 📁 File Structure

```
simple-bot/
├── multi.js              # Multi-user mode entry point
├── index.js              # Single-user mode entry point
├── config.js             # Configuration settings
├── pair.js               # Pairing API endpoints
├── pterodactyl-egg.json  # Pterodactyl egg configuration
├── Dockerfile            # Docker configuration
├── lib/
│   ├── dashboard.js      # Dashboard HTML & API
│   ├── sessionManager.js # Session management
│   ├── sessions/         # Session files
│   └── database/         # Database models
└── plugins/              # Bot command plugins
```

---

## 🆘 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/mr-Colab/simple-bot/issues)
- **WhatsApp Channel**: https://whatsapp.com/channel/0029VbB3YxTDJ6H15SKoBv3S

---

## 📝 Migration from Heroku

If you're migrating from Heroku:

1. **Export your session data** (if using GitHub backup)
2. **Copy your environment variables** to Pterodactyl
3. **Update `ENDPOINT_URL`** to your new Pterodactyl URL
4. **Start the bot** - sessions will auto-restore from database

Your users can continue using the dashboard with the new endpoint URL!

---

Happy Botting! 🤖✨
