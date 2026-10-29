// Le moteur (règles halal, note santé, traductions, sources) est partagé avec la
// version web : il vit dans ../public/lib et Metro doit pouvoir le lire.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, "../public/lib")];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules")];
// Version web de contrôle (captures en CI) : les modules natifs sans équivalent web sont remplacés
const WEB_SHIMS = { "react-native-webview": path.resolve(__dirname, "src/shims/webview.js") };
const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (ctx, name, platform) => {
  if (platform === "web" && WEB_SHIMS[name]) return { type: "sourceFile", filePath: WEB_SHIMS[name] };
  return upstream ? upstream(ctx, name, platform) : ctx.resolveRequest(ctx, name, platform);
};
module.exports = config;
