import { createClient, OffError } from "./lib/off.js";

// Mode démo (produits d'exemple, sans internet) : ajouter #demo à l'adresse.
const off = createClient({ demo: location.hash === "#demo" });

const $ = (id) => document.getElementById(id);
const resultEl = $("result");
const input = $("searchInput");

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---------------------------------------------------------------------------
// Code-barres : vérification de la clé de contrôle (EAN-8, EAN-13, UPC-A)
// Évite d'interroger l'API sur une lecture caméra erronée.
// ---------------------------------------------------------------------------
function validBarcode(code) {
  if (!/^\d{8}$|^\d{12,14}$/.test(code)) return false;
  const digits = code.split("").map(Number);
  const check = digits.pop();
  const sum = digits.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

// ---------------------------------------------------------------------------
// Recherche
// ---------------------------------------------------------------------------
let lastQuery = 0;

async function lookup(raw) {
  const q = raw.trim();
  if (!q) return;
  const digits = q.replace(/\s+/g, "");
  const ticket = ++lastQuery; // ignore les réponses d'une recherche précédente
  resultEl.innerHTML = `<div class="ticket loading">Recherche en cours…</div>`;

  try {
    if (/^\d{8,14}$/.test(digits)) {
      const p = await off.product(digits);
      if (ticket !== lastQuery) return;
      if (p) return renderProduct(p);
      return renderMessage("Produit introuvable", `Le code ${esc(digits)} n'est pas encore dans Open Food Facts. Vous pouvez l'y ajouter depuis l'application Open Food Facts : la fiche sera ensuite analysée ici.`);
    }
    if (q.length < 2) return renderMessage("Recherche trop courte", "Tapez au moins 2 caractères.");
    const list = await off.search(q);
    if (ticket !== lastQuery) return;
    if (!list.length) return renderMessage("Aucun résultat", `Aucun produit ne correspond à « ${esc(q)} ». Essayez le code-barres, plus fiable que le nom.`);
    if (list.length === 1) return renderProduct(list[0]);
    renderResults(q, list);
  } catch (err) {
    if (ticket !== lastQuery) return;
    renderMessage("Recherche impossible", esc(err instanceof OffError ? err.message : "Erreur inattendue. Réessayez."));
  }
}

// ---------------------------------------------------------------------------
// Rendu
// ---------------------------------------------------------------------------
const VERDICT_TEXT = {
  halal_certifie: "Ce produit porte un label de certification halal.",
  halal_probable: "Aucun ingrédient problématique n'a été trouvé dans la liste déclarée.",
  mashbouh: "Un ou plusieurs ingrédients ont une origine inconnue ou un statut débattu. À vous de juger selon votre niveau de prudence, ou de contacter le fabricant.",
  haram: "Ce produit contient un ingrédient interdit.",
  inconnu: "Impossible de conclure avec les informations disponibles.",
};

function renderProduct(p) {
  const v = p.verdict;
  const flags = v.flags.length
    ? `<div><div class="label">Ingrédients signalés</div><div class="flags">${v.flags
        .map(
          (f) => `<div class="flag ${f.severity}">
            <span class="term">${esc(f.label)}</span>
            <span class="why">${esc(f.reason)}</span>
            <span class="src">trouvé dans : « ${esc(f.source)} »</span>
          </div>`
        )
        .join("")}</div></div>`
    : "";

  const cert = v.certification
    ? `<span class="cert">✓ Certifié halal${v.certification.organisme ? " · " + esc(v.certification.organisme) : ""}</span>`
    : "";

  const notes = v.notes.length ? `<div class="notes">${v.notes.map((n) => `<p>${esc(n)}</p>`).join("")}</div>` : "";

  resultEl.innerHTML = `
    <article class="ticket st-${v.status}">
      <div class="ticket-head">
        ${p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy">` : ""}
        <div class="head-text">
          <span class="pill">${esc(v.statusLabel)}</span>
          <span class="pname">${esc(p.name)}</span>
          <span class="pmeta">${[p.brand, p.quantity, p.code].filter(Boolean).map(esc).join(" · ")}</span>
        </div>
      </div>
      <div class="ticket-body">
        <p>${VERDICT_TEXT[v.status]}</p>
        ${cert}
        ${notes}
        ${flags}
        <div>
          <div class="label">Ingrédients déclarés</div>
          <div class="ingredients">${p.ingredients ? esc(p.ingredients.replace(/_/g, "")) : "Non renseignés."}</div>
        </div>
        <a class="off-link" href="${esc(p.offUrl)}" target="_blank" rel="noopener">Voir ou corriger la fiche sur Open Food Facts</a>
      </div>
    </article>`;

  saveHistory({ code: p.code, name: p.name, brand: p.brand, status: v.status });
  renderHistory();
}

function renderResults(q, list) {
  resultEl.innerHTML = `
    <article class="ticket st-inconnu">
      <div class="ticket-head"><div class="head-text">
        <span class="pill">${list.length} résultats</span>
        <span class="pname">« ${esc(q)} »</span>
      </div></div>
      <div class="ticket-body"><div class="list">${list.map(rowHtml).join("")}</div></div>
    </article>`;
  bindRows(resultEl);
}

function rowHtml(p) {
  const status = p.verdict ? p.verdict.status : p.status;
  return `<button type="button" class="row" data-code="${esc(p.code)}">
    ${p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy">` : ""}
    <span class="rt"><span class="rn">${esc(p.name)}</span><span class="rb">${esc(p.brand || "")}</span></span>
    <span class="dot s-${esc(status)}" title="${esc(status)}"></span>
  </button>`;
}

function bindRows(root) {
  root.querySelectorAll(".row").forEach((b) =>
    b.addEventListener("click", () => {
      input.value = b.dataset.code;
      lookup(b.dataset.code);
    })
  );
}

function renderMessage(title, html) {
  resultEl.innerHTML = `
    <article class="ticket st-inconnu">
      <div class="ticket-head"><div class="head-text">
        <span class="pill">Info</span><span class="pname">${esc(title)}</span>
      </div></div>
      <div class="ticket-body"><p>${html}</p></div>
    </article>`;
}

// ---------------------------------------------------------------------------
// Historique (local à cet appareil)
// ---------------------------------------------------------------------------
const HKEY = "halalscan_history_v1";
function getHistory() {
  try { return JSON.parse(localStorage.getItem(HKEY)) || []; } catch { return []; }
}
function saveHistory(item) {
  try {
    const h = [item, ...getHistory().filter((x) => x.code !== item.code)].slice(0, 10);
    localStorage.setItem(HKEY, JSON.stringify(h));
  } catch { /* stockage indisponible : pas d'historique */ }
}
function renderHistory() {
  const h = getHistory();
  $("history").hidden = !h.length;
  $("historyList").innerHTML = h.map(rowHtml).join("");
  bindRows($("historyList"));
}

// ---------------------------------------------------------------------------
// Scanner caméra (html5-qrcode)
// ---------------------------------------------------------------------------
let scanner = null;

async function startScan() {
  if (!window.Html5Qrcode) {
    return renderMessage("Scanner indisponible", "La bibliothèque de scan n'a pas pu être chargée. Saisissez le code-barres à la main.");
  }
  if (!window.isSecureContext) {
    return renderMessage("Caméra bloquée", "Le navigateur n'autorise la caméra qu'en HTTPS ou sur localhost. Ouvrez l'app depuis son adresse https://.");
  }
  $("scanner").hidden = false;
  $("scanBtn").hidden = true;
  const F = window.Html5QrcodeSupportedFormats;
  scanner = new window.Html5Qrcode("reader", {
    formatsToSupport: [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E],
    useBarCodeDetectorIfSupported: true,
    verbose: false,
  });
  try {
    await scanner.start(
      { facingMode: "environment" },
      { fps: 12, qrbox: (w, h) => ({ width: Math.min(w * 0.85, 360), height: Math.min(h * 0.45, 160) }) },
      async (text) => {
        const code = text.replace(/\D/g, "");
        if (!validBarcode(code)) return; // lecture partielle, on continue
        if (navigator.vibrate) navigator.vibrate(60);
        await stopScan();
        input.value = code;
        lookup(code);
      },
      () => {}
    );
  } catch (err) {
    await stopScan();
    renderMessage("Caméra inaccessible", "Autorisez l'accès à la caméra dans votre navigateur, ou saisissez le code-barres à la main.");
  }
}

async function stopScan() {
  if (scanner) {
    try { if (scanner.isScanning) await scanner.stop(); scanner.clear(); } catch { /* déjà arrêté */ }
    scanner = null;
  }
  $("scanner").hidden = true;
  $("scanBtn").hidden = false;
}

// ---------------------------------------------------------------------------
// Démarrage
// ---------------------------------------------------------------------------
$("scanBtn").addEventListener("click", startScan);
$("stopBtn").addEventListener("click", stopScan);
$("searchForm").addEventListener("submit", (e) => {
  e.preventDefault();
  lookup(input.value);
});

if (off.demo) {
  $("modeHint").textContent = "Mode démo : seuls les produits d'exemple sont disponibles (ex. 3017620422003, 4001686301029, 3019081100146, 6111242002017).";
}

renderHistory();
