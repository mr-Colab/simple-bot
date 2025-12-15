# 🚀 Quick Start Guide: External API Access for Multi-User Mode

This guide helps you quickly set up external API access for your WhatsApp Bot Multi-User deployment, perfect for Pterodactyl or any other hosting platform.

## 📋 What You Need

- WhatsApp Bot Multi-User Mode running
- A server with a public IP or domain
- (Optional) API Key for security

## 🎯 Step-by-Step Setup

### 1. Configure Your Environment

Create or edit your `.env` file or set environment variables:

```bash
# Required
PORT=8000
DATABASE_URL=your_database_url

# Security (Recommended for Production)
API_KEY=your_secure_random_api_key_here
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com

# Development/Testing
# CORS_ORIGIN=*  # Allow all origins (not for production!)
```

### 2. Start Multi-User Mode

```bash
npm run multi
```

You should see:
```
🌐 CORS enabled for origins: ALL (*)
📊 Dashboard API endpoints registered
🌐 Dashboard running at http://localhost:8000
```

### 3. Test the API

```bash
# Get statistics
curl http://localhost:8000/api/stats

# List sessions
curl http://localhost:8000/api/sessions

# Create new session (with API key)
curl -X POST http://localhost:8000/api/sessions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key_here" \
  -d '{
    "userId": "bot_1234567890",
    "phoneNumber": "1234567890"
  }'
```

### 4. Use the Frontend

#### Option A: Standalone HTML (Easiest)

1. Open `frontend-example.html` in your browser
2. Configure API URL and API Key
3. Enter phone number and connect!

#### Option B: Host the Frontend

Host `frontend-example.html` on:
- GitHub Pages
- Netlify
- Vercel
- Your web server

#### Option C: Create Custom Frontend

Use the examples in:
- `CUSTOM_FRONTEND_GUIDE.md` - All frameworks
- `REACT_FRONTEND_EXAMPLE.md` - React component

## 🔐 Security Checklist

For production deployment:

- [ ] Set a strong `API_KEY` (32+ characters)
- [ ] Configure `CORS_ORIGIN` to specific domains (not `*`)
- [ ] Use HTTPS (not HTTP)
- [ ] Keep API key secret (don't commit to git)
- [ ] Monitor API usage
- [ ] Use firewall rules if needed

## 🌐 Pterodactyl Deployment

### Setup in Pterodactyl Panel

1. **Environment Variables** (in Pterodactyl):
   ```
   PORT=8000
   DATABASE_URL=postgresql://user:pass@host:5432/db
   API_KEY=your_secure_api_key
   CORS_ORIGIN=https://yourdomain.com
   ```

2. **Startup Command**:
   ```bash
   npm run multi
   ```

3. **Access Your API**:
   - Internal: `http://localhost:8000`
   - External: `http://your-server-ip:8000`

### Network Configuration

Make sure port 8000 (or your chosen PORT) is:
- Opened in Pterodactyl allocation
- Not blocked by firewall
- Accessible from your frontend's domain

## 🎨 Using the Frontend

### With the Provided HTML File

1. **Download** `frontend-example.html`
2. **Open** in any browser (works offline!)
3. **Configure**:
   - API Server URL: `http://your-server:8000`
   - API Key: Your configured key
4. **Connect**: Enter phone number and get pairing code

### With Your Own Frontend

**Minimal Example:**
```javascript
const response = await fetch('http://your-server:8000/api/sessions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your_api_key'
  },
  body: JSON.stringify({
    userId: 'bot_1234567890',
    phoneNumber: '1234567890'
  })
});

const data = await response.json();
console.log('Pairing Code:', data.pairingCode);
```

## 📱 Connecting WhatsApp

After getting a pairing code:

1. Open WhatsApp on your phone
2. Go to **Settings** → **Linked Devices**
3. Tap **"Link a Device"**
4. Enter the 8-character pairing code
5. Wait for connection confirmation

## 🛠️ Troubleshooting

### API Not Accessible

**Problem**: Can't reach API from external network

**Solutions**:
- Check firewall rules
- Verify port is open in Pterodactyl
- Confirm server is running (`npm run multi`)
- Test with curl from same server first

### CORS Error in Browser

**Problem**: "CORS policy: No 'Access-Control-Allow-Origin' header"

**Solutions**:
- Verify `CORS_ORIGIN` is set correctly
- If testing locally, use `CORS_ORIGIN=*`
- Check that frontend domain is in allowed origins
- Restart server after changing CORS_ORIGIN

### 401 Unauthorized Error

**Problem**: API returns "Unauthorized: Invalid or missing API key"

**Solutions**:
- Verify API_KEY is set on server
- Check `X-API-Key` header in request
- Confirm API key matches exactly
- GET endpoints don't need API key (stats, list sessions)

### Pairing Code Not Working

**Problem**: WhatsApp rejects pairing code

**Solutions**:
- Ensure phone number is correct (with country code)
- Use code within a few minutes (they expire)
- Check server logs for errors
- Try creating a new session

## 📚 Documentation Links

- **[API_GUIDE.md](API_GUIDE.md)** - Complete API reference
- **[CUSTOM_FRONTEND_GUIDE.md](CUSTOM_FRONTEND_GUIDE.md)** - Framework examples
- **[REACT_FRONTEND_EXAMPLE.md](REACT_FRONTEND_EXAMPLE.md)** - React component
- **[README.md](README.md)** - General information

## 💡 Tips

1. **Development**: Use `CORS_ORIGIN=*` for easy testing
2. **Production**: Always restrict CORS to specific domains
3. **API Key**: Generate with `openssl rand -hex 32`
4. **Monitoring**: Check server logs regularly
5. **Backups**: Use the `/api/sessions/:userId/backup` endpoint

## 🆘 Need Help?

1. Check the documentation files
2. Review server logs for errors
3. Test API with curl/Postman first
4. Verify all environment variables are set
5. Check GitHub issues or create a new one

## ✅ Quick Verification

Test your setup is working:

```bash
# 1. Check server is running
curl http://your-server:8000/api/stats

# Expected: {"success":true,"activeSessions":0,"totalUsers":0}

# 2. Check CORS headers
curl -I http://your-server:8000/api/stats

# Expected: Access-Control-Allow-Origin: *

# 3. Create a test session
curl -X POST http://your-server:8000/api/sessions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_key" \
  -d '{"userId":"test_bot","phoneNumber":"1234567890"}'

# Expected: {"success":true,"pairingCode":"ABCD-1234",...}
```

If all three work, you're ready to go! 🎉

---

**Happy Coding! 🚀**
