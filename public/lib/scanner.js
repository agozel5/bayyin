// Contrôleur de caméra autour de html5-qrcode (chargé en global depuis unpkg).
//
// Pourquoi ce module : la bibliothèque rappelle le callback de détection à chaque
// image tant que la caméra tourne. Sans garde, une détection déclenchait plusieurs
// arrêts qui se chevauchaient, et le scanner restait bloqué après le premier scan.
// Ici :
//   - une seule instance html5-qrcode pour toute la session ;
//   - une détection n'est traitée qu'une fois (drapeau `handled`) ;
//   - un seul arrêt à la fois (promesse `stopping` partagée) ;
//   - si on quitte l'onglet pendant le démarrage, la caméra est coupée dès qu'elle démarre.

// Clé de contrôle EAN-8, EAN-13, UPC-A (12) et GTIN-14 : écarte les lectures partielles.
export function validBarcode(code) {
  if (!/^\d{8}$|^\d{12,14}$/.test(code)) return false;
  const digits = code.split("").map(Number);
  const check = digits.pop();
  const sum = digits.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

// UPC-E (8 chiffres compressés) n'a pas la même clé : on le décompresse en UPC-A.
function expandUpcE(code) {
  if (!/^[01]\d{7}$/.test(code)) return null;
  const [n, d1, d2, d3, d4, d5, d6, chk] = code.split("");
  let mid;
  if ("012".includes(d6)) mid = d1 + d2 + d6 + "0000" + d3 + d4 + d5;
  else if (d6 === "3") mid = d1 + d2 + d3 + "00000" + d4 + d5;
  else if (d6 === "4") mid = d1 + d2 + d3 + d4 + "00000" + d5;
  else mid = d1 + d2 + d3 + d4 + d5 + "0000" + d6;
  const upca = n + mid + chk;
  return validBarcode(upca) ? upca : null;
}

export function normalizeScan(text) {
  const code = String(text).replace(/\D/g, "");
  if (validBarcode(code)) return code;
  return expandUpcE(code);
}

const STATE_SCANNING = 2;
const STATE_PAUSED = 3;

export function createScanner(elementId, { onCode, onState }) {
  let qr = null;
  let state = "idle"; // idle | starting | scanning | stopping | error
  let handled = false;
  let wanted = false; // l'utilisateur veut-il la caméra allumée ?
  let stopping = null;

  const set = (s, detail = {}) => {
    state = s;
    onState?.(s, detail);
  };

  const running = () => {
    if (!qr) return false;
    const st = typeof qr.getState === "function" ? qr.getState() : null;
    return qr.isScanning || st === STATE_SCANNING || st === STATE_PAUSED;
  };

  function onDecode(text) {
    if (handled) return;
    const code = normalizeScan(text);
    if (!code) return; // lecture partielle : on continue
    handled = true;
    wanted = false;
    if (navigator.vibrate) navigator.vibrate(40);
    // Ne pas attendre dans le callback de la bibliothèque : on enchaîne après coup.
    stop().then(() => onCode(code));
  }

  async function start() {
    wanted = true;
    if (state === "starting" || state === "scanning") return;
    if (stopping) await stopping;

    if (!window.Html5Qrcode) return set("error", { kind: "lib" });
    if (!window.isSecureContext) return set("error", { kind: "https" });

    if (!qr) {
      const F = window.Html5QrcodeSupportedFormats || {};
      qr = new window.Html5Qrcode(elementId, {
        formatsToSupport: [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E].filter((x) => x !== undefined),
        useBarCodeDetectorIfSupported: true,
        verbose: false,
      });
    }

    handled = false;
    set("starting");
    try {
      await qr.start(
        { facingMode: "environment" },
        { fps: 12, aspectRatio: 1.333, disableFlip: true },
        onDecode,
        () => {}
      );
    } catch (err) {
      wanted = false;
      const message = String((err && (err.name || err.message)) || err);
      const denied = /NotAllowed|Permission|denied/i.test(message);
      return set("error", { kind: denied ? "denied" : "camera", message });
    }
    if (!wanted) return stop(); // l'utilisateur est parti pendant le démarrage
    set("scanning");
  }

  function stop() {
    wanted = false;
    if (stopping) return stopping;
    if (!running()) {
      if (state !== "error") set("idle");
      return Promise.resolve();
    }
    set("stopping");
    stopping = Promise.resolve()
      .then(() => qr.stop())
      .catch(() => {}) // déjà arrêté : sans conséquence
      .finally(() => {
        stopping = null;
        set("idle");
      });
    return stopping;
  }

  return {
    start,
    stop,
    get state() {
      return state;
    },
  };
}
