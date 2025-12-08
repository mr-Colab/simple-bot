const {
    Sparky,
    commands,
    isPublic
} = require("../lib");
const {
    getBuffer
} = require("./pluginsCore");
const plugins = require("../lib");
const config = require("../config.js");
const font = require("@viper-x/fancytext");
const menust = config.MENU_FONT;
const style = font[menust];
const more = String.fromCharCode(8206);
const readMore = more.repeat(4001);

// Platform detection
let SERVER = process.env.PWD?.includes("userland") ? "LINUX"
    : process.env.PITCHER_API_BASE_URL?.includes('codesandbox') ? 'CODESANDBOX'
    : process.env.REPLIT_USER ? "REPLIT"
    : process.env.AWS_REGION ? "AWS"
    : process.env.TERMUX_VERSION ? 'TERMUX'
    : process.env.DYNO ? 'HEROKU'
    : process.env.KOYEB_APP_ID ? 'KOYEB'
    : process.env.GITHUB_SERVER_URL ? 'GITHUB'
    : process.env.RENDER ? 'RENDER'
    : process.env.RAILWAY_SERVICE_NAME ? 'RAILWAY'
    : process.env.VERCEL ? "VERCEL"
    : process.env.DIGITALOCEAN_APP_NAME ? "DIGITALOCEAN"
    : process.env.AZURE_HTTP_FUNCTIONS ? "AZURE"
    : process.env.NETLIFY ? "NETLIFY"
    : process.env.FLY_IO ? 'FLY_IO'
    : process.env.CF_PAGES ? "CLOUDFLARE"
    : process.env.SPACE_ID ? "HUGGINGFACE"
    : 'VPS';

