/**
 * Multi-User Session Manager with Database Backup
 * Manages multiple WhatsApp sessions for different users
 * Sessions are backed up to PostgreSQL and auto-restored on startup
 */

const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion
} = require("baileys");
const { Boom } = require("@hapi/boom");
const pino = require("pino");
const fs = require('fs');
const path = require('path');
const NodeCache = require("node-cache");
const config = require("../config");

const {
  saveSessionToDB,
  getSessionFromDB,
  getAllSessionsFromDB,
  deleteSessionFromDB,
  updateSessionStatus,
  syncSessionsTable
} = require('./database/sessions');

const logger = pino({ level: "silent" });

// Store all active sessions
const sessions = new Map();

// Store pending pairing codes
const pendingPairings = new Map();

// Store reconnection attempts for each session
const reconnectionAttempts = new Map();

// Session directory base path
const SESSION_BASE_PATH = './lib/sessions';

// Batch size for restoring sessions
const RESTORE_BATCH_SIZE = 5;
const RESTORE_DELAY_MS = 3000;

// Default max reconnection attempts (used if config is not available)
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 2;

// Ensure sessions directory exists
if (!fs.existsSync(SESSION_BASE_PATH)) {
  fs.mkdirSync(SESSION_BASE_PATH, { recursive: true });
}

/**
 * Get session path for a user
 */
function getSessionPath(userId) {
  return path.join(SESSION_BASE_PATH, userId);
}

/**
 * Check if a session exists for a user (file or database)
 */
async function sessionExists(userId) {
  const sessionPath = getSessionPath(userId);
  const fileExists = fs.existsSync(path.join(sessionPath, 'creds.json'));
  
  if (fileExists) return true;
  
  // Check database
  const dbSession = await getSessionFromDB(userId);
  return dbSession !== null;
}

/**
 * Get all registered user IDs (from files and database)
 */
async function getAllUserIds() {
  const userIds = new Set();
  
  // Get from files
  if (fs.existsSync(SESSION_BASE_PATH)) {
    const dirs = fs.readdirSync(SESSION_BASE_PATH).filter(dir => {
      const sessionPath = path.join(SESSION_BASE_PATH, dir);
      return fs.statSync(sessionPath).isDirectory() && 
             fs.existsSync(path.join(sessionPath, 'creds.json'));
    });
    dirs.forEach(id => userIds.add(id));
  }
  
  // Get from database
  try {
    const dbSessions = await getAllSessionsFromDB();
    dbSessions.forEach(s => userIds.add(s.userId));
  } catch (error) {
    console.error('[SessionManager] Error getting sessions from DB:', error.message);
  }
  
  return Array.from(userIds);
}

/**
 * Get session info
 */
function getSessionInfo(userId) {
  const session = sessions.get(userId);
  if (!session) {
    return { status: 'offline', userId };
  }
  return {
    status: 'online',
    userId,
    phoneNumber: session.sock?.user?.id?.split(':')[0] || 'Unknown',
    name: session.sock?.user?.name || 'Unknown'
  };
}

/**
 * Get all sessions info
 */
async function getAllSessionsInfo() {
  const allUsers = await getAllUserIds();
  return allUsers.map(userId => getSessionInfo(userId));
}

/**
 * Restore session from database to files
 */
async function restoreSessionFromDB(userId) {
  const sessionPath = getSessionPath(userId);
  const credsPath = path.join(sessionPath, 'creds.json');
  
  // If creds already exist, skip restore
  if (fs.existsSync(credsPath)) {
    return true;
  }
  
  // Get from database
  const dbSession = await getSessionFromDB(userId);
  if (!dbSession || !dbSession.creds) {
    console.log(`[${userId}] No session found in database`);
    return false;
  }
  
  // Create session directory
  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }
  
  // Write creds.json
  try {
    fs.writeFileSync(credsPath, JSON.stringify(dbSession.creds, null, 2));
    console.log(`[${userId}] ✅ Session restored from database`);
    return true;
  } catch (error) {
    console.error(`[${userId}] Error restoring session:`, error.message);
    return false;
  }
}

/**
 * Backup session to database
 */
async function backupSessionToDB(userId, creds, phoneNumber = null) {
  try {
    await saveSessionToDB(userId, phoneNumber, creds);
    return true;
  } catch (error) {
    console.error(`[${userId}] Error backing up session:`, error.message);
    return false;
  }
}

/**
 * Restore all sessions from database in batches
 */
