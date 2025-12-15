/**
 * Plugin Hot-Reload Watcher
 * Watches the plugins folder and automatically loads new plugins without restart
 * Works for both single-user and multi-user modes
 */

const fs = require('fs');
const path = require('path');

// Track loaded plugins to avoid reloading
const loadedPlugins = new Set();

// Plugins directory path
const PLUGINS_PATH = path.join(__dirname, '..', 'plugins');

// Watch interval in milliseconds (check every 5 seconds)
const WATCH_INTERVAL = 5000;

// Watcher interval reference
let watcherInterval = null;

/**
 * Load a single plugin file
 * @param {string} filePath - Full path to the plugin file
 * @returns {boolean} - Whether the plugin was loaded successfully
 */
function loadPlugin(filePath) {
  const fileName = path.basename(filePath);
  
  try {
    // Clear require cache to allow reloading modified plugins
    if (require.cache[require.resolve(filePath)]) {
      delete require.cache[require.resolve(filePath)];
    }
    
    require(filePath);
    loadedPlugins.add(fileName);
    console.log(`🔌 [PluginWatcher] Loaded plugin: ${fileName}`);
    return true;
  } catch (error) {
    console.error(`❌ [PluginWatcher] Failed to load plugin ${fileName}:`, error.message);
    return false;
  }
}

/**
 * Scan plugins folder and load any new plugins
 * @returns {number} - Number of new plugins loaded
 */
function scanAndLoadNewPlugins() {
  if (!fs.existsSync(PLUGINS_PATH)) {
    return 0;
  }

  let newPluginsLoaded = 0;

  try {
    const pluginFiles = fs.readdirSync(PLUGINS_PATH)
      .filter(file => path.extname(file) === '.js');

    for (const file of pluginFiles) {
      if (!loadedPlugins.has(file)) {
        const filePath = path.join(PLUGINS_PATH, file);
        
        // Check if file is readable (not still being written)
        try {
          fs.accessSync(filePath, fs.constants.R_OK);
          
          // Small delay to ensure file is fully written
          const stats = fs.statSync(filePath);
          const now = Date.now();
          const fileAge = now - stats.mtimeMs;
          
          // Only load if file is at least 1 second old (to avoid partial writes)
          if (fileAge >= 1000) {
            if (loadPlugin(filePath)) {
              newPluginsLoaded++;
            }
          }
        } catch (accessError) {
          // File not ready yet, skip for now
        }
      }
    }
  } catch (error) {
    console.error('❌ [PluginWatcher] Error scanning plugins folder:', error.message);
  }

  return newPluginsLoaded;
}

/**
 * Initialize plugin watcher - loads existing plugins and starts watching for new ones
 */
function initPluginWatcher() {
  console.log('🔍 [PluginWatcher] Initializing plugin watcher...');
  
  // First, load all existing plugins
  if (fs.existsSync(PLUGINS_PATH)) {
    const pluginFiles = fs.readdirSync(PLUGINS_PATH)
      .filter(file => path.extname(file) === '.js');

    console.log(`📦 [PluginWatcher] Found ${pluginFiles.length} plugin(s)`);

    let loaded = 0;
    for (const file of pluginFiles) {
      const filePath = path.join(PLUGINS_PATH, file);
      if (loadPlugin(filePath)) {
        loaded++;
      }
    }

    console.log(`✅ [PluginWatcher] Loaded ${loaded}/${pluginFiles.length} plugins`);
  } else {
    console.log('⚠️ [PluginWatcher] Plugins folder not found');
  }

  // Start watching for new plugins
  startWatching();
  
  console.log(`👀 [PluginWatcher] Watching for new plugins (interval: ${WATCH_INTERVAL/1000}s)`);
}

/**
 * Start the plugin watcher interval
 */
function startWatching() {
  if (watcherInterval) {
    clearInterval(watcherInterval);
  }

  watcherInterval = setInterval(() => {
    const newPlugins = scanAndLoadNewPlugins();
    if (newPlugins > 0) {
      console.log(`🆕 [PluginWatcher] Loaded ${newPlugins} new plugin(s)`);
    }
  }, WATCH_INTERVAL);
}

/**
 * Stop the plugin watcher
 */
function stopWatching() {
  if (watcherInterval) {
    clearInterval(watcherInterval);
    watcherInterval = null;
    console.log('🛑 [PluginWatcher] Stopped watching for plugins');
  }
}

/**
 * Get list of loaded plugins
 * @returns {Array} - Array of loaded plugin file names
 */
function getLoadedPlugins() {
  return Array.from(loadedPlugins);
}

/**
 * Check if a plugin is loaded
 * @param {string} fileName - Plugin file name
 * @returns {boolean}
 */
function isPluginLoaded(fileName) {
  return loadedPlugins.has(fileName);
}

/**
 * Reload a specific plugin (useful for updates)
 * @param {string} fileName - Plugin file name to reload
 * @returns {boolean} - Whether reload was successful
 */
function reloadPlugin(fileName) {
  const filePath = path.join(PLUGINS_PATH, fileName);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ [PluginWatcher] Plugin not found: ${fileName}`);
    return false;
  }

  // Remove from loaded set to allow re-registration
  loadedPlugins.delete(fileName);
  
  // Clear require cache
  try {
    delete require.cache[require.resolve(filePath)];
  } catch (e) {
    // Ignore if not in cache
  }

  return loadPlugin(filePath);
}

module.exports = {
  initPluginWatcher,
  startWatching,
  stopWatching,
  scanAndLoadNewPlugins,
  loadPlugin,
  reloadPlugin,
  getLoadedPlugins,
  isPluginLoaded,
  PLUGINS_PATH
};
