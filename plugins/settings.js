const {
    Sparky,
    isPublic,
    getUserSettings,
    updateUserSetting,
    addSudo,
    removeSudo,
    getSudoList
} = require('../lib');
const config = require("../config.js");

// In-memory cache for user settings to apply immediately
const userSettingsCache = new Map();

/**
 * Get cached user settings or load from database
 * @param {string} jid - User JID
 * @returns {Object} User settings
 */
async function getCachedSettings(jid) {
    if (!userSettingsCache.has(jid)) {
        const settings = await getUserSettings(jid);
        if (settings) {
            userSettingsCache.set(jid, {
                auto_status_view: settings.auto_status_view,
                status_reaction: settings.status_reaction,
                auto_recording: settings.auto_recording,
                auto_typing: settings.auto_typing,
                work_type: settings.work_type,
                sudo_list: settings.sudo_list
            });
        }
    }
    return userSettingsCache.get(jid);
}

/**
 * Update cached settings and database
 * @param {string} jid - User JID
 * @param {string} key - Setting key
 * @param {any} value - Setting value
 */
async function updateCachedSetting(jid, key, value) {
    const result = await updateUserSetting(jid, key, value);
    if (result) {
        if (!userSettingsCache.has(jid)) {
            await getCachedSettings(jid);
        }
        const cached = userSettingsCache.get(jid);
        if (cached) {
            cached[key] = value;
            userSettingsCache.set(jid, cached);
        }
    }
    return result;
}

/**
 * Refresh user cache from database
 * @param {string} jid - User JID
 */
async function refreshUserCache(jid) {
    const settings = await getUserSettings(jid);
    if (settings) {
        userSettingsCache.set(jid, {
            auto_status_view: settings.auto_status_view,
            status_reaction: settings.status_reaction,
            auto_recording: settings.auto_recording,
            auto_typing: settings.auto_typing,
            work_type: settings.work_type,
            sudo_list: settings.sudo_list
        });
    }
}

// Settings command - shows all settings menu
Sparky({
    name: "settings",
    fromMe: true,
    desc: "View and manage your bot settings",
    category: "settings",
}, async ({ m, client }) => {
    try {
        const userJid = m.user;
        const settings = await getCachedSettings(userJid);
        
        if (!settings) {
            return m.reply("_Failed to load settings. Please try again._");
        }

        const sudoList = settings.sudo_list ? settings.sudo_list.split(",").filter(x => x.trim()) : [];
        
        const settingsMenu = `╭━━━〔 *SETTINGS* 〕━━━╮
┃
┃ *Current Configuration:*
┃
┃ 📊 *Status Settings*
┃ • Auto Status View: ${settings.auto_status_view ? '✅ ON' : '❌ OFF'}
┃ • Status Reaction: ${settings.status_reaction ? '✅ ON' : '❌ OFF'}
┃
┃ ⌨️ *Presence Settings*
┃ • Auto Typing: ${settings.auto_typing ? '✅ ON' : '❌ OFF'}
┃ • Auto Recording: ${settings.auto_recording ? '✅ ON' : '❌ OFF'}
┃
┃ 🔧 *Bot Mode*
┃ • Work Type: ${settings.work_type.toUpperCase()}
┃
┃ 👑 *Sudo Users: ${sudoList.length}*
┃
╰━━━━━━━━━━━━━━━━━━━━━╯

*Available Commands:*

\`${m.prefix}statusview on/off\` - Toggle auto status view
\`${m.prefix}statusreact on/off\` - Toggle status reaction
\`${m.prefix}autotyping on/off\` - Toggle auto typing
\`${m.prefix}autorecording on/off\` - Toggle auto recording
\`${m.prefix}mode public/private\` - Change bot mode
\`${m.prefix}setsudo\` - Add sudo user
\`${m.prefix}delsudo\` - Remove sudo user
\`${m.prefix}getsudo\` - View sudo list`;

        return m.reply(settingsMenu);
    } catch (e) {
        console.log('Settings error:', e);
        return m.reply('_Error loading settings_');
    }
});

// Toggle auto status view
Sparky({
    name: "statusview",
    fromMe: true,
    desc: "Toggle auto status view on/off",
    category: "settings",
}, async ({ m, args }) => {
    try {
        const userJid = m.user;
        
        if (!args || (args.toLowerCase() !== 'on' && args.toLowerCase() !== 'off')) {
            const settings = await getCachedSettings(userJid);
            const currentStatus = settings?.auto_status_view ? 'ON' : 'OFF';
            return m.reply(`*Auto Status View*\n\n_Current status: ${currentStatus}_\n_Usage: ${m.prefix}statusview on/off_`);
        }
        
        const newValue = args.toLowerCase() === 'on';
        const result = await updateCachedSetting(userJid, 'auto_status_view', newValue);
        
        if (result) {
            // Update global config for immediate effect
            config.AUTO_STATUS_VIEW = newValue;
            return m.reply(`_Auto Status View ${newValue ? 'enabled ✅' : 'disabled ❌'}_`);
        }
        return m.reply('_Failed to update setting_');
    } catch (e) {
        console.log('Statusview error:', e);
        return m.reply('_Error updating setting_');
    }
});

