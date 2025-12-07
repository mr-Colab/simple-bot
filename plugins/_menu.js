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
    desc: "Display menu (button/interactive as default, text as 2nd option)"
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

        // Check menu type - default to 'button', support 'text' as 2nd option
        const menuType = config.MENU_TYPE ? config.MENU_TYPE.toLowerCase() : 'button';

        if (menuType === 'button' || menuType === 'interactive') {
            // Interactive button menu logic with new nativeFlowMessage structure
            // Get bot thumbnail
            const botThumbnail = config.BOT_INFO.split(";")[2] || "https://i.imgur.com/Q2UNwXR.jpg";
            let thumbnailBuffer;
            try {
                thumbnailBuffer = await getBuffer(botThumbnail);
            } catch (e) {
                console.log('Error loading thumbnail:', e);
                thumbnailBuffer = null;
            }

            const menuText = `╭━━━〔 *${config.BOT_INFO.split(";")[0].toLowerCase()}* 〕━━━╮
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
╰━━━━━━━━━━━━━>`;

            return await client.sendMessage(m.jid, {
                interactiveMessage: {
                    title: menuText,
                    footer: config.BOT_INFO.split(";")[0],
                    thumbnail: thumbnailBuffer,
                    nativeFlowMessage: {
                        messageParamsJson: JSON.stringify({
                            limited_time_offer: {
                                text: config.BOT_INFO.split(";")[0],
                                url: "https://github.com/A-S-W-I-N-S-P-A-R-K-Y/X--BOT--MD",
                                expiration_time: Date.now() * 9999
                            },
                            bottom_sheet: {
                                in_thread_buttons_limit: 2,
                                divider_indices: [1, 2, 3, 4, 5, 999],
                                list_title: config.BOT_INFO.split(";")[0],
                                button_title: "Menu Categories"
                            },
                            tap_target_configuration: {
                                title: "▸ Menu ◂",
                                description: config.BOT_INFO.split(";")[0],
                                canonical_url: "https://github.com/A-S-W-I-N-S-P-A-R-K-Y/X--BOT--MD",
                                domain: "github.com",
                                button_index: 0
                            }
                        }),
                        buttons: [
                            {
                                name: "single_select",
                                buttonParamsJson: JSON.stringify({ has_multiple_buttons: true })
                            },
                            {
                                name: "call_permission_request",
                                buttonParamsJson: JSON.stringify({ has_multiple_buttons: true })
                            },
                            {
                                name: "single_select",
                                buttonParamsJson: JSON.stringify({
                                    title: "¿ Select Menu ?",
                                    sections: [
                                        {
                                            title: `# ${config.BOT_INFO.split(";")[0]}`,
                                            highlight_label: "Categories",
                                            rows: [
                                                {
                                                    title: "📥 Download Menu",
                                                    description: "Media download commands",
                                                    id: `${m.prefix}downloadmenu`
                                                },
                                                {
                                                    title: "👥 Group Menu",
                                                    description: "Group management commands",
                                                    id: `${m.prefix}groupmenu`
                                                },
                                                {
                                                    title: "👑 Owner Menu",
                                                    description: "Bot owner commands",
                                                    id: `${m.prefix}ownermenu`
                                                },
                                                {
                                                    title: "🛠️ Other Menu",
                                                    description: "Miscellaneous commands",
                                                    id: `${m.prefix}othermenu`
                                                }
                                            ]
                                        }
                                    ],
                                    has_multiple_buttons: true
                                })
                            },
                            {
                                name: "quick_reply",
                                buttonParamsJson: JSON.stringify({
                                    display_text: "📜 All Commands",
                                    id: `${m.prefix}allcmds`
                                })
                            }
                        ]
                    }
                }
            }, { quoted: m });
        }

        // Text menu as 2nd option
        if (menuType === 'text') {
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

            return await client.sendMessage(m.jid, {
                text: style(menu)
            }, {
                quoted: sperky
            });
        }

        // Default fallback to button menu
        console.log("Unknown menu type, using button menu as default:", config.MENU_TYPE);
        
        const botThumbnail = config.BOT_INFO.split(";")[2] || "https://i.imgur.com/Q2UNwXR.jpg";
        let thumbnailBuffer;
        try {
            thumbnailBuffer = await getBuffer(botThumbnail);
        } catch (e) {
            console.log('Error loading thumbnail:', e);
            thumbnailBuffer = null;
        }

        const menuText = `╭━━━〔 *${config.BOT_INFO.split(";")[0].toLowerCase()}* 〕━━━╮
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
╰━━━━━━━━━━━━━>`;

        return await client.sendMessage(m.jid, {
            interactiveMessage: {
                title: menuText,
                footer: config.BOT_INFO.split(";")[0],
                thumbnail: thumbnailBuffer,
                nativeFlowMessage: {
                    messageParamsJson: JSON.stringify({
                        limited_time_offer: {
                            text: config.BOT_INFO.split(";")[0],
                            url: "https://github.com/A-S-W-I-N-S-P-A-R-K-Y/X--BOT--MD",
                            expiration_time: Date.now() * 9999
                        },
                        bottom_sheet: {
                            in_thread_buttons_limit: 2,
                            divider_indices: [1, 2, 3, 4, 5, 999],
                            list_title: config.BOT_INFO.split(";")[0],
                            button_title: "Menu Categories"
                        },
                        tap_target_configuration: {
                            title: "▸ Menu ◂",
                            description: config.BOT_INFO.split(";")[0],
                            canonical_url: "https://github.com/A-S-W-I-N-S-P-A-R-K-Y/X--BOT--MD",
                            domain: "github.com",
                            button_index: 0
                        }
                    }),
                    buttons: [
                        {
                            name: "single_select",
                            buttonParamsJson: JSON.stringify({ has_multiple_buttons: true })
                        },
                        {
                            name: "call_permission_request",
                            buttonParamsJson: JSON.stringify({ has_multiple_buttons: true })
                        },
                        {
                            name: "single_select",
                            buttonParamsJson: JSON.stringify({
                                title: "¿ Select Menu ?",
                                sections: [
                                    {
                                        title: `# ${config.BOT_INFO.split(";")[0]}`,
                                        highlight_label: "Categories",
                                        rows: [
                                            {
                                                title: "📥 Download Menu",
                                                description: "Media download commands",
                                                id: `${m.prefix}downloadmenu`
                                            },
                                            {
                                                title: "👥 Group Menu",
                                                description: "Group management commands",
                                                id: `${m.prefix}groupmenu`
                                            },
                                            {
                                                title: "👑 Owner Menu",
                                                description: "Bot owner commands",
                                                id: `${m.prefix}ownermenu`
                                            },
                                            {
                                                title: "🛠️ Other Menu",
                                                description: "Miscellaneous commands",
                                                id: `${m.prefix}othermenu`
                                            }
                                        ]
                                    }
                                ],
                                has_multiple_buttons: true
                            })
                        },
                        {
                            name: "quick_reply",
                            buttonParamsJson: JSON.stringify({
                                display_text: "📜 All Commands",
                                id: `${m.prefix}allcmds`
                            })
                        }
                    ]
                }
            }
        }, { quoted: m });

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

