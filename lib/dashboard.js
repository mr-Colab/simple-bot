/**
 * Multi-User Web Dashboard
 * Provides API and web interface for managing multiple bot instances
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const sessionManager = require('./sessionManager');
const config = require('../config');

function setupDashboard(app) {
  // Enable CORS for external API access
  // Parse CORS_ORIGIN: '*' for all origins, or comma-separated URLs for specific origins
  const corsOrigin = config.CORS_ORIGIN === '*' 
    ? '*' 
    : config.CORS_ORIGIN.split(',').map(origin => origin.trim());
  
  app.use(cors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'X-API-Key']
  }));

  console.log('🌐 CORS enabled for origins:', corsOrigin === '*' ? 'ALL (*)' : corsOrigin.join(', '));

  // Serve static files
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Middleware for API key authentication (optional)
  function authenticateApiKey(req, res, next) {
    // Skip authentication if no API key is configured
    if (!config.API_KEY) {
      return next();
    }

    const apiKey = req.headers['x-api-key'];
    
    // Allow dashboard access without API key
    if (req.path === '/' || req.path.startsWith('/api/stats') || (req.path.startsWith('/api/sessions') && req.method === 'GET')) {
      return next();
    }

    if (!apiKey || apiKey !== config.API_KEY) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid or missing API key. Include X-API-Key header.'
      });
    }

    next();
  }

  // Apply API key authentication to all routes
  app.use(authenticateApiKey);

  // Dashboard HTML
  app.get('/', (req, res) => {
    res.send(getDashboardHTML());
  });

  // API: Get all sessions
  app.get('/api/sessions', (req, res) => {
    const sessions = sessionManager.getAllSessionsInfo();
    res.json({
      success: true,
      count: sessions.length,
      sessions
    });
  });

  // API: Get session info
  app.get('/api/sessions/:userId', (req, res) => {
    const { userId } = req.params;
    const info = sessionManager.getSessionInfo(userId);
    res.json({ success: true, ...info });
  });

  // API: Create new session / Get pairing code
  app.post('/api/sessions', async (req, res) => {
    const { userId, phoneNumber } = req.body;

    if (!userId || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'userId and phoneNumber are required'
      });
    }

    // Validate userId (alphanumeric only)
    if (!/^[a-zA-Z0-9_-]+$/.test(userId)) {
      return res.status(400).json({
        success: false,
        message: 'userId must be alphanumeric (a-z, 0-9, _, -)'
      });
    }

    // Check if session already exists
    if (await sessionManager.sessionExists(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Session already exists for this user. Delete it first or use a different userId.'
      });
    }

    try {
      const result = await sessionManager.createSession(
        userId,
        phoneNumber,
        handleMessage,
        handleConnection
      );

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // API: Start existing session
  app.post('/api/sessions/:userId/start', async (req, res) => {
    const { userId } = req.params;

    if (!await sessionManager.sessionExists(userId)) {
      return res.status(404).json({
        success: false,
        message: 'Session not found. Create a new session first.'
      });
    }

    try {
      const result = await sessionManager.createSession(
        userId,
        null,
        handleMessage,
        handleConnection
      );

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // API: Stop session
  app.post('/api/sessions/:userId/stop', async (req, res) => {
    const { userId } = req.params;

    await sessionManager.stopSession(userId);
    res.json({
      success: true,
      message: `Session ${userId} stopped`
    });
  });

  // API: Delete session
  app.delete('/api/sessions/:userId', async (req, res) => {
    const { userId } = req.params;

    await sessionManager.deleteSession(userId);
    res.json({
      success: true,
      message: `Session ${userId} deleted`
    });
  });

  // API: Logout session
  app.post('/api/sessions/:userId/logout', async (req, res) => {
    const { userId } = req.params;

    await sessionManager.logoutSession(userId);
    res.json({
      success: true,
      message: `Session ${userId} logged out and deleted`
    });
  });

  // API: Get pending pairing code
  app.get('/api/sessions/:userId/pairing', (req, res) => {
    const { userId } = req.params;
    const pairing = sessionManager.getPendingPairing(userId);

    if (!pairing) {
      return res.status(404).json({
        success: false,
        message: 'No pending pairing for this user'
      });
    }

    res.json({
      success: true,
      ...pairing
    });
  });

  // API: Get stats
  app.get('/api/stats', async (req, res) => {
    const allUsers = await sessionManager.getAllUserIds();
    res.json({
      success: true,
      activeSessions: sessionManager.getActiveSessionCount(),
      totalUsers: allUsers.length
    });
  });

  // API: Backup session to database
  app.post('/api/sessions/:userId/backup', async (req, res) => {
    const { userId } = req.params;
    const fs = require('fs');
    const path = require('path');
    
    const credsPath = path.join('./lib/sessions', userId, 'creds.json');
    
    if (!fs.existsSync(credsPath)) {
      return res.status(404).json({
        success: false,
        message: 'Session credentials not found'
      });
    }
    
    try {
      const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
      await sessionManager.backupSessionToDB(userId, creds);
      res.json({
        success: true,
        message: `Session ${userId} backed up to database`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // API: Restore session from database
  app.post('/api/sessions/:userId/restore', async (req, res) => {
    const { userId } = req.params;
    
    try {
      const restored = await sessionManager.restoreSessionFromDB(userId);
      
      if (restored) {
        res.json({
          success: true,
          message: `Session ${userId} restored from database`
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'No session found in database for this user'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // API: Restore all sessions from database
  app.post('/api/sessions/restore-all', async (req, res) => {
    try {
      const result = await sessionManager.restoreAllSessionsFromDB(handleMessage, handleConnection);
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  console.log('📊 Dashboard API endpoints registered');
}

// Message handler for all sessions
async function handleMessage(userId, sock, messageUpdate) {
  const { serialize, commands, whatsappAutomation } = require('./index');

  let message;
  try {
    message = await serialize(JSON.parse(JSON.stringify(messageUpdate.messages[0])), sock);
  } catch (error) {
    console.error(`[${userId}] Error serializing message:`, error);
    return;
  }

  // Add userId to message for context
  message.sessionUserId = userId;

  await whatsappAutomation(sock, message, messageUpdate);

  if (config.DISABLE_PM && !message.isGroup) {
    return;
  }

  commands.map(async (command) => {
    if (command.fromMe && !message.sudo) {
      return;
    }

    let messageText = message.text
      ? message.body[0].toLowerCase() + message.body.slice(1).trim()
      : '';

    try {
      if (command.on) {
        command.function({ m: message, args: message.body, client: sock, userId });
      } else if (command.name && command.name.test(messageText)) {
        let args = message.body.replace(command.name, '$1').trim();
        command.function({ m: message, args: args, client: sock, userId });
      }
    } catch (error) {
      console.log(`[${userId}] Command error:`, error);
    }
  });
}

// Connection handler for all sessions
async function handleConnection(userId, status, sock, statusCode) {
  if (status === 'open') {
    console.log(`[${userId}] ✅ Session connected successfully`);
    
    // Load plugins once (they're shared across all sessions)
    const fs = require('fs');
    const path = require('path');
    const pluginsPath = path.join(__dirname, '..', 'plugins');
    
    if (fs.existsSync(pluginsPath)) {
      const pluginFiles = fs.readdirSync(pluginsPath)
        .filter(file => path.extname(file) === '.js');
      
      pluginFiles.forEach(file => {
        try {
          require(path.join(pluginsPath, file));
        } catch (error) {
          // Plugin already loaded or error
        }
      });
    }

    // Send startup message to the user
    if (config.START_MSG) {
      try {
        const ownerJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        
        const startupMessage = `*LD7 V1 STARTED! *

_Session: ${userId}_
_Mode: ${config.WORK_TYPE}_
_Prefix: ${config.HANDLERS}_
_Version: ${config.VERSION}_

*Extra Configurations*

\`\`\`Always online: ${config.ALWAYS_ONLINE ? '✅' : '❌'}
Auto typing: ${config.AUTO_TYPING ? '✅' : '❌'}
Auto status view: ${config.AUTO_STATUS_VIEW ? '✅' : '❌'}
Auto status reaction: ${config.STATUS_REACTION ? '✅' : '❌'}
Auto read messages: ${config.READ_MESSAGES ? '✅' : '❌'}
Logs: ${config.LOGS ? '✅' : '❌'}\`\`\`

_Multi-User Mode Active 🚀_`;

        await sock.sendMessage(ownerJid, {
          text: startupMessage,
          contextInfo: {
            externalAdReply: {
              title: "LD7 V1 - Multi User",
              body: "Session: " + userId,
              sourceUrl: 'https://github.com/mr-Colab/simple-bot',
              mediaType: 1,
              showAdAttribution: false,
              renderLargerThumbnail: true,
              thumbnailUrl: 'https://i.imgur.com/Q2UNwXR.jpg'
            }
          }
        });
        
        console.log(`[${userId}] 📨 Startup message sent`);
      } catch (error) {
        console.error(`[${userId}] Failed to send startup message:`, error.message);
      }
    }
  }
}

// Dashboard HTML template
function getDashboardHTML() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LD7 V1 Multi-User Dashboard</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
    
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box; 
    }
    
    body { 
      font-family: 'Poppins', sans-serif; 
      background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
      background-attachment: fixed;
      color: #fff;
      min-height: 100vh;
      padding: 20px;
      overflow-x: hidden;
    }
    
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    
    @keyframes shimmer {
      0% { background-position: -1000px 0; }
      100% { background-position: 1000px 0; }
    }
    
    .container { 
      max-width: 1400px; 
      margin: 0 auto;
      animation: fadeInUp 0.8s ease-out;
    }
    
    h1 { 
      text-align: center; 
      margin-bottom: 40px; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      font-size: 3em;
      font-weight: 700;
      text-shadow: 0 0 30px rgba(102, 126, 234, 0.5);
      animation: pulse 2s infinite;
    }
    
    .stats { 
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 25px; 
      margin-bottom: 40px;
    }
    
    .stat-card {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 30px;
      border-radius: 20px;
      text-align: center;
      transition: all 0.3s ease;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      animation: fadeInUp 0.8s ease-out;
    }
    
    .stat-card:hover {
      transform: translateY(-10px);
      box-shadow: 0 12px 40px rgba(102, 126, 234, 0.3);
      border-color: rgba(102, 126, 234, 0.5);
    }
    
    .stat-card h3 { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      font-size: 3em; 
      font-weight: 700;
      margin-bottom: 10px;
    }
    
    .stat-card p { 
      color: #a8b3cf; 
      font-size: 1.1em;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .card {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
      backdrop-filter: blur(10px);
      border-radius: 25px;
      padding: 35px;
      margin-bottom: 30px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
      animation: fadeInUp 1s ease-out;
    }
    
    .card:hover {
      border-color: rgba(102, 126, 234, 0.3);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
    }
    
    .card h2 { 
      margin-bottom: 25px; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      font-size: 1.8em;
      font-weight: 600;
    }
    
    .form-group { 
      margin-bottom: 20px; 
    }
    
    .form-group label { 
      display: block; 
      margin-bottom: 8px; 
      color: #a8b3cf;
      font-weight: 500;
      font-size: 0.95em;
    }
    
    .form-group input {
      width: 100%;
      padding: 15px 20px;
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.05);
      color: #fff;
      font-size: 16px;
      font-family: 'Poppins', sans-serif;
      transition: all 0.3s ease;
    }
    
    .form-group input:focus { 
      outline: none;
      border-color: #667eea;
      background: rgba(102, 126, 234, 0.1);
      box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
    }
    
    .form-group input::placeholder {
      color: rgba(168, 179, 207, 0.5);
    }
    
    .btn {
      padding: 15px 35px;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
      font-family: 'Poppins', sans-serif;
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 1px;
      position: relative;
      overflow: hidden;
    }
    
    .btn::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      transition: left 0.5s;
    }
    
    .btn:hover::before {
      left: 100%;
    }
    
    .btn-primary { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }
    
    .btn-primary:hover { 
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
    }
    
    .btn-danger { 
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: #fff;
      box-shadow: 0 4px 15px rgba(245, 87, 108, 0.4);
    }
    
    .btn-danger:hover { 
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(245, 87, 108, 0.6);
    }
    
    .btn-secondary { 
      background: linear-gradient(135deg, #a8b3cf 0%, #7f8c9f 100%);
      color: #fff;
      box-shadow: 0 4px 15px rgba(168, 179, 207, 0.4);
    }
    
    .btn-secondary:hover { 
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(168, 179, 207, 0.6);
    }
    
    .sessions-list { 
      margin-top: 25px; 
    }
    
    .session-item {
      background: rgba(255, 255, 255, 0.03);
      backdrop-filter: blur(10px);
      padding: 20px 25px;
      border-radius: 15px;
      margin-bottom: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid rgba(255, 255, 255, 0.05);
      transition: all 0.3s ease;
      animation: fadeInUp 0.5s ease-out;
    }
    
    .session-item:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(102, 126, 234, 0.3);
      transform: translateX(5px);
    }
    
    .session-info { flex: 1; }
    
    .session-info h4 { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      font-size: 1.2em;
      margin-bottom: 5px;
    }
    
    .session-info p { 
      color: #a8b3cf; 
      font-size: 0.9em;
    }
    
    .session-actions { 
      display: flex; 
      gap: 10px; 
      flex-wrap: wrap;
    }
    
    .session-actions .btn {
      padding: 10px 20px;
      font-size: 14px;
    }
    
    .status-online { 
      color: #00ff88;
      font-weight: 600;
      text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
    }
    
    .status-offline { 
      color: #ff4444;
      font-weight: 600;
    }
    
    .pairing-code {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      padding: 30px;
      border-radius: 15px;
      text-align: center;
      font-size: 2.5em;
      font-weight: 700;
      letter-spacing: 8px;
      margin: 25px 0;
      box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
      animation: pulse 1.5s infinite;
    }
    
    .alert {
      padding: 18px 25px;
      border-radius: 12px;
      margin-bottom: 20px;
      font-weight: 500;
      animation: fadeInUp 0.5s ease-out;
    }
    
    .alert-success { 
      background: linear-gradient(135deg, rgba(0, 255, 136, 0.15) 0%, rgba(0, 200, 100, 0.15) 100%);
      border: 1px solid rgba(0, 255, 136, 0.3);
      color: #00ff88;
    }
    
    .alert-error { 
      background: linear-gradient(135deg, rgba(255, 68, 68, 0.15) 0%, rgba(200, 0, 0, 0.15) 100%);
      border: 1px solid rgba(255, 68, 68, 0.3);
      color: #ff4444;
    }
    
    .hidden { display: none; }
    
    /* Responsive Design */
    @media (max-width: 768px) {
      h1 { font-size: 2em; }
      .stats { grid-template-columns: 1fr; }
      .session-item {
        flex-direction: column;
        gap: 15px;
        text-align: center;
      }
      .session-actions {
        width: 100%;
        justify-content: center;
      }
    }
    
    /* Scrollbar Styling */
    ::-webkit-scrollbar {
      width: 10px;
    }
    
    ::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
    }
    
    ::-webkit-scrollbar-thumb {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 10px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🤖 LD7 V1 Multi-User Dashboard</h1>
    
    <div class="stats">
      <div class="stat-card">
        <h3 id="activeCount">0</h3>
        <p>Connected Bots</p>
      </div>
      <div class="stat-card">
        <h3 id="totalCount">0</h3>
        <p>Total Users</p>
      </div>
    </div>

    <div class="card">
      <h2>➕ Connect New Bot</h2>
      <div id="alertBox" class="alert hidden"></div>
      <div id="pairingBox" class="hidden">
        <p style="text-align: center; margin-bottom: 10px; color: #a8b3cf;">Enter this code in WhatsApp > Linked Devices:</p>
        <div class="pairing-code" id="pairingCode"></div>
      </div>
      <form id="createForm">
        <div class="form-group">
          <label>Phone Number (with country code, no spaces)</label>
          <input type="text" id="phoneNumber" placeholder="e.g., 1234567890" required>
        </div>
        <button type="submit" class="btn btn-primary">Connect Bot & Get Pairing Code</button>
      </form>
    </div>

    <div class="card">
      <h2>📋 Connected Bots</h2>
      <div id="sessionsList" class="sessions-list">
        <p style="color: #a8b3cf;">Loading sessions...</p>
      </div>
    </div>
  </div>

  <script>
    // Load stats
    async function loadStats() {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        document.getElementById('activeCount').textContent = data.activeSessions;
        document.getElementById('totalCount').textContent = data.totalUsers;
      } catch (e) {
        console.error('Error loading stats:', e);
      }
    }

    // Load sessions
    async function loadSessions() {
      try {
        const res = await fetch('/api/sessions');
        const data = await res.json();
        const list = document.getElementById('sessionsList');
        
        if (data.sessions.length === 0) {
          list.innerHTML = '<p style="color: #a8b3cf;">No bots connected yet. Connect one above!</p>';
          return;
        }

        list.innerHTML = data.sessions.map(s => \`
          <div class="session-item">
            <div class="session-info">
              <h4>\${s.phoneNumber || s.userId}</h4>
              <p>
                <span class="\${s.status === 'online' ? 'status-online' : 'status-offline'}">
                  ● \${s.status.toUpperCase()}
                </span>
                \${s.name ? ' | ' + s.name : ''}
              </p>
            </div>
            <div class="session-actions">
              \${s.status === 'offline' ? 
                \`<button class="btn btn-primary" onclick="startSession('\${s.userId}')">Start</button>\` :
                \`<button class="btn btn-secondary" onclick="stopSession('\${s.userId}')">Stop</button>\`
              }
              <button class="btn btn-danger" onclick="deleteSession('\${s.userId}')">Delete</button>
            </div>
          </div>
        \`).join('');
      } catch (e) {
        console.error('Error loading sessions:', e);
      }
    }

    // Create session
    document.getElementById('createForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const phoneNumber = document.getElementById('phoneNumber').value.trim();
      // Auto-generate userId from phone number
      const userId = 'bot_' + phoneNumber.replace(/[^0-9]/g, '');
      const alertBox = document.getElementById('alertBox');
      const pairingBox = document.getElementById('pairingBox');

      try {
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, phoneNumber })
        });
        const data = await res.json();

        if (data.success && data.pairingCode) {
          pairingBox.classList.remove('hidden');
          document.getElementById('pairingCode').textContent = data.pairingCode;
          alertBox.className = 'alert alert-success';
          alertBox.textContent = data.message;
          alertBox.classList.remove('hidden');
          document.getElementById('phoneNumber').value = '';
        } else if (data.success) {
          alertBox.className = 'alert alert-success';
          alertBox.textContent = data.message;
          alertBox.classList.remove('hidden');
          pairingBox.classList.add('hidden');
        } else {
          alertBox.className = 'alert alert-error';
          alertBox.textContent = data.message;
          alertBox.classList.remove('hidden');
          pairingBox.classList.add('hidden');
        }

        loadSessions();
        loadStats();
      } catch (e) {
        alertBox.className = 'alert alert-error';
        alertBox.textContent = 'Error: ' + e.message;
        alertBox.classList.remove('hidden');
      }
    });

    // Start session
    async function startSession(userId) {
      await fetch(\`/api/sessions/\${userId}/start\`, { method: 'POST' });
      setTimeout(() => {
        loadSessions();
        loadStats();
      }, 1000);
    }

    // Stop session
    async function stopSession(userId) {
      await fetch(\`/api/sessions/\${userId}/stop\`, { method: 'POST' });
      setTimeout(() => {
        loadSessions();
        loadStats();
      }, 1000);
    }

    // Delete session
    async function deleteSession(userId) {
      if (confirm(\`Are you sure you want to delete this bot connection?\`)) {
        await fetch(\`/api/sessions/\${userId}\`, { method: 'DELETE' });
        setTimeout(() => {
          loadSessions();
          loadStats();
        }, 1000);
      }
    }

    // Initial load
    loadStats();
    loadSessions();

    // Auto refresh
    setInterval(() => {
      loadStats();
      loadSessions();
    }, 5000);
  </script>
</body>
</html>
`;
}

module.exports = { setupDashboard, handleMessage, handleConnection };
