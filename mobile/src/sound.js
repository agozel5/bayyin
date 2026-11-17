// Son de lecture d'un code-barres (réglage « Son quand un code est lu », coupé par défaut).
// Le mode silencieux du téléphone est respecté. Sans le module audio, rien ne se passe.
import { getSettings } from "./storage";

let player = null;
let ready = false;
function init() {
  if (ready) return player;
  ready = true;
  try {
    // Le module natif n'existe que dans les builds récents : sans lui, on ne charge rien (pas de plantage).
    const { requireOptionalNativeModule } = require("expo-modules-core");
    if (!requireOptionalNativeModule("ExpoAudio")) { player = null; return null; }
    const A = require("expo-audio");
    if (A.setAudioModeAsync) A.setAudioModeAsync({ playsInSilentMode: false, interruptionMode: "mixWithOthers" }).catch(() => {});
    player = A.createAudioPlayer(require("../assets/scan.wav"));
    player.volume = 0.7;
  } catch { player = null; }
  return player;
}
export function playScan() {
  if (!getSettings().scanSound) return;
  const p = init();
  if (!p) return;
  try { p.seekTo(0); p.play(); } catch { /* lecture impossible : on continue sans son */ }
}
