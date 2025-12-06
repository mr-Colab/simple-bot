const {delay} = require('baileys');
const {Sparky, isPublic, setData, getData} = require('../lib');
const {getString} = require('./pluginsCore');
const lang = getString('group');

// Store antilink enabled groups in memory (will also use database)
const antilinkGroups = new Set();


Sparky({
	name: 'tag',
	fromMe: true,
	desc: lang.TAG_DESC,
	category: 'group',
}, async ({
	m,
	client,
	args
}) => {
	args = args || m.quoted;
	if (!m.isGroup) return await m.reply(lang.NOT_GROUP);
	
	if (!args) return await m.reply(lang.TAG_ALERT);
	//if (!m.botIsAdmin) return await m.reply(lang.NOT_ADMIN);
	const groupMetadata = await client.groupMetadata(m.jid);
	const jids = groupMetadata.participants.map(p => p.id);
	const content = typeof args === 'string' ? {
		text: args ? args : m.quoted.text,
		mentions: jids
	} : args;
	const options = {
		contextInfo: {
			mentionedJid: jids
		}
	};
	return typeof args === 'string' ? await client.sendMessage(m.jid, content, {
		quoted: m
	}) : await m.forwardMessage(m.jid, content, options);
});


Sparky({
	name: "tagall",
	fromMe: true,
	desc: lang.TAGALL_DESC,
	category: "group",
}, async ({
	client,
	m
}) => {
	if (!m.isGroup) return await m.reply(lang.NOT_GROUP);
	
	//if (!m.botIsAdmin) return await m.reply(lang.NOT_ADMIN);
		const {
			participants
		} = await client.groupMetadata(m.jid).catch(() => ({
			participants: []
		}));
		if (!participants.length) return await m.reply(lang.ERROR_METADATA);
		const msg = participants.map((p, i) => `${i + 1}. @${p.id.split('@')[0]}`).join("\n");
		const jids = participants.map(p => p.id);
		return await m.sendMsg(m.jid, msg, {
			mentions: jids,
			quoted: m
		});
});


// Sparky({
// 	name: "add",
// 	fromMe: true,
// 	desc: lang.ADD_DESC,
// 	category: "group",
// }, async ({
// 	client,
// 	m,
// 	args
// }) => {
// 	args = args || m.quoted;
// 	if (!m.isGroup) return await m.reply(lang.NOT_GROUP);
	
// 	if (!args) return await m.reply(lang.ADD_ALERT);
// 	//if (!m.botIsAdmin) return await m.reply(lang.NOT_ADMIN);
// 	let jid = m.quoted ? m.quoted.sender : await m.formatNumberToJid(args);
// 	await client.groupParticipantsUpdate(m.jid, [jid], 'add');
// 	return await m.sendMsg(m.jid, lang.ADDED.replace("{}", `@${jid.split("@")[0]}`), {
// 		mentions: [jid],
// 		quoted: m
// 	});
// });


Sparky({
	name: "kick",
	fromMe: true,
	desc: lang.KICK_DESC,
	category: "group",
}, async ({
	client,
	m,
	args
}) => {
	args = args || m.quoted;
	if (!m.isGroup) return await m.reply(lang.NOT_GROUP);
	
	if (!args) return await m.reply(lang.KICK_ALERT);
	//if (!m.botIsAdmin) return await m.reply(lang.NOT_ADMIN);
	let jid = m.quoted ? m.quoted.sender : await m.formatNumberToJid(args);
	await client.groupParticipantsUpdate(m.jid, [jid], 'remove');
	return await m.sendMsg(m.jid, lang.KICKED.replace("{}", `@${jid.split("@")[0]}`), {
		mentions: [jid],
		quoted: m
	});
});


Sparky({
	name: "promote",
	fromMe: true,
	desc: lang.PROMOTE_DESC,
	category: "group",
}, async ({
	client,
	m,
	args
}) => {
	args = args || m.quoted;
	if (!m.isGroup) return await m.reply(lang.NOT_GROUP);
	
	if (!args) return await m.reply(lang.PROMOTE_ALERT);
	//if (!m.botIsAdmin) return await m.reply(lang.NOT_ADMIN);
	let jid = m.quoted ? m.quoted.sender : await m.formatNumberToJid(args);
	if(await m.isAdmin(jid)) return await m.reply(lang.ALREADY_PROMOTED);
	await client.groupParticipantsUpdate(m.jid, [jid], 'promote');
	return await m.sendMsg(m.jid, lang.PROMOTED.replace("{}", `@${jid.split("@")[0]}`), {
		mentions: [jid],
		quoted: m
	});
});


