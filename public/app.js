import { createClient, OffError } from "./lib/off.js";
import { createScanner } from "./lib/scanner.js";
import { store } from "./lib/store.js";
import { ADDITIVES, TEXT_RULES } from "./lib/rules.js";

// Mode démo (produits d'exemple, sans connexion) : ajouter ?demo à l'adresse.
const DEMO = new URLSearchParams(location.search).has("demo");
const off = createClient({ demo: DEMO });

const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ===========================================================================
// Statuts
// ===========================================================================
const ICON = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  badge: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  question: '<path d="M9.2 9a3 3 0 1 1 4.3 2.7c-.9.4-1.5 1.2-1.5 2.2v.6M12 18v.1"/>',
  cross: '<path d="M7 7l10 10M17 7L7 17"/>',
  dash: '<path d="M7 12h10"/>',
};
const svg = (paths, cls = "") => `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true">${paths}</svg>`;

const STATUS = {
  halal_certifie: { label: "Halal certifié", short: "Certifié", icon: ICON.badge,
    summary: "Ce produit porte un label de certification halal.",
    legend: "Label d'un organisme de certification présent sur la fiche. Seul statut qui couvre l'abattage et l'origine des ingrédients." },
  halal_probable: { label: "Halal probable", short: "Probable", icon: ICON.check,
    summary: "Aucun ingrédient problématique dans la liste déclarée.",
    legend: "Rien d'interdit ni de douteux dans les ingrédients déclarés, mais pas de certification." },
  mashbouh: { label: "Douteux", short: "Douteux", icon: ICON.question,
    summary: "Un ingrédient a une origine inconnue ou un statut débattu.",
    legend: "Ingrédient d'origine inconnue (gélatine, E471…) ou au statut débattu entre écoles (carmin, présure…)." },
  haram: { label: "Haram", short: "Haram", icon: ICON.cross,
    summary: "Ce produit contient un ingrédient interdit.",
    legend: "Porc, sang, alcool ou dérivé explicitement interdit." },
  inconnu: { label: "Non déterminé", short: "Inconnu", icon: ICON.dash,
    summary: "Pas assez d'informations pour conclure.",
    legend: "La liste d'ingrédients n'est pas renseignée sur Open Food Facts." },
};
const SEV_LABEL = { haram: "Haram", mashbouh: "Douteux", info: "Info" };
const ORDER = ["haram", "mashbouh", "halal_certifie", "halal_probable", "inconnu"];

// ===========================================================================
// Rendu d'un produit
// ===========================================================================
const STAR = '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>';
const PLACEHOLDER_IMG = '<path d="M4 7l8-4 8 4v10l-8 4-8-4zM4 7l8 4 8-4M12 11v10"/>';

function prodBlock(p) {
  const img = p.image
    ? `<img class="prod-img" src="${esc(p.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
    : `<span class="prod-img ph">${svg(PLACEHOLDER_IMG)}</span>`;
  const meta = [p.brand, p.quantity].filter(Boolean).map(esc).join(" · ");
  return `<div class="prod">${img}<div class="prod-text">
    <span class="prod-name">${esc(p.name)}</span>
    ${meta ? `<span class="prod-meta">${meta}</span>` : ""}
    <span class="prod-code">${esc(p.code)}</span>
  </div></div>`;
}

function heroBlock(status) {
  const s = STATUS[status];
  return `<div class="v-hero"><span class="v-icon">${svg(s.icon)}</span>
    <div class="v-text"><p class="v-status">${s.label}</p><p class="v-summary">${s.summary}</p></div></div>`;
}

function flagsBlock(flags) {
  if (!flags.length) return "";
  return `<div class="flags-wrap"><p class="label" style="margin-bottom:8px">Ingrédients signalés · ${flags.length}</p><div class="flags">${flags
    .map(
      (f) => `<div class="flag ${f.severity}">
        <div class="flag-top"><span class="flag-term">${esc(f.label)}</span><span class="sev">${SEV_LABEL[f.severity]}</span></div>
        <span class="flag-why">${esc(f.reason)}</span>
        <span class="flag-src">trouvé dans « ${esc(f.source)} »</span>
      </div>`
    )
    .join("")}</div></div>`;
}

function fullVerdict(p) {
  const v = p.verdict;
  const cert = v.certification
    ? `<div class="cert">${svg('<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>')}Certifié halal${v.certification.organisme ? " · " + esc(v.certification.organisme) : ""}</div>`
    : "";
  const notes = v.notes.length ? `<div class="notes">${v.notes.map((n) => `<p>${esc(n)}</p>`).join("")}</div>` : "";
  const ingr = p.ingredients
    ? `<details class="ingr"><summary>Liste d'ingrédients complète</summary><p>${esc(p.ingredients.replace(/_/g, ""))}</p></details>`
    : "";
  return `<article class="card verdict v-${v.status}">
    ${heroBlock(v.status)}
    ${prodBlock(p)}
    <div class="v-body">
      ${cert}${notes}${flagsBlock(v.flags)}${ingr}
      <a class="v-link" href="${esc(p.offUrl)}" target="_blank" rel="noopener">Voir ou corriger la fiche sur Open Food Facts ↗</a>
    </div>
  </article>`;
}