// Group Menu Command
Sparky({
    name: "groupmenu",
    category: "misc",
    fromMe: isPublic,
    desc: "Display group management commands"
}, async ({ client, m, args }) => {
    try {
        let cmdList = `╭━━━〔 *GROUP MENU* 〕━━━╮\n┃\n`;
        
        let found = false;
        commands.forEach((command) => {
            if (command.category && command.category.toLowerCase() === 'group' && !command.dontAddCommandList) {
                let cmdName = command.name;
                if (cmdName) {
                    let name = cmdName.source.split('\\s*')[1].toString().match(/(\W*)([A-Za-züşiğ öç1234567890|]*)/)[2];
                    cmdList += `┃ • ${m.prefix}${name}\n`;
                    found = true;
                }
            }
        });

        if (!found) {
            cmdList += '┃ • No group commands available\n';
        }

        cmdList += '┃\n╰━━━━━━━━━━━━━━━╯';
        await m.reply(style(cmdList));
    } catch (e) {
        console.log('Groupmenu error:', e);
        await m.reply('Error displaying group menu');
    }
});

// Owner Menu Command
Sparky({
    name: "ownermenu",
    category: "misc",
    fromMe: isPublic,
    desc: "Display owner/sudo commands"
}, async ({ client, m, args }) => {
    try {
        let cmdList = `╭━━━〔 *OWNER MENU* 〕━━━╮\n┃\n`;
        
        let found = false;
        commands.forEach((command) => {
            if (command.category && command.category.toLowerCase() === 'sudo' && !command.dontAddCommandList) {
                let cmdName = command.name;
                if (cmdName) {
                    let name = cmdName.source.split('\\s*')[1].toString().match(/(\W*)([A-Za-züşiğ öç1234567890|]*)/)[2];
                    cmdList += `┃ • ${m.prefix}${name}\n`;
                    found = true;
                }
            }
        });

        if (!found) {
            cmdList += '┃ • No owner commands available\n';
        }

        cmdList += '┃\n╰━━━━━━━━━━━━━━━╯';
        await m.reply(style(cmdList));
    } catch (e) {
        console.log('Ownermenu error:', e);
        await m.reply('Error displaying owner menu');
    }
});