Sparky({
	name: "demote",
	fromMe: true,
	desc: lang.DEMOTE_DESC,
	category: "group",
}, async ({
	client,
	m,
	args
}) => {
	args = args || m.quoted;
	if (!m.isGroup) return await m.reply(lang.NOT_GROUP);
	
	if (!args) return await m.reply(lang.DEMOTE_ALERT);
	//if (!m.botIsAdmin) return await m.reply(lang.NOT_ADMIN);
	let jid = m.quoted ? m.quoted.sender : await m.formatNumberToJid(args);
	if(!await m.isAdmin(jid)) return await m.reply(lang.ALREADY_DEMOTED);
	await client.groupParticipantsUpdate(m.jid, [jid], 'demote');
	return await m.sendMsg(m.jid, lang.DEMOTED.replace("{}", `@${jid.split("@")[0]}`), {
		mentions: [jid],
		quoted: m
	});
});


Sparky({
	name: "mute",
	fromMe: true,
	desc: lang.MUTE_DESC,
	category: "group",
}, async ({
	client,
	m
}) => {
	if (!m.isGroup) return await m.reply(lang.NOT_GROUP);
	
	//if (!m.botIsAdmin) return await m.reply(lang.NOT_ADMIN);
	await client.groupSettingUpdate(m.jid, 'announcement');
	return await m.sendMsg(m.jid, lang.MUTED);
});


Sparky({
	name: "unmute",
	fromMe: true,
	desc: lang.UNMUTE_DESC,
	category: "group",
}, async ({
	client,
	m
}) => {
	if (!m.isGroup) return await m.reply(lang.NOT_GROUP);
	
	//if (!m.botIsAdmin) return await m.reply(lang.NOT_ADMIN);
	await client.groupSettingUpdate(m.jid, 'not_announcement');
	return await m.sendMsg(m.jid, lang.UNMUTED);
});


Sparky({
	name: "glock",
	fromMe: true,
	desc: lang.GLOCK_DESC,
	category: "group",
}, async ({
	client,
	m
}) => {
	if (!m.isGroup) return await m.reply(lang.NOT_GROUP);
	
	//if (!m.botIsAdmin) return await m.reply(lang.NOT_ADMIN);
	await client.groupSettingUpdate(m.jid, 'locked');
	return await m.sendMsg(m.jid, lang.GLOCKED);
});


Sparky({
	name: "gunlock",
	fromMe: true,
	desc: lang.GUNLOCK_DESC,
	category: "group",
}, async ({
	client,
	m,
	args
}) => {
	if (!m.isGroup) return await m.reply(lang.NOT_GROUP);
	
	//if (!m.botIsAdmin) return await m.reply(lang.NOT_ADMIN);
	await client.groupSettingUpdate(m.jid, 'unlocked');
	return await m.sendMsg(m.jid, lang.GUNLOCKED);
});


Sparky({
	name: "invite",
	fromMe: true,
	desc: lang.INVITE_DESC,
	category: "group",
}, async ({
	client,
	m
}) => {
	if (!m.isGroup) return await m.reply(lang.NOT_GROUP);
	
	//if (!m.botIsAdmin) return await m.reply(lang.NOT_ADMIN);
	return await m.reply(lang.INVITE.replace("{}", `https://chat.whatsapp.com/${await client.groupInviteCode(m.jid)}`));
});


Sparky({
	name: "revoke",
	fromMe: true,
	desc: lang.REVOKE_DESC,
	category: "group",
}, async ({
	client,
	m
}) => {
	if (!m.isGroup) return await m.reply(lang.NOT_GROUP);
	
	//if (!m.botIsAdmin) return await m.reply(lang.NOT_ADMIN);
	await client.groupRevokeInvite(m.jid)
	return await m.reply(lang.REVOKED);
});


Sparky({
	name: "gname",
	fromMe: true,
	desc: lang.GNAME_DESC,
	category: "group",
}, async ({
	client,
	m,
	args
}) => {
	if (!m.isGroup) return await m.reply(lang.NOT_GROUP);
	
	if(!args) return await m.reply(lang.GNAME_ALERT);
	//if (!m.botIsAdmin) return await m.reply(lang.NOT_ADMIN);
	await client.groupUpdateSubject(m.jid, args)
	return await m.sendMsg(m.jid, lang.GNAME_SUCCESS.replace("{}", args));
});