async function restoreAllSessionsFromDB(onMessage, onConnection) {
  try {
    await syncSessionsTable();
    
    const dbSessions = await getAllSessionsFromDB();
    
    if (dbSessions.length === 0) {
      console.log('[SessionManager] No sessions found in database');
      return { restored: 0, total: 0 };
    }
    
    console.log(`\n🔄 Restoring ${dbSessions.length} session(s) from database...`);
    
    let restored = 0;
    let failed = 0;
    
    // Process in batches
    for (let i = 0; i < dbSessions.length; i += RESTORE_BATCH_SIZE) {
      const batch = dbSessions.slice(i, i + RESTORE_BATCH_SIZE);
      const batchNum = Math.floor(i / RESTORE_BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(dbSessions.length / RESTORE_BATCH_SIZE);
      
      console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} sessions)`);
      
      // Restore and start sessions in this batch
      const promises = batch.map(async (dbSession) => {
        try {
          // Restore files from DB
          const restoreSuccess = await restoreSessionFromDB(dbSession.userId);
          
          if (restoreSuccess) {
            // Start the session
            const result = await createSession(
              dbSession.userId,
              dbSession.phoneNumber,
              onMessage,
              onConnection
            );
            
            if (result.success) {
              restored++;
              console.log(`  ✅ ${dbSession.userId} - Restored & Connected`);
            } else {
              failed++;
              console.log(`  ⚠️ ${dbSession.userId} - Restored but failed to connect: ${result.message}`);
            }
          } else {
            failed++;
            console.log(`  ❌ ${dbSession.userId} - Failed to restore`);
          }
        } catch (error) {
          failed++;
          console.error(`  ❌ ${dbSession.userId} - Error: ${error.message}`);
        }
      });
      
      await Promise.all(promises);
      
      // Wait between batches to avoid overwhelming the server
      if (i + RESTORE_BATCH_SIZE < dbSessions.length) {
        console.log(`  ⏳ Waiting ${RESTORE_DELAY_MS/1000}s before next batch...`);
        await new Promise(resolve => setTimeout(resolve, RESTORE_DELAY_MS));
      }
    }
    
    console.log(`\n✅ Restore complete: ${restored} successful, ${failed} failed`);
    return { restored, failed, total: dbSessions.length };
    
  } catch (error) {
    console.error('[SessionManager] Error restoring sessions:', error.message);
    return { restored: 0, failed: 0, total: 0, error: error.message };
  }
}

/**
 * Create a new session for a user
 */
async function createSession(userId, phoneNumber, onMessage, onConnection) {
  // Check if session already exists and is active
  if (sessions.has(userId)) {
    const existingSession = sessions.get(userId);
    if (existingSession.sock?.ws?.isOpen) {
      console.log(`[${userId}] Session already active`);
      return { success: false, message: 'Session already active' };
    }
    // Clean up existing session
    await stopSession(userId);
  }

  const sessionPath = getSessionPath(userId);
  
  // Try to restore from database if local files don't exist
  if (!fs.existsSync(path.join(sessionPath, 'creds.json'))) {
    await restoreSessionFromDB(userId);
  }
  
  // Create session directory if it doesn't exist
  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }

  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const groupCache = new NodeCache({
      stdTTL: 3600,
      checkperiod: 600,
      useClones: false
    });

    const sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger)
      },
      downloadHistory: false,
      syncFullHistory: false,
      shouldSyncHistoryMessage: () => false,
      printQRInTerminal: false,
      version: version,
      logger: logger,
      getMessage: false,
      cachedGroupMetadata: async (jid) => groupCache.get(jid)
    });

    // Store session
    sessions.set(userId, {
      sock,
      saveCreds,
      groupCache,
      phoneNumber,
      createdAt: new Date()
    });

    // Connection update handler
    sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
      if (connection === "connecting") {
        console.log(`[${userId}] Connecting...`);
      } else if (connection === 'open') {
        console.log(`[${userId}] Connected!`);
        pendingPairings.delete(userId);
        // Reset reconnection attempts on successful connection
        reconnectionAttempts.delete(userId);
        
        // Backup session to database on successful connection
        const credsPath = path.join(sessionPath, 'creds.json');
        if (fs.existsSync(credsPath)) {
          try {
            const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
            await backupSessionToDB(userId, creds, phoneNumber || sock.user?.id?.split(':')[0]);
          } catch (error) {
            console.error(`[${userId}] Failed to backup session:`, error.message);
          }
        }
        
        if (onConnection) {
          onConnection(userId, 'open', sock);
        }
      } else if (connection === 'close') {
        const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
        console.log(`[${userId}] Connection closed. Status:`, statusCode);
        
        if (onConnection) {
          onConnection(userId, 'close', null, statusCode);
        }

        if (statusCode === DisconnectReason.loggedOut) {
          console.log(`[${userId}] Logged out. Removing session.`);
          reconnectionAttempts.delete(userId);
          await deleteSession(userId, true); // Also delete from DB
        } else if (statusCode !== DisconnectReason.connectionReplaced) {
          // Track reconnection attempts - use config value with fallback to constant
          const maxAttempts = config.MAX_RECONNECT_ATTEMPTS || DEFAULT_MAX_RECONNECT_ATTEMPTS;
          const currentAttempts = (reconnectionAttempts.get(userId) || 0) + 1;
          reconnectionAttempts.set(userId, currentAttempts);
          
          if (currentAttempts <= maxAttempts) {
            console.log(`[${userId}] Attempting to reconnect (${currentAttempts}/${maxAttempts})...`);
            setTimeout(() => {
              createSession(userId, phoneNumber, onMessage, onConnection);
            }, 5000);
          } else {
            console.log(`[${userId}] Max reconnection attempts (${maxAttempts}) reached. Deleting session from database.`);
            reconnectionAttempts.delete(userId);
            await deleteSession(userId, true); // Delete from DB after max attempts
          }
        }
      }
    });

    // Save credentials on update and backup to database
    sock.ev.on("creds.update", async () => {
      await saveCreds();
      
      // Backup to database
      const credsPath = path.join(sessionPath, 'creds.json');
      if (fs.existsSync(credsPath)) {
        try {
          const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
          await backupSessionToDB(userId, creds, phoneNumber);
        } catch (error) {
          // Silent fail for backup
        }
      }
    });

    // Message handler
    if (onMessage) {
      sock.ev.on('messages.upsert', async (messageUpdate) => {
        onMessage(userId, sock, messageUpdate);
      });
    }

    // Request pairing code if not registered
    if (!sock.authState.creds.registered && phoneNumber) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
      if (cleanNumber.length < 10) {
        return { success: false, message: 'Invalid phone number format' };
      }

      console.log(`[${userId}] Requesting pairing code for: ${cleanNumber}`);
      const code = await sock.requestPairingCode(cleanNumber);
      console.log(`[${userId}] Pairing Code: ${code}`);
      
      pendingPairings.set(userId, {
        code,
        phoneNumber: cleanNumber,
        createdAt: new Date()
      });

      return { 
        success: true, 
        pairingCode: code, 
        message: 'Pairing code generated. Enter this in WhatsApp > Linked Devices' 
      };
    }

    return { success: true, message: 'Session created successfully' };

  } catch (error) {
    console.error(`[${userId}] Error creating session:`, error);
    return { success: false, message: error.message };
  }
}

/**
 * Stop a session
 */
async function stopSession(userId) {
  const session = sessions.get(userId);
  if (session) {
    try {
      if (session.sock?.ws) {
        session.sock.ws.close();
      }
      session.sock?.end();
    } catch (error) {
      console.error(`[${userId}] Error stopping session:`, error);
    }
    sessions.delete(userId);
    console.log(`[${userId}] Session stopped`);
  }
}

/**
 * Delete a session completely
 */
async function deleteSession(userId, alsoFromDB = false) {
  await stopSession(userId);
  
  const sessionPath = getSessionPath(userId);
  if (fs.existsSync(sessionPath)) {
    fs.rmSync(sessionPath, { recursive: true, force: true });
    console.log(`[${userId}] Session files deleted`);
  }
  
  if (alsoFromDB) {
    await deleteSessionFromDB(userId);
  }
}

/**
 * Get session socket
 */
function getSession(userId) {
  return sessions.get(userId);
}

/**
 * Get pending pairing info
 */
function getPendingPairing(userId) {
  return pendingPairings.get(userId);
}

/**
 * Get active session count
 */
function getActiveSessionCount() {
  return sessions.size;
}

/**
 * Logout a session
 */
async function logoutSession(userId) {
  const session = sessions.get(userId);
  if (session?.sock) {
    try {
      await session.sock.logout();
    } catch (error) {
      console.error(`[${userId}] Error logging out:`, error);
    }
  }
  await deleteSession(userId, true); // Also delete from DB
}

/**
 * Reset reconnection attempts for a user
 * Useful when manually restarting a session
 */
function resetReconnectionAttempts(userId) {
  reconnectionAttempts.delete(userId);
}

/**
 * Restart a stopped session
 * This resets reconnection attempts and starts the session again
 */
async function restartSession(userId, onMessage, onConnection) {
  // Reset reconnection attempts
  resetReconnectionAttempts(userId);
  
  // Get phone number from database if available
  let phoneNumber = null;
  try {
    const dbSession = await getSessionFromDB(userId);
    phoneNumber = dbSession?.phoneNumber || null;
  } catch (error) {
    console.error(`[${userId}] Error fetching session from database:`, error.message);
    // Continue with null phoneNumber - session can still be restarted from local files
  }
  
  // Create session (which will start or reconnect)
  return await createSession(userId, phoneNumber, onMessage, onConnection);
}

module.exports = {
  createSession,
  stopSession,
  deleteSession,
  getSession,
  getSessionInfo,
  getAllSessionsInfo,
  getAllUserIds,
  sessionExists,
  getPendingPairing,
  getActiveSessionCount,
  logoutSession,
  restoreAllSessionsFromDB,
  restoreSessionFromDB,
  backupSessionToDB,
  resetReconnectionAttempts,
  restartSession,
  sessions
};