// Toggle status reaction
Sparky({
    name: "statusreact",
    fromMe: true,
    desc: "Toggle status reaction on/off",
    category: "settings",
}, async ({ m, args }) => {
    try {
        const userJid = m.user;
        
        if (!args || (args.toLowerCase() !== 'on' && args.toLowerCase() !== 'off')) {
            const settings = await getCachedSettings(userJid);
            const currentStatus = settings?.status_reaction ? 'ON' : 'OFF';
            return m.reply(`*Status Reaction*\n\n_Current status: ${currentStatus}_\n_Usage: ${m.prefix}statusreact on/off_`);
        }
        
        const newValue = args.toLowerCase() === 'on';
        const result = await updateCachedSetting(userJid, 'status_reaction', newValue);
        
        if (result) {
            // Update global config for immediate effect
            config.STATUS_REACTION = newValue;
            return m.reply(`_Status Reaction ${newValue ? 'enabled ✅' : 'disabled ❌'}_`);
        }
        return m.reply('_Failed to update setting_');
    } catch (e) {
        console.log('Statusreact error:', e);
        return m.reply('_Error updating setting_');
    }
});

// Toggle auto typing
Sparky({
    name: "autotyping",
    fromMe: true,
    desc: "Toggle auto typing on/off",
    category: "settings",
}, async ({ m, args }) => {
    try {
        const userJid = m.user;
        
        if (!args || (args.toLowerCase() !== 'on' && args.toLowerCase() !== 'off')) {
            const settings = await getCachedSettings(userJid);
            const currentStatus = settings?.auto_typing ? 'ON' : 'OFF';
            return m.reply(`*Auto Typing*\n\n_Current status: ${currentStatus}_\n_Usage: ${m.prefix}autotyping on/off_`);
        }
        
        const newValue = args.toLowerCase() === 'on';
        const result = await updateCachedSetting(userJid, 'auto_typing', newValue);
        
        if (result) {
            // Update global config for immediate effect
            config.AUTO_TYPING = newValue;
            // If typing is on, recording should be off
            let message = `_Auto Typing ${newValue ? 'enabled ✅' : 'disabled ❌'}_`;
            if (newValue) {
                config.AUTO_RECORDING = false;
                await updateCachedSetting(userJid, 'auto_recording', false);
                message += '\n_Auto Recording has been disabled automatically._';
            }
            return m.reply(message);
        }
        return m.reply('_Failed to update setting_');
    } catch (e) {
        console.log('Autotyping error:', e);
        return m.reply('_Error updating setting_');
    }
});

// Toggle auto recording
Sparky({
    name: "autorecording",
    fromMe: true,
    desc: "Toggle auto recording on/off",
    category: "settings",
}, async ({ m, args }) => {
    try {
        const userJid = m.user;
        
        if (!args || (args.toLowerCase() !== 'on' && args.toLowerCase() !== 'off')) {
            const settings = await getCachedSettings(userJid);
            const currentStatus = settings?.auto_recording ? 'ON' : 'OFF';
            return m.reply(`*Auto Recording*\n\n_Current status: ${currentStatus}_\n_Usage: ${m.prefix}autorecording on/off_`);
        }
        
        const newValue = args.toLowerCase() === 'on';
        const result = await updateCachedSetting(userJid, 'auto_recording', newValue);
        
        if (result) {
            // Update global config for immediate effect
            config.AUTO_RECORDING = newValue;
            // If recording is on, typing should be off
            let message = `_Auto Recording ${newValue ? 'enabled ✅' : 'disabled ❌'}_`;
            if (newValue) {
                config.AUTO_TYPING = false;
                await updateCachedSetting(userJid, 'auto_typing', false);
                message += '\n_Auto Typing has been disabled automatically._';
            }
            return m.reply(message);
        }
        return m.reply('_Failed to update setting_');
    } catch (e) {
        console.log('Autorecording error:', e);
        return m.reply('_Error updating setting_');
    }
});

