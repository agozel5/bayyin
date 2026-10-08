// Le moteur (règles halal, note santé, traductions, sources) est partagé avec la
// version web : il vit dans ../public/lib et Metro doit pouvoir le lire.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, "../public/lib")];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules")];
module.exports = config;
