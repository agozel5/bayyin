import { createClient, OffError } from "./lib/off.js";
import { createCamera, decodeImageFile, getDetector, detectorEngine } from "./lib/camera.js";
import { store } from "./lib/store.js";
import { ADDITIVES, TEXT_RULES } from "./lib/rules.js";
import { ADDITIVE_RISK, RISK_LABELS, HEALTH_GRADES } from "./lib/health.js";

// Mode démo (produits d'exemple, sans connexion) : ajouter ?demo à l'adresse.
const DEMO = new URLSearchParams(location.search).has("demo");
const off = createClient({ demo: DEMO });

const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const svg = (paths, cls = "") => `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true">${paths}</svg>`;
const fmt = (v) => Number(v).toLocaleString("fr-FR", { maximumFractionDigits: v < 10 ? 1 : 0 });

// ===========================================================================
// Libellés
// ===========================================================================
const I = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  question: '<path d="M9.2 9a3 3 0 1 1 4.3 2.7c-.9.4-1.5 1.2-1.5 2.2v.6M12 18v.1"/>',
  cross: '<path d="M7 7l10 10M17 7L7 17"/>',
  dash: '<path d="M7 12h10"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
  box: '<path d="M4 7l8-4 8 4v10l-8 4-8-4zM4 7l8 4 8-4M12 11v10"/>',
  chev: '<path d="M9 6l6 6-6 6"/>',
  shield: '<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  energy: '<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.3 1.2-3.6 2.3-4.6.3 1.6 1 2.6 2 3.1C11 9 11.2 5.8 12 3z"/>',
  sugars: '<path d="M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8"/>',
  "saturated-fat": '<path d="M12 3.5c3 4 6 7.4 6 10.5a6 6 0 0 1-12 0c0-3.1 3-6.5 6-10.5z"/>',
  salt: '<path d="M8 9h8l-1 11H9zM9 9c0-3 1.3-5 3-5s3 2 3 5M11 6h.01M13 6.5h.01"/>',
  proteins: '<path d="M12 4c3.3 0 6 3.4 6 8s-2.7 8-6 8-6-3.4-6-8 2.7-8 6-8z"/>',
  fiber: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14zM5 19l7-7"/>',
  fruits: '<path d="M12 7c-4-2-8 1-7 6 .8 4 3.5 7 7 7s6.2-3 7-7c1-5-3-8-7-6zM12 7c0-2 1-3.5 3-4"/>',
};

const STATUS = {
  halal_certifie: { label: "Halal certifié", short: "Certifié", icon: I.check,
    lead: "Ce produit porte un label de certification halal.",
    legend: "Label d'un organisme de certification sur la fiche. Seul statut qui couvre l'abattage et l'origine des ingrédients." },
  halal_probable: { label: "Halal probable", short: "Halal", icon: I.check,
    lead: "Aucun ingrédient problématique dans la liste déclarée.",
    legend: "Rien d'interdit ni de douteux dans les ingrédients déclarés, mais pas de certification." },
  mashbouh: { label: "Douteux", short: "Douteux", icon: I.question,
    lead: "Un ingrédient a une origine inconnue ou un statut débattu.",
    legend: "Ingrédient d'origine inconnue (gélatine, E471…) ou au statut débattu entre écoles (carmin, présure…)." },
  haram: { label: "Haram", short: "Haram", icon: I.cross,
    lead: "Ce produit contient un ingrédient interdit.",
    legend: "Porc, sang, alcool ou dérivé explicitement interdit." },
  inconnu: { label: "Non déterminé", short: "Inconnu", icon: I.dash,
    lead: "Pas assez d'informations pour conclure.",
    legend: "La liste d'ingrédients n'est pas renseignée sur Open Food Facts." },
};
const SEV_LABEL = { haram: "Haram", mashbouh: "Douteux", info: "Info" };
const STATUS_ORDER = ["haram", "mashbouh", "halal_certifie", "halal_probable", "inconnu"];

const statusPill = (st) => `<span class="pill s-${st}"><span class="dot"></span>${STATUS[st].short}</span>`;
const scoreOf = (p) => (p.health && p.health.score) || null;
const miniScore = (p) => {
  const s = scoreOf(p);
  return s ? `<span class="mini-score g-${s.grade}"><span class="dot"></span>${s.score}/100</span>` : "";
};

