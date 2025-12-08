const { DataTypes } = require("sequelize");
const config = require("../../config");

const UserSettings = config.DATABASE.define("user_settings", {
  jid: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true
  },
  auto_status_view: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  status_reaction: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  auto_recording: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  auto_typing: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  work_type: {
    type: DataTypes.STRING,
    defaultValue: "public"
  },
  sudo_list: {
    type: DataTypes.TEXT,
    defaultValue: ""
  }
}, {
  timestamps: true
});

// Initialize the table
UserSettings.sync();

/**
 * Get user settings, create default if not exists
 * @param {string} jid - User JID
 * @returns {Object} User settings
 */
async function getUserSettings(jid) {
  try {
    let settings = await UserSettings.findOne({ where: { jid } });
    if (!settings) {
      settings = await UserSettings.create({
        jid,
        auto_status_view: config.AUTO_STATUS_VIEW,
        status_reaction: config.STATUS_REACTION,
        auto_recording: config.AUTO_RECORDING,
        auto_typing: config.AUTO_TYPING,
        work_type: config.WORK_TYPE,
        sudo_list: config.SUDO || ""
      });
    }
    return settings;
  } catch (error) {
    console.error("Error getting user settings:", error);
    return null;
  }
}

/**
 * Update user setting
 * @param {string} jid - User JID
 * @param {string} key - Setting key
 * @param {any} value - Setting value
 * @returns {boolean} Success status
 */
async function updateUserSetting(jid, key, value) {
  try {
    let settings = await getUserSettings(jid);
    if (!settings) return false;
    
    settings[key] = value;
    await settings.save();
    return true;
  } catch (error) {
    console.error("Error updating user setting:", error);
    return false;
  }
}

/**
 * Add sudo user
 * @param {string} jid - User JID (owner)
 * @param {string} sudoNumber - Number to add as sudo
 * @returns {Object} Result object
 */
async function addSudo(jid, sudoNumber) {
  try {
    let settings = await getUserSettings(jid);
    if (!settings) return { success: false, message: "Settings not found" };
    
    let sudoList = settings.sudo_list ? settings.sudo_list.split(",").filter(x => x.trim()) : [];
    
    if (sudoList.includes(sudoNumber)) {
      return { success: false, message: "User is already a sudo" };
    }
    
    sudoList.push(sudoNumber);
    settings.sudo_list = sudoList.join(",");
    await settings.save();
    
    return { success: true, message: "Sudo added successfully" };
  } catch (error) {
    console.error("Error adding sudo:", error);
    return { success: false, message: "Error adding sudo" };
  }
}

/**
 * Remove sudo user
 * @param {string} jid - User JID (owner)
 * @param {string} sudoNumber - Number to remove from sudo
 * @returns {Object} Result object
 */
async function removeSudo(jid, sudoNumber) {
  try {
    let settings = await getUserSettings(jid);
    if (!settings) return { success: false, message: "Settings not found" };
    
    let sudoList = settings.sudo_list ? settings.sudo_list.split(",").filter(x => x.trim()) : [];
    
    if (!sudoList.includes(sudoNumber)) {
      return { success: false, message: "User is not a sudo" };
    }
    
    sudoList = sudoList.filter(num => num !== sudoNumber);
    settings.sudo_list = sudoList.join(",");
    await settings.save();
    
    return { success: true, message: "Sudo removed successfully" };
  } catch (error) {
    console.error("Error removing sudo:", error);
    return { success: false, message: "Error removing sudo" };
  }
}

/**
 * Get sudo list
 * @param {string} jid - User JID
 * @returns {Array} Sudo list
 */
async function getSudoList(jid) {
  try {
    let settings = await getUserSettings(jid);
    if (!settings) return [];
    
    return settings.sudo_list ? settings.sudo_list.split(",").filter(x => x.trim()) : [];
  } catch (error) {
    console.error("Error getting sudo list:", error);
    return [];
  }
}

/**
 * Check if a number is sudo for a user
 * @param {string} ownerJid - Owner's JID
 * @param {string} checkNumber - Number to check
 * @returns {boolean} Is sudo
 */
async function isSudo(ownerJid, checkNumber) {
  try {
    const sudoList = await getSudoList(ownerJid);
    return sudoList.includes(checkNumber);
  } catch (error) {
    console.error("Error checking sudo:", error);
    return false;
  }
}

module.exports = {
  UserSettings,
  getUserSettings,
  updateUserSetting,
  addSudo,
  removeSudo,
  getSudoList,
  isSudo
};
