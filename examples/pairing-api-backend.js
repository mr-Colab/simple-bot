/**
 * ============================================
 * PAIRING API BACKEND - EXAMPLE FILE
 * ============================================
 * 
 * This is a complete example backend for WhatsApp bot pairing.
 * Deploy this on Pterodactyl Panel and create your frontend on Vercel.
 * 
 * Features:
 * - Request pairing code by phone number
 * - Check connection status
 * - Get connected bots count
 * - Disconnect bots
 * - CORS enabled for external frontend
 * 
 * Usage:
 *   node examples/pairing-api-backend.js
 * 
 * Environment Variables:
 *   PORT=8000
 *   CORS_ORIGIN=https://your-vercel-app.vercel.app
 *   DATABASE_URL=postgresql://... (optional)
 */

const express = require("express");
const cors = require("cors");
const http = require("http");

// Import session manager from main bot
const sessionManager = require("../lib/sessionManager");
const { handleMessage, handleConnection } = require("../lib/dashboard");

const app = express();
const PORT = process.env.PORT || 8000;

// ============================================
// MIDDLEWARE
// ============================================

// CORS - Allow external frontend
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: corsOrigin,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: corsOrigin !== '*'
}));

// Parse JSON body
app.use(express.json());

// ============================================
// API ENDPOINTS
// ============================================

/**
 * GET /
 * Health check / API info
 */
app.get('/', (req, res) => {
  res.json({
    name: 'WhatsApp Pairing API',
    version: '1.0.0',
    endpoints: {
      status: 'GET /api/status',
      requestPairing: 'POST /api/pair',
      checkConnection: 'GET /api/check/:phoneNumber',
      disconnect: 'DELETE /api/disconnect/:phoneNumber',
      listBots: 'GET /api/bots'
    }
  });
});

/**
 * GET /api/status
 * Get server status and connected bots count
 * 
 * Response:
 * {
 *   "success": true,
 *   "server": "online",
 *   "connectedBots": 5,
 *   "totalUsers": 12
 * }
 */
app.get('/api/status', async (req, res) => {
  try {
    const allUsers = await sessionManager.getAllUserIds();
    const activeSessions = sessionManager.getActiveSessionCount();
    
    res.json({
      success: true,
      server: 'online',
      connectedBots: activeSessions,
      totalUsers: allUsers.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/pair
 * Request a pairing code for a phone number
 * 
 * Request Body:
 * {
 *   "phoneNumber": "1234567890"
 * }
 * 
 * Response (Success):
 * {
 *   "success": true,
 *   "pairingCode": "ABCD-1234",
 *   "phoneNumber": "1234567890",
 *   "message": "Enter this code in WhatsApp > Linked Devices"
 * }
 * 
 * Response (Already Connected):
 * {
 *   "success": true,
 *   "status": "already_connected",
 *   "phoneNumber": "1234567890"
 * }
 */
app.post('/api/pair', async (req, res) => {
  const { phoneNumber } = req.body;

  // Validate phone number
  if (!phoneNumber) {
    return res.status(400).json({
      success: false,
      error: 'phoneNumber is required'
    });
  }

  // Clean phone number (remove non-digits)
  const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
  
  if (cleanNumber.length < 10) {
    return res.status(400).json({
      success: false,
      error: 'Invalid phone number. Include country code (e.g., 1234567890)'
    });
  }

  // Generate user ID from phone number
  const userId = `bot_${cleanNumber}`;

  try {
    // Check if already connected
    const existingSession = sessionManager.getSessionInfo(userId);
    if (existingSession && existingSession.status === 'online') {
      return res.json({
        success: true,
        status: 'already_connected',
        phoneNumber: cleanNumber,
        name: existingSession.name || null,
        message: 'This number is already connected'
      });
    }

    // Delete old session if exists
    if (await sessionManager.sessionExists(userId)) {
      await sessionManager.deleteSession(userId);
    }

    // Create new session and get pairing code
    const result = await sessionManager.createSession(
      userId,
      cleanNumber,
      handleMessage,
      handleConnection
    );

    if (result.success && result.pairingCode) {
      res.json({
        success: true,
        status: 'pairing_code_generated',
        pairingCode: result.pairingCode,
        phoneNumber: cleanNumber,
        message: 'Enter this code in WhatsApp > Linked Devices > Link a Device'
      });
    } else {
      res.json({
        success: result.success,
        status: 'pending',
        phoneNumber: cleanNumber,
        message: result.message
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/check/:phoneNumber
 * Check if a phone number is connected
 * 
 * Response:
 * {
 *   "success": true,
 *   "phoneNumber": "1234567890",
 *   "connected": true,
 *   "status": "online",
 *   "name": "John Doe"
 * }
 */
app.get('/api/check/:phoneNumber', (req, res) => {
  const { phoneNumber } = req.params;
  const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
  const userId = `bot_${cleanNumber}`;
  
  const info = sessionManager.getSessionInfo(userId);
  
  res.json({
    success: true,
    phoneNumber: cleanNumber,
    connected: info.status === 'online',
    status: info.status,
    name: info.name || null
  });
});

/**
 * DELETE /api/disconnect/:phoneNumber
 * Disconnect a bot by phone number
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Bot disconnected successfully"
 * }
 */
app.delete('/api/disconnect/:phoneNumber', async (req, res) => {
  const { phoneNumber } = req.params;
  const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
  const userId = `bot_${cleanNumber}`;

  try {
    await sessionManager.logoutSession(userId);
    res.json({
      success: true,
      phoneNumber: cleanNumber,
      message: 'Bot disconnected successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/bots
 * Get list of all bots
 * 
 * Response:
 * {
 *   "success": true,
 *   "total": 10,
 *   "connected": 5,
 *   "bots": [
 *     { "phoneNumber": "1234567890", "status": "online", "name": "John" },
 *     { "phoneNumber": "0987654321", "status": "offline", "name": null }
 *   ]
 * }
 */
app.get('/api/bots', async (req, res) => {
  try {
    const sessions = await sessionManager.getAllSessionsInfo();
    const connectedBots = sessions.filter(s => s.status === 'online');
    
    res.json({
      success: true,
      total: sessions.length,
      connected: connectedBots.length,
      bots: sessions.map(s => ({
        phoneNumber: s.phoneNumber || s.userId.replace('bot_', ''),
        status: s.status,
        name: s.name || null
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// START SERVER
// ============================================

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log('╔════════════════════════════════════════╗');
  console.log('║     WHATSAPP PAIRING API SERVER      ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║  Port: ${String(PORT).padEnd(30)}║`);
  console.log(`║  CORS: ${(corsOrigin).substring(0, 30).padEnd(30)}║`);
  console.log('╠════════════════════════════════════════╣');
  console.log('║  Endpoints:                            ║');
  console.log('║  GET  /api/status    - Server status   ║');
  console.log('║  POST /api/pair      - Get pairing code║');
  console.log('║  GET  /api/check/:n  - Check connection║');
  console.log('║  DELETE /api/disconnect/:n - Disconnect║');
  console.log('║  GET  /api/bots      - List all bots   ║');
  console.log('╚════════════════════════════════════════╝');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  process.exit(0);
});

module.exports = app;