function compactVerdict(p) {
  const v = p.verdict;
  const strong = v.flags.filter((f) => f.severity !== "info");
  const why = strong.length
    ? `<p class="flag-why"><strong>${strong.length === 1 ? "Point signalé" : strong.length + " points signalés"} :</strong> ${strong.map((f) => esc(f.label)).join(", ")}</p>`
    : v.certification
      ? `<p class="flag-why">Certification${v.certification.organisme ? " " + esc(v.certification.organisme) : ""} reconnue.</p>`
      : "";
  return `<article class="card verdict v-${v.status}">
    ${heroBlock(v.status)}
    ${prodBlock(p)}
    <div class="v-body">
      ${why}
      <div class="v-actions">
        <button class="btn btn-ghost" type="button" data-open="${esc(p.code)}">Détails</button>
        <button class="btn btn-primary" type="button" data-action="rescan">Scanner un autre</button>
      </div>
    </div>
  </article>`;
}

const loadingCard = (text = "Recherche du produit…") =>
  `<div class="card loading-card"><span class="spinner" aria-hidden="true"></span>${esc(text)}</div>`;

const messageCard = (title, text, actions = "") =>
  `<div class="card msg"><strong>${esc(title)}</strong><p>${text}</p>${actions}</div>`;

function rowHtml(p, { fav = false, when = "" } = {}) {
  const st = p.verdict.status;
  const img = p.image
    ? `<img class="row-img" src="${esc(p.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
    : `<span class="row-img ph"></span>`;
  const meta = [p.brand, when].filter(Boolean).map(esc).join(" · ");
  return `<button type="button" class="row" data-open="${esc(p.code)}">
    ${img}
    <span class="row-text"><span class="row-name">${esc(p.name)}</span><span class="row-meta">${meta || esc(p.code)}</span></span>
    ${fav ? svg(STAR, "row-fav") : ""}
    <span class="badge v-${st}"><span class="dot v-${st}"></span>${STATUS[st].short}</span>
  </button>`;
}

// ===========================================================================
// Recherche d'un produit (partagée par tous les onglets)
// ===========================================================================
const memo = new Map(); // produits déjà vus dans cette session, pour ouvrir la fiche sans réseau

async function fetchProduct(code) {
  if (memo.has(code)) return memo.get(code);
  const p = await off.product(code);
  if (p) memo.set(code, p);
  return p;
}

const errorText = (err) =>
  esc(err instanceof OffError ? err.message : "Erreur inattendue. Vérifiez votre connexion puis réessayez.");

const notFoundText = (code) =>
  `Le code <span class="mono">${esc(code)}</span> n'est pas encore dans Open Food Facts. Vous pouvez l'ajouter avec l'application Open Food Facts : il sera ensuite analysé ici.`;

// ===========================================================================
// Onglet Scanner
// ===========================================================================
const vf = $("viewfinder");
const scanResult = $("scanResult");
let scanTicket = 0;

const scanner = createScanner("reader", {
  onState(state, detail) {
    vf.dataset.state = state;
    if (state === "error") {
      const msgs = {
        lib: ["Scanner indisponible", "Le module de lecture n'a pas pu se charger. Vérifiez votre connexion, ou tapez le code-barres ci-dessous."],
        https: ["Caméra bloquée", "Le navigateur n'autorise la caméra que sur une adresse https://."],
        denied: ["Accès à la caméra refusé", "Autorisez la caméra pour ce site dans les réglages du navigateur (sur iPhone : Réglages › Safari › Caméra), puis réessayez."],
        camera: ["Caméra inaccessible", "Une autre application utilise peut-être la caméra. Fermez-la puis réessayez."],
      };
      const [title, text] = msgs[detail.kind] || msgs.camera;
      $("vfErrorTitle").textContent = title;
      $("vfErrorText").textContent = text + (detail.message && detail.kind === "camera" ? ` (${detail.message})` : "");
    }
  },
  onCode(code) {
    showScanResult(code);
  },
});

async function showScanResult(code) {
  const ticket = ++scanTicket;
  $("startLabel").textContent = "Scanner un autre produit";
  scanResult.innerHTML = loadingCard();
  scanResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
  try {
    const p = await fetchProduct(code);
    if (ticket !== scanTicket) return;
    if (!p) {
      scanResult.innerHTML = messageCard("Produit introuvable", notFoundText(code),
        `<div class="v-actions"><button class="btn btn-primary" type="button" data-action="rescan">Scanner un autre</button></div>`);
      return;
    }
    store.add(p);
    scanResult.innerHTML = compactVerdict(p);
  } catch (err) {
    if (ticket !== scanTicket) return;
    scanResult.innerHTML = messageCard("Recherche impossible", errorText(err),
      `<div class="v-actions"><button class="btn btn-primary" type="button" data-retry="${esc(code)}">Réessayer</button></div>`);
  }
}

$("startScan").addEventListener("click", () => scanner.start());
$("retryScan").addEventListener("click", () => scanner.start());
$("stopScan").addEventListener("click", () => scanner.stop());

scanResult.addEventListener("click", (e) => {
  if (e.target.closest("[data-action=rescan]")) {
    scanResult.innerHTML = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
    scanner.start();
  }
  const retry = e.target.closest("[data-retry]");
  if (retry) showScanResult(retry.dataset.retry);
});

$("manualForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const code = $("manualInput").value.replace(/\D/g, "");
  if (code.length < 8 || code.length > 14) {
    scanResult.innerHTML = messageCard("Code incomplet", "Un code-barres compte 8 ou 13 chiffres, parfois 12 ou 14.");
    return;
  }
  $("manualInput").blur();
  scanner.stop();
  showScanResult(code);
});

