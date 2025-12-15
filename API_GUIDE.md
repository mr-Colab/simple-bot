# LD7 V1 Multi-User API Guide

This guide explains how to use the external API endpoints for managing WhatsApp bot instances in multi-user mode.

## Base URL

When deployed, your API will be accessible at:
```
http://your-server-ip:8000
```
or
```
https://your-domain.com
```

## Authentication

### Optional API Key

You can secure your API endpoints by setting an `API_KEY` environment variable. When set, most API endpoints will require this key to be included in the request headers.

**Header Format:**
```
X-API-Key: your_api_key_here
```

**Note:** If `API_KEY` is not set, the API endpoints will be accessible without authentication (useful for testing, but not recommended for production).

### Endpoints that don't require API key:
- `GET /` - Dashboard
- `GET /api/stats` - Get statistics
- `GET /api/sessions` - List all sessions
- `GET /api/sessions/:userId` - Get session info

### Endpoints that require API key (when configured):
- `POST /api/sessions` - Create new session
- `POST /api/sessions/:userId/start` - Start session
- `POST /api/sessions/:userId/stop` - Stop session
- `DELETE /api/sessions/:userId` - Delete session
- `POST /api/sessions/:userId/logout` - Logout session
- `POST /api/sessions/:userId/backup` - Backup session
- `POST /api/sessions/:userId/restore` - Restore session

## API Endpoints

### 1. Get Statistics

Get overall statistics about active sessions and users.

**Endpoint:** `GET /api/stats`

**Response:**
```json
{
  "success": true,
  "activeSessions": 2,
  "totalUsers": 5
}
```

---

### 2. List All Sessions

Get information about all bot sessions.

**Endpoint:** `GET /api/sessions`

**Response:**
```json
{
  "success": true,
  "count": 2,
  "sessions": [
    {
      "userId": "bot_1234567890",
      "phoneNumber": "1234567890",
      "status": "online",
      "name": "John's Bot"
    },
    {
      "userId": "bot_9876543210",
      "phoneNumber": "9876543210",
      "status": "offline",
      "name": null
    }
  ]
}
```

---

### 3. Get Session Info

Get detailed information about a specific session.

**Endpoint:** `GET /api/sessions/:userId`

**Example:** `GET /api/sessions/bot_1234567890`

**Response:**
```json
{
  "success": true,
  "userId": "bot_1234567890",
  "phoneNumber": "1234567890",
  "status": "online",
  "name": "John's Bot"
}
```

---

### 4. Create New Session / Get Pairing Code

Create a new bot session and get a pairing code for WhatsApp connection.

**Endpoint:** `POST /api/sessions`

**Headers:**
```
Content-Type: application/json
X-API-Key: your_api_key_here  (if API_KEY is configured)
```

**Request Body:**
```json
{
  "userId": "bot_1234567890",
  "phoneNumber": "1234567890"
}
```

**Parameters:**
- `userId` (required): Unique identifier for this bot session (alphanumeric, _, -)
- `phoneNumber` (required): Phone number with country code, no spaces or special characters

**Response (Success):**
```json
{
  "success": true,
  "message": "Session created. Use the pairing code to connect.",
  "pairingCode": "ABCD-1234",
  "userId": "bot_1234567890"
}
```

**How to use the pairing code:**
1. Open WhatsApp on your phone
2. Go to Settings > Linked Devices
3. Tap "Link a Device"
4. Enter the pairing code

**Response (Error - Session Exists):**
```json
{
  "success": false,
  "message": "Session already exists for this user. Delete it first or use a different userId."
}
```

**Response (Error - Invalid userId):**
```json
{
  "success": false,
  "message": "userId must be alphanumeric (a-z, 0-9, _, -)"
}
```

---

### 5. Start Existing Session

Start an existing bot session that is currently stopped.

**Endpoint:** `POST /api/sessions/:userId/start`

**Example:** `POST /api/sessions/bot_1234567890/start`

**Headers:**
```
X-API-Key: your_api_key_here  (if API_KEY is configured)
```

**Response:**
```json
{
  "success": true,
  "message": "Session started successfully",
  "userId": "bot_1234567890"
}
```

---

### 6. Stop Session

Stop a running bot session.

**Endpoint:** `POST /api/sessions/:userId/stop`

**Example:** `POST /api/sessions/bot_1234567890/stop`

**Headers:**
```
X-API-Key: your_api_key_here  (if API_KEY is configured)
```

**Response:**
```json
{
  "success": true,
  "message": "Session bot_1234567890 stopped"
}
```

---

### 7. Delete Session

Permanently delete a bot session and all its data.

**Endpoint:** `DELETE /api/sessions/:userId`

