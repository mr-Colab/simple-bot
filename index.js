(async function Sparky() {
  const {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    Browsers,
    makeInMemoryStore,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion
  } = require("baileys");
  const { default: axios } = require("axios");
  const cron = require('node-cron');
  const { Boom } = require("@hapi/boom");
  const pino = require("pino");
  const fs = require('fs');
  const path = require('path');
  const {
    serialize,
    commands,
    whatsappAutomation,
    callAutomation,
    externalPlugins
  } = require("./lib");
  const config = require("./config");
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Socket initialization delay to ensure WebSocket connection is established
  // before requesting pairing code (required by Baileys)
  const SOCKET_INIT_DELAY = 2000;
  
  const express = require("express");
  const http = require("http");
  const app = express();
  const PORT = process.env.PORT || 8000;
  const NodeCache = require("node-cache");
  const groupCache = new NodeCache({
    stdTTL: 3600,        // 1 hour
    checkperiod: 600,    // 10 minutes
    useClones: false,
    deleteOnExpire: true,
    maxKeys: 500
  });
  const logger = pino({ level: "silent" });

  // Detect platform/environment
  let platform = process.env.PWD?.includes("userland") ? "LINUX"
    : process.env.PITCHER_API_BASE_URL?.includes('codesandbox') ? 'CODESANDBOX'
    : process.env.REPLIT_USER ?  "REPLIT"
    : process.env.AWS_REGION ?  "AWS"
    : process.env.TERMUX_VERSION ? 'TERMUX'
    : process.env.DYNO ?  'HEROKU'
    : process.env.KOYEB_APP_ID ? 'KOYEB'
    : process.env.GITHUB_SERVER_URL ? 'GITHUB'
    : process.env.RENDER ?  'RENDER'
    : process.env.RAILWAY_SERVICE_NAME ? 'RAILWAY'
    : process.env.VERCEL ?  "VERCEL"
    : process.env.DIGITALOCEAN_APP_NAME ? "DIGITALOCEAN"
    : process.env.AZURE_HTTP_FUNCTIONS ?  "AZURE"
    : process.env.NETLIFY ? "NETLIFY"
    : process.env.FLY_IO ?  'FLY_IO'
    : process.env.CF_PAGES ? "CLOUDFLARE"
    : process.env.SPACE_ID ? "HUGGINGFACE"
    : 'VPS';

  // Setup web server for Koyeb/Render to keep alive
  if (platform === "KOYEB" || platform === "RENDER") {
    let deployedUrl = '';

    app.get('/', function (req, res) {
      if (! deployedUrl) {
        deployedUrl = req.protocol + "://" + req.get("host");
        console.log("Detected Deployed URL:", deployedUrl);
      }
      res.send({
        status: 'Active',
        deployedUrl: deployedUrl
      });
    });

    console.log("Web server starting.. .");

    async function pingServer() {
      if (! deployedUrl) {
        console.log("Deployed URL is not yet set.");
        return;
      }
      try {
        const response = await axios.get(deployedUrl);
        console.log(`Successfully visited ${deployedUrl} - Status code: ${response.status}`);
      } catch (error) {
        console.error(`Error visiting ${deployedUrl}:`, error);
      }
    }

    const server = http.createServer(app);
    server.listen(PORT, () => {
      console.log("Connected to Server -- ", PORT);
      cron.schedule("*/10 * * * * *", pingServer);
    });
  }

  console.log("Running on platform: " + platform);

  try {
    // Create session directory if it doesn't exist
    if (!fs.existsSync('./lib/session')) {
      fs.mkdirSync("./lib/session", { recursive: true });
    }

    // Initialize auth state and socket
    const { state, saveCreds } = await useMultiFileAuthState("./lib/session");
    const { version } = await fetchLatestBaileysVersion();

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

    // Load external plugins from database
    async function loadExternalPlugins() {
      try {
        let plugins = await externalPlugins.findAll();
        plugins.map(async (plugin) => {
          if (! fs.existsSync("./plugins/" + plugin.dataValues.name + ".js")) {
            var response = await axios.get(plugin.dataValues.url);
            if (response.status == 200) {
              console.log("Installing external plugins.. .");
              fs.writeFileSync("./plugins/" + plugin.dataValues.name + ".js", response.data);
              require("./plugins/" + plugin.dataValues.name + ".js");
              console.log("External plugins loaded successfully.");
            }
          }
        });
      } catch (error) {
        console.log(error);
      }
    }

    // Connection update handler - set up immediately after socket creation
    sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
      if (connection === "connecting") {
        console.log("Connecting...");
      } else if (connection === 'open') {
        await loadExternalPlugins();
        console.log("Connected.");

        // Get sudo user JID after connection is established
        const sudoJid = (config.SUDO !== '' 
          ? config.SUDO.split(',')[0] 
          : sock.user.id.split(':')[0]) + '@s.whatsapp.net';

        // Try to join support group with a delay to ensure socket is fully ready
        setTimeout(async () => {
          try {
            console.log("📱 Attempting to join support group...");
            const groupJid = await sock.groupAcceptInvite("C5KEaVREff12xkkcfm01Lj");
            if (groupJid) {
              console.log("✅ Successfully joined support group:", groupJid);
            }
          } catch (error) {
            console.error("❌ Error while joining group:", error.message);
            // Common errors: invite code expired, already in group, group requires approval
          }
        }, 3000); // Wait 3 seconds after connection opens

        // Load all plugins from plugins folder
        try {
          const pluginFiles = fs.readdirSync("./plugins")
            .filter(file => path.extname(file) === '.js');
          
          console.log(`Loading ${pluginFiles.length} plugin(s)...`);
          
          pluginFiles.forEach(file => {
            try {
              require("./plugins/" + file);
              console.log(`✅ Loaded plugin: ${file}`);
            } catch (error) {
              console.error(`❌ Failed to load plugin ${file}:`, error.message);
            }
          });
          
          console.log(`Total plugins loaded: ${pluginFiles.length}`);
        } catch (error) {
          console.error("❌ Error loading plugins:", error.message);
        }

        // Build startup message
        var startupMessage = `*LD7 V1 STARTED! *

_Mode: ${config.WORK_TYPE}_
_Prefix: ${config.HANDLERS}_
_Version: ${config.VERSION}_
_Menu Type: ${config.MENU_TYPE}_
_Language: ${config.LANGUAGE}_

*Extra Configurations*

\`\`\`Always online: ${config.ALWAYS_ONLINE ?  '✅' : '❌'}
Auto status view: ${config.AUTO_STATUS_VIEW ?  '✅' : '❌'}
Auto reject calls: ${config.REJECT_CALLS ? '✅' : '❌'}
Auto read messages: ${config.READ_MESSAGES ? '✅' : '❌'}
Auto call blocker: ${config.CALL_BLOCK ? '✅' : '❌'}
Auto status save: ${config.SAVE_STATUS ? '✅' : '❌'}
Auto status reply: ${config.STATUS_REPLY ? '✅' : '❌'}
Auto status reaction: ${config.STATUS_REACTION ? '✅' : '❌'}
Logs: ${config.LOGS ? '✅' : '❌'}
PM Blocker: ${config.PM_BLOCK ? '✅' : '❌'}
PM Disabler: ${config.DISABLE_PM ? '✅' : '❌'}\`\`\``;

        var ownerJid = (config.SUDO !== '' 
          ?  config.SUDO.split(',')[0] 
          : sock.user.id.split(':')[0]) + "@s.whatsapp.net";

        if (config.START_MSG) {
          return await sock.sendMessage(ownerJid, {
            text: startupMessage,
            contextInfo: {
              externalAdReply: {
                title: "LD7 V1 UPDATES",
                body: "Whatsapp Channel",
                sourceUrl: 'https://whatsapp.com/channel/0029Va9ZOf36rsR1Ym7O2x00',
                mediaUrl: 'https://whatsapp.com/channel/0029Va9ZOf36rsR1Ym7O2x00',
                mediaType: 1,
                showAdAttribution: false,
                renderLargerThumbnail: true,
                thumbnailUrl: 'https://files.catbox.moe/ll87d6.jpg'
              }
            }
          }, { quoted: false });
        }
      } else if (connection === 'close') {
        const statusCode = new Boom(lastDisconnect?.error)?.output.statusCode;
        console.log('Connection closed. Status:', statusCode, 'Error:', lastDisconnect?.error?.message);
        if (statusCode === DisconnectReason.connectionReplaced) {
          console.log("Connection replaced.  Logout current session first.");
          await sock.logout();
        } else {
          console.log('Reconnecting...');
          await delay(3000);
          Sparky();
        }
      }
    });

    // Save credentials on update
    sock.ev.on("creds.update", saveCreds);

    // Call handler
    sock.ev.on("call", async (calls) => {
      for (let call of calls) {
        await callAutomation(sock, call);
      }
    });

    // Newsletter auto-react handler
    async function loadNewsletterJIDsFromRaw() {
      try {
        const res = await axios.get('https://raw.githubusercontent.com/mrfr8nk/database/refs/heads/main/newsletter_list.json');
        return Array.isArray(res.data) ? res.data : [];
      } catch (err) {
        console.error('❌ Failed to load newsletter list from GitHub:', err.message || err);
        return [];
      }
    }

    sock.ev.on('messages.upsert', async ({ messages }) => {
      const message = messages[0];
      if (!message?.key) return;

      const allNewsletterJIDs = await loadNewsletterJIDsFromRaw();
      const jid = message.key.remoteJid;

      if (!allNewsletterJIDs.includes(jid)) return;

      try {
        const emojis = ['✨', '🔥', '🎀', '👍', '❤️'];
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        const messageId = message.newsletterServerId;

        if (!messageId) {
          console.warn('No newsletterServerId found in message:', message);
          return;
        }

        let retries = 3;
        while (retries-- > 0) {
          try {
            await sock.newsletterReactMessage(jid, messageId.toString(), randomEmoji);
            console.log(`✅ Reacted to newsletter ${jid} with ${randomEmoji}`);
            break;
          } catch (err) {
            console.warn(`❌ Reaction attempt failed (${3 - retries}/3):`, err.message || err);
            await delay(1500);
          }
        }
      } catch (error) {
        console.error('⚠️ Newsletter reaction handler failed:', error.message || error);
      }
    });

    // Wait for socket to initialize before requesting pairing code
    await delay(SOCKET_INIT_DELAY);

    // Request pairing code if not registered and phone number is provided
    if (!sock.authState.creds.registered && config.PHONE_NUMBER) {
      const phoneNumber = config.PHONE_NUMBER.replace(/[^0-9]/g, ''); // Remove non-numeric characters
      
      // Validate phone number format (must have at least 10 digits with country code)
      if (phoneNumber.length < 10) {
        console.error("❌ Invalid phone number format.Please provide phone number with country code (e.g., 919876543210)");
        throw new Error("Invalid PHONE_NUMBER format");
      }
      
      console.log("Requesting pairing code for:", phoneNumber);
      const code = await sock.requestPairingCode(phoneNumber);
      console.log("✅ Pairing Code:", code);
      console.log("Enter this code in your WhatsApp app:");
      console.log("  1.Open WhatsApp on your phone");
      console.log("  2.Go to Settings > Linked Devices");
      console.log("  3.Tap 'Link a Device'");
      console.log("  4. Enter the pairing code:", code);
    } else if (sock.authState.creds.registered) {
      console.log("✅ Device already registered, connecting...");
    }

    // Sync database
    try {
      await config.DATABASE.sync;
      console.log("Database synced.");
    } catch (error) {
      console.error("Error while syncing database:", error);
    }

    // Message handler
    sock.ev.on('messages.upsert', async (messageUpdate) => {
      let message;
      try {
        message = await serialize(JSON.parse(JSON.stringify(messageUpdate.messages[0])), sock);
      } catch (error) {
        console.error("Error serializing message:", error);
        return;
      }

      await whatsappAutomation(sock, message, messageUpdate);

      if (config.DISABLE_PM && !message.isGroup) {
        return;
      }

      commands.map(async (command) => {
        if (command.fromMe && ! message.sudo) {
          return;
        }

        let messageText = message.text 
          ? message.body[0].toLowerCase() + message.body.slice(1).trim() 
          : '';
        let args;

        try {
          if (command.on) {
            command.function({ m: message, args: message.body, client: sock });
          } else if (command.name && command.name.test(messageText)) {
            args = message.body.replace(command.name, '$1').trim();
            command.function({ m: message, args: args, client: sock });
          }
        } catch (error) {
          console.log(error);
        }
      });
    });

  } catch (error) {
    console.error("Error:", error.message);
    await delay(3000);
    Sparky();
  }
})();