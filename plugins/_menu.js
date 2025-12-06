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
    desc: "Display interactive menu with categories"
}, async ({ client, m, args }) => {
    try {
        // Add reaction
        await m.react('🗂️');

        // Get uptime
        const uptime = await m.uptime();
        
        // Get memory usage
        const memoryUsage = process.memoryUsage();
        const ramUsed = Math.round(memoryUsage.heapUsed / 1024 / 1024);
        const ramTotal = Math.round(memoryUsage.heapTotal / 1024 / 1024);

        // Get user's pushname
        const pushname = m.pushName || 'User';

        // Get categories from commands
        let categories = [];
        commands.forEach((command) => {
            if (!command.dontAddCommandList && command.category) {
                const category = command.category.toLowerCase();
                if (!categories.includes(category)) {
                    categories.push(category);
                }
            }
        });
        categories.sort();

        // Build category rows for interactive menu
        const categoryRows = categories.map((cat) => {
            const categoryNames = {
                'downloader': { emoji: '📥', title: 'Download Menu', desc: 'Media download commands' },
                'converters': { emoji: '🔄', title: 'Converter Menu', desc: 'Media conversion commands' },
                'misc': { emoji: '🛠️', title: 'Miscellaneous Menu', desc: 'Utility and tool commands' },
                'group': { emoji: '👥', title: 'Group Menu', desc: 'Group management commands' },
                'sudo': { emoji: '👑', title: 'Owner Menu', desc: 'Bot owner commands' },
                'manage': { emoji: '⚙️', title: 'Management Menu', desc: 'Bot management commands' }
            };

            const catInfo = categoryNames[cat] || { 
                emoji: '📂', 
                title: cat.charAt(0).toUpperCase() + cat.slice(1) + ' Menu',
                desc: cat.charAt(0).toUpperCase() + cat.slice(1) + ' commands'
            };

            return {
                title: `${catInfo.emoji} ${catInfo.title}`,
                description: catInfo.desc,
                id: `${m.prefix}listcmd ${cat}`
            };
        });

        // Add "All Commands" option
        categoryRows.unshift({
            title: '📜 All Commands',
            description: 'View complete command list',
            id: `${m.prefix}allcmds`
        });

        // Send interactive button message
        await client.sendMessage(m.jid, {
            image: { url: config.BOT_INFO.split(";")[2] || "https://i.imgur.com/Q2UNwXR.jpg" },
            caption: `╭━━━〔 *${config.BOT_INFO.split(";")[0]}* 〕━━━╮
┃
┃ *👤 User:* ${pushname}
┃ *👑 Owner:* ${config.BOT_INFO.split(";")[1]}
┃ *⏰ Uptime:* ${uptime}
┃ *📦 RAM:* ${ramUsed}MB / ${ramTotal}MB
┃ *🎐 Prefix:* ${m.prefix}
┃ *💻 Platform:* ${SERVER}
┃ *📂 Commands:* ${commands.length}
┃
╰━━━━━━━━━━━━━━━━━━╯

*Select a category from the button below:*`,
            buttons: [
                {
                    buttonId: 'menu_categories',
                    buttonText: {
                        displayText: '📂 Select Menu Category'
                    },
                    type: 4,
                    nativeFlowInfo: {
                        name: 'single_select',
                        paramsJson: JSON.stringify({
                            title: `${config.BOT_INFO.split(";")[0]} Menu`,
                            sections: [
                                {
                                    title: '🔍 Choose a Category',
                                    highlight_label: 'Main Menu',
                                    rows: categoryRows
                                }
                            ]
                        })
                    }
                }
            ],
            headerType: 1
        }, { quoted: m });

    } catch (e) {
        console.log('Menu error:', e);
        // Fallback to text menu if interactive menu fails
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

