const {
  commands,
  Sparky,
  isPublic,
  plugins
} = require("./plugins");
const {
  YtInfo,
  yts,
  yta,
  ytv,
  spdl
} = require('./youtube.js');
const {
  serialize
} = require("./serialize");
const {
  whatsappAutomation,
  callAutomation
} = require("./whatsappController");
const {
  warnDB
} = require("./database/warn");
const {
  externalPlugins,
  installExternalPlugins
} = require('./database/external_plugins');
const {
  setData,
  getData
} = require('./database');
const {
  uploadMedia,
  handleMediaUpload
} = require("./tools");
const sessionManager = require("./sessionManager");
global.owner = ["13056978303"];
module.exports = {
  'commands': commands,
  'Sparky': Sparky,
  'YtInfo': YtInfo,
  'yts': yts,
  'yta': yta,
  'ytv': ytv,
  'spdl': spdl,
  'isPublic': isPublic,
  'serialize': serialize,
  'whatsappAutomation': whatsappAutomation,
  'callAutomation': callAutomation,
  'externalPlugins': externalPlugins,
  'installExternalPlugins': installExternalPlugins,
  'warnDB': warnDB,
  'uploadMedia': uploadMedia,
  'handleMediaUpload': handleMediaUpload,
  'setData': setData,
  'getData': getData,
  'sessionManager': sessionManager
};