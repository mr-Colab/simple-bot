/**
 * Multi-User Web Dashboard
 * Provides API and web interface for managing multiple bot instances
 */

const express = require('express');
const path = require('path');
const sessionManager = require('./sessionManager');
const config = require('../config');

function setupDashboard(app) {
  // Serve static files
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

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
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #fff;
      min-height: 100vh;
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { text-align: center; margin-bottom: 30px; color: #00ff88; }
    .stats { 
      display: flex; 
      gap: 20px; 
      margin-bottom: 30px;
      justify-content: center;
    }
    .stat-card {
      background: rgba(255,255,255,0.1);
      padding: 20px 40px;
      border-radius: 10px;
      text-align: center;
    }
    .stat-card h3 { color: #00ff88; font-size: 2em; }
    .stat-card p { color: #aaa; }
    .card {
      background: rgba(255,255,255,0.05);
      border-radius: 15px;
      padding: 25px;
      margin-bottom: 20px;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .card h2 { margin-bottom: 20px; color: #00ff88; }
    .form-group { margin-bottom: 15px; }
    .form-group label { display: block; margin-bottom: 5px; color: #aaa; }
    .form-group input {
      width: 100%;
      padding: 12px;
      border: none;
      border-radius: 8px;
      background: rgba(255,255,255,0.1);
      color: #fff;
      font-size: 16px;
    }
    .form-group input:focus { outline: 2px solid #00ff88; }
    .btn {
      padding: 12px 30px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
      transition: all 0.3s;
    }
    .btn-primary { background: #00ff88; color: #000; }
    .btn-primary:hover { background: #00cc6a; }
    .btn-danger { background: #ff4444; color: #fff; }
    .btn-danger:hover { background: #cc0000; }
    .btn-secondary { background: #666; color: #fff; }
    .btn-secondary:hover { background: #888; }
    .sessions-list { margin-top: 20px; }
    .session-item {
      background: rgba(255,255,255,0.05);
      padding: 15px 20px;
      border-radius: 10px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .session-info { flex: 1; }
    .session-info h4 { color: #00ff88; }
    .session-info p { color: #aaa; font-size: 14px; }
    .session-actions { display: flex; gap: 10px; }
    .status-online { color: #00ff88; }
    .status-offline { color: #ff4444; }
    .pairing-code {
      background: #00ff88;
      color: #000;
      padding: 20px;
      border-radius: 10px;
      text-align: center;
      font-size: 2em;
      font-weight: bold;
      letter-spacing: 5px;
      margin: 20px 0;
    }
    .alert {
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 15px;
    }
    .alert-success { background: rgba(0,255,136,0.2); border: 1px solid #00ff88; }
    .alert-error { background: rgba(255,68,68,0.2); border: 1px solid #ff4444; }
    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🤖 LD7 V1 Multi-User Dashboard</h1>
    
    <div class="stats">
      <div class="stat-card">
        <h3 id="activeCount">0</h3>
        <p>Active Sessions</p>
      </div>
      <div class="stat-card">
        <h3 id="totalCount">0</h3>
        <p>Total Users</p>
      </div>
    </div>

    <div class="card">
      <h2>➕ Create New Session</h2>
      <div id="alertBox" class="alert hidden"></div>
      <div id="pairingBox" class="hidden">
        <p style="text-align: center; margin-bottom: 10px;">Enter this code in WhatsApp > Linked Devices:</p>
        <div class="pairing-code" id="pairingCode"></div>
      </div>
      <form id="createForm">
        <div class="form-group">
          <label>User ID (unique identifier)</label>
          <input type="text" id="userId" placeholder="e.g., user1, john_doe" required>
        </div>
        <div class="form-group">
          <label>Phone Number (with country code)</label>
          <input type="text" id="phoneNumber" placeholder="e.g., 1234567890" required>
        </div>
        <button type="submit" class="btn btn-primary">Create Session & Get Pairing Code</button>
      </form>
    </div>

    <div class="card">
      <h2>📋 Active Sessions</h2>
      <div id="sessionsList" class="sessions-list">
        <p style="color: #aaa;">Loading sessions...</p>
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
          list.innerHTML = '<p style="color: #aaa;">No sessions yet. Create one above!</p>';
          return;
        }

        list.innerHTML = data.sessions.map(s => \`
          <div class="session-item">
            <div class="session-info">
              <h4>\${s.userId}</h4>
              <p>
                <span class="\${s.status === 'online' ? 'status-online' : 'status-offline'}">
                  ● \${s.status.toUpperCase()}
                </span>
                \${s.phoneNumber ? ' | ' + s.phoneNumber : ''}
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
      const userId = document.getElementById('userId').value.trim();
      const phoneNumber = document.getElementById('phoneNumber').value.trim();
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
      loadSessions();
      loadStats();
    }

    // Stop session
    async function stopSession(userId) {
      await fetch(\`/api/sessions/\${userId}/stop\`, { method: 'POST' });
      loadSessions();
      loadStats();
    }

    // Delete session
    async function deleteSession(userId) {
      if (confirm(\`Are you sure you want to delete session "\${userId}"?\`)) {
        await fetch(\`/api/sessions/\${userId}\`, { method: 'DELETE' });
        loadSessions();
        loadStats();
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