// ===========================================================================
// Fiche produit
// ===========================================================================
function productTop(p) {
  const img = p.image
    ? `<img class="p-img" src="${esc(p.image)}" alt="" referrerpolicy="no-referrer">`
    : `<span class="p-img ph">${svg(I.box)}</span>`;
  const meta = [p.brand, p.quantity].filter(Boolean).map(esc).join(" · ");
  return `<div class="p-top">${img}<div class="p-text">
    <span class="p-name">${esc(p.name)}</span>
    ${meta ? `<span class="p-meta">${meta}</span>` : ""}
    <span class="p-code">${esc(p.code)}</span>
  </div></div>`;
}

function scoreTiles(p) {
  const st = p.verdict.status;
  const s = scoreOf(p);
  const health = s
    ? `<div class="score-tile health g-${s.grade}">
         <span class="ring" style="--p:${s.score}"><span>${s.score}<small>/100</small></span></span>
         <span class="st-text"><span class="st-kicker">Santé</span><span class="st-value">${s.label}</span></span>
       </div>`
    : `<div class="score-tile health none">
         <span class="ring" style="--p:0"><span>?</span></span>
         <span class="st-text"><span class="st-kicker">Santé</span><span class="st-value">Non noté</span></span>
       </div>`;
  return `<div class="scores">
    <div class="score-tile s-${st}">
      <span class="st-ico">${svg(STATUS[st].icon)}</span>
      <span class="st-text"><span class="st-kicker">Halal</span><span class="st-value">${STATUS[st].label}</span></span>
    </div>
    ${health}
  </div>`;
}

function halalSection(p) {
  const v = p.verdict;
  const cert = v.certification
    ? `<div class="cert">${svg(I.shield)}Certifié halal${v.certification.organisme ? " · " + esc(v.certification.organisme) : ""}</div>`
    : "";
  const notes = v.notes.length ? `<div class="notes">${v.notes.map((n) => `<p>${esc(n)}</p>`).join("")}</div>` : "";
  const flags = v.flags.length
    ? `<div class="flags">${v.flags
        .map(
          (f) => `<div class="flag ${f.severity}">
            <div class="flag-top"><span class="flag-term">${esc(f.label)}</span><span class="pill ${f.severity === "haram" ? "s-haram" : f.severity === "mashbouh" ? "s-mashbouh" : "r-info"}">${SEV_LABEL[f.severity]}</span></div>
            <span class="flag-why">${esc(f.reason)}</span>
            <span class="flag-src">Trouvé dans « ${esc(f.source)} »</span>
          </div>`
        )
        .join("")}</div>`
    : "";
  return `<section class="sec"><div class="sec-head"><h3>Halal</h3></div>
    <p class="lead">${STATUS[v.status].lead}</p>${cert}${notes}${flags}</section>`;
}

function nutRow(n) {
  const pct = Math.max(4, Math.min(100, (n.value / n.max) * 100));
  return `<div class="nut lv-${n.level}">
    <span class="nut-ico">${svg(I[n.id] || I.box)}</span>
    <span class="nut-text"><strong>${esc(n.name)}</strong><small>${esc(n.text)}</small></span>
    <span class="nut-val">${fmt(n.value)} ${esc(n.unit)}<span class="dot"></span></span>
    <span class="nut-bar"><i style="width:${pct}%"></i></span>
  </div>`;
}

function healthSection(p) {
  const h = p.health;
  if (!h) return "";
  const s = h.score;
  const risky = h.additives.length;
  const neg = [...h.nutrition.negatives];
  const pos = [...h.nutrition.positives];
  const lead = s
    ? `Note de <strong>${s.score}/100</strong> : Nutri-Score ${s.nutriscore.toUpperCase()} (${s.parts.nutrition}/60), additifs ${s.parts.additives}/30, bio ${s.parts.bio}/10.`
    : "Pas de Nutri-Score sur la fiche : la note santé ne peut pas être calculée.";
  const list = (items) => `<div class="nut-list">${items.map(nutRow).join("")}</div>`;
  return `<section class="sec"><div class="sec-head"><h3>Santé</h3><small>pour ${h.nutrition.per}</small></div>
    <p class="lead">${lead}</p>
    ${neg.length || risky ? `<p class="sub-label">Défauts</p>${list(neg)}${risky ? `<div class="nut lv-eleve"><span class="nut-ico">${svg('<path d="M9 3h6M10 3v6.2L4.8 18a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 9.2V3"/>')}</span><span class="nut-text"><strong>Additifs</strong><small>${risky} additif${risky > 1 ? "s" : ""} à risque</small></span><span class="nut-val">${risky}<span class="dot"></span></span></div>` : ""}` : ""}
    ${pos.length || (!risky && p.verdict) ? `<p class="sub-label">Qualités</p>${list(pos)}${!risky ? `<div class="nut lv-bon"><span class="nut-ico">${svg('<path d="M9 3h6M10 3v6.2L4.8 18a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 9.2V3"/>')}</span><span class="nut-text"><strong>Additifs</strong><small>Aucun additif à risque</small></span><span class="nut-val"><span class="dot"></span></span></div>` : ""}` : ""}
    ${!neg.length && !pos.length ? `<p class="notes">Valeurs nutritionnelles non renseignées sur la fiche.</p>` : ""}
  </section>`;
}