Sparky({
	name: "gdesc",
	fromMe: true,
	desc: lang.GDESC_DESC,
	category: "group",
}, async ({
	client,
	m,
	args
}) => {
	if (!m.isGroup) return await m.reply(lang.NOT_GROUP);
	
	if(!args) return await m.reply(lang.GDESC_ALERT);
	//if (!m.botIsAdmin) return await m.reply(lang.NOT_ADMIN);
	await client.groupUpdateDescription(m.jid, args)
	return await m.sendMsg(m.jid, lang.GDESC_SUCCESS.replace("{}", args));
});


Sparky({
	name: "joinrequests",
	fromMe: true,
	desc: lang.JOINREQUESTS_DESC,
	category: "group",
}, async ({
	client,
	m,
	args
}) => {
	if (!m.isGroup) return await m.reply(lang.NOT_GROUP);
	
	//if (!m.botIsAdmin) return await m.reply(lang.NOT_ADMIN);
	const allJoinRequests = await client.groupRequestParticipantsList(m.jid);
	if(allJoinRequests.length === 0) {
	return await m.reply(lang.JOINREQUESTS_NULL);
	}
	if(args) {
	switch(args.toLowerCase()) {
	case 'approve all': {
	await m.sendMsg(m.jid, lang.JOINREQUESTS_APPROVING.replace("{}", allJoinRequests.length));
	for(let i of allJoinRequests) {
	await client.groupRequestParticipantsUpdate(m.jid, [i.jid], "approve");
	await delay(900);
	}
	break;
	}
	case 'reject all': {
	await m.sendMsg(m.jid, lang.JOINREQUESTS_REJECTING.replace("{}", allJoinRequests.length));
	for(let i of allJoinRequests) {
	await client.groupRequestParticipantsUpdate(m.jid, [i.jid], "reject");
	await delay(900);
	}
	break;
	}
	default: {
	return await m.reply(lang.JOINREQUESTS_INVAILD_PARAMS);
	}
	}
	return;
	}
	const formattedList = allJoinRequests
    .map((item, index) => {
	    const requestVia = item.request_method === "linked_group_join" ? "community_" : item.request_method === "invite_link" ? "invite link_" : `added by @${item.requestor?.split("@")[0]}_`;
	    return `_${index + 1}. @${item.jid.split("@")[0]}_\n_• Request via: ${requestVia}\n_• Requested time: ${new Date(parseInt(item.request_time) * 1000).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}_`})
    .join('\n\n');
	const jids = allJoinRequests.map(i => i.jid);
	return await m.sendMsg(m.jid,lang.JOINREQUESTS_FOUND.replace("{}", formattedList), { mentions: jids });
});


Sparky({
	name: "leave",
	fromMe: true,
	desc: lang.LEAVE_DESC,
	category: "group",
}, async ({
	client,
	m
}) => {
	if (!m.isGroup) return await m.reply(lang.NOT_GROUP);
	await m.sendMsg(m.jid, lang.LEAVE_MSG);
	return await client.groupLeave(m.jid);
});


Sparky({
	name: "removegpp",
	fromMe: true,
	desc: lang.REMOVEGPP_DESC,
	category: "group",
}, async ({
	client,
	m
}) => {
	if (!m.isGroup) return await m.reply(lang.NOT_GROUP);
	
	//if (!m.botIsAdmin) return await m.reply(lang.NOT_ADMIN);
	await client.removeProfilePicture(m.jid);
	return await m.sendMsg(m.jid, lang.REMOVEGPP_SUCCESS);
});


Sparky({
	name: "gpp",
	fromMe: true,
	desc: lang.GPP_DESC,
	category: "group",
}, async ({
	client,
	m,
	args
}) => {
    args = args || m.quoted;
	if (!m.isGroup) return await m.reply(lang.NOT_GROUP);
	
	if(!args) return await m.reply(lang.GPP_ALERT);
	//if (!m.botIsAdmin) return await m.reply(lang.NOT_ADMIN);
	if(m.quoted && !m.quoted.message.imageMessage) return await m.reply(lang.GPP_NOTIMAGE);
	try {
	await client.updateProfilePicture(m.jid, m.quoted ? await m.quoted.download() : { url: args });
	return await m.sendMsg(m.jid, lang.GPP_SUCCESS);
	} catch {
	return await m.reply(lang.GPP_FAILED);
	}
});


