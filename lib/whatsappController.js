const config = require("../config");

/**
 * Handle WhatsApp automation features (status viewing, reactions, replies)
 * @param {Object} client - The WhatsApp client instance
 * @param {Object} message - The serialized message object
 * @param {Object} messageUpdate - The raw message update from Baileys
 */
async function whatsappAutomation(client, message, messageUpdate) {
  // Logging placeholders (empty blocks - original code had no implementation)
  if (config.LOGS && messageUpdate.type === "notify" && 
      !message?. sender?.includes(client?. user?.id?.split(':')[0])) {
    // Log notify messages from others (not implemented)
  } else if (config.LOGS && messageUpdate.type !== "notify" && 
             !message?.sender?.includes(client?. user?.id?.split(':')[0])) {
    // Log non-notify messages from others (not implemented)
  }

  // Auto Status View Feature
  if (config.AUTO_STATUS_VIEW && 
      message.key && 
      message.key. remoteJid === 'status@broadcast' && 
      message.key.participant) {
    
    console.log('📱 Status detected from:', message.key.participant);
    
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

module.exports = {
  whatsappAutomation,
  callAutomation
};