function additivesSection(p) {
  const h = p.health;
  if (!h || !h.additives.length) return "";
  return `<section class="sec"><div class="sec-head"><h3>Additifs à surveiller</h3><small>${h.additives.length}</small></div>
    <div class="risks">${h.additives
      .map(
        (a) => `<details class="risk"><summary><span>${esc(a.code)} · ${esc(a.name)}</span><span class="pill r-${a.level}">${RISK_LABELS[a.level]}</span></summary><p>${esc(a.reason)}</p></details>`
      )
      .join("")}</div></section>`;
}

function extraSection(p) {
  const h = p.health;
  if (!h) return "";
  const allergens = h.allergens.length
    ? `<div class="tags">${h.allergens.map((a) => `<span class="tag">${esc(a)}</span>`).join("")}</div>`
    : `<p class="notes">Aucun allergène majeur déclaré sur la fiche.</p>`;
  const nova = h.nova
    ? `<div class="nova"><span class="nova-num nova-${h.nova.group}">${h.nova.group}</span><p><strong>${esc(h.nova.label)}</strong>${esc(h.nova.text)}</p></div>`
    : "";
  return `<section class="sec"><div class="sec-head"><h3>Allergènes</h3></div>${allergens}</section>
    ${nova ? `<section class="sec"><div class="sec-head"><h3>Transformation</h3><small>groupe NOVA</small></div>${nova}</section>` : ""}`;
}

function productDetail(p) {
  const ingr = p.ingredients
    ? `<section class="sec"><details class="ingr"><summary>Ingrédients</summary><p>${esc(p.ingredients.replace(/_/g, ""))}</p></details></section>`
    : "";
  return `${productTop(p)}${scoreTiles(p)}
    ${halalSection(p)}
    ${healthSection(p)}
    ${additivesSection(p)}
    <section class="sec" id="altSection"><div class="sec-head"><h3>Alternatives</h3><small>halal, mieux notées</small></div>
      <div id="altBox"><div class="loading"><span class="spinner"></span>Recherche d'alternatives…</div></div></section>
    ${extraSection(p)}
    ${ingr}
    <section class="sec"><a class="off-link" href="${esc(p.offUrl)}" target="_blank" rel="noopener">Voir ou corriger la fiche sur Open Food Facts ↗</a></section>`;
}

function altCard(a) {
  const img = a.image ? `<img src="${esc(a.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<span class="ph"></span>`;
  return `<button type="button" class="alt" data-open="${esc(a.code)}">${img}
    <strong>${esc(a.name)}</strong><small>${esc(a.brand || "")}</small>
    <span class="alt-tags">${statusPill(a.verdict.status)}${miniScore(a)}</span></button>`;
}

async function loadAlternatives(p, code) {
  const box = $("altBox");
  if (!box) return;
  try {
    const alts = await off.alternatives(p);
    if (sheetCode !== code || !$("altBox")) return;
    alts.forEach((a) => memo.set(a.code, a));
    $("altBox").innerHTML = alts.length
      ? `<div class="alts">${alts.map(altCard).join("")}</div>`
      : `<p class="notes">${p.categories && p.categories.length ? "Pas d'alternative halal mieux notée trouvée dans cette catégorie." : "Catégorie du produit inconnue : impossible de chercher des alternatives."}</p>`;
  } catch {
    if (sheetCode === code && $("altBox")) $("altBox").innerHTML = `<p class="notes">Alternatives indisponibles pour le moment.</p>`;
  }
}

