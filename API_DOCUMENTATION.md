# 🔌 API Documentation

This document describes the API endpoints for the LD7 V1 WhatsApp Multi-User Bot. Use these endpoints to integrate with your own frontend (e.g., deployed on Vercel).

---

## 🌐 Base URL

Set your API base URL to your Pterodactyl server's public endpoint:

```
https://your-pterodactyl-domain.com:PORT
```

Example: `https://bot.example.com:8000`

---

## 🔒 CORS Configuration

The API supports CORS for external frontend access. Configure allowed origins using the `CORS_ORIGIN` environment variable:

```env
# Allow all origins (development)
CORS_ORIGIN=*

# Allow specific origin (production - recommended)
CORS_ORIGIN=https://your-vercel-app.vercel.app
```

---

## 📋 API Endpoints

### Health Check

#### `GET /api/stats`

Get server statistics.

**Response:**
```json
{
  "success": true,
  "activeSessions": 5,
  "totalUsers": 12
}
```

---

### Sessions Management

#### `GET /api/sessions`

Get all active sessions.

**Response:**
```json
{
  "success": true,
  "count": 2,
  "sessions": [
    {
      "userId": "bot_1234567890",
      "status": "online",
      "phoneNumber": "1234567890",
      "name": "John Doe"
    },
    {
      "userId": "bot_0987654321",
      "status": "offline",
      "phoneNumber": "0987654321"
    }
  ]
}
```

---

#### `POST /api/sessions`

Create a new session and get a pairing code.

**Request Body:**
```json
{
  "userId": "bot_1234567890",
  "phoneNumber": "1234567890"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | Unique identifier (alphanumeric, `_`, `-`) |
| `phoneNumber` | string | Yes | Phone number with country code |

**Response (Success):**
```json
{
  "success": true,
  "pairingCode": "ABCD1234",
  "message": "Pairing code generated. Enter this in WhatsApp > Linked Devices"
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Session already exists for this user. Delete it first or use a different userId."
}
```

---

#### `GET /api/sessions/:userId`

Get information about a specific session.

**Parameters:**
- `userId`: The session user ID

**Response:**
```json
{
  "success": true,
  "userId": "bot_1234567890",
  "status": "online",
  "phoneNumber": "1234567890",
  "name": "John Doe"
}
```

---

#### `POST /api/sessions/:userId/start`

Start an existing (offline) session.

**Response:**
```json
{
  "success": true,
  "message": "Session created successfully"
}
```

---

#### `POST /api/sessions/:userId/stop`

Stop a running session.

**Response:**
```json
{
  "success": true,
  "message": "Session bot_1234567890 stopped"
}
```

---

#### `DELETE /api/sessions/:userId`

Delete a session completely.

**Response:**
```json
{
  "success": true,
  "message": "Session bot_1234567890 deleted"
}
```

---

#### `POST /api/sessions/:userId/logout`

Logout and delete a session (logs out from WhatsApp).

**Response:**
```json
{
  "success": true,
  "message": "Session bot_1234567890 logged out and deleted"
}
```

---

#### `GET /api/sessions/:userId/pairing`

Get pending pairing code for a session.

**Response (Success):**
```json
{
  "success": true,
  "code": "ABCD1234",
  "phoneNumber": "1234567890",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

**Response (Not Found):**
```json
{
  "success": false,
  "message": "No pending pairing for this user"
}
```

---

### Database Backup

#### `POST /api/sessions/:userId/backup`

Backup session to database.

**Response:**
```json
{
  "success": true,
  "message": "Session bot_1234567890 backed up to database"
}
```

---

#### `POST /api/sessions/:userId/restore`

Restore session from database.

**Response:**
```json
{
  "success": true,
  "message": "Session bot_1234567890 restored from database"
}
```

---

#### `POST /api/sessions/restore-all`

Restore all sessions from database.

**Response:**
```json
{
  "success": true,
  "restored": 5,
  "failed": 1,
  "total": 6
}
```

---

## 🖥️ Frontend Integration Example

Here's a simple example of how to integrate with a React/Next.js frontend:

```javascript
const API_BASE_URL = 'https://your-pterodactyl-server.com:8000';

// Get pairing code
async function getPairingCode(phoneNumber) {
  const userId = `bot_${phoneNumber.replace(/[^0-9]/g, '')}`;
  
  const response = await fetch(`${API_BASE_URL}/api/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, phoneNumber }),
  });
  
  const data = await response.json();
  
  if (data.success && data.pairingCode) {
    return data.pairingCode;
  } else {
    throw new Error(data.message);
  }
}

// Check session status
async function checkSessionStatus(phoneNumber) {
  const userId = `bot_${phoneNumber.replace(/[^0-9]/g, '')}`;
  
  const response = await fetch(`${API_BASE_URL}/api/sessions/${userId}`);
  const data = await response.json();
  
  return data;
}

// Get all active sessions
async function getAllSessions() {
  const response = await fetch(`${API_BASE_URL}/api/sessions`);
  const data = await response.json();
  
  return data.sessions;
}
```

---

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | `8000` |
| `CORS_ORIGIN` | Allowed CORS origin(s) | `*` (all) |
| `ENDPOINT_URL` | Public API URL | Auto-detected |
| `DATABASE_URL` | PostgreSQL URL for backup | SQLite |

---

## 📝 Notes

1. **Phone Number Format**: Always include country code without `+` or spaces (e.g., `1234567890` for +1 234 567 890)

2. **User ID Format**: The userId should be alphanumeric. Recommended format: `bot_<phoneNumber>`

3. **Pairing Code**: The pairing code is valid for a limited time. Users should enter it in WhatsApp > Linked Devices promptly.

4. **CORS in Production**: Set `CORS_ORIGIN` to your specific frontend domain for security.

---

## 🚀 Quick Start for Frontend Developers

1. Deploy the bot to Pterodactyl with a public IP/domain
2. Note the API URL (e.g., `https://bot.example.com:8000`)
3. Set `CORS_ORIGIN=https://your-frontend.vercel.app` on the bot
4. Create your frontend and call the API endpoints
5. Users visit your frontend, enter phone number, get pairing code, and connect!