// ===========================================================================
// Onglet Recherche
// ===========================================================================
const SUGGESTIONS = DEMO ? ["Haribo", "Nutella", "Saucisson", "Camembert", "Nuggets"] : ["Nutella", "Haribo", "Kinder", "Oreo", "Danone", "Isla Délice"];
$("suggestChips").innerHTML = SUGGESTIONS.map((s) => `<button type="button" class="chip" data-q="${esc(s)}">${esc(s)}</button>`).join("");
$("suggestChips").addEventListener("click", (e) => {
  const b = e.target.closest("[data-q]");
  if (!b) return;
  $("searchInput").value = b.dataset.q;
  runSearch(b.dataset.q);
});

let searchTicket = 0;
async function runSearch(raw) {
  const q = raw.trim();
  const out = $("searchResults");
  $("searchSuggest").hidden = !!q;
  if (!q) return (out.innerHTML = "");
  const ticket = ++searchTicket;
  out.innerHTML = loadingCard("Recherche en cours…");
  const digits = q.replace(/\s+/g, "");
  try {
    if (/^\d{8,14}$/.test(digits)) {
      const p = await fetchProduct(digits);
      if (ticket !== searchTicket) return;
      if (!p) return (out.innerHTML = messageCard("Produit introuvable", notFoundText(digits)));
      return (out.innerHTML = `<div class="list">${rowHtml(p)}</div>`);
    }
    if (q.length < 2) return (out.innerHTML = messageCard("Recherche trop courte", "Tapez au moins 2 caractères."));
    const list = await off.search(q);
    if (ticket !== searchTicket) return;
    list.forEach((p) => memo.set(p.code, p));
    if (!list.length) {
      out.innerHTML = messageCard("Aucun résultat", `Aucun produit ne correspond à « ${esc(q)} ». Le code-barres donne un résultat plus sûr que le nom.`);
      return;
    }
    out.innerHTML = `<p class="label" style="margin-bottom:8px">${list.length} résultat${list.length > 1 ? "s" : ""}</p><div class="list">${list.map((p) => rowHtml(p)).join("")}</div>`;
  } catch (err) {
    if (ticket !== searchTicket) return;
    out.innerHTML = messageCard("Recherche impossible", errorText(err));
  }
}
$("searchForm").addEventListener("submit", (e) => {
  e.preventDefault();
  $("searchInput").blur();
  runSearch($("searchInput").value);
});
$("searchInput").addEventListener("input", (e) => {
  if (!e.target.value.trim()) runSearch("");
});