const loadingHtml = (t = "Recherche du produit…") => `<div class="loading"><span class="spinner"></span>${esc(t)}</div>`;
const messageHtml = (title, text, actions = "") => `<div class="card-msg"><strong>${esc(title)}</strong><p>${text}</p>${actions}</div>`;
const errorText = (err) => esc(err instanceof OffError ? err.message : "Erreur inattendue. Vérifiez votre connexion puis réessayez.");
const notFoundText = (code) =>
  `Le code ${esc(code)} n'est pas encore dans Open Food Facts. Vous pouvez l'ajouter avec l'application Open Food Facts : il sera ensuite analysé ici.`;

function rowHtml(p, { fav = false, when = "" } = {}) {
  const img = p.image
    ? `<img class="row-img" src="${esc(p.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
    : `<span class="row-img ph"></span>`;
  const meta = [p.brand, when].filter(Boolean).map(esc).join(" · ");
  return `<button type="button" class="row" data-open="${esc(p.code)}">${img}
    <span class="row-text"><span class="row-name">${esc(p.name)}</span>
      ${meta ? `<span class="row-meta">${meta}</span>` : ""}
      <span class="row-tags">${statusPill(p.verdict.status)}${miniScore(p)}${fav ? svg(I.star, "row-fav") : ""}</span>
    </span>${svg(I.chev, "row-chev")}</button>`;
}

// ===========================================================================
// Données
// ===========================================================================
const memo = new Map();
async function fetchProduct(code) {
  if (memo.has(code)) return memo.get(code);
  const p = await off.product(code);
  if (p) memo.set(code, p);
  return p;
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

function lockScroll() {
  document.body.classList.toggle("no-scroll", !sheet.hidden || !cameraEl.hidden);
}

async function openSheet(code, { fromScan = false, replace = false } = {}) {
  sheetCode = code;
  const cached = memo.get(code) || (store.get(code) && store.get(code).p);
  const fresh = cached && cached.health; // les anciennes entrées d'historique n'ont pas de données santé
  $("sheetTitle").textContent = cached ? cached.name : "Fiche produit";
  $("sheetBody").innerHTML = fresh ? productDetail(cached) : loadingHtml();
  $("sheetFoot").hidden = !fromScan;
  sheet.hidden = false;
  $("sheetBody").scrollTop = 0;
  if (replace) history.replaceState({ sheet: true }, "");
  else if (!(history.state && history.state.sheet)) history.pushState({ sheet: true }, "");
  lockScroll();
  refreshFav();

  if (fresh) {
    if (fromScan || !store.get(code)) store.add(cached);
    refreshFav();
    loadAlternatives(cached, code);
    return;
  }
  try {
    const p = await fetchProduct(code);
    if (sheetCode !== code) return;
    if (!p) {
      $("sheetTitle").textContent = "Produit introuvable";
      $("sheetBody").innerHTML = messageHtml("Produit introuvable", notFoundText(code));
      return;
    }
    $("sheetTitle").textContent = p.name;
    $("sheetBody").innerHTML = productDetail(p);
    store.add(p);
    refreshFav();
    loadAlternatives(p, code);
  } catch (err) {
    if (sheetCode === code)
      $("sheetBody").innerHTML = messageHtml("Chargement impossible", errorText(err),
        `<button class="btn btn-primary" type="button" data-open="${esc(code)}">Réessayer</button>`);
  }
}

function closeSheet({ fromPop = false } = {}) {
  if (sheet.hidden) return;
  sheet.hidden = true;
  sheetCode = null;
  lockScroll();
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
$("scanAgain").addEventListener("click", () => {
  sheet.hidden = true;
  sheetCode = null;
  openCamera({ replace: true });
});
if (navigator.share) {
  $("sheetShare").hidden = false;
  $("sheetShare").addEventListener("click", async () => {
    const p = memo.get(sheetCode) || (store.get(sheetCode) && store.get(sheetCode).p);
    if (!p) return;
    const s = scoreOf(p);
    try {
      await navigator.share({
        title: p.name,
        text: `${p.name} : ${STATUS[p.verdict.status].label}${s ? `, santé ${s.score}/100` : ""} (Halal Scan)`,
        url: location.origin + location.pathname,
      });
    } catch { /* partage annulé */ }
  });
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-open]");
  if (b) openSheet(b.dataset.open, { replace: !sheet.hidden });
});

// ===========================================================================
// Caméra plein écran
// ===========================================================================
const cameraEl = $("camera");
let torchOn = false;

const camera = createCamera({
  video: $("camVideo"),
  frame: $("camFrame"),
  onState(state, detail) {
    cameraEl.dataset.state = state;
    if (state === "scanning") {
      $("torchBtn").hidden = !detail.torch;
      $("engineInfo").textContent = detail.engine || detectorEngine() || "—";
    }
    if (state === "error") {
      const msgs = {
        https: ["Caméra bloquée", "La caméra ne fonctionne que sur une adresse sécurisée (https)."],
        unsupported: ["Caméra non prise en charge", "Ce navigateur ne donne pas accès à la caméra. Utilisez la photo ou tapez le code."],
        denied: ["Accès à la caméra refusé", "Autorisez la caméra pour ce site. Sur iPhone : Réglages › Safari › Caméra › Autoriser, puis rechargez la page."],
        nocamera: ["Aucune caméra trouvée", "Utilisez la photo ou tapez le code-barres."],
        busy: ["Caméra déjà utilisée", "Une autre application utilise la caméra. Fermez-la puis réessayez."],
        decoder: ["Lecteur indisponible", "Le module de lecture n'a pas pu se charger. Vérifiez votre connexion puis réessayez."],
        camera: ["Caméra inaccessible", "La caméra n'a pas pu démarrer."],
      };
      const [title, text] = msgs[detail.kind] || msgs.camera;
      $("camErrorTitle").textContent = title;
      $("camErrorText").textContent = text + (detail.message && !["denied", "https"].includes(detail.kind) ? ` (${detail.message})` : "");
    }
  },
  onCode(code) {
    closeCamera({ keepHistory: true });
    openSheet(code, { fromScan: true, replace: true });
  },
});

function openCamera({ replace = false } = {}) {
  cameraEl.hidden = false;
  cameraEl.dataset.state = "starting";
  torchOn = false;
  $("torchBtn").setAttribute("aria-pressed", "false");
  if (replace) history.replaceState({ cam: true }, "");
  else history.pushState({ cam: true }, "");
  lockScroll();
  camera.start();
}

function closeCamera({ fromPop = false, keepHistory = false } = {}) {
  if (cameraEl.hidden) return;
  camera.stop();
  cameraEl.hidden = true;
  lockScroll();
  if (!fromPop && !keepHistory && history.state && history.state.cam) history.back();
}

$("openCamera").addEventListener("click", () => openCamera());
$("closeCamera").addEventListener("click", () => closeCamera());
$("camRetry").addEventListener("click", () => camera.start());
$("torchBtn").addEventListener("click", async () => {
  torchOn = await camera.setTorch(!torchOn);
  $("torchBtn").setAttribute("aria-pressed", String(torchOn));
});
$("camManual").addEventListener("click", () => {
  closeCamera();
  showManual();
});

// ===========================================================================
// Photo et saisie manuelle
// ===========================================================================
async function handlePhoto(input) {
  const file = input.files && input.files[0];
  input.value = "";
  if (!file) return;
  const fromCamera = !cameraEl.hidden;
  if (fromCamera) {
    camera.stop();
    cameraEl.dataset.state = "decoding";
  } else {
    $("homeStatus").innerHTML = loadingHtml("Lecture de la photo…");
  }
  try {
    const code = await decodeImageFile(file);
    if (fromCamera) closeCamera({ keepHistory: true });
    $("homeStatus").innerHTML = "";
    if (code) return openSheet(code, { fromScan: true, replace: fromCamera });
    if (fromCamera && history.state && history.state.cam) history.back();
    $("homeStatus").innerHTML = messageHtml("Code-barres illisible",
      "Aucun code-barres trouvé sur la photo. Cadrez le code de près, bien à plat, sans reflet, ou tapez les chiffres.");
  } catch (err) {
    if (fromCamera) closeCamera();
    $("homeStatus").innerHTML = messageHtml("Lecture impossible", esc("Le module de lecture n'a pas pu se charger. Vérifiez votre connexion."));
  }
}
$("photoInput").addEventListener("change", (e) => handlePhoto(e.target));
$("photoInputCam").addEventListener("change", (e) => handlePhoto(e.target));

function showManual() {
  $("manualForm").hidden = false;
  $("manualInput").focus();
}
$("focusManual").addEventListener("click", () => {
  if ($("manualForm").hidden) showManual();
  else $("manualForm").hidden = true;
});
$("manualForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const code = $("manualInput").value.replace(/\D/g, "");
  if (code.length < 8 || code.length > 14) {
    $("homeStatus").innerHTML = messageHtml("Code incomplet", "Un code-barres compte en général 13 chiffres (parfois 8, 12 ou 14).");
    return;
  }
  $("homeStatus").innerHTML = "";
  $("manualInput").blur();
  openSheet(code, { fromScan: true });
});

// ===========================================================================
// Accueil : derniers produits
// ===========================================================================
function renderHome() {
  const recent = store.all().slice(0, 4);
  $("homeRecent").hidden = !recent.length;
  $("homeExplain").hidden = recent.length >= 3;
  $("homeRecentList").innerHTML = recent.map((e) => rowHtml(e.p, { fav: e.fav })).join("");
}

// ===========================================================================
// Recherche
// ===========================================================================
const SUGGESTIONS = DEMO ? ["Haribo", "Nutella", "Saucisson", "Camembert", "Nuggets"] : ["Nutella", "Haribo", "Kinder", "Isla Délice", "Danone", "Oreo"];
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
  out.innerHTML = loadingHtml("Recherche en cours…");
  const digits = q.replace(/\s+/g, "");
  try {
    if (/^\d{8,14}$/.test(digits)) {
      const p = await fetchProduct(digits);
      if (ticket !== searchTicket) return;
      out.innerHTML = p ? `<div class="list">${rowHtml(p)}</div>` : messageHtml("Produit introuvable", notFoundText(digits));
      return;
    }
    if (q.length < 2) return (out.innerHTML = messageHtml("Recherche trop courte", "Tapez au moins 2 caractères."));
    const list = await off.search(q);
    if (ticket !== searchTicket) return;
    list.forEach((p) => memo.set(p.code, p));
    out.innerHTML = list.length
      ? `<p class="label" style="margin-bottom:4px">${list.length} résultat${list.length > 1 ? "s" : ""}</p><div class="list">${list.map((p) => rowHtml(p)).join("")}</div>`
      : messageHtml("Aucun résultat", `Aucun produit ne correspond à « ${esc(q)} ». Le code-barres donne un résultat plus sûr que le nom.`);
  } catch (err) {
    if (ticket === searchTicket) out.innerHTML = messageHtml("Recherche impossible", errorText(err));
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
// Historique
// ===========================================================================
let historyFilter = "all";
let confirmClear = false;

function relTime(ts) {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  const d = new Date(ts);
  const hm = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === new Date().toDateString()) return `aujourd'hui ${hm}`;
  if (d.toDateString() === new Date(Date.now() - 864e5).toDateString()) return `hier ${hm}`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

const HISTORY_FILTERS = [
  { id: "all", label: "Tous", test: () => true },
  { id: "fav", label: "Favoris", test: (e) => e.fav },
  { id: "ok", label: "Halal", test: (e) => e.p.verdict.status.startsWith("halal") },
  { id: "mashbouh", label: "Douteux", test: (e) => e.p.verdict.status === "mashbouh" },
  { id: "haram", label: "Haram", test: (e) => e.p.verdict.status === "haram" },
];
const STATUS_COLOR = { halal_certifie: "var(--c-cert)", halal_probable: "var(--c-prob)", mashbouh: "var(--c-doubt)", haram: "var(--c-haram)", inconnu: "var(--c-none)" };

function renderHistory() {
  const all = store.all();
  const counts = {};
  all.forEach((e) => (counts[e.p.verdict.status] = (counts[e.p.verdict.status] || 0) + 1));
  const present = STATUS_ORDER.filter((s) => counts[s]);

  if (!all.length) {
    $("historyStats").innerHTML = `<div class="empty">${svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>')}<strong>Aucun produit pour l'instant</strong><p>Les produits que vous scannez apparaîtront ici, consultables même sans connexion.</p><a class="btn btn-primary" href="#scan">Scanner un produit</a></div>`;
  } else {
    $("historyStats").innerHTML = `<div class="stats">
      <div class="stats-top"><span class="stats-num">${all.length}</span><span class="stats-unit">produit${all.length > 1 ? "s" : ""} vérifié${all.length > 1 ? "s" : ""}</span></div>
      <div class="bar" role="img" aria-label="${present.map((s) => `${counts[s]} ${STATUS[s].label}`).join(", ")}">${present.map((s) => `<i style="flex:${counts[s]};--c:${STATUS_COLOR[s]}"></i>`).join("")}</div>
      <div class="bar-legend">${present.map((s) => `<span><i class="dot" style="--c:${STATUS_COLOR[s]}"></i>${counts[s]} ${STATUS[s].label.toLowerCase()}</span>`).join("")}</div>
    </div>`;
  }

  $("historyFilter").hidden = !all.length;
  $("historyFilter").innerHTML = HISTORY_FILTERS.map(
    (f) => `<button type="button" class="chip" role="tab" aria-selected="${f.id === historyFilter}" data-f="${f.id}">${f.label}<span class="n">${all.filter(f.test).length}</span></button>`
  ).join("");

  const shown = all.filter(HISTORY_FILTERS.find((f) => f.id === historyFilter).test);
  $("historyList").innerHTML = !all.length
    ? ""
    : shown.length
      ? shown.map((e) => rowHtml(e.p, { fav: e.fav, when: relTime(e.at) })).join("")
      : `<div class="empty"><p>${historyFilter === "fav" ? "Aucun favori. Touchez l'étoile sur une fiche produit pour l'ajouter." : "Aucun produit dans cette catégorie."}</p></div>`;

  $("historyClear").innerHTML = !all.length
    ? ""
    : confirmClear
      ? `<span>Effacer l'historique ? Les favoris sont gardés.</span><button type="button" class="link-btn danger" data-clear="yes">Effacer</button><button type="button" class="link-btn" data-clear="no">Annuler</button>`
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
  if (current === "scan") renderHome();
});

