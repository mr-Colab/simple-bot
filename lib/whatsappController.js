const config = require("../config");
const { downloadMediaMessage } = require("baileys");

// Store recent statuses for sending when requested
// Key: status message ID, Value: { message, timestamp }
const recentStatuses = new Map();
const STATUS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Clean up old statuses periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of recentStatuses.entries()) {
    if (now - value.timestamp > STATUS_CACHE_TTL) {
      recentStatuses.delete(key);
    }
  }
}, 60 * 60 * 1000); // Clean every hour

/**
 * Handle WhatsApp automation features (status viewing, reactions, replies)
 * @param {Object} client - The WhatsApp client instance
 * @param {Object} message - The serialized message object
 * @param {Object} messageUpdate - The raw message update from Baileys
 */
async function whatsappAutomation(client, message, messageUpdate) {
  const botNumber = client?.user?.id?.split(':')[0];
  
  // Logging placeholders (empty blocks - original code had no implementation)
  if (config.LOGS && messageUpdate.type === "notify" && 
      !message?. sender?.includes(botNumber)) {
    // Log notify messages from others (not implemented)
  } else if (config.LOGS && messageUpdate.type !== "notify" && 
             !message?.sender?.includes(botNumber)) {
    // Log non-notify messages from others (not implemented)
  }

  // ==================== STATUS SEND REQUEST HANDLER ====================
  // When someone replies to your status with "send" or "snd", send them the status
  await handleStatusSendRequest(client, message, messageUpdate);

  // ==================== CACHE YOUR OWN STATUSES ====================
  // Cache your own posted statuses so they can be sent when requested
  if (message.key && 
      message.key.remoteJid === 'status@broadcast' && 
      message.key.fromMe) {
    
    const statusKey = message.key.id;
    console.log('📤 Your status detected, caching with key:', statusKey);
    recentStatuses.set(statusKey, {
      message: messageUpdate.messages[0],
      participant: client.user.id,
      timestamp: Date.now(),
      isOwn: true
    });
    console.log('💾 Your status cached successfully');
  }

  // Auto Status View Feature
  if (config.AUTO_STATUS_VIEW && 
      message.key && 
      message.key. remoteJid === 'status@broadcast' && 
      message.key.participant) {
    
    console.log('📱 Status detected from:', message.key.participant);
    
    // Cache the status for later sending (also cache other's statuses in case needed)
    const statusKey = message.key.id;
    if (!recentStatuses.has(statusKey)) {
      recentStatuses.set(statusKey, {
        message: messageUpdate.messages[0],
        participant: message.key.participant,
        timestamp: Date.now()
      });
      console.log('💾 Status cached with key:', statusKey);
    }
    
    // Mark status as viewed
    try {
      await client.readMessages([message.key]);
      console.log('✅ Status viewed successfully');
    } catch (error) {
      console.log('❌ Failed to view status:', error.message);
    }

    // Auto React to Status
    if (config.STATUS_REACTION) {
      const emojiList = config.STATUS_REACTION_EMOJI.split(',');
      const randomEmoji = emojiList[Math.floor(Math.random() * emojiList.length)];
      
      console.log('🎭 Attempting to react with:', randomEmoji);
      
      try {
        await client.sendMessage("status@broadcast", {
          react: {
            key: message.key,
            text: randomEmoji
          }
        }, {
          statusJidList: [message.key.participant, client.user.id].filter(Boolean)
        });
        console.log('✅ Reacted to status successfully');
      } catch (error) {
        console.log('❌ Failed to react to status:', error.message);
      }
    }

    // Auto Reply to Status
    if (config.STATUS_REPLY) {
      console.log('💬 Attempting to reply to status');
      try {
        await client.sendMessage(message.key.participant, {
          text: config.STATUS_REPLY_MSG
        }, {
          quoted: message
        });
        console.log('✅ Replied to status successfully');
      } catch (error) {
        console.log('❌ Failed to reply to status:', error.message);
      }
    }
  }
}

/**
 * Handle incoming call automation (reject/block calls)
 * @param {Object} client - The WhatsApp client instance
 * @param {Object} call - The call object from Baileys
 */
async function callAutomation(client, call) {
  const callerNumber = call.from. split('@')[0];
  const isSudoUser = config.SUDO. includes(callerNumber);

  // Auto Reject Calls (without blocking)
  if (config.REJECT_CALL && call.status === "offer" && !isSudoUser) {
    await client. rejectCall(call.id, call. from);
    return await client.sendMessage(call.from, {
      text: config.REJECT_CALL_MSG
    });
  }

  // Auto Block Callers (reject + block)
  if (config.CALL_BLOCK && call.status === "offer" && !isSudoUser) {
    await client. rejectCall(call.id, call. from);
    await client.sendMessage(call.from, {
      text: config.CALL_BLOCK_MSG
    });
    return await client.updateBlockStatus(call. from, "block");
  }
}