// ==================== KICKALL COMMAND ====================
Sparky({
	name: "kickall",
	fromMe: true,
	desc: "Remove all non-admin members from group in batches",
	category: "group",
}, async ({
	client,
	m,
	args
}) => {
	if (!m.isGroup) return await m.reply('_This command can only be used in groups_');
	
	try {
		const groupMetadata = await client.groupMetadata(m.jid);
		const participants = groupMetadata.participants;
		
		// Get admins list
		const admins = participants
			.filter(p => p.admin === 'admin' || p.admin === 'superadmin')
			.map(p => p.id);
		
		// Get bot's JID
		const botJid = client.user.id.replace(/:[0-9]+/, '') + '@s.whatsapp.net';
		
		// Get non-admin members to kick (exclude admins and bot)
		const membersToKick = participants
			.filter(p => !admins.includes(p.id) && p.id !== botJid)
			.map(p => p.id);
		
		if (membersToKick.length === 0) {
			return await m.reply('_No members to kick (only admins in group)_');
		}
		
		await m.reply(`_Kicking ${membersToKick.length} members in batches..._`);
		
		// Kick in batches of 5 with 900ms delay
		const batchSize = 5;
		let kickedCount = 0;
		
		for (let i = 0; i < membersToKick.length; i += batchSize) {
			const batch = membersToKick.slice(i, i + batchSize);
			
			try {
				await client.groupParticipantsUpdate(m.jid, batch, 'remove');
				kickedCount += batch.length;
				console.log(`Kicked batch: ${kickedCount}/${membersToKick.length}`);
			} catch (err) {
				console.error('Error kicking batch:', err.message);
			}
			
			// Delay between batches
			if (i + batchSize < membersToKick.length) {
				await delay(900);
			}
		}
		
		return await m.reply(`_Successfully kicked ${kickedCount}/${membersToKick.length} members_`);
	} catch (error) {
		console.error('kickall error:', error);
		return await m.reply('_Failed to kick members: ' + error.message + '_');
	}
});


// ==================== ANTILINK COMMAND ====================
Sparky({
	name: "antilink",
	fromMe: true,
	desc: "Enable/disable antilink in group (on/off)",
	category: "group",
}, async ({
	client,
	m,
	args
}) => {
	if (!m.isGroup) return await m.reply('_This command can only be used in groups_');
	
	if (!args) {
		const isEnabled = antilinkGroups.has(m.jid);
		return await m.reply(`_Antilink is currently ${isEnabled ? 'enabled ✅' : 'disabled ❌'}_\n_Use: .antilink on/off_`);
	}
	
	const action = args.toLowerCase().trim();
	
	if (action === 'on' || action === 'enable') {
		antilinkGroups.add(m.jid);
		await setData(m.jid, 'true', 'active', 'antilink');
		return await m.reply('_Antilink enabled ✅_\n_Links will be automatically deleted_');
	} else if (action === 'off' || action === 'disable') {
		antilinkGroups.delete(m.jid);
		await setData(m.jid, 'false', 'inactive', 'antilink');
		return await m.reply('_Antilink disabled ❌_');
	} else {
		return await m.reply('_Invalid option. Use: .antilink on/off_');
	}
});


// ==================== ANTILINK MESSAGE HANDLER ====================
Sparky({
	on: "text",
	fromMe: false,
}, async ({
	client,
	m,
	args
}) => {
	try {
		// Only work in groups
		if (!m.isGroup) return;
		
		// Check if antilink is enabled for this group
		if (!antilinkGroups.has(m.jid)) {
			// Check database
			const data = await getData(m.jid);
			if (!data?.antilink || data.antilink.message !== 'true') return;
			// Add to memory cache
			antilinkGroups.add(m.jid);
		}
		
		// Check if sender is admin (admins can send links)
		const isAdmin = await m.isAdmin(m.sender);
		if (isAdmin) return;
		
		// Check if message contains links
		const linkRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(chat\.whatsapp\.com\/[^\s]+)|(wa\.me\/[^\s]+)/gi;
		const messageText = m.body || m.text || '';
		
		if (linkRegex.test(messageText)) {
			// Delete the message silently
			try {
				await client.sendMessage(m.jid, {
					delete: m.key
				});
				console.log(`Antilink: Deleted message with link from ${m.sender}`);
			} catch (err) {
				console.error('Failed to delete antilink message:', err.message);
			}
		}
	} catch (error) {
		console.error('Antilink handler error:', error);
	}
});