**Example:** `DELETE /api/sessions/bot_1234567890`

**Headers:**
```
X-API-Key: your_api_key_here  (if API_KEY is configured)
```

**Response:**
```json
{
  "success": true,
  "message": "Session bot_1234567890 deleted"
}
```

---

### 8. Logout Session

Logout and delete a bot session from WhatsApp.

**Endpoint:** `POST /api/sessions/:userId/logout`

**Example:** `POST /api/sessions/bot_1234567890/logout`

**Headers:**
```
X-API-Key: your_api_key_here  (if API_KEY is configured)
```

**Response:**
```json
{
  "success": true,
  "message": "Session bot_1234567890 logged out and deleted"
}
```

---

### 9. Get Pending Pairing Code

Get the pairing code for a session that is waiting for connection.

**Endpoint:** `GET /api/sessions/:userId/pairing`

**Example:** `GET /api/sessions/bot_1234567890/pairing`

**Response:**
```json
{
  "success": true,
  "pairingCode": "ABCD-1234",
  "expiresAt": "2024-01-15T12:30:00.000Z"
}
```

---

## Usage Examples

### Example 1: Create a new bot with cURL

```bash
curl -X POST http://your-server:8000/api/sessions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key_here" \
  -d '{
    "userId": "bot_1234567890",
    "phoneNumber": "1234567890"
  }'
```

### Example 2: Create a new bot with JavaScript/Node.js

```javascript
const axios = require('axios');

async function createBot() {
  try {
    const response = await axios.post('http://your-server:8000/api/sessions', {
      userId: 'bot_1234567890',
      phoneNumber: '1234567890'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'your_api_key_here'
      }
    });

    console.log('Pairing Code:', response.data.pairingCode);
    console.log('Enter this code in WhatsApp');
  } catch (error) {
    console.error('Error:', error.response.data);
  }
}

createBot();
```

### Example 3: Create a new bot with Python

```python
import requests

def create_bot():
    url = 'http://your-server:8000/api/sessions'
    headers = {
        'Content-Type': 'application/json',
        'X-API-Key': 'your_api_key_here'
    }
    data = {
        'userId': 'bot_1234567890',
        'phoneNumber': '1234567890'
    }

    response = requests.post(url, json=data, headers=headers)
    result = response.json()

    if result['success']:
        print(f"Pairing Code: {result['pairingCode']}")
        print("Enter this code in WhatsApp")
    else:
        print(f"Error: {result['message']}")

create_bot()
```

### Example 4: List all sessions

```bash
curl http://your-server:8000/api/sessions
```

### Example 5: Stop a session

```bash
curl -X POST http://your-server:8000/api/sessions/bot_1234567890/stop \
  -H "X-API-Key: your_api_key_here"
```

### Example 6: Delete a session

```bash
curl -X DELETE http://your-server:8000/api/sessions/bot_1234567890 \
  -H "X-API-Key: your_api_key_here"
```

---

## Deployment on Pterodactyl

When deploying to Pterodactyl:

1. Set up your environment variables in the Pterodactyl panel:
   - `PORT`: The port your app will run on (usually assigned by Pterodactyl)
   - `DATABASE_URL`: Your database connection string
   - `API_KEY`: Your secure API key for external access
   - Other bot configuration variables as needed

2. Start the multi-user mode:
   ```bash
   npm run multi
   ```
   or
   ```bash
   node multi.js
   ```

3. Your API will be accessible at:
   ```
   http://your-pterodactyl-ip:port/api/sessions
   ```

4. You can now call the API endpoints from external applications, scripts, or services.

---

## Security Recommendations

1. **Always set an API_KEY in production** to prevent unauthorized access to your bot management endpoints.

2. **Use HTTPS** in production to encrypt API communication.

3. **Restrict CORS origins** if needed by modifying the CORS configuration in `lib/dashboard.js`.

4. **Keep your API key secret** - don't commit it to version control or share it publicly.

5. **Monitor API usage** to detect any unusual activity.

6. **Use strong, randomly generated API keys** - at least 32 characters long.

---

## Troubleshooting

### API returns 401 Unauthorized

- Make sure you're including the `X-API-Key` header in your requests
- Verify that your API key matches the one set in the `API_KEY` environment variable

### CORS errors in browser

- The API is configured to allow all origins by default
- If you need to restrict origins, modify the CORS configuration in `lib/dashboard.js`

### Cannot connect to API

- Ensure the server is running with `node multi.js`
- Check that the port is not blocked by a firewall
- Verify the server IP/domain and port in your requests

---

## Support

For issues or questions, please refer to the main [README.md](README.md) or contact the repository maintainers.