/**
 * Handle status send requests - when someone replies "send" or "snd" to your status
 * @param {Object} client - The WhatsApp client instance
 * @param {Object} message - The serialized message object
 * @param {Object} messageUpdate - The raw message update from Baileys
 */
async function handleStatusSendRequest(client, message, messageUpdate) {
  try {
    const botNumber = client?.user?.id?.split(':')[0];
    const rawMessage = messageUpdate.messages[0];
    
    // Check if this is a private message (not from status broadcast)
    if (message.key?.remoteJid === 'status@broadcast') {
      return; // This is a status, not a reply to status
    }
    
    // Check if message is from a private chat (not group)
    if (message.isGroup) {
      return;
    }
    
    // Get the message text
    const msgText = (message.text || message.body || '').toLowerCase().trim();
    
    // Check if message is "send" or "snd"
    if (msgText !== 'send' && msgText !== 'snd') {
      return;
    }
    
    // Check if this is a reply to a status (quoted message from status@broadcast)
    const contextInfo = rawMessage?.message?.extendedTextMessage?.contextInfo ||
                        rawMessage?.message?.conversation?.contextInfo ||
                        null;
    
    if (!contextInfo?.stanzaId || !contextInfo?.participant) {
      // Not a reply, or missing context - just ignore silently
      return;
    }
    
    // Check if the quoted message is from the bot's own status
    const quotedParticipant = contextInfo.participant;
    if (!quotedParticipant?.includes(botNumber)) {
      return; // Not replying to our status
    }
    
    console.log('📩 Status send request detected from:', message.sender);
    console.log('📎 Quoted status ID:', contextInfo.stanzaId);
    
    // Get the cached status
    const statusKey = contextInfo.stanzaId;
    const cachedStatus = recentStatuses.get(statusKey);
    
    if (!cachedStatus) {
      console.log('❌ Status not found in cache');
      await client.sendMessage(message.sender, {
        text: '_❌ Sorry, this status is no longer available or has expired._'
      });
      return;
    }
    
    const statusMessage = cachedStatus.message;
    const statusMsg = statusMessage?.message;
    
    // Determine the type of status and send accordingly
    let buffer = null;
    let mtype = null;
    
    // Check for different media types
    if (statusMsg?.imageMessage) {
      mtype = 'image';
      buffer = await downloadMediaMessage(statusMessage, 'buffer', {}, {
        logger: console,
        reuploadRequest: client.updateMediaMessage
      });
    } else if (statusMsg?.videoMessage) {
      mtype = 'video';
      buffer = await downloadMediaMessage(statusMessage, 'buffer', {}, {
        logger: console,
        reuploadRequest: client.updateMediaMessage
      });
    } else if (statusMsg?.audioMessage) {
      mtype = 'audio';
      buffer = await downloadMediaMessage(statusMessage, 'buffer', {}, {
        logger: console,
        reuploadRequest: client.updateMediaMessage
      });
    } else if (statusMsg?.extendedTextMessage?.text) {
      mtype = 'text';
    } else if (statusMsg?.conversation) {
      mtype = 'text';
    }
    
    // Get caption if available
    const caption = statusMsg?.imageMessage?.caption || 
                   statusMsg?.videoMessage?.caption || 
                   statusMsg?.extendedTextMessage?.text ||
                   statusMsg?.conversation ||
                   '';
    
    const senderName = message.sender.split('@')[0];
    
    // Send the status to the requester
    if (mtype === 'image' && buffer) {
      await client.sendMessage(message.sender, {
        image: buffer,
        caption: caption || '📥 *Here is the status you requested*'
      });
      console.log('✅ Image status sent to:', senderName);
    } else if (mtype === 'video' && buffer) {
      await client.sendMessage(message.sender, {
        video: buffer,
        caption: caption || '📥 *Here is the status you requested*'
      });
      console.log('✅ Video status sent to:', senderName);
    } else if (mtype === 'audio' && buffer) {
      await client.sendMessage(message.sender, {
        audio: buffer,
        mimetype: 'audio/mp4',
        ptt: false
      });
      console.log('✅ Audio status sent to:', senderName);
    } else if (mtype === 'text') {
      await client.sendMessage(message.sender, {
        text: `📥 *Status:*\n\n${caption}`
      });
      console.log('✅ Text status sent to:', senderName);
    } else {
      await client.sendMessage(message.sender, {
        text: '_❌ Unable to send this status type._'
      });
      console.log('❌ Unknown status type');
    }
    
    // Optional: Send confirmation that status was sent
    // await client.sendMessage(message.sender, { text: '_✅ Status sent!_' });
    
  } catch (error) {
    console.error('❌ Error handling status send request:', error.message);
  }
}

module.exports = {
  whatsappAutomation,
  callAutomation,
  recentStatuses
};