Sparky({
    name: "menu",
    category: "misc",
    fromMe: isPublic,
    desc: "Display menu - format depends on MENU_TYPE config"
}, async ({ client, m, args }) => {
    try {
        // Handle specific command info request
        if (args) {
            for (let i of plugins.commands) {
                if (i.name.test(args)) {
                    return m.reply(style(`*command : ${args.trim()}*\n*description : ${i.desc.toLowerCase()}*`));
                }
            }
            return m.reply(style("_oops command not found_"));
        }

        // Add reaction
        await m.react('🗂️');

        // Get date and time
        let [date, time] = new Date().toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata"
        }).split(",");

        // Get uptime
        const uptime = await m.uptime();
        
        // Get memory usage
        const memoryUsage = process.memoryUsage();
        const ramUsed = Math.round(memoryUsage.heapUsed / 1024 / 1024);
        const ramTotal = Math.round(memoryUsage.heapTotal / 1024 / 1024);

        // Get user's pushname
        const pushname = m.pushName || 'User';

        // Check menu type - if 'button' or 'interactive', show interactive menu
        const menuType = config.MENU_TYPE ? config.MENU_TYPE.toLowerCase() : 'button';

        if (menuType === 'button' || menuType === 'interactive') {
            // Interactive button menu logic - using pair.js style
            let categories = [];
            let categorizedCommands = {};
            
            commands.forEach((command) => {
                if (!command.dontAddCommandList && command.category) {
                    const category = command.category.toLowerCase();
                    if (!categories.includes(category)) {
                        categories.push(category);
                        categorizedCommands[category] = [];
                    }
                    
                    // Get command name
                    if (command.name) {
                        let cmdName = command.name.source.split('\\s*')[1].toString().match(/(\W*)([A-Za-züşiğ öç1234567890|]*)/)[2];
                        if (cmdName) {
                            categorizedCommands[category].push(cmdName);
                        }
                    }
                }
            });
            categories.sort();

            // Build sections for interactive menu
            const sections = [];
            
            const categoryInfo = {
                'downloader': { emoji: '📥', name: 'Download Commands', label: 'Media' },
                'converters': { emoji: '🔄', name: 'Converter Commands', label: 'Tools' },
                'misc': { emoji: '🛠️', name: 'Miscellaneous Commands', label: 'Utility' },
                'group': { emoji: '👥', name: 'Group Commands', label: 'Groups' },
                'sudo': { emoji: '👑', name: 'Owner Commands', label: 'Admin' },
                'manage': { emoji: '⚙️', name: 'Management Commands', label: 'Settings' }
            };

            categories.forEach((cat) => {
                const info = categoryInfo[cat] || { 
                    emoji: '📂', 
                    name: cat.charAt(0).toUpperCase() + cat.slice(1) + ' Commands',
                    label: cat.charAt(0).toUpperCase() + cat.slice(1)
                };

                const rows = [];
                const cmds = categorizedCommands[cat] || [];
                
                cmds.forEach((cmd, index) => {
                    if (index < 10) { // Limit to 10 commands per category in dropdown
                        rows.push({
                            title: `${m.prefix}${cmd}`,
                            description: `Execute ${cmd} command`,
                            id: `${m.prefix}${cmd}`
                        });
                    }
                });

                if (rows.length > 0) {
                    sections.push({
                        title: `${info.emoji} ${info.name}`,
                        highlight_label: info.label,
                        rows: rows
                    });
                }
            });

            // Add "View All Commands" section
            sections.unshift({
                title: '📋 Quick Access',
                highlight_label: 'Main Menu',
                rows: [
                    { title: '📜 All Commands', description: 'View complete command list', id: `${m.prefix}allcmds` },
                    { title: '🔍 Command List', description: 'List commands by category', id: `${m.prefix}list` },
                    { title: '📊 Bot Stats', description: 'View bot statistics', id: `${m.prefix}ping` }
                ]
            });

            const menuMessage = {
                image: { url: config.BOT_INFO.split(";")[2] || "https://i.imgur.com/Q2UNwXR.jpg" },
                caption: `╭━━━〔 *${config.BOT_INFO.split(";")[0].toLowerCase()}* 〕━━━╮
┃╭━━━━━━━━━━━━━◉
┃┃•  owner : ${config.BOT_INFO.split(";")[1].toLowerCase()}
┃┃•  mode : ${config.WORK_TYPE.toLowerCase()}
┃┃•  prefix : ${m.prefix}
┃┃•  platform : ${SERVER}
┃┃•  date : ${date}
┃┃•  time : ${time}
┃┃•  uptime : ${uptime}
┃┃•  ram : ${ramUsed}MB / ${ramTotal}MB
┃┃•  plugins : ${commands.length}
┃╰━━━━━━━━━━━━━◉
╰━━━━━━━━━━━━━>

> 📂 ᴄʟɪᴄᴋ ʙᴇʟᴏᴡ ᴛᴏ ᴇxᴘʟᴏʀᴇ ᴄᴏᴍᴍᴀɴᴅs`,
                buttons: [
                    {
                        buttonId: `${m.prefix}menu_action`,
                        buttonText: { displayText: '📂 ᴍᴇɴᴜ ᴏᴘᴛɪᴏɴs' },
                        type: 4,
                        nativeFlowInfo: {
                            name: 'single_select',
                            paramsJson: JSON.stringify({
                                title: `ᴄʟɪᴄᴋ ʜᴇʀᴇ ❏`,
                                sections: sections
                            })
                        }
                    },
                    { buttonId: `${m.prefix}allcmds`, buttonText: { displayText: 'ℹ️ ᴀʟʟ ᴄᴏᴍᴍᴀɴᴅs' }, type: 1 },
                    { buttonId: `${m.prefix}ping`, buttonText: { displayText: '📈 ʙᴏᴛ sᴛᴀᴛs' }, type: 1 }
                ],
                headerType: 1,
                viewOnce: true
            };

            return await client.sendMessage(m.jid, menuMessage, { quoted: m });
        }

        // For other menu types, build traditional text menu
        let menu = `╭━━━〔${config.BOT_INFO.split(";")[0]}〕━━>
┃╭━━━━━━━━━━━━━◉
┃┃•  owner : ${config.BOT_INFO.split(";")[1]}
┃┃•  mode : ${config.WORK_TYPE}
┃┃•  prefix : ${m.prefix}
┃┃•  platform : ${SERVER}
┃┃•  date : ${date}
┃┃•  time : ${time}
┃┃•  uptime : ${uptime}
┃┃•  plugins : ${commands.length}
┃╰━━━━━━━━━━━━━◉
╰━━━━━━━━━━━━━>\n${readMore}\n\n`;

        let cmnd = [];
        let Sparky;
        let type = [];

        // Sorting commands based on category
        commands.map((command, num) => {
            if (command.name) {
                let SparkyName = command.name;
                Sparky = SparkyName.source.split('\\s*')[1].toString().match(/(\W*)([A-Za-züşiğ öç1234567890]*)/)[2];
            }
            if (command.dontAddCommandList || Sparky === undefined) return;
            if (!command.dontAddCommandList && Sparky !== undefined) {
                let category;
                if (!command.category) {
                    category = "misc";
                } else {
                    category = command.category.toLowerCase();
                }
                cmnd.push({
                    Sparky,
                    category: category
                });
                if (!type.includes(category)) type.push(category);
            }
        });

        cmnd.sort();
        type.sort().forEach((cmmd) => {
            menu += `╭━━━>
┠┌─⭓『 *${cmmd.toUpperCase()}* 』\n`;
            let comad = cmnd.filter(({ category }) => category == cmmd);
            comad.sort();
            comad.forEach(({ Sparky }) => {
                menu += `┃│• ${Sparky.trim()}\n`;
            });
            menu += `┃└─⭓\n`;
            menu += `╰━━━━>\n`;
        });

        let sperky = {
            "key": {
                "participants": "0@s.whatsapp.net",
                "remoteJid": "status@broadcast",
                "fromMe": false,
                "id": "Hey!"
            },
            "message": {
                "contactMessage": {
                    "displayName": `${config.BOT_INFO.split(";")[0]}`,
                    "vcard": `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
                }
            },
            "participant": "0@s.whatsapp.net"
        };

        // Switch based on MENU_TYPE
        switch (menuType) {
            case 'big': {
                return await client.sendMessage(m.jid, {
                    text: style(menu),
                    contextInfo: {
                        externalAdReply: {
                            title: style(`Hey ${m.pushName}!`),
                            body: style(`${config.BOT_INFO.split(";")[0]}`),
                            sourceUrl: "https://sparky.biz.id",
                            mediaType: 1,
                            showAdAttribution: true,
                            renderLargerThumbnail: true,
                            thumbnailUrl: `${config.BOT_INFO.split(";")[2]}`
                        }
                    }
                }, { quoted: m });
            }
            case 'image': {
                return await m.sendFromUrl(config.BOT_INFO.split(";")[2], { caption: style(menu) });
            }
            case 'small': {
                return await client.sendMessage(m.jid, {
                    text: style(menu),
                    contextInfo: {
                        externalAdReply: {
                            title: style(`Hey ${m.pushName}!`),
                            body: style(`${config.BOT_INFO.split(";")[0]}`),
                            sourceUrl: "https://sparky.biz.id",
                            mediaUrl: "https://sparky.biz.id",
                            mediaType: 1,
                            showAdAttribution: true,
                            renderLargerThumbnail: false,
                            thumbnailUrl: `${config.BOT_INFO.split(";")[2]}`
                        }
                    }
                }, { quoted: sperky });
            }
            case 'document': {
                return await client.sendMessage(m.jid, {
                    document: {
                        url: 'https://i.ibb.co/pnPNhMZ/2843ad26fd25.jpg'
                    },
                    caption: menu,
                    mimetype: 'application/zip',
                    fileName: style(config.BOT_INFO.split(";")[0]),
                    fileLength: "99999999999",
                    contextInfo: {
                        externalAdReply: {
                            title: style(`Hey ${m.pushName}!`),
                            body: style(`${config.BOT_INFO.split(";")[0]}`),
                            sourceUrl: "https://sparky.biz.id",
                            mediaType: 1,
                            showAdAttribution: true,
                            renderLargerThumbnail: true,
                            thumbnailUrl: `${config.BOT_INFO.split(";")[2]}`
                        }
                    }
                }, {
                    quoted: sperky
                });
            }
            case 'text': {
                return await client.sendMessage(m.jid, {
                    text: style(menu)
                }, {
                    quoted: sperky
                });
            }
            case 'video': {
                return await client.sendMessage(
                    m.jid,
                    {
                        video: { url: config.BOT_INFO.split(";")[2] },
                        caption: style(menu),
                        gifPlayback: true
                    },
                    { quoted: sperky }
                );
            }
            case 'payment': {
                return await client.relayMessage(m.jid, {
                    requestPaymentMessage: {
                        currencyCodeIso4217: 'INR',
                        amount1000: '99000',
                        requestFrom: m.sender.jid,
                        noteMessage: {
                            extendedTextMessage: {
                                text: style(menu)
                            }
                        },
                        expiryTimestamp: '0',
                        amount: {
                            value: '99000',
                            offset: 1000,
                            currencyCode: 'INR'
                        },
                    }
                }, {});
            }
            default: {
                console.log("Unsupported menu format!", config.MENU_TYPE);
                // Fallback to text
                return await client.sendMessage(m.jid, {
                    text: style(menu)
                }, {
                    quoted: sperky
                });
            }
        }

    } catch (e) {
        console.log('Menu error:', e);
        await m.reply(`*${config.BOT_INFO.split(";")[0]} Menu*\n\nUse ${m.prefix}list to see all commands.`);
    }
});

// Command to list commands by category
Sparky({
    name: "listcmd",
    category: "misc",
    fromMe: isPublic,
    desc: "List commands by category"
}, async ({ client, m, args }) => {
    try {
        if (!args) {
            return m.reply('Please specify a category. Example: .listcmd downloader');
        }

        const category = args.toLowerCase().trim();
        let cmdList = `╭━━━〔 *${category.toUpperCase()}* 〕━━━╮\n┃\n`;
        
        let found = false;
        commands.forEach((command) => {
            if (command.category && command.category.toLowerCase() === category && !command.dontAddCommandList) {
                let cmdName = command.name;
                if (cmdName) {
                    let name = cmdName.source.split('\\s*')[1].toString().match(/(\W*)([A-Za-züşiğ öç1234567890|]*)/)[2];
                    cmdList += `┃ • ${name}\n`;
                    found = true;
                }
            }
        });

        if (!found) {
            return m.reply(`No commands found in category: ${category}`);
        }

        cmdList += '┃\n╰━━━━━━━━━━━━━━━╯';
        await m.reply(style(cmdList));
    } catch (e) {
        console.log('Listcmd error:', e);
        await m.reply('Error listing commands');
    }
});

// Command to list all commands
Sparky({
    name: "allcmds",
    category: "misc",
    fromMe: isPublic,
    desc: "List all available commands"
}, async ({ client, m, args }) => {
    try {
        let [date, time] = new Date().toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata"
        }).split(",");

        let menu = `╭━━━〔 ${config.BOT_INFO.split(";")[0]} 〕━━━╮
┃
┃ • Owner: ${config.BOT_INFO.split(";")[1]}
┃ • Mode: ${config.WORK_TYPE}
┃ • Prefix: ${m.prefix}
┃ • Platform: ${SERVER}
┃ • Date: ${date}
┃ • Time: ${time}
┃ • Uptime: ${await m.uptime()}
┃ • Plugins: ${commands.length}
┃
╰━━━━━━━━━━━━━━━━╯\n\n`;

        let cmnd = [];
        let type = [];

        // Sort commands by category
        commands.forEach((command) => {
            if (command.name && !command.dontAddCommandList) {
                let SparkyName = command.name;
                let Sparky = SparkyName.source.split('\\s*')[1].toString().match(/(\W*)([A-Za-züşiğ öç1234567890|]*)/)[2];
                
                if (Sparky) {
                    let category = command.category ? command.category.toLowerCase() : "misc";
                    cmnd.push({ Sparky, category });
                    if (!type.includes(category)) type.push(category);
                }
            }
        });

        cmnd.sort();
        type.sort().forEach((cat) => {
            menu += `╭━━━━━━━━━━━━╮\n┃ *${cat.toUpperCase()}*\n┃\n`;
            let catCmds = cmnd.filter(({ category }) => category === cat);
            catCmds.forEach(({ Sparky }) => {
                menu += `┃ • ${Sparky.trim()}\n`;
            });
            menu += `╰━━━━━━━━━━━━╯\n\n`;
        });

        await client.sendMessage(m.jid, {
            text: style(menu),
            contextInfo: {
                externalAdReply: {
                    title: `Hey ${m.pushName}!`,
                    body: config.BOT_INFO.split(";")[0],
                    sourceUrl: "https://github.com/A-S-W-I-N-S-P-A-R-K-Y/X--BOT--MD",
                    mediaType: 1,
                    showAdAttribution: true,
                    renderLargerThumbnail: true,
                    thumbnailUrl: config.BOT_INFO.split(";")[2]
                }
            }
        }, { quoted: m });

    } catch (e) {
        console.log('Allcmds error:', e);
        await m.reply('Error displaying commands');
    }
});