// Change bot mode
Sparky({
    name: "mode",
    fromMe: true,
    desc: "Change bot mode (public/private)",
    category: "settings",
}, async ({ m, args }) => {
    try {
        const userJid = m.user;
        
        if (!args || (args.toLowerCase() !== 'public' && args.toLowerCase() !== 'private')) {
            const settings = await getCachedSettings(userJid);
            const currentMode = settings?.work_type || 'public';
            return m.reply(`*Bot Mode*\n\n_Current mode: ${currentMode.toUpperCase()}_\n_Usage: ${m.prefix}mode public/private_`);
        }
        
        const newValue = args.toLowerCase();
        const result = await updateCachedSetting(userJid, 'work_type', newValue);
        
        if (result) {
            // Update global config for immediate effect
            config.WORK_TYPE = newValue;
            return m.reply(`_Bot mode changed to ${newValue.toUpperCase()} ✅_`);
        }
        return m.reply('_Failed to update setting_');
    } catch (e) {
        console.log('Mode error:', e);
        return m.reply('_Error updating setting_');
    }
});

// Add sudo user
Sparky({
    name: "setsudo",
    fromMe: true,
    desc: "Add a sudo user",
    category: "settings",
}, async ({ m, args, client }) => {
    try {
        const userJid = m.user;
        
        // Get sudo number from quoted message, mentions, or args
        let newSudo = (m.quoted?.sender?.split("@")[0]) || 
                      (m.mentions && m.mentions.length > 0 ? m.mentions[0].split("@")[0] : "") || 
                      (args ? args.trim() : "");

        if (!newSudo) {
            return m.reply(`*Add Sudo User*\n\n_Reply to a message, mention someone, or provide a phone number_\n_Example: ${m.prefix}setsudo 1234567890_`);
        }

        // Clean the number
        newSudo = newSudo.replace(/[^0-9]/g, "");

        if (!newSudo) {
            return m.reply("_Invalid phone number_");
        }

        const result = await addSudo(userJid, newSudo);
        
        if (result.success) {
            // Update global config for immediate effect
            let sudoList = config.SUDO ? config.SUDO.split(",").filter(x => x.trim()) : [];
            if (!sudoList.includes(newSudo)) {
                sudoList.push(newSudo);
                config.SUDO = sudoList.join(",");
            }
            
            // Refresh cache
            await refreshUserCache(userJid);
            
            return client.sendMessage(m.jid, {
                text: `_Added @${newSudo} as sudo ✅_`,
                mentions: [`${newSudo}@s.whatsapp.net`]
            });
        }
        
        return m.reply(`_${result.message}_`);
    } catch (e) {
        console.log('Setsudo error:', e);
        return m.reply('_Error adding sudo_');
    }
});

// Remove sudo user
Sparky({
    name: "delsudo",
    fromMe: true,
    desc: "Remove a sudo user",
    category: "settings",
}, async ({ m, args, client }) => {
    try {
        const userJid = m.user;
        
        // Get sudo number from quoted message, mentions, or args
        let delSudo = (m.quoted?.sender?.split("@")[0]) || 
                      (m.mentions && m.mentions.length > 0 ? m.mentions[0].split("@")[0] : "") || 
                      (args ? args.trim() : "");

        if (!delSudo) {
            return m.reply(`*Remove Sudo User*\n\n_Reply to a message, mention someone, or provide a phone number_\n_Example: ${m.prefix}delsudo 1234567890_`);
        }

        // Clean the number
        delSudo = delSudo.replace(/[^0-9]/g, "");

        if (!delSudo) {
            return m.reply("_Invalid phone number_");
        }

        const result = await removeSudo(userJid, delSudo);
        
        if (result.success) {
            // Update global config for immediate effect
            let sudoList = config.SUDO ? config.SUDO.split(",").filter(x => x.trim()) : [];
            sudoList = sudoList.filter(num => num !== delSudo);
            config.SUDO = sudoList.join(",");
            
            // Refresh cache
            await refreshUserCache(userJid);
            
            return client.sendMessage(m.jid, {
                text: `_Removed @${delSudo} from sudo ✅_`,
                mentions: [`${delSudo}@s.whatsapp.net`]
            });
        }
        
        return m.reply(`_${result.message}_`);
    } catch (e) {
        console.log('Delsudo error:', e);
        return m.reply('_Error removing sudo_');
    }
});

// Get sudo list
Sparky({
    name: "getsudo",
    fromMe: true,
    desc: "Show all sudo users",
    category: "settings",
}, async ({ m }) => {
    try {
        const userJid = m.user;
        const sudoList = await getSudoList(userJid);

        if (sudoList.length === 0) {
            return m.reply("_No sudo users found_");
        }

        const mentionList = sudoList.map(num => `${num}@s.whatsapp.net`);
        const textList = sudoList.map((num, i) => `${i + 1}. ${num}`).join("\n");

        return m.reply(`*Current SUDO Users:*\n\n${textList}`, {
            mentions: mentionList
        });
    } catch (e) {
        console.log('Getsudo error:', e);
        return m.reply('_Error getting sudo list_');
    }
});

// Export the settings cache for use in other modules
module.exports = {
    userSettingsCache,
    getCachedSettings,
    updateCachedSetting
};
