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
  const simpleGit = require("simple-git");
  const git = simpleGit();
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
  let platform = process.env.PWD?. includes("userland") ? "LINUX"
    : process. env. PITCHER_API_BASE_URL?.includes('codesandbox') ? 'CODESANDBOX'
    : process.env. REPLIT_USER ?  "REPLIT"
    : process.env.AWS_REGION ?  "AWS"
    : process.env.TERMUX_VERSION ? 'TERMUX'
    : process. env.DYNO ?  'HEROKU'
    : process.env. KOYEB_APP_ID ? 'KOYEB'
    : process.env. GITHUB_SERVER_URL ? 'GITHUB'
    : process.env. RENDER ?  'RENDER'
    : process. env.RAILWAY_SERVICE_NAME ? 'RAILWAY'
    : process.env.VERCEL ?  "VERCEL"
    : process.env.DIGITALOCEAN_APP_NAME ? "DIGITALOCEAN"
    : process. env.AZURE_HTTP_FUNCTIONS ?  "AZURE"
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
        deployedUrl = req.protocol + "://" + req. get("host");
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
      console. log("Connected to Server -- ", PORT);
      cron.schedule("*/10 * * * * *", pingServer);
    });
  }

  console.log("Running on platform: " + platform);

  // Create session directory if it doesn't exist
  if (!fs. existsSync('./lib/session')) {
    fs.mkdirSync("./lib/session", { recursive: true });
  }

  try {
    // Fetch and save session from Gist
    try {
      if (! config.SESSION_ID) {
        throw new Error("Session ID missing");
      }
      const sessionData = await axios.get(
        'https://gist.github.com/ESWIN-SPERKY/' + config.SESSION_ID. split(':')[1] + "/raw"
      );
      Object.keys(sessionData.data).forEach(fileName => {
        fs.writeFileSync('./lib/session/' + fileName, sessionData. data[fileName], "utf8");
      });
      console. log("Session connected and session files saved.");
      console.log("Session created successfully");
    } catch (error) {
      console.error("Error:", error. message);
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

    // Get sudo user JID
    const sudoJid = (config.SUDO !== '' 
      ? config. SUDO. split(',')[0] 
      : sock.user.id. split(':')[0]) + '@s. whatsapp.net';

    // Check for updates periodically
    const updateCheckInterval = setInterval(async () => {
      await git.fetch();
      var commits = await git.log(["main.. origin/main"]);
      let updateMessage = "*_New updates available for X-BOT-MD_*\n\n";
      
      commits.all.map((commit, index) => {
        updateMessage += '```' + (index + 1 + ".  " + commit.message + "\n") + "```";
      });

      if (commits.total > 0) {
        await sock.sendMessage(sudoJid, {
          text: updateMessage + `\n_Type '${config. HANDLERS === "false" ? '' : config.HANDLERS}update now' to update the bot._`
        });
        clearInterval(updateCheckInterval);
      }
    }, 60000); // Check every minute

    // Sync database
    try {
      await config.DATABASE. sync;
      console.log("Database synced.");
    } catch (error) {
      console.error("Error while syncing database:", error);
    }

    // Load external plugins from database
    async function loadExternalPlugins() {
      try {
        let plugins = await externalPlugins. findAll();
        plugins.map(async (plugin) => {
          if (! fs.existsSync("./plugins/" + plugin.dataValues.name + ".js")) {
            var response = await axios.get(plugin.dataValues.url);
            if (response.status == 200) {
              console.log("Installing external plugins.. .");
              fs.writeFileSync("./plugins/" + plugin.dataValues.name + ".js", response.data);
              require("./plugins/" + plugin. dataValues.name + ".js");
              console.log("External plugins loaded successfully.");
            }
          }
        });
      } catch (error) {
        console.log(error);
      }
    }

    // Connection update handler
    sock. ev.on("connection. update", async ({ connection, lastDisconnect }) => {
      if (connection === "connecting") {
        console. log("Connecting.. .");
      } else if (connection === 'open') {
        await loadExternalPlugins();
        console.log("Connected.");

        // Try to join support group
        try {
          await sock.groupAcceptInvite("I6lxNWSNneILUeqRqCa36S");
        } catch (error) {
          console.error("❌ Error while joining group or following channel:", error. message);
        }

        // Load all plugins from plugins folder
        fs.readdirSync("./plugins")
          .filter(file => path.extname(file) === '.js')
          .forEach(file => require("./plugins/" + file));

        // Build startup message
        var startupMessage = `*X BOT MD STARTED! *

_Mode: ${config.WORK_TYPE}_
_Prefix: ${config. HANDLERS}_
_Version: ${config.VERSION}_
_Menu Type: ${config. MENU_TYPE}_
_Language: ${config. LANGUAGE}_

*Extra Configurations*

\`\`\`Always online: ${config.ALWAYS_ONLINE ?  '✅' : '❌'}
Auto status view: ${config.AUTO_STATUS_VIEW ?  '✅' : '❌'}
Auto reject calls: ${config. REJECT_CALLS ? '✅' : '❌'}
Auto read messages: ${config. READ_MESSAGES ? '✅' : '❌'}
Auto call blocker: ${config. CALL_BLOCK ? '✅' : '❌'}
Auto status save: ${config. SAVE_STATUS ? '✅' : '❌'}
Auto status reply: ${config.STATUS_REPLY ? '✅' : '❌'}
Auto status reaction: ${config.STATUS_REACTION ? '✅' : '❌'}
Logs: ${config.LOGS ? '✅' : '❌'}
PM Blocker: ${config. PM_BLOCK ? '✅' : '❌'}
PM Disabler: ${config. DISABLE_PM ? '✅' : '❌'}\`\`\``;

        var ownerJid = (config.SUDO !== '' 
          ?  config.SUDO. split(',')[0] 
          : sock.user.id. split(':')[0]) + "@s.whatsapp.net";

        if (config.START_MSG) {
          return await sock.sendMessage(ownerJid, {
            text: startupMessage,
            contextInfo: {
              externalAdReply: {
                title: "X BOT MD UPDATES",
                body: "Whatsapp Channel",
                sourceUrl: 'https://whatsapp.com/channel/0029Va9ZOf36rsR1Ym7O2x00',
                mediaUrl: 'https://whatsapp. com/channel/0029Va9ZOf36rsR1Ym7O2x00',
                mediaType: 1,
                showAdAttribution: false,
                renderLargerThumbnail: true,
                thumbnailUrl: 'https://i.imgur.com/Q2UNwXR.jpg'
              }
            }
          }, { quoted: false });
        }
      } else if (connection === 'close') {
        const statusCode = new Boom(lastDisconnect?. error)?.output. statusCode;
        if (statusCode === DisconnectReason. connectionReplaced) {
          console.log("Connection replaced.  Logout current session first.");
          await sock. logout();
        } else {
          console.log('Reconnecting...');
          await delay(3000);
          Sparky();
        }
      }
    });

    // Message handler
    sock. ev.on('messages.upsert', async (messageUpdate) => {
      let message;
      try {
        message = await serialize(JSON.parse(JSON. stringify(messageUpdate. messages[0])), sock);
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
          ? message. body[0].toLowerCase() + message.body.slice(1).trim() 
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
          console. log(error);
        }
      });
    });

    // Save credentials on update
    sock.ev.on("creds.update", saveCreds);

    // Call handler
    sock.ev.on("call", async (calls) => {
      for (let call of calls) {
        await callAutomation(sock, call);
      }
    });

  } catch (error) {
    console. error("Error:", error. message);
    await delay(3000);
    Sparky();
  }
})();