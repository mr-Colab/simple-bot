const {
	Sparky,
	isPublic
} = require("../lib/");
const config = require("../config.js");
const os = require('os');

// Helper to format bytes
function formatBytes(bytes) {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper to format uptime
function formatUptime(seconds) {
	const days = Math.floor(seconds / (3600 * 24));
	const hours = Math.floor((seconds % (3600 * 24)) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);
	
	const parts = [];
	if (days > 0) parts.push(`${days}d`);
	if (hours > 0) parts.push(`${hours}h`);
	if (minutes > 0) parts.push(`${minutes}m`);
	if (secs > 0) parts.push(`${secs}s`);
	return parts.join(' ') || '0s';
}


Sparky({
		name: "jid",
		fromMe: isPublic,
		category: "misc",
		desc: "Gets the unique ID of a whatsapp chat or user."
	},
	async ({
		m
	}) => {
		return await m.reply(`${m?.quoted ? m?.quoted?.sender : m.jid}`);
	});


Sparky({
		name: "runtime",
		fromMe: isPublic,
		category: "misc",
		desc: "Shows the bot's current runtime."
	},
	async ({
		m
	}) => {
		return await m.reply(`_Runtime : ${await m.runtime()}_`);
	});


Sparky({
		name: "ping",
		fromMe: isPublic,
		category: "misc",
		desc: "Checks if the bot is online and responsive."
	},
	async ({
		m
	}) => {
		const start = new Date().getTime();
		let pong = await m.sendMsg(m.jid, "_Checking Ping..._", {
			quoted: m
		});
		const end = new Date().getTime();
		return await m.sendMsg(m.jid, `_${config.PING} : ${end - start} ms_`, {
			edit: pong.key
		});
	});


Sparky({
		name: "wame",
		fromMe: isPublic,
		category: "misc",
		desc: "Converts a phone number into a whatsapp link."
	},
	async ({
		m,
		args
	}) => {
		return await m.reply(`https://wa.me/${m?.quoted ? m?.quoted?.sender?.split("@")[0] : m?.sender?.split("@")[0]}${args ? `?text=${args}` : ''}`);
	});


Sparky({
		name: "stats",
		fromMe: isPublic,
		category: "misc",
		desc: "Shows system statistics, RAM usage, and connected users."
	},
	async ({
		m
	}) => {
		// RAM/Memory info
		const memUsage = process.memoryUsage();
		const heapUsed = formatBytes(memUsage.heapUsed);
		const heapTotal = formatBytes(memUsage.heapTotal);
		const rss = formatBytes(memUsage.rss);
		const external = formatBytes(memUsage.external);
		
		// System info
		const totalMem = formatBytes(os.totalmem());
		const freeMem = formatBytes(os.freemem());
		const usedMem = formatBytes(os.totalmem() - os.freemem());
		const memPercent = ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(1);
		
		// CPU info
		const cpus = os.cpus();
		const cpuModel = cpus[0]?.model || 'Unknown';
		const cpuCores = cpus.length;
		
		// Uptime
		const botUptime = formatUptime(process.uptime());
		const systemUptime = formatUptime(os.uptime());
		
		// Multi-user info
		let multiUserStats = '';
		try {
			const sessionManager = require('../lib/sessionManager');
			if (sessionManager && sessionManager.getActiveSessionCount) {
				const activeCount = sessionManager.getActiveSessionCount();
				const allUserIds = await sessionManager.getAllUserIds();
				multiUserStats = `
╭━━━〔 *MULTI-USER MODE* 〕━━━⬣
│ • Active Sessions: ${activeCount}
│ • Total Users: ${allUserIds.length}
│ • Mode: Multi-User Enabled
╰━━━━━━━━━━━━━━━━━━━━━━⬣`;
			}
		} catch (e) {
			// Not in multi-user mode or sessionManager not available
			multiUserStats = `
╭━━━〔 *MODE* 〕━━━⬣
│ • Mode: Single User
╰━━━━━━━━━━━━━━━━⬣`;
		}
		
		const statsMessage = `
╭━━━〔 *BOT STATISTICS* 〕━━━⬣
│ • Bot Uptime: ${botUptime}
│ • System Uptime: ${systemUptime}
╰━━━━━━━━━━━━━━━━━━━━━━⬣

╭━━━〔 *RAM USAGE* 〕━━━⬣
│ • Heap Used: ${heapUsed}
│ • Heap Total: ${heapTotal}
│ • RSS Memory: ${rss}
│ • External: ${external}
╰━━━━━━━━━━━━━━━━━━━━━━⬣

╭━━━〔 *SYSTEM MEMORY* 〕━━━⬣
│ • Total RAM: ${totalMem}
│ • Used RAM: ${usedMem} (${memPercent}%)
│ • Free RAM: ${freeMem}
╰━━━━━━━━━━━━━━━━━━━━━━⬣

╭━━━〔 *CPU INFO* 〕━━━⬣
│ • Model: ${cpuModel.substring(0, 40)}
│ • Cores: ${cpuCores}
╰━━━━━━━━━━━━━━━━━━━━━━⬣
${multiUserStats}

╭━━━〔 *NODE.JS* 〕━━━⬣
│ • Version: ${process.version}
│ • Platform: ${process.platform}
│ • Arch: ${process.arch}
╰━━━━━━━━━━━━━━━━━━━━━━⬣`;

		return await m.reply(statsMessage.trim());
	});