// ===========================================================================
// Onglet Historique
// ===========================================================================
let historyFilter = "all";
let confirmClear = false;

function relTime(ts) {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  const d = new Date(ts);
  const today = new Date();
  const yest = new Date(Date.now() - 864e5);
  const hm = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === today.toDateString()) return `aujourd'hui ${hm}`;
  if (d.toDateString() === yest.toDateString()) return `hier ${hm}`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

const HISTORY_FILTERS = [
  { id: "all", label: "Tous", test: () => true },
  { id: "fav", label: "Favoris", test: (e) => e.fav },
  { id: "ok", label: "Halal", test: (e) => e.p.verdict.status.startsWith("halal") },
  { id: "mashbouh", label: "Douteux", test: (e) => e.p.verdict.status === "mashbouh" },
  { id: "haram", label: "Haram", test: (e) => e.p.verdict.status === "haram" },
];

function renderHistory() {
  const all = store.all();
  const counts = {};
  all.forEach((e) => (counts[e.p.verdict.status] = (counts[e.p.verdict.status] || 0) + 1));

  $("historyStats").innerHTML = all.length
    ? `<div class="stats">
        <div class="stats-top"><span class="stats-num">${all.length}</span><span>produit${all.length > 1 ? "s" : ""} vérifié${all.length > 1 ? "s" : ""}</span></div>
        <div class="bar" role="img" aria-label="${ORDER.filter((s) => counts[s]).map((s) => `${counts[s]} ${STATUS[s].label}`).join(", ")}">
          ${ORDER.filter((s) => counts[s]).map((s) => `<i class="v-${s}" style="flex:${counts[s]}"></i>`).join("")}
        </div>
        <div class="bar-legend">${ORDER.filter((s) => counts[s]).map((s) => `<span><i class="dot v-${s}"></i>${counts[s]} ${STATUS[s].label.toLowerCase()}</span>`).join("")}</div>
      </div>`
    : "";

  $("historyFilter").hidden = !all.length;
  $("historyFilter").innerHTML = HISTORY_FILTERS.map((f) => {
    const n = all.filter(f.test).length;
    return `<button type="button" class="chip" role="tab" aria-selected="${f.id === historyFilter}" data-f="${f.id}">${f.label}<span class="n">${n}</span></button>`;
  }).join("");

  const filter = HISTORY_FILTERS.find((f) => f.id === historyFilter);
  const shown = all.filter(filter.test);
  const list = $("historyList");
  if (!all.length) {
    list.innerHTML = "";
    $("historyStats").innerHTML = `<div class="card empty">${svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>')}<strong>Aucun produit pour l'instant</strong><p>Les produits que vous scannez ou ouvrez apparaîtront ici, même hors connexion.</p><a class="btn btn-primary" href="#scan">Scanner un produit</a></div>`;
  } else if (!shown.length) {
    list.innerHTML = `<div class="empty"><p>${historyFilter === "fav" ? "Aucun favori. Touchez l'étoile sur une fiche produit pour l'ajouter." : "Aucun produit dans cette catégorie."}</p></div>`;
  } else {
    list.innerHTML = shown.map((e) => rowHtml(e.p, { fav: e.fav, when: relTime(e.at) })).join("");
  }

  $("historyClear").innerHTML = !all.length
    ? ""
    : confirmClear
      ? `<span style="font-size:.88rem;color:var(--muted);align-self:center">Effacer l'historique (les favoris sont gardés) ?</span>
         <button type="button" class="link-btn danger" data-clear="yes">Effacer</button>
         <button type="button" class="link-btn" data-clear="no">Annuler</button>`
      : `<button type="button" class="link-btn" data-clear="ask">Effacer l'historique</button>`;
}

$("historyFilter").addEventListener("click", (e) => {
  const b = e.target.closest("[data-f]");
  if (!b) return;
  historyFilter = b.dataset.f;
  renderHistory();
});
$("historyClear").addEventListener("click", (e) => {
  const b = e.target.closest("[data-clear]");
  if (!b) return;
  confirmClear = b.dataset.clear === "ask";
  if (b.dataset.clear === "yes") {
    store.clear({ keepFavs: true });
    toast("Historique effacé");
  }
  renderHistory();
});
store.subscribe(() => {
  if (current === "history") renderHistory();
});

