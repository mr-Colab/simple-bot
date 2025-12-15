# 📦 Examples

This folder contains example files for setting up the WhatsApp bot with a separate API backend and frontend.

## Architecture

```
┌─────────────────────────────┐     ┌─────────────────────────────┐
│     FRONTEND (Vercel)       │     │   BACKEND (Pterodactyl)     │
│                             │     │                             │
│  - User enters phone number │────▶│  - Receives API request     │
│  - Displays pairing code    │◀────│  - Returns pairing code     │
│  - Shows connected count    │     │  - Manages bot sessions     │
│                             │     │                             │
│  examples/frontend-vercel/  │     │  examples/pairing-api-      │
│                             │     │          backend.js         │
└─────────────────────────────┘     └─────────────────────────────┘
```

## Files

### `pairing-api-backend.js`
Complete backend API for WhatsApp pairing. Deploy this on Pterodactyl.

**Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/status` | Get server status & connected count |
| POST | `/api/pair` | Request pairing code |
| GET | `/api/check/:phoneNumber` | Check connection status |
| DELETE | `/api/disconnect/:phoneNumber` | Disconnect a bot |
| GET | `/api/bots` | List all bots |

### `frontend-vercel/index.html`
Simple frontend for users to connect their WhatsApp. Deploy this on Vercel.

**Features:**
- Enter phone number
- Get pairing code
- See connected bots count
- Server status indicator

---

## Setup Guide

### Step 1: Deploy Backend on Pterodactyl

1. Deploy the main bot to Pterodactyl (use `npm run multi`)
2. Set environment variables:
   ```
   PORT=8000
   CORS_ORIGIN=https://your-vercel-app.vercel.app
   ```
3. Note your public API URL (e.g., `https://bot.example.com:8000`)

### Step 2: Deploy Frontend on Vercel

1. Copy `frontend-vercel/index.html` to a new folder
2. Edit the `API_BASE_URL` in the script:
   ```javascript
   const API_BASE_URL = 'https://your-pterodactyl-server.com:8000';
   ```
3. Deploy to Vercel:
   ```bash
   npx vercel deploy
   ```

### Step 3: Test It

1. Go to your Vercel frontend URL
2. Enter a phone number
3. Get the pairing code
4. Enter it in WhatsApp > Linked Devices

---

## API Reference

### POST /api/pair

Request a pairing code.

**Request:**
```json
{
  "phoneNumber": "1234567890"
}
```

**Response (Success):**
```json
{
  "success": true,
  "status": "pairing_code_generated",
  "pairingCode": "ABCD1234",
  "phoneNumber": "1234567890",
  "message": "Enter this code in WhatsApp > Linked Devices > Link a Device"
}
```

**Response (Already Connected):**
```json
{
  "success": true,
  "status": "already_connected",
  "phoneNumber": "1234567890",
  "name": "John Doe",
  "message": "This number is already connected"
}
```

### GET /api/status

Get server status.

**Response:**
```json
{
  "success": true,
  "server": "online",
  "connectedBots": 5,
  "totalUsers": 12,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### GET /api/check/:phoneNumber

Check if a number is connected.

**Response:**
```json
{
  "success": true,
  "phoneNumber": "1234567890",
  "connected": true,
  "status": "online",
  "name": "John Doe"
}
```

### GET /api/bots

List all bots.

**Response:**
```json
{
  "success": true,
  "total": 10,
  "connected": 5,
  "bots": [
    { "phoneNumber": "1234567890", "status": "online", "name": "John" },
    { "phoneNumber": "0987654321", "status": "offline", "name": null }
  ]
}
```

---

## CORS Configuration

For production, set `CORS_ORIGIN` to your specific frontend domain:

```env
CORS_ORIGIN=https://your-app.vercel.app
```

For development, you can use:
```env
CORS_ORIGIN=*
```

---

## Notes

- Phone numbers should include country code (no + or spaces)
- Pairing codes expire after ~60 seconds
- The backend uses the existing session manager from the main bot
