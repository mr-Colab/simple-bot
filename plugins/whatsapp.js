const {
	Sparky,
	isPublic
} = require("../lib");
const config = require("../config");
const { downloadMediaMessage } = require("baileys");

// ==================== SAVE STATUS COMMAND ====================
Sparky({
	name: "save",
	fromMe: true,
	category: "whatsapp",
	desc: "Save a status by replying to it. The status will be sent to your bot number."
}, async ({ m, client }) => {
	try {
		// Check if replying to a message
		if (!m.quoted) {
			return await m.reply("_Reply to a status to save it_");
		}

		// Get bot's own JID
		const botJid = client.user.id.split(':')[0] + '@s.whatsapp.net';
		
		// Get the quoted message type
		const quotedMsg = m.quoted;
		const mtype = quotedMsg.mtype;
		
		// Download the media
		let buffer;
		try {
			buffer = await quotedMsg.downloadM();
		} catch (e) {
			// Try alternative download method
			buffer = await downloadMediaMessage(
				{ key: quotedMsg.key, message: quotedMsg.message },
				'buffer',
				{},
				{ 
					logger: console,
					reuploadRequest: client.updateMediaMessage 
				}
			);
		}

		if (!buffer) {
			return await m.reply("_Failed to download status media_");
		}

		// Get sender info
		const sender = quotedMsg.key?.participant || quotedMsg.key?.remoteJid || "Unknown";
		const senderName = sender.split('@')[0];
		const caption = quotedMsg.text || quotedMsg.caption || "";
		const statusCaption = `📥 *Status Saved*\n\n👤 *From:* @${senderName}\n${caption ? `📝 *Caption:* ${caption}` : ""}`;

		// Determine media type and send accordingly
		if (mtype === 'imageMessage' || (Array.isArray(mtype) && mtype.includes('imageMessage'))) {
			await client.sendMessage(botJid, {
				image: buffer,
				caption: statusCaption,
				mentions: [sender]
			});
		} else if (mtype === 'videoMessage' || (Array.isArray(mtype) && mtype.includes('videoMessage'))) {
			await client.sendMessage(botJid, {
				video: buffer,
				caption: statusCaption,
				mentions: [sender]
			});
		} else if (mtype === 'audioMessage' || (Array.isArray(mtype) && mtype.includes('audioMessage'))) {
			await client.sendMessage(botJid, {
				audio: buffer,
				mimetype: 'audio/mp4',
				ptt: false
			});
			await client.sendMessage(botJid, {
				text: statusCaption,
				mentions: [sender]
			});
		} else {
			// Try sending as document for other types
			await client.sendMessage(botJid, {
				document: buffer,
				mimetype: 'application/octet-stream',
				fileName: `status_${Date.now()}`,
				caption: statusCaption,
				mentions: [sender]
			});
		}

		await m.reply("_✅ Status saved and sent to your chat_");

	} catch (error) {
		console.error("Save status error:", error);
		await m.reply("_❌ Failed to save status: " + error.message + "_");
	}
});

Sparky({
    name: "online",
    fromMe: true,
    category: "whatsapp",
    desc: "Changes the user's online privacy settings. Use *all* to allow all users or *match_last_seen* to only allow those who match your last seen."
}, async ({ m, args, client }) => {
    if (!args) return await m.reply(`_*Example:-* online all_\n_to change *online* privacy settings_`);
    const available_privacy = ['all', 'match_last_seen'];
    if (!available_privacy.includes(args)) return await m.reply(`_action must be *${available_privacy.join('/')}* values_`);
    await client.updateOnlinePrivacy(args)
    await m.reply(`_Privacy Updated to *${args}*_`);
});

Sparky({
    name: "lastseen",
    fromMe: true,
    category: "whatsapp",
    desc: "Changes the user's last seen privacy settings. Options include *all*, *contacts*, *contact_blacklist*, or *none*."
}, async ({ m, args, client }) => {
    if (!args) return await m.reply(`_*Example:-* lastseen all_\n_to change last seen privacy settings_`);
    const available_privacy = ['all', 'contacts', 'contact_blacklist', 'none'];
    if (!available_privacy.includes(args)) return await m.reply(`_action must be *${available_privacy.join('/')}* values_`);
    await client.updateLastSeenPrivacy(args)
    await m.reply(`_Privacy settings *last seen* Updated to *${args}*_`);
});

Sparky({
    name: "profile",
    fromMe: true,
    category: "whatsapp",
    desc: "Changes the user's profile picture privacy settings. Options include *all*, *contacts*, *contact_blacklist*, or *none*."
}, async ({ m, args, client }) => {
    if (!args) return await m.reply(`_*Example:-* profile all_\n_to change *profile picture* privacy settings_`);
    const available_privacy = ['all', 'contacts', 'contact_blacklist', 'none'];
    if (!available_privacy.includes(args)) return await m.reply(`_action must be *${available_privacy.join('/')}* values_`);
    await client.updateProfilePicturePrivacy(args)
    await m.reply(`_Privacy Updated to *${args}*_`);
});

Sparky({
    name: "status",
    fromMe: true,
    category: "whatsapp",
    desc: "Changes the user's status privacy settings. Options include *all*, *contacts*, *contact_blacklist*, or *none*."
}, async ({ m, args, client }) => {
    if (!args) return await m.reply(`_*Example:-* status all_\n_to change *status* privacy settings_`);
    const available_privacy = ['all', 'contacts', 'contact_blacklist', 'none'];
    if (!available_privacy.includes(args)) return await m.reply(`_action must be *${available_privacy.join('/')}* values_`);
    await client.updateStatusPrivacy(args)
    await m.reply(`_Privacy Updated to *${args}*_`);
});