// ===========================================================================
// Onglet Additifs
// ===========================================================================
let addFilter = "all";

function additiveGroups() {
  // Regroupe les additifs qui partagent la même explication (ex. dérivés d'acides gras).
  const groups = new Map();
  for (const [code, a] of Object.entries(ADDITIVES)) {
    const key = a.severity + "|" + a.reason;
    if (!groups.has(key)) groups.set(key, { severity: a.severity, reason: a.reason, codes: [], labels: [] });
    const g = groups.get(key);
    g.codes.push(code.toUpperCase());
    g.labels.push(a.label);
  }
  return [...groups.values()].map((g) =>
    g.codes.length > 1
      ? { name: "Dérivés d'acides gras", codes: g.codes, severity: g.severity, reason: g.reason, search: g.labels.join(" ") }
      : { name: g.labels[0], codes: [], severity: g.severity, reason: g.reason, search: g.labels[0] }
  );
}

const INGREDIENT_ITEMS = TEXT_RULES.map((r) => ({ name: r.label, codes: [], severity: r.severity, reason: r.reason, search: r.label }));
const ADDITIVE_ITEMS = additiveGroups();
const SEV_ORDER = { haram: 0, mashbouh: 1, info: 2 };
const bySev = (a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity];

const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "");

function renderAdditives() {
  const q = norm($("addInput").value || "");
  const match = (it) =>
    (addFilter === "all" || it.severity === addFilter) &&
    (!q || norm(it.name + " " + it.search + " " + it.codes.join(" ") + " " + it.reason).includes(q));

  const all = [...INGREDIENT_ITEMS, ...ADDITIVE_ITEMS];
  $("addFilter").innerHTML = [["all", "Tous"], ["haram", "Haram"], ["mashbouh", "Douteux"], ["info", "Info"]]
    .map(([id, label]) => {
      const n = id === "all" ? all.length : all.filter((i) => i.severity === id).length;
      return `<button type="button" class="chip" role="tab" aria-selected="${id === addFilter}" data-f="${id}">${label}<span class="n">${n}</span></button>`;
    })
    .join("");

  const item = (it) => `<div class="add-item ${it.severity}">
    <div class="add-head"><span class="add-name">${esc(it.name)}</span><span class="badge v-${it.severity === "haram" ? "haram" : it.severity === "mashbouh" ? "mashbouh" : "inconnu"}">${SEV_LABEL[it.severity]}</span></div>
    ${it.codes.length ? `<div class="add-codes">${it.codes.map((c) => `<span>${esc(c)}</span>`).join("")}</div>` : ""}
    <p class="add-why">${esc(it.reason)}</p>
  </div>`;

  const ing = INGREDIENT_ITEMS.filter(match).sort(bySev);
  const add = ADDITIVE_ITEMS.filter(match).sort(bySev);
  $("addList").innerHTML =
    (ing.length ? `<div class="add-group"><p class="label">Ingrédients · ${ing.length}</p>${ing.map(item).join("")}</div>` : "") +
    (add.length ? `<div class="add-group"><p class="label">Additifs (codes E) · ${add.length}</p>${add.map(item).join("")}</div>` : "") +
    (!ing.length && !add.length ? `<div class="card empty"><strong>Rien de trouvé</strong><p>Cet ingrédient ou additif n'est pas surveillé : l'app le considère comme sans problème.</p></div>` : "");
}
$("addFilter").addEventListener("click", (e) => {
  const b = e.target.closest("[data-f]");
  if (!b) return;
  addFilter = b.dataset.f;
  renderAdditives();
});
$("addInput").addEventListener("input", renderAdditives);

// ===========================================================================
// Onglet Infos
// ===========================================================================
$("legend").innerHTML = ["halal_certifie", "halal_probable", "mashbouh", "haram", "inconnu"]
  .map((s) => `<div class="legend-row"><span class="badge v-${s}"><span class="dot v-${s}"></span>${STATUS[s].label}</span><p>${STATUS[s].legend}</p></div>`)
  .join("");
if (DEMO) {
  $("demoLink").href = location.pathname + "#scan";
  $("demoLink").querySelector("strong").textContent = "Quitter le mode démo";
  $("demoLink").querySelector("small").textContent = "Revenir aux vraies données Open Food Facts";
}

