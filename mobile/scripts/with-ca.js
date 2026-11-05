// Lance une commande en faisant confiance aux certificats du système (réseau d'entreprise) :
// même effet que NODE_OPTIONS=--use-system-ca, sans avoir à le taper (marche dans cmd et PowerShell).
// Sur les serveurs de compilation (CI), rien n'est ajouté.
const { spawnSync } = require("child_process");
const env = { ...process.env };
if (!env.CI && !/--use-system-ca/.test(env.NODE_OPTIONS || "")) env.NODE_OPTIONS = `${env.NODE_OPTIONS || ""} --use-system-ca`.trim();
const [cmd, ...args] = process.argv.slice(2);
if (!cmd) { console.error("Usage : node scripts/with-ca.js <commande> [arguments]"); process.exit(1); }
const r = spawnSync(cmd, args, { stdio: "inherit", env, shell: true });
process.exit(r.status == null ? 1 : r.status);
