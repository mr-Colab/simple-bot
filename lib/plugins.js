const { HANDLERS, WORK_TYPE } = require('../config.js');
const config = require("../config.js");

// Determine the command prefix/handler
let commandPrefix;
if (config. HANDLERS === "false") {
  commandPrefix = '^';
} else {
  commandPrefix = config.HANDLERS;
}

// Build regex pattern for command matching
let handlerPattern;
const handlerChars = config.HANDLERS.split('');

if (handlerChars.length > 1 && handlerChars[0] === handlerChars[1]) {
  // If handler has repeated characters (e.g., "! !" or ".. "), use as-is
  handlerPattern = config.HANDLERS;
} else if (/[-!$%^&*()_+|~=`{}\[\]:";'<>?,. \/]/.test(commandPrefix) && commandPrefix !== '^') {
  // If handler is a special character, wrap in character class for regex
  handlerPattern = "^[" + commandPrefix + ']';
} else {
  handlerPattern = commandPrefix;
}

// Make handler optional if MULTI_HANDLERS is enabled
if (config.MULTI_HANDLERS && handlerPattern.includes('^[')) {
  handlerPattern = handlerPattern + '?';
}

// Array to store all registered commands
const commands = [];

/**
 * Register a command with the bot
 * @param {Object} commandConfig - Command configuration object
 * @param {Function} handler - The function to execute when command is triggered
 * @returns {Object} The configured command object
 */
function Sparky(commandConfig, handler) {
  // Attach the handler function
  commandConfig.function = handler;
  
  // Convert command name to regex pattern
  // Pattern: prefix + whitespace + command name + whitespace + capture remaining args
  commandConfig.name = new RegExp(
    handlerPattern + "\\s*" + commandConfig.name + "\\s*(? !\\S)(. *)$", 
    'i'
  );
  
  // Set defaults if neither 'on' nor 'name' is defined
  if (commandConfig.on === undefined && commandConfig. name === undefined) {
    commandConfig. on = "message";
    commandConfig. fromMe = false;
  }
  
  // Add to command list by default if name is defined
  if (!(commandConfig.name === undefined && commandConfig. name)) {
    commandConfig.dontAddCommandList = false;
  }
  
  // Event-based commands (like 'on: message') shouldn't appear in command list
  if (commandConfig.on) {
    commandConfig.dontAddCommandList = true;
  }
  
  // Default category for uncategorized commands
  if (!commandConfig. category) {
    commandConfig.category = "misc";
  }
  
  // Add command to registry
  commands.push(commandConfig);
  
  return commandConfig;
}

// Determine if bot is in public or private mode
// If WORK_TYPE is "private", isPublic = 'public' (string, likely falsy check elsewhere)
// Otherwise, isPublic = false (true && false = false)
const isPublic = WORK_TYPE.toLowerCase() === "private" ?  'public' : false;

module. exports = {
  commands,
  Sparky,
  isPublic
};