// ===========================================================================
// Additifs (deux listes : halal et santé)
// ===========================================================================
let addMode = "halal";
let addFilter = "all";
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "");

function groupBy(entries, toItem) {
  const groups = new Map();
  for (const [code, a] of entries) {
    const key = a.level || a.severity;
    const gk = key + "|" + a.reason;
    if (!groups.has(gk)) groups.set(gk, { level: key, reason: a.reason, members: [] });
    groups.get(gk).members.push({ code: code.toUpperCase(), ...a });
  }
  return [...groups.values()].map(toItem);
}

const HALAL_ITEMS = [
  ...TEXT_RULES.map((r) => ({ group: "Ingrédients", name: r.label, sub: "", codes: [], level: r.severity, reason: r.reason })),
  ...groupBy(Object.entries(ADDITIVES), (g) => ({
    group: "Additifs (codes E)",
    name: g.members.length > 1 ? "Dérivés d'acides gras" : g.members[0].label,
    sub: "",
    codes: g.members.length > 1 ? g.members.map((m) => m.code) : [],
    level: g.level,
    reason: g.reason,
  })),
];
const HEALTH_ITEMS = groupBy(Object.entries(ADDITIVE_RISK), (g) => ({
  group: RISK_LABELS[g.level],
  name: g.members.length > 1 ? g.members.map((m) => m.name).join(", ") : g.members[0].name,
  sub: g.members.length > 1 ? "" : g.members[0].code,
  codes: g.members.length > 1 ? g.members.map((m) => m.code) : [],
  level: g.level,
  reason: g.reason,
}));

