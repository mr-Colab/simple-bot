/**
 * X-BOT-MD Multi-User Mode
 * Allows multiple users to run their own WhatsApp bot instances
 * 
 * Usage: node multi.js
 * Then open http://localhost:8000 in your browser
 */

const express = require("express");
const http = require("http");
const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const config = require("./config");
const sessionManager = require("./lib/sessionManager");
const { setupDashboard, handleMessage, handleConnection } = require("./lib/dashboard");

const app = express();
const PORT = process.env.PORT || 8000;

// Detect platform
let platform = process.env.REPLIT_USER ? "REPLIT"
  : process.env.DYNO ? 'HEROKU'
  : process.env.KOYEB_APP_ID ? 'KOYEB'
  : process.env.RENDER ? 'RENDER'
  : process.env.RAILWAY_SERVICE_NAME ? 'RAILWAY'
  : 'VPS';

console.log("╔════════════════════════════════════════╗");
console.log("║     X-BOT-MD MULTI-USER MODE          ║");
console.log("╠════════════════════════════════════════╣");
console.log("║  Running on platform:", platform.padEnd(17), "║");
console.log("║  Port:", String(PORT).padEnd(30), "║");
console.log("╚════════════════════════════════════════╝");

// Setup dashboard
setupDashboard(app);

// Keep-alive for cloud platforms
let deployedUrl = '';

if (platform === "KOYEB" || platform === "RENDER" || platform === "HEROKU") {
  async function pingServer() {
    if (!deployedUrl) return;
    try {
      await axios.get(deployedUrl);
      console.log(`✅ Keep-alive ping to ${deployedUrl}`);
    } catch (error) {
      console.error(`❌ Keep-alive error:`, error.message);
    }
  }

  app.use((req, res, next) => {
    if (!deployedUrl && req.get('host')) {
      deployedUrl = req.protocol + "://" + req.get("host");
      console.log("📍 Detected URL:", deployedUrl);
    }
    next();
  });

  cron.schedule("*/5 * * * *", pingServer);
}

// Load plugins once at startup
function loadPlugins() {
  const pluginsPath = path.join(__dirname, 'plugins');
  
  if (!fs.existsSync(pluginsPath)) {
    console.log("⚠️ Plugins folder not found");
    return;
  }

  const pluginFiles = fs.readdirSync(pluginsPath)
    .filter(file => path.extname(file) === '.js');

  console.log(`\n📦 Loading ${pluginFiles.length} plugin(s)...`);

  let loaded = 0;
  pluginFiles.forEach(file => {
    try {
      require(path.join(pluginsPath, file));
      loaded++;
    } catch (error) {
      console.error(`❌ Failed to load ${file}:`, error.message);
    }
  });

  console.log(`✅ Loaded ${loaded}/${pluginFiles.length} plugins\n`);
}

// Auto-start existing sessions from database
async function autoStartSessions() {
  // First try to restore from database (includes batch processing)
  console.log("\n🔍 Checking for sessions in database...");
  
  const dbResult = await sessionManager.restoreAllSessionsFromDB(handleMessage, handleConnection);
  
  if (dbResult.total > 0) {
    console.log(`📊 Database restore: ${dbResult.restored}/${dbResult.total} sessions restored`);
    return;
  }
  
  // Fallback: Check local files if no DB sessions
  const existingUsers = await sessionManager.getAllUserIds();
  
  if (existingUsers.length === 0) {
    console.log("📋 No existing sessions found. Create one via the dashboard.");
    return;
  }

  console.log(`\n🔄 Auto-starting ${existingUsers.length} existing session(s) from files...`);

  // Process in batches of 5
  const BATCH_SIZE = 5;
  for (let i = 0; i < existingUsers.length; i += BATCH_SIZE) {
    const batch = existingUsers.slice(i, i + BATCH_SIZE);
    
    const promises = batch.map(async (userId) => {
      try {
        console.log(`  ➤ Starting session: ${userId}`);
        await sessionManager.createSession(userId, null, handleMessage, handleConnection);
      } catch (error) {
        console.error(`  ❌ Failed to start ${userId}:`, error.message);
      }
    });
    
    await Promise.all(promises);
    
    // Delay between batches
    if (i + BATCH_SIZE < existingUsers.length) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  console.log("✅ Auto-start complete\n");
}

// Sync database
async function syncDatabase() {
  try {
    await config.DATABASE.sync();
    console.log("✅ Database synced");
  } catch (error) {
    console.error("❌ Database sync error:", error.message);
  }
}

// Start server
const server = http.createServer(app);

server.listen(PORT, async () => {
  console.log(`\n🌐 Dashboard running at http://localhost:${PORT}`);
  console.log("   Open this URL in your browser to manage bot instances\n");

  // Initialize
  await syncDatabase();
  loadPlugins();
  await autoStartSessions();

  console.log("═".repeat(50));
  console.log("🚀 X-BOT-MD Multi-User is ready!");
  console.log("═".repeat(50));
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log("\n🛑 Shutting down...");
  
  const users = sessionManager.getAllUserIds();
  for (const userId of users) {
    await sessionManager.stopSession(userId);
  }
  
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error("Uncaught Exception:", error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