// Downloader Menu Command
Sparky({
    name: "downloadmenu",
    category: "misc",
    fromMe: isPublic,
    desc: "Display download commands"
}, async ({ client, m, args }) => {
    try {
        let cmdList = `╭━━━〔 *DOWNLOAD MENU* 〕━━━╮\n┃\n`;
        
        let found = false;
        commands.forEach((command) => {
            if (command.category && command.category.toLowerCase() === 'downloader' && !command.dontAddCommandList) {
                let cmdName = command.name;
                if (cmdName) {
                    let name = cmdName.source.split('\\s*')[1].toString().match(/(\W*)([A-Za-züşiğ öç1234567890|]*)/)[2];
                    cmdList += `┃ • ${m.prefix}${name}\n`;
                    found = true;
                }
            }
        });

        if (!found) {
            cmdList += '┃ • No download commands available\n';
        }

        cmdList += '┃\n╰━━━━━━━━━━━━━━━╯';
        await m.reply(style(cmdList));
    } catch (e) {
        console.log('Downloadmenu error:', e);
        await m.reply('Error displaying download menu');
    }
});

// Other/Misc Menu Command
Sparky({
    name: "othermenu",
    category: "misc",
    fromMe: isPublic,
    desc: "Display miscellaneous commands"
}, async ({ client, m, args }) => {
    try {
        let cmdList = `╭━━━〔 *OTHER MENU* 〕━━━╮\n┃\n`;
        
        let found = false;
        commands.forEach((command) => {
            if (command.category && command.category.toLowerCase() === 'misc' && !command.dontAddCommandList) {
                let cmdName = command.name;
                if (cmdName) {
                    let name = cmdName.source.split('\\s*')[1].toString().match(/(\W*)([A-Za-züşiğ öç1234567890|]*)/)[2];
                    cmdList += `┃ • ${m.prefix}${name}\n`;
                    found = true;
                }
            }
        });

        if (!found) {
            cmdList += '┃ • No misc commands available\n';
        }

        cmdList += '┃\n╰━━━━━━━━━━━━━━━╯';
        await m.reply(style(cmdList));
    } catch (e) {
        console.log('Othermenu error:', e);
        await m.reply('Error displaying other menu');
    }
});