// ===========================================================================
// Fiche produit (panneau plein écran)
// ===========================================================================
const sheet = $("sheet");
let sheetCode = null;

function refreshFav() {
  const e = store.get(sheetCode);
  const on = !!(e && e.fav);
  $("sheetFav").setAttribute("aria-pressed", String(on));
  $("sheetFav").setAttribute("aria-label", on ? "Retirer des favoris" : "Ajouter aux favoris");
}

async function openSheet(code) {
  sheetCode = code;
  const cached = memo.get(code) || store.get(code)?.p;
  $("sheetTitle").textContent = cached ? cached.name : "Fiche produit";
  $("sheetBody").innerHTML = cached ? fullVerdict(cached) : loadingCard();
  sheet.hidden = false;
  document.body.classList.add("sheet-open");
  $("sheetBody").scrollTop = 0;
  history.pushState({ sheet: true }, "");
  refreshFav();
  if (cached) {
    if (!store.get(code)) store.add(cached); // ouvert depuis la recherche : entre dans l'historique
    refreshFav();
    return;
  }
  try {
    const p = await fetchProduct(code);
    if (sheetCode !== code) return;
    if (!p) return ($("sheetBody").innerHTML = messageCard("Produit introuvable", notFoundText(code)));
    $("sheetTitle").textContent = p.name;
    $("sheetBody").innerHTML = fullVerdict(p);
    store.add(p);
    refreshFav();
  } catch (err) {
    if (sheetCode === code) $("sheetBody").innerHTML = messageCard("Chargement impossible", errorText(err));
  }
}

function closeSheet({ fromPop = false } = {}) {
  if (sheet.hidden) return;
  sheet.hidden = true;
  sheetCode = null;
  document.body.classList.remove("sheet-open");
  if (!fromPop && history.state && history.state.sheet) history.back();
}

$("sheetClose").addEventListener("click", () => closeSheet());
$("sheetFav").addEventListener("click", () => {
  if (!sheetCode) return;
  if (!store.get(sheetCode)) {
    const p = memo.get(sheetCode);
    if (!p) return;
    store.add(p);
  }
  const on = store.toggleFav(sheetCode);
  refreshFav();
  toast(on ? "Ajouté aux favoris" : "Retiré des favoris");
});
if (navigator.share) {
  $("sheetShare").hidden = false;
  $("sheetShare").addEventListener("click", async () => {
    const p = memo.get(sheetCode) || store.get(sheetCode)?.p;
    if (!p) return;
    try {
      await navigator.share({
        title: p.name,
        text: `${p.name} : ${STATUS[p.verdict.status].label} selon Halal Scan`,
        url: location.origin + location.pathname,
      });
    } catch { /* partage annulé */ }
  });
}
window.addEventListener("popstate", () => closeSheet({ fromPop: true }));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeSheet();
});

// Tout élément [data-open] ouvre la fiche du produit
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-open]");
  if (b) openSheet(b.dataset.open);
});

// ===========================================================================
// Navigation par onglets
// ===========================================================================
const TABS = ["scan", "search", "history", "additives", "infos"];
let current = null;

function showTab(name) {
  if (!TABS.includes(name)) name = "scan";
  if (name === current) return;
  if (current === "scan") scanner.stop();
  current = name;
  document.querySelectorAll(".view").forEach((v) => (v.hidden = v.dataset.view !== name));
  document.querySelectorAll(".tab").forEach((t) =>
    t.dataset.tab === name ? t.setAttribute("aria-current", "page") : t.removeAttribute("aria-current")
  );
  if (name === "history") {
    confirmClear = false;
    renderHistory();
  }
  if (name === "additives") renderAdditives();
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", () => {
  closeSheet({ fromPop: true });
  showTab(location.hash.slice(1));
});

// Caméra coupée quand l'app passe en arrière-plan (sinon iOS la laisse dans un état figé)
document.addEventListener("visibilitychange", () => {
  if (document.hidden) scanner.stop();
});

// ===========================================================================
// Toast
// ===========================================================================
let toastTimer;
function toast(text) {
  const t = $("toast");
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 2000);
}

// ===========================================================================
// Démarrage
// ===========================================================================
if (DEMO) {
  $("demoBadge").hidden = false;
  $("manualInput").placeholder = "Ex. 4001686301029";
}
showTab(location.hash.slice(1) || "scan");