Sparky({
    name: "readreceipt",
    fromMe: true,
    category: "whatsapp",
    desc: "Changes the user's read receipt privacy settings. Options are *all* or *none*."
}, async ({ m, args, client }) => {
    if (!args) return await m.reply(`_*Example:-* readreceipt all_\n_to change *read and receipts message* privacy settings_`);
    const available_privacy = ['all', 'none'];
    if (!available_privacy.includes(args)) return await m.reply(`_action must be *${available_privacy.join('/')}* values_`);
    await client.updateReadReceiptsPrivacy(args)
    await m.reply(`_Privacy Updated to *${args}*_`);
});

Sparky({
    name: "groupadd",
    fromMe: true,
    category: "whatsapp",
    desc: "Changes the user's group addition privacy settings. Options include *all*, *contacts*, *contact_blacklist*, or *none*."
}, async ({ m, args, client }) => {
    if (!args) return await m.reply(`_*Example:-* groupadd all_\n_to change *group add* privacy settings_`);
    const available_privacy = ['all', 'contacts', 'contact_blacklist', 'none'];
    if (!available_privacy.includes(args)) return await m.reply(`_action must be *${available_privacy.join('/')}* values_`);
    await client.updateGroupsAddPrivacy(args)
    await m.reply(`_Privacy Updated to *${args}*_`);
});

Sparky({
    name: "getprivacy",
    fromMe: true,
    category: "whatsapp",
    desc: "Fetches and displays the privacy settings of the user, including online status, profile, last seen, read receipts, and more."
}, async ({ m, args, client }) => {
    const { readreceipts, profile, status, online, last, groupadd, calladd } = await client.fetchPrivacySettings(true);
    const msg = `Privacy Information:
---------------------
Name                 : ${client.user.name}
Online Status        : ${online}
Profile              : ${profile}
Last Seen            : ${last}
Read Receipts        : ${readreceipts}
Status Privacy       : ${status}
Group Addition       : ${groupadd}
Call Addition        : ${calladd}
`
    let img;
    try {
        img = {
            url: await client.profilePictureUrl(m.jid, 'image')
        };
    } catch (e) {
        img = {
            url: "https://i.ibb.co/sFjZh7S/6883ac4d6a92.jpg"
        };
    }
    await client.sendMessage(m.jid, {
        image: img,
        caption: msg
    })
});

Sparky({
    name: "dlt",
    fromMe: true,
    desc: "Deletes the replied message from the chat.",
    category: "whatsapp",
}, async ({ client, m }) => {
    try {
        if(!m.quoted) return m.reply("Reply to a message to delete it.");
        await client.sendMessage(m.jid, {
            delete: {
                remoteJid: m.jid,
                fromMe: false,
                id: m.quoted.key.id,
                participant: m.quoted.key.participant || m.quoted.key.remoteJid
            }
        });
        await client.sendMessage(m.jid, {
            delete: {
                remoteJid: m.jid,
                fromMe: true,
                id: m.quoted.key.id
            }
        });
        await client.sendMessage(m.jid, {
            delete: {
                remoteJid: m.jid,
                fromMe: true,
                id: m.key.id
            }
        });
    } catch (e) {}
});
// ==================== NEWSLETTER/CHANNEL INFO COMMAND ====================
Sparky({
    name: "newsletter|channelid|channelinfo",
    fromMe: isPublic,
    category: "whatsapp",
    desc: "Get WhatsApp Channel information from link"
}, async ({ client, m, args }) => {
    try {
        await m.react('⏳');

        const url = args || m.quoted?.text;
        
        if (!url) {
            return await m.reply('❎ *Please provide a WhatsApp Channel link.*\n\n*Example:* .newsletter https://whatsapp.com/channel/123456789');
        }

        // Extract channel invite ID from URL
        const match = url.match(/whatsapp\.com\/channel\/([\w-]+)/);
        
        if (!match) {
            return await m.reply('⚠️ *Invalid channel link format.*\n\nMake sure it looks like:\nhttps://whatsapp.com/channel/xxxxxxxxx');
        }

        const inviteId = match[1];
        let metadata;

        try {
            metadata = await client.newsletterMetadata("invite", inviteId);
        } catch (e) {
            console.error('Newsletter metadata error:', e);
            return await m.reply('❌ Failed to fetch channel metadata. Make sure the link is correct and accessible.');
        }

        if (!metadata || !metadata.id) {
            return await m.reply('❌ Channel not found or inaccessible.');
        }

        // Format channel information
        const infoText = `\`📡 Channel Info\`\n\n` +
            `🛠️ *ID:* ${metadata.id}\n` +
            `📌 *Name:* ${metadata.name || 'N/A'}\n` +
            `👥 *Followers:* ${metadata.subscribers?.toLocaleString() || 'N/A'}\n` +
            `📅 *Created:* ${metadata.creation_time ? new Date(metadata.creation_time * 1000).toLocaleString() : 'Unknown'}\n` +
            `📝 *Description:* ${metadata.description || 'No description'}`;

        // Send with preview image if available
        if (metadata.preview) {
            await client.sendMessage(m.jid, {
                image: { url: `https://pps.whatsapp.net${metadata.preview}` },
                caption: infoText
            }, { quoted: m });
        } else {
            await m.reply(infoText);
        }

        await m.react('✅');

    } catch (error) {
        console.error('Newsletter command error:', error);
        await m.react('❌');
        await m.reply('⚠️ An unexpected error occurred while fetching channel info.');
    }
});
