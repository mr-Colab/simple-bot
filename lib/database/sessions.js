/**
 * Session Database Model
 * Stores WhatsApp session credentials in PostgreSQL for backup/restore
 */

const { DataTypes } = require("sequelize");
const config = require("../../config");

const SessionDB = config.DATABASE.define("sessions", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Store the entire creds.json as JSON
  creds: {
    type: DataTypes.JSON,
    allowNull: true
  },
  // Store app state sync keys
  syncKeys: {
    type: DataTypes.JSON,
    allowNull: true
  },
  // Session status
  status: {
    type: DataTypes.STRING,
    defaultValue: 'active'
  },
  // Last connected timestamp
  lastConnected: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Created timestamp
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

/**
 * Save session to database
 */
async function saveSessionToDB(userId, phoneNumber, creds, syncKeys = null) {
  try {
    const existing = await SessionDB.findOne({ where: { userId } });
    
    if (existing) {
      existing.creds = creds;
      if (syncKeys) existing.syncKeys = syncKeys;
      if (phoneNumber) existing.phoneNumber = phoneNumber;
      existing.lastConnected = new Date();
      existing.status = 'active';
      await existing.save();
      console.log(`[DB] Session updated for: ${userId}`);
      return existing;
    } else {
      const session = await SessionDB.create({
        userId,
        phoneNumber,
        creds,
        syncKeys,
        lastConnected: new Date(),
        status: 'active'
      });
      console.log(`[DB] Session saved for: ${userId}`);
      return session;
    }
  } catch (error) {
    console.error(`[DB] Error saving session for ${userId}:`, error.message);
    return null;
  }
}

/**
 * Get session from database
 */
async function getSessionFromDB(userId) {
  try {
    const session = await SessionDB.findOne({ where: { userId } });
    return session ? session.dataValues : null;
  } catch (error) {
    console.error(`[DB] Error getting session for ${userId}:`, error.message);
    return null;
  }
}

/**
 * Get all sessions from database
 */
async function getAllSessionsFromDB() {
  try {
    const sessions = await SessionDB.findAll({ where: { status: 'active' } });
    return sessions.map(s => s.dataValues);
  } catch (error) {
    console.error(`[DB] Error getting all sessions:`, error.message);
    return [];
  }
}

/**
 * Delete session from database
 */
async function deleteSessionFromDB(userId) {
  try {
    await SessionDB.destroy({ where: { userId } });
    console.log(`[DB] Session deleted for: ${userId}`);
    return true;
  } catch (error) {
    console.error(`[DB] Error deleting session for ${userId}:`, error.message);
    return false;
  }
}

/**
 * Update session status
 */
async function updateSessionStatus(userId, status) {
  try {
    await SessionDB.update({ status }, { where: { userId } });
    return true;
  } catch (error) {
    console.error(`[DB] Error updating status for ${userId}:`, error.message);
    return false;
  }
}

/**
 * Sync the sessions table
 */
async function syncSessionsTable() {
  try {
    await SessionDB.sync({ alter: true });
    console.log('[DB] Sessions table synced');
    return true;
  } catch (error) {
    console.error('[DB] Error syncing sessions table:', error.message);
    return false;
  }
}

module.exports = {
  SessionDB,
  saveSessionToDB,
  getSessionFromDB,
  getAllSessionsFromDB,
  deleteSessionFromDB,
  updateSessionStatus,
  syncSessionsTable
};