const MODES = {
  halal: { items: HALAL_ITEMS, filters: [["all", "Tous"], ["haram", "Haram"], ["mashbouh", "Douteux"], ["info", "Info"]],
    pill: (l) => `<span class="pill ${l === "haram" ? "s-haram" : l === "mashbouh" ? "s-mashbouh" : "r-info"}">${SEV_LABEL[l]}</span>`,
    order: { haram: 0, mashbouh: 1, info: 2 } },
  sante: { items: HEALTH_ITEMS, filters: [["all", "Tous"], ["eleve", "Élevé"], ["modere", "Modéré"], ["limite", "Limité"]],
    pill: (l) => `<span class="pill r-${l}">${RISK_LABELS[l].replace("Risque ", "")}</span>`,
    order: { eleve: 0, modere: 1, limite: 2 } },
};

function renderAdditives() {
  const m = MODES[addMode];
  const q = norm($("addInput").value || "");
  document.querySelectorAll(".segmented button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.mode === addMode)));
  $("addFilter").innerHTML = m.filters
    .map(([id, label]) => {
      const n = id === "all" ? m.items.length : m.items.filter((i) => i.level === id).length;
      return `<button type="button" class="chip" role="tab" aria-selected="${id === addFilter}" data-f="${id}">${label}<span class="n">${n}</span></button>`;
    })
    .join("");
  const items = m.items
    .filter((it) => (addFilter === "all" || it.level === addFilter) && (!q || norm([it.name, it.sub, it.codes.join(" "), it.reason].join(" ")).includes(q)))
    .sort((a, b) => m.order[a.level] - m.order[b.level]);
  const groups = [...new Set(items.map((i) => i.group))];
  $("addList").innerHTML = items.length
    ? groups
        .map(
          (g) => `<div class="add-group"><p class="label">${esc(g)}</p>${items
            .filter((i) => i.group === g)
            .map(
              (it) => `<div class="add-item"><div class="add-head"><span class="add-name">${esc(it.name)}${it.sub ? `<small>${esc(it.sub)}</small>` : ""}</span>${m.pill(it.level)}</div>
                ${it.codes.length ? `<div class="add-codes">${it.codes.map((c) => `<span>${esc(c)}</span>`).join("")}</div>` : ""}
                <p class="add-why">${esc(it.reason)}</p></div>`
            )
            .join("")}</div>`
        )
        .join("")
    : `<div class="empty"><strong>Rien de trouvé</strong><p>${addMode === "halal" ? "Cet ingrédient n'est pas surveillé pour le halal : il est considéré sans problème." : "Cet additif n'est pas classé à risque dans l'app."}</p></div>`;
}
document.querySelector(".segmented").addEventListener("click", (e) => {
  const b = e.target.closest("[data-mode]");
  if (!b) return;
  addMode = b.dataset.mode;
  addFilter = "all";
  renderAdditives();
});
$("addFilter").addEventListener("click", (e) => {
  const b = e.target.closest("[data-f]");
  if (!b) return;
  addFilter = b.dataset.f;
  renderAdditives();
});
$("addInput").addEventListener("input", renderAdditives);

// ===========================================================================
// Infos
// ===========================================================================
$("legendHalal").innerHTML = STATUS_ORDER.slice()
  .sort((a, b) => ["halal_certifie", "halal_probable", "mashbouh", "haram", "inconnu"].indexOf(a) - ["halal_certifie", "halal_probable", "mashbouh", "haram", "inconnu"].indexOf(b))
  .map((s) => `<div class="legend-row"><span class="pill s-${s}"><span class="dot"></span>${STATUS[s].label}</span><p>${STATUS[s].legend}</p></div>`)
  .join("");
$("legendHealth").innerHTML = HEALTH_GRADES.map((g, i) => {
  const max = i === 0 ? 100 : HEALTH_GRADES[i - 1].min - 1;
  return `<div class="legend-row"><span class="pill g-${g.id}" style="--cbg:var(--tint)"><span class="dot"></span>${g.label}</span><p>De ${g.min} à ${max} sur 100.</p></div>`;
}).join("");
if (DEMO) {
  $("demoLink").href = location.pathname + "#scan";
  $("demoLink").querySelector("strong").textContent = "Quitter le mode démo";
  $("demoLink").querySelector("small").textContent = "Revenir aux vraies données Open Food Facts";
}

// ===========================================================================
// Navigation
// ===========================================================================
const TABS = ["scan", "search", "history", "additives", "infos"];
let current = null;

function showTab(name) {
  if (!TABS.includes(name)) name = "scan";
  current = name;
  document.querySelectorAll(".view").forEach((v) => (v.hidden = v.dataset.view !== name));
  document.querySelectorAll(".tab").forEach((t) =>
    t.dataset.tab === name ? t.setAttribute("aria-current", "page") : t.removeAttribute("aria-current")
  );
  if (name === "scan") renderHome();
  if (name === "history") {
    confirmClear = false;
    renderHistory();
  }
  if (name === "additives") renderAdditives();
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", () => {
  closeCamera({ fromPop: true });
  closeSheet({ fromPop: true });
  showTab(location.hash.slice(1));
});
window.addEventListener("popstate", (e) => {
  const st = e.state || {};
  if (!st.cam) closeCamera({ fromPop: true });
  if (!st.sheet) closeSheet({ fromPop: true });
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!cameraEl.hidden) closeCamera();
  else closeSheet();
});
// Caméra rendue au système quand l'app passe en arrière-plan ; relancée au retour.
document.addEventListener("visibilitychange", () => {
  if (cameraEl.hidden) return;
  if (document.hidden) camera.stop();
  else camera.start();
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
if (DEMO) $("demoBadge").hidden = false;
showTab(location.hash.slice(1) || "scan");
// Prépare le lecteur en arrière-plan pour que le premier scan soit immédiat.
const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
idle(() => getDetector().then(() => ($("engineInfo").textContent = detectorEngine())).catch(() => {}));
