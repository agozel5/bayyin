import { createClient, OffError, present } from "./lib/off.js";
import { createCamera, decodeImageFile, getDetector, detectorEngine } from "./lib/camera.js";
import { store, localProducts } from "./lib/store.js";
import { settings, LANGS } from "./lib/settings.js";
import { classify, ADDITIVES, TEXT_RULES, TOPICS, SCHOOLS, DECISIONS, TOPIC_OF, SEVERITY_OF } from "./lib/rules.js";
import { ADDITIVE_RISK, HEALTH_GRADES } from "./lib/health.js";
import { t, tn, setLang, getLang, locale, applyStatic, LANG_NAMES } from "./lib/i18n.js";
import { readIngredients, additivesFromText } from "./lib/ocr.js";
import { SOURCES, SOURCE_BY_ID, RISK_SOURCES, FLAG_SOURCES } from "./lib/sources.js";

// Mode démo (produits d'exemple, sans connexion) : ajouter ?demo à l'adresse.
const DEMO = new URLSearchParams(location.search).has("demo");
const prefs = () => settings.get();
const off = createClient({ demo: DEMO, prefs });

const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const svg = (paths, cls = "") => `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true">${paths}</svg>`;
const fmt = (v) => Number(v).toLocaleString(locale(), { maximumFractionDigits: v < 10 ? 1 : 0 });

// ===========================================================================
// Icônes et statuts
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
  flask: '<path d="M9 3h6M10 3v6.2L4.8 18a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 9.2V3"/>',
  doc: '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M9 12h6M9 15.5h6M9 19h4"/>',
  energy: '<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.3 1.2-3.6 2.3-4.6.3 1.6 1 2.6 2 3.1C11 9 11.2 5.8 12 3z"/>',
  sugars: '<path d="M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8"/>',
  "saturated-fat": '<path d="M12 3.5c3 4 6 7.4 6 10.5a6 6 0 0 1-12 0c0-3.1 3-6.5 6-10.5z"/>',
  salt: '<path d="M8 9h8l-1 11H9zM9 9c0-3 1.3-5 3-5s3 2 3 5M11 6h.01M13 6.5h.01"/>',
  proteins: '<path d="M12 4c3.3 0 6 3.4 6 8s-2.7 8-6 8-6-3.4-6-8 2.7-8 6-8z"/>',
  fiber: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14zM5 19l7-7"/>',
  fruits: '<path d="M12 7c-4-2-8 1-7 6 .8 4 3.5 7 7 7s6.2-3 7-7c1-5-3-8-7-6zM12 7c0-2 1-3.5 3-4"/>',
};
const STATUS_ICON = { halal_certifie: I.check, halal_probable: I.check, mashbouh: I.question, haram: I.cross, inconnu: I.dash };
const STATUS_ORDER = ["haram", "mashbouh", "halal_certifie", "halal_probable", "inconnu"];
const LEGEND_ORDER = ["halal_certifie", "halal_probable", "mashbouh", "haram", "inconnu"];
const S = (st, part) => t(`status.${st}.${part}`);

// Le verdict est recalculé à l'affichage : il suit toujours les réglages actuels.
const verdictOf = (p) => (p.raw ? classify(p.raw, prefs()) : p.verdict);
const nameOf = (p) => {
  const n = p.names || {};
  return n[getLang()] || p.name || n.any || n.en || t("product.unnamed");
};
const statusPill = (st) => `<span class="pill s-${st}"><span class="dot"></span>${S(st, "short")}</span>`;
const scoreOf = (p) => (p.health && p.health.score) || null;
const miniScore = (p) => {
  const s = scoreOf(p);
  return s ? `<span class="mini-score g-${s.grade}" dir="ltr"><span class="dot"></span>${s.score}/100</span>` : "";
};

// Libellés des signalements (traduits à partir de leur identifiant)
function flagLabel(f) {
  if (f.group === "gras") return `${f.code} · ${t("flag.fatty.label")}`;
  const label = t(`flag.${f.id}.label`);
  return f.code ? `${f.code} · ${label}` : label;
}
function flagReason(f) {
  if (f.variant) return t(`flag.variant.${f.variant}`);
  if (f.group === "gras") return t("flag.fatty.reason");
  return t(`flag.${f.id}.reason`);
}
// « Source : EFSA, CIRC » avec liens
function sourceLine(ids) {
  const links = (ids || []).map((id) => SOURCE_BY_ID[id]).filter(Boolean)
    .map((src) => `<a href="${esc(src.url)}" target="_blank" rel="noopener">${esc(src.name)}</a>`);
  return links.length ? `<span class="src-line">${t("detail.source")} : ${links.join(", ")}</span>` : "";
}
const noteText = (n) => (/\s/.test(n) ? n : t(`note.${n}`)); // anciennes entrées : texte déjà rédigé

// ===========================================================================
// Fiche produit
// ===========================================================================
function productTop(p) {
  const img = p.image
    ? `<img class="p-img" src="${esc(p.image)}" alt="" referrerpolicy="no-referrer">`
    : `<span class="p-img ph">${svg(p.local ? I.doc : I.box)}</span>`;
  const meta = [p.brand, p.quantity].filter(Boolean).map(esc).join(" · ");
  const code = /^\d+$/.test(p.code) ? p.code : "";
  return `<div class="p-top">${img}<div class="p-text">
    <span class="p-name">${esc(nameOf(p))}</span>
    ${meta ? `<span class="p-meta">${meta}</span>` : ""}
    ${code ? `<span class="p-code" dir="ltr">${esc(code)}</span>` : ""}
  </div></div>`;
}

function scoreTiles(p, v) {
  const s = scoreOf(p);
  const health = s
    ? `<div class="score-tile health g-${s.grade}">
         <span class="ring" style="--p:${s.score}" dir="ltr"><span>${s.score}<small>/100</small></span></span>
         <span class="st-text"><span class="st-kicker">${t("detail.health")}</span><span class="st-value">${t(`grade.${s.grade}`)}</span></span>
       </div>`
    : `<div class="score-tile health none">
         <span class="ring" style="--p:0"><span>?</span></span>
         <span class="st-text"><span class="st-kicker">${t("detail.health")}</span><span class="st-value">${t("detail.not_rated")}</span></span>
       </div>`;
  return `<div class="scores">
    <div class="score-tile s-${v.status}">
      <span class="st-ico">${svg(STATUS_ICON[v.status])}</span>
      <span class="st-text"><span class="st-kicker">${t("detail.halal")}</span><span class="st-value">${S(v.status, "label")}</span></span>
    </div>${health}</div>`;
}

function halalSection(p, v) {
  const cert = v.certification
    ? `<div class="cert">${svg(I.shield)}${t("detail.certified")}${v.certification.organisme ? " · " + esc(v.certification.organisme) : ""}</div>`
    : "";
  const notes = [...(p.local ? [t("detail.local")] : []), ...v.notes.map(noteText)];
  const flags = v.flags.length
    ? `<div class="flags">${v.flags
        .map((f) => {
          const pillCls = f.severity === "haram" ? "s-haram" : f.severity === "mashbouh" ? "s-mashbouh" : "r-info";
          const setting = f.covered
            ? `<span class="flag-setting">${t("detail.covered")}</span>`
            : f.topic && f.decision
              ? `<span class="flag-setting">${esc(t("detail.by_setting", { topic: t(`topic.${f.topic}`), d: t(`decision.${f.decision}`).toLowerCase() }))} <a href="#settings" data-goto-settings>${t("detail.change_setting")}</a></span>`
              : "";
          return `<div class="flag ${f.severity}">
            <div class="flag-top"><span class="flag-term">${esc(flagLabel(f))}</span><span class="pill ${pillCls}">${t(`sev.${f.severity}`)}</span></div>
            <span class="flag-why">${esc(flagReason(f))}</span>
            ${setting}
            ${f.source && !f.code ? `<span class="flag-src">${esc(t("detail.found_in", { s: f.source }))}</span>` : ""}
            ${sourceLine(FLAG_SOURCES[f.id])}
          </div>`;
        })
        .join("")}</div>`
    : "";
  const ocrCta =
    v.status === "inconnu" && /^\d+$/.test(p.code)
      ? `<label class="btn btn-primary" for="ocrInput" data-ocr-code="${esc(p.code)}">${svg(I.doc)}${t("detail.photo_ingredients")}</label>`
      : "";
  return `<section class="sec"><div class="sec-head"><h3>${t("detail.halal")}</h3></div>
    <p class="lead">${S(v.status, "lead")}</p>${cert}
    ${notes.length ? `<div class="notes">${notes.map((n) => `<p>${esc(n)}</p>`).join("")}</div>` : ""}
    ${flags}${ocrCta}</section>`;
}

function nutRow(n) {
  const pct = Math.max(4, Math.min(100, (n.value / n.max) * 100));
  const textKey = n.id === "fiber" && n.value >= 6 ? "excellent" : n.level;
  return `<div class="nut lv-${n.level}">
    <span class="nut-ico">${svg(I[n.id] || I.box)}</span>
    <span class="nut-text"><strong>${t(`nut.${n.id}`)}</strong><small>${t(`nut.${n.id}.${textKey}`)}</small></span>
    <span class="nut-val" dir="ltr">${fmt(n.value)} ${esc(n.unit)}<span class="dot"></span></span>
    <span class="nut-bar"><i style="width:${pct}%"></i></span>
  </div>`;
}

function healthSection(p) {
  const h = p.health;
  if (!h) return "";
  const s = h.score;
  const risky = h.additives.length;
  const neg = h.nutrition.negatives;
  const pos = h.nutrition.positives;
  const lead = s
    ? t("detail.health_lead_html", { n: s.score, g: s.nutriscore.toUpperCase(), a: s.parts.nutrition, b: s.parts.additives, c: s.parts.bio })
    : esc(t("detail.health_none"));
  const list = (items) => `<div class="nut-list">${items.map(nutRow).join("")}</div>`;
  const addRow = (bad) =>
    `<div class="nut ${bad ? "lv-eleve" : "lv-bon"}"><span class="nut-ico">${svg(I.flask)}</span><span class="nut-text"><strong>${t("detail.additives")}</strong><small>${bad ? tn("detail.additives_risky", risky) : t("detail.additives_none")}</small></span><span class="nut-val">${bad ? risky : ""}<span class="dot"></span></span></div>`;
  const hasNut = neg.length || pos.length;
  return `<section class="sec"><div class="sec-head"><h3>${t("detail.health")}</h3><small>${t("detail.per", { u: t(h.nutrition.drink ? "unit.100ml" : "unit.100g") })}</small></div>
    <p class="lead">${lead}</p>
    ${neg.length || risky ? `<p class="sub-label">${t("detail.defects")}</p>${list(neg)}${risky ? addRow(true) : ""}` : ""}
    ${pos.length || !risky ? `<p class="sub-label">${t("detail.qualities")}</p>${list(pos)}${!risky ? addRow(false) : ""}` : ""}
    ${!hasNut ? `<p class="notes">${t("detail.nut_missing")}</p>` : ""}
    ${s || hasNut ? sourceLine(["nutriscore", "fsa"]) : ""}
  </section>`;
}

function additivesSection(p) {
  const h = p.health;
  if (!h || !h.additives.length) return "";
  return `<section class="sec"><div class="sec-head"><h3>${t("detail.watch")}</h3><small>${h.additives.length}</small></div>
    <div class="risks">${h.additives
      .map(
        (a) => `<details class="risk"><summary><span>${esc(a.code)} · ${esc(t(`addname.${a.code.toLowerCase()}`))}</span><span class="pill r-${a.level}">${t(`risk.${a.level}`)}</span></summary><p>${esc(t(`risk.reason.${a.key}`))}</p><p class="risk-src">${sourceLine(RISK_SOURCES[a.key])}</p></details>`
      )
      .join("")}</div></section>`;
}

// Tous les additifs déclarés, avec leur statut halal (selon le réglage) et leur risque santé.
function allAdditivesSection(p, v) {
  if (!p.raw || p.local) return "";
  const keys = [...new Set((p.raw.additives_tags || []).map((tag) => String(tag).replace(/^\w+:/, "").toLowerCase()))]
    .filter((k) => /^e\d{3,4}[a-z]*$/.test(k));
  if (!keys.length) return `<section class="sec"><div class="sec-head"><h3>${t("detail.all_additives")}</h3></div><p class="notes">${t("detail.add_none")}</p></section>`;
  const baseOf = (k) => k.match(/^e\d+/)[0];
  // OFF donne aussi les sous-codes (E322 et E322i) : on garde le plus précis seulement s'il est seul
  const shown = keys.filter((k) => !(k === baseOf(k) && keys.some((o) => o !== k && baseOf(o) === k)));
  const rows = shown.map((k) => {
    const flag = v.flags.find((f) => f.id === k || f.id === baseOf(k));
    const risk = (p.health && p.health.additives || []).find((a) => a.code.toLowerCase() === k || a.code.toLowerCase() === baseOf(k));
    const pills = [
      flag ? `<span class="pill ${flag.severity === "haram" ? "s-haram" : flag.severity === "mashbouh" ? "s-mashbouh" : "r-info"}">${t("detail.halal")} · ${t(`sev.${flag.severity}`)}</span>` : "",
      risk ? `<span class="pill r-${risk.level}">${t(`risk.short.${risk.level}`)}</span>` : "",
    ].join("");
    const name = risk ? t(`addname.${risk.code.toLowerCase()}`) : flag ? flagLabel(flag).replace(/^E\w+ · /, "") : "";
    return `<div class="add-row"><span class="add-code" dir="ltr">${esc(k.toUpperCase())}</span><span class="add-row-name">${esc(name)}</span>${pills || `<span class="add-ok">${t("detail.add_ok")}</span>`}</div>`;
  });
  return `<section class="sec"><div class="sec-head"><h3>${t("detail.all_additives")}</h3><small>${shown.length}</small></div><div class="add-rows">${rows.join("")}</div></section>`;
}

// Lien de signalement prérempli (ticket GitHub du projet)
function reportLink(p, v) {
  if (!/^\d+$/.test(p.code)) return "";
  const st = prefs();
  const vars = { name: nameOf(p), code: p.code, status: S(v.status, "label"), school: t(`school.${st.school}`), url: p.offUrl || "" };
  const url = "https://github.com/agozel5/bayyin/issues/new?title=" + encodeURIComponent(t("report.title", vars)) + "&body=" + encodeURIComponent(t("report.body", vars));
  return `<a class="off-link muted-link" href="${esc(url)}" target="_blank" rel="noopener">${t("detail.report")}</a>`;
}

function extraSection(p) {
  const h = p.health;
  if (!h || p.local) return "";
  const tags = h.allergenTags || [];
  const allergens = tags.length
    ? `<div class="tags">${tags.map((a) => `<span class="tag">${esc(t(`allergen.${a}`))}</span>`).join("")}</div>`
    : (h.allergens || []).length
      ? `<div class="tags">${h.allergens.map((a) => `<span class="tag">${esc(a)}</span>`).join("")}</div>`
      : `<p class="notes">${t("detail.allergens_none")}</p>`;
  const nova = h.nova
    ? `<div class="nova"><span class="nova-num nova-${h.nova.group}">${h.nova.group}</span><p><strong>${t(`nova.${h.nova.group}.t`)}</strong>${t(`nova.${h.nova.group}.p`)}</p></div>`
    : "";
  return `<section class="sec"><div class="sec-head"><h3>${t("detail.allergens")}</h3></div>${allergens}</section>
    ${nova ? `<section class="sec"><div class="sec-head"><h3>${t("detail.nova")}</h3><small>${t("detail.nova_sub")}</small></div>${nova}</section>` : ""}`;
}

function productDetail(p) {
  const v = verdictOf(p);
  const ingr = p.ingredients
    ? `<section class="sec"><details class="ingr"${p.local ? " open" : ""}><summary>${t("detail.ingredients")}</summary><p>${esc(p.ingredients.replace(/_/g, ""))}</p></details></section>`
    : "";
  const isBarcode = /^\d+$/.test(p.code);
  const alt = p.local
    ? ""
    : `<section class="sec" id="altSection"><div class="sec-head"><h3>${t("detail.alternatives")}</h3><small>${t("detail.alt_sub")}</small></div>
      <div id="altBox"><div class="loading"><span class="spinner"></span>${t("detail.alt_loading")}</div></div></section>`;
  const offLink = p.local
    ? isBarcode
      ? `<section class="sec"><a class="off-link" href="https://world.openfoodfacts.org/cgi/product.pl?type=add&code=${esc(p.code)}" target="_blank" rel="noopener">${t("msg.add_off")}</a></section>`
      : ""
    : `<section class="sec"><a class="off-link" href="${esc(p.offUrl)}" target="_blank" rel="noopener">${t("detail.off_link")}</a></section>`;
  return `${productTop(p)}${scoreTiles(p, v)}${halalSection(p, v)}${healthSection(p)}${additivesSection(p)}${alt}${allAdditivesSection(p, v)}${extraSection(p)}${ingr}${offLink.replace("</section>", reportLink(p, v) + "</section>")}`;
}

function altCard(a) {
  const img = a.image ? `<img src="${esc(a.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<span class="ph"></span>`;
  return `<button type="button" class="alt" data-open="${esc(a.code)}">${img}
    <strong>${esc(nameOf(a))}</strong><small>${esc(a.brand || "")}</small>
    <span class="alt-tags">${statusPill(verdictOf(a).status)}${miniScore(a)}</span></button>`;
}

async function loadAlternatives(p, code) {
  if (!$("altBox")) return;
  try {
    const alts = await off.alternatives(p);
    if (sheetCode !== code || !$("altBox")) return;
    alts.forEach((a) => memo.set(a.code, a));
    $("altBox").innerHTML = alts.length
      ? `<div class="alts">${alts.map(altCard).join("")}</div>`
      : `<p class="notes">${t(p.categories && p.categories.length ? "detail.alt_none" : "detail.alt_nocat")}</p>`;
  } catch {
    if (sheetCode === code && $("altBox")) $("altBox").innerHTML = `<p class="notes">${t("detail.alt_error")}</p>`;
  }
}

const loadingHtml = (text) => `<div class="loading"><span class="spinner"></span>${esc(text)}</div>`;
const messageHtml = (title, text, actions = "") =>
  `<div class="card-msg"><strong>${esc(title)}</strong><p>${esc(text)}</p>${actions ? `<div class="msg-actions">${actions}</div>` : ""}</div>`;
function errorText(err) {
  if (err instanceof OffError) {
    if (err.code === "network") return t(navigator.onLine === false ? "msg.offline_missing" : "msg.network");
    return t("msg.server");
  }
  return t("msg.unexpected");
}
const ocrButton = (code = "") =>
  `<label class="btn btn-primary" for="ocrInput" data-ocr-code="${esc(code)}">${svg(I.doc)}${t("detail.photo_ingredients")}</label>`;
const notFoundHtml = (code) => messageHtml(t("msg.notfound.t"), t("msg.notfound.p", { code }), ocrButton(code));

function rowHtml(p, { fav = false, when = "" } = {}) {
  const img = p.image
    ? `<img class="row-img" src="${esc(p.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
    : `<span class="row-img ph">${p.local ? svg(I.doc) : ""}</span>`;
  const meta = [p.brand, when].filter(Boolean).map(esc).join(" · ");
  return `<button type="button" class="row" data-open="${esc(p.code)}">${img}
    <span class="row-text"><span class="row-name">${esc(nameOf(p))}</span>
      ${meta ? `<span class="row-meta">${meta}</span>` : ""}
      <span class="row-tags">${statusPill(verdictOf(p).status)}${miniScore(p)}${fav ? svg(I.star, "row-fav") : ""}</span>
    </span>${svg(I.chev, "row-chev flip")}</button>`;
}

// ===========================================================================
// Données : Open Food Facts, puis fiche complétée par photo, puis historique (hors ligne)
// ===========================================================================
const memo = new Map();
async function fetchProduct(code) {
  if (memo.has(code)) return memo.get(code);
  let p = null;
  let error = null;
  try {
    p = await off.product(code);
  } catch (err) {
    error = err;
  }
  const local = localProducts.get(code);
  if (local && (!p || !p.ingredients)) p = present(local, prefs());
  if (!p && error) {
    const saved = store.get(code);
    if (saved) p = saved.p;
    else throw error;
  }
  if (p) memo.set(code, p);
  return p;
}

// ===========================================================================
// Fiche produit (panneau plein écran)
// ===========================================================================
const sheet = $("sheet");
const cameraEl = $("camera");
let sheetCode = null;
let sheetProduct = null;

function refreshFav() {
  const e = sheetCode && store.get(sheetCode);
  const on = !!(e && e.fav);
  $("sheetFav").hidden = !sheetProduct;
  $("sheetFav").setAttribute("aria-pressed", String(on));
  $("sheetFav").setAttribute("aria-label", t(on ? "sheet.fav_remove" : "sheet.fav_add"));
}
const lockScroll = () => document.body.classList.toggle("no-scroll", !sheet.hidden || !cameraEl.hidden);

function showSheet({ replace = false, fromScan = false } = {}) {
  $("sheetFoot").hidden = !fromScan;
  sheet.hidden = false;
  $("sheetBody").scrollTop = 0;
  if (replace) history.replaceState({ sheet: true }, "");
  else if (!(history.state && history.state.sheet)) history.pushState({ sheet: true }, "");
  lockScroll();
}

function renderSheetProduct(p) {
  sheetProduct = p;
  $("sheetTitle").textContent = nameOf(p);
  $("sheetBody").innerHTML = productDetail(p);
  refreshFav();
}

async function openSheet(code, { fromScan = false, replace = false } = {}) {
  sheetCode = code;
  sheetProduct = null;
  const cached = memo.get(code) || (store.get(code) && store.get(code).p);
  const fresh = cached && cached.health; // les très anciennes entrées n'ont pas de données santé
  $("sheetTitle").textContent = cached ? nameOf(cached) : t("sheet.title");
  $("sheetBody").innerHTML = loadingHtml(t("msg.loading"));
  showSheet({ replace, fromScan });
  refreshFav();

  if (fresh) {
    renderSheetProduct(cached);
    if (fromScan || !store.get(code)) store.add(cached);
    refreshFav();
    if (!cached.local) loadAlternatives(cached, code);
    return;
  }
  try {
    const p = await fetchProduct(code);
    if (sheetCode !== code) return;
    if (!p) {
      $("sheetTitle").textContent = t("msg.notfound.t");
      $("sheetBody").innerHTML = notFoundHtml(code);
      return;
    }
    renderSheetProduct(p);
    store.add(p);
    refreshFav();
    if (!p.local) loadAlternatives(p, code);
  } catch (err) {
    if (sheetCode !== code) return;
    $("sheetBody").innerHTML = messageHtml(t("msg.load_error.t"), errorText(err),
      `<button class="btn btn-primary" type="button" data-open="${esc(code)}">${t("msg.retry")}</button>${ocrButton(code)}`);
  }
}

function closeSheet({ fromPop = false } = {}) {
  if (sheet.hidden) return;
  sheet.hidden = true;
  sheetCode = null;
  sheetProduct = null;
  lockScroll();
  if (!fromPop && history.state && history.state.sheet) history.back();
}

$("sheetClose").addEventListener("click", () => closeSheet());
$("sheetFav").addEventListener("click", () => {
  if (!sheetCode || !sheetProduct) return;
  if (!store.get(sheetCode)) store.add(sheetProduct);
  const on = store.toggleFav(sheetCode);
  refreshFav();
  toast(t(on ? "sheet.fav_added" : "sheet.fav_removed"));
});
$("scanAgain").addEventListener("click", () => {
  sheet.hidden = true;
  sheetCode = null;
  openCamera({ replace: true });
});
if (navigator.share) {
  $("sheetShare").hidden = false;
  $("sheetShare").addEventListener("click", async () => {
    const p = sheetProduct;
    if (!p) return;
    const s = scoreOf(p);
    try {
      await navigator.share({
        title: nameOf(p),
        text: t("sheet.share_text", { name: nameOf(p), status: S(verdictOf(p).status, "label"), health: s ? t("sheet.share_health", { n: s.score }) : "" }),
        url: location.origin + location.pathname,
      });
    } catch { /* partage annulé */ }
  });
}

// Délégation : ouvrir une fiche, aller aux réglages, préparer une photo d'ingrédients
let pendingOcrCode = null;
document.addEventListener("click", (e) => {
  const open = e.target.closest("[data-open]");
  if (open) return openSheet(open.dataset.open, { replace: !sheet.hidden });
  const ocr = e.target.closest("[data-ocr-code], label[for=ocrInput]");
  if (ocr) pendingOcrCode = ocr.dataset.ocrCode || null;
  if (e.target.closest("[data-goto-settings]")) {
    e.preventDefault();
    closeSheet();
    setTimeout(() => {
      location.hash = "#settings";
      $("schoolBlock").scrollIntoView({ block: "start" });
    }, 50);
  }
});

// ===========================================================================
// Photo de la liste d'ingrédients (OCR)
// ===========================================================================
let ocrTicket = 0;
async function startOcr(file, code) {
  const ticket = ++ocrTicket;
  sheetCode = code ? `ocr:${code}` : "ocr";
  sheetProduct = null;
  $("sheetTitle").textContent = t("ocr.title");
  $("sheetBody").innerHTML = `<div class="ocr-progress"><span class="spinner"></span><p id="ocrStep">${t("ocr.loading")}</p><small>${t("ocr.loading_note")}</small><div class="progress"><i id="ocrBar"></i></div></div>`;
  showSheet({ replace: !sheet.hidden });
  refreshFav();
  try {
    const text = await readIngredients(file, {
      lang: getLang(),
      onProgress: (n) => {
        if (ticket !== ocrTicket || !$("ocrStep")) return;
        $("ocrStep").textContent = t("ocr.reading", { n });
        $("ocrBar").style.width = n + "%";
      },
    });
    if (ticket !== ocrTicket) return;
    if (!text || text.replace(/[^\p{L}]/gu, "").length < 6) {
      $("sheetBody").innerHTML = messageHtml(t("ocr.empty.t"), t("ocr.empty.p"),
        `<label class="btn btn-primary" for="ocrInput" data-ocr-code="${esc(code || "")}">${t("ocr.retake")}</label>`);
      return;
    }
    $("sheetBody").innerHTML = `<div class="ocr-review">
      <h3>${t("ocr.review")}</h3><p class="muted">${t("ocr.review_hint")}</p>
      <textarea id="ocrText" class="field area" rows="8" spellcheck="false">${esc(text)}</textarea>
      <label class="muted small" for="ocrName">${t("ocr.name")}</label>
      <input id="ocrName" class="field" type="text" autocomplete="off">
      <button class="btn btn-primary btn-block" type="button" id="ocrAnalyze">${t("ocr.analyze")}</button>
      <label class="btn btn-soft btn-block" for="ocrInput" data-ocr-code="${esc(code || "")}">${t("ocr.retake")}</label>
    </div>`;
    $("ocrAnalyze").addEventListener("click", () => analyzeOcr(code));
  } catch {
    if (ticket === ocrTicket) $("sheetBody").innerHTML = messageHtml(t("msg.reader_error.t"), t("ocr.error.p"));
  }
}

function analyzeOcr(code) {
  const text = $("ocrText").value.trim();
  if (!text) return;
  const name = $("ocrName").value.trim();
  const raw = {
    code: code || `local-${Date.now()}`,
    product_name: name || t("ocr.unnamed"),
    ingredients_text: text,
    additives_tags: additivesFromText(text),
    categories_tags: [],
    local: true,
  };
  if (code) localProducts.set(code, raw);
  const p = present(raw, prefs());
  memo.set(p.code, p);
  store.add(p);
  sheetCode = p.code;
  renderSheetProduct(p);
  if (code) toast(t("ocr.saved"));
}

$("ocrInput").addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  e.target.value = "";
  if (!file) return;
  const code = pendingOcrCode;
  pendingOcrCode = null;
  if (!cameraEl.hidden) closeCamera({ keepHistory: true });
  startOcr(file, code);
});

// ===========================================================================
// Caméra plein écran
// ===========================================================================
let torchOn = false;
const camera = createCamera({
  video: $("camVideo"),
  frame: $("camFrame"),
  onState(state, detail) {
    cameraEl.dataset.state = state;
    if (state === "starting") $("camBusyText").textContent = t("cam.opening");
    if (state === "scanning") {
      $("torchBtn").hidden = !detail.torch;
      $("engineInfo").textContent = detail.engine || detectorEngine() || "—";
    }
    if (state === "error") {
      const kind = ["https", "unsupported", "denied", "nocamera", "busy", "decoder"].includes(detail.kind) ? detail.kind : "camera";
      $("camErrorTitle").textContent = t(`cam.err.${kind}.t`);
      $("camErrorText").textContent = t(`cam.err.${kind}.p`) + (detail.message && !["denied", "https"].includes(kind) ? ` (${detail.message})` : "");
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
// Photo du code-barres et saisie manuelle
// ===========================================================================
async function handleBarcodePhoto(input) {
  const file = input.files && input.files[0];
  input.value = "";
  if (!file) return;
  const fromCamera = !cameraEl.hidden;
  if (fromCamera) {
    camera.stop();
    cameraEl.dataset.state = "decoding";
    $("camBusyText").textContent = t("cam.reading");
  } else {
    $("homeStatus").innerHTML = loadingHtml(t("cam.reading"));
  }
  try {
    const code = await decodeImageFile(file);
    if (fromCamera) closeCamera({ keepHistory: true });
    $("homeStatus").innerHTML = "";
    if (code) return openSheet(code, { fromScan: true, replace: fromCamera });
    if (fromCamera && history.state && history.state.cam) history.back();
    $("homeStatus").innerHTML = messageHtml(t("msg.photo_unreadable.t"), t("msg.photo_unreadable.p"));
  } catch {
    if (fromCamera) closeCamera();
    $("homeStatus").innerHTML = messageHtml(t("msg.reader_error.t"), t("msg.reader_error.p"));
  }
}
$("photoInput").addEventListener("change", (e) => handleBarcodePhoto(e.target));
$("photoInputCam").addEventListener("change", (e) => handleBarcodePhoto(e.target));

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
    $("homeStatus").innerHTML = messageHtml(t("msg.code_short.t"), t("msg.code_short.p"));
    return;
  }
  $("homeStatus").innerHTML = "";
  $("manualInput").blur();
  openSheet(code, { fromScan: true });
});

// ===========================================================================
// Accueil
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
function renderSuggestions() {
  $("suggestChips").innerHTML = SUGGESTIONS.map((s) => `<button type="button" class="chip" data-q="${esc(s)}">${esc(s)}</button>`).join("");
}
$("suggestChips").addEventListener("click", (e) => {
  const b = e.target.closest("[data-q]");
  if (!b) return;
  $("searchInput").value = b.dataset.q;
  runSearch(b.dataset.q);
});

let searchTicket = 0;
let lastResults = null;
async function runSearch(raw) {
  const q = raw.trim();
  const out = $("searchResults");
  $("searchSuggest").hidden = !!q;
  lastResults = null;
  if (!q) return (out.innerHTML = "");
  const ticket = ++searchTicket;
  out.innerHTML = loadingHtml(t("search.searching"));
  const digits = q.replace(/\s+/g, "");
  try {
    if (/^\d{8,14}$/.test(digits)) {
      const p = await fetchProduct(digits);
      if (ticket !== searchTicket) return;
      lastResults = p ? [p] : [];
      out.innerHTML = p ? `<div class="list">${rowHtml(p)}</div>` : notFoundHtml(digits);
      return;
    }
    if (q.length < 2) return (out.innerHTML = messageHtml(t("search.short.t"), t("search.short.p")));
    const list = await off.search(q);
    if (ticket !== searchTicket) return;
    list.forEach((p) => memo.set(p.code, p));
    lastResults = list;
    renderResults(q);
  } catch (err) {
    if (ticket === searchTicket) out.innerHTML = messageHtml(t("msg.error.t"), errorText(err));
  }
}
function renderResults(q) {
  if (!lastResults) return;
  $("searchResults").innerHTML = lastResults.length
    ? `<p class="label" style="margin-bottom:4px">${tn("search.results", lastResults.length)}</p><div class="list">${lastResults.map((p) => rowHtml(p)).join("")}</div>`
    : messageHtml(t("search.none.t"), t("search.none.p", { q }));
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
  if (s < 60) return t("when.now");
  if (s < 3600) return t("when.min", { n: Math.floor(s / 60) });
  const d = new Date(ts);
  const hm = d.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === new Date().toDateString()) return t("when.today", { t: hm });
  if (d.toDateString() === new Date(Date.now() - 864e5).toDateString()) return t("when.yesterday", { t: hm });
  return d.toLocaleDateString(locale(), { day: "numeric", month: "short" });
}

const HISTORY_FILTERS = [
  { id: "all", test: () => true },
  { id: "fav", test: (e) => e.fav },
  { id: "halal", test: (e) => verdictOf(e.p).status.startsWith("halal") },
  { id: "doubt", test: (e) => verdictOf(e.p).status === "mashbouh" },
  { id: "haram", test: (e) => verdictOf(e.p).status === "haram" },
];
const STATUS_COLOR = { halal_certifie: "var(--c-cert)", halal_probable: "var(--c-prob)", mashbouh: "var(--c-doubt)", haram: "var(--c-haram)", inconnu: "var(--c-none)" };

function renderHistory() {
  const all = store.all();
  const counts = {};
  all.forEach((e) => {
    const st = verdictOf(e.p).status;
    counts[st] = (counts[st] || 0) + 1;
  });
  const seen = STATUS_ORDER.filter((s) => counts[s]);

  $("historyStats").innerHTML = !all.length
    ? `<div class="empty">${svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>')}<strong>${t("history.empty.t")}</strong><p>${t("history.empty.p")}</p><a class="btn btn-primary" href="#scan">${t("home.scan")}</a></div>`
    : `<div class="stats">
      <div class="stats-top"><span class="stats-num">${all.length}</span><span class="stats-unit">${t(all.length === 1 ? "history.count_one" : "history.count_other")}</span></div>
      <div class="bar" role="img" aria-label="${seen.map((s) => `${counts[s]} ${S(s, "label")}`).join(", ")}">${seen.map((s) => `<i style="flex:${counts[s]};--c:${STATUS_COLOR[s]}"></i>`).join("")}</div>
      <div class="bar-legend">${seen.map((s) => `<span><i class="dot" style="--c:${STATUS_COLOR[s]}"></i>${counts[s]} ${S(s, "label")}</span>`).join("")}</div>
    </div>`;

  $("historyFilter").hidden = !all.length;
  $("historyFilter").innerHTML = HISTORY_FILTERS.map(
    (f) => `<button type="button" class="chip" role="tab" aria-selected="${f.id === historyFilter}" data-f="${f.id}">${t(`history.f.${f.id}`)}<span class="n">${all.filter(f.test).length}</span></button>`
  ).join("");

  const shown = all.filter(HISTORY_FILTERS.find((f) => f.id === historyFilter).test);
  $("historyList").innerHTML = !all.length
    ? ""
    : shown.length
      ? shown.map((e) => rowHtml(e.p, { fav: e.fav, when: relTime(e.at) })).join("")
      : `<div class="empty"><p>${t(historyFilter === "fav" ? "history.empty_fav" : "history.empty_cat")}</p></div>`;

  $("historyClear").innerHTML = !all.length
    ? ""
    : confirmClear
      ? `<span>${t("history.clear_q")}</span><button type="button" class="link-btn danger" data-clear="yes">${t("history.clear_yes")}</button><button type="button" class="link-btn" data-clear="no">${t("history.clear_no")}</button>`
      : `<button type="button" class="link-btn" data-clear="ask">${t("history.clear")}</button>`;
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
    toast(t("history.cleared"));
  }
  renderHistory();
});
store.subscribe(() => {
  if (current === "history") renderHistory();
  if (current === "scan") renderHome();
});

// ===========================================================================
// Additifs (deux listes : halal selon vos réglages, et santé)
// ===========================================================================
let addMode = "halal";
let addFilter = "all";
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "");

function halalItems() {
  const topics = prefs().topics;
  const level = (id, base) => (TOPIC_OF[id] ? SEVERITY_OF[topics[TOPIC_OF[id]]] : base);
  const items = TEXT_RULES.map((r) => ({
    group: t("add.group_ingredients"), name: t(`flag.${r.id}.label`), codes: [], reason: t(`flag.${r.id}.reason`),
    level: level(r.id, r.severity), topic: TOPIC_OF[r.id],
  }));
  const fattyCodes = [];
  for (const [code, a] of Object.entries(ADDITIVES)) {
    if (a.group === "gras") { fattyCodes.push(code.toUpperCase()); continue; }
    items.push({
      group: t("add.group_additives"), name: `${code.toUpperCase()} · ${t(`flag.${code}.label`)}`, codes: [],
      reason: t(`flag.${code}.reason`), level: level(code, a.severity), topic: TOPIC_OF[code],
    });
  }
  items.push({
    group: t("add.group_additives"), name: t("add.fatty"), codes: fattyCodes, reason: t("flag.fatty.reason"),
    level: SEVERITY_OF[topics.derives], topic: "derives",
  });
  return items;
}

function healthItems() {
  const groups = new Map();
  for (const [code, a] of Object.entries(ADDITIVE_RISK)) {
    if (!groups.has(a.key)) groups.set(a.key, { level: a.level, key: a.key, members: [] });
    groups.get(a.key).members.push(code);
  }
  return [...groups.values()].map((g) => ({
    group: t(`risk.${g.level}`),
    name: g.members.map((c) => t(`addname.${c}`)).join(", "),
    codes: g.members.map((c) => c.toUpperCase()),
    reason: t(`risk.reason.${g.key}`),
    level: g.level,
  }));
}

const ADD_MODES = {
  halal: {
    items: halalItems,
    filters: [["all", "add.f.all"], ["haram", "sev.haram"], ["mashbouh", "sev.mashbouh"], ["info", "sev.info"]],
    pill: (it) => `<span class="pill ${it.level === "haram" ? "s-haram" : it.level === "mashbouh" ? "s-mashbouh" : "r-info"}">${t(`sev.${it.level}`)}</span>`,
    order: { haram: 0, mashbouh: 1, info: 2 },
  },
  sante: {
    items: healthItems,
    filters: [["all", "add.f.all"], ["eleve", "risk.short.eleve"], ["modere", "risk.short.modere"], ["limite", "risk.short.limite"]],
    pill: (it) => `<span class="pill r-${it.level}">${t(`risk.short.${it.level}`)}</span>`,
    order: { eleve: 0, modere: 1, limite: 2 },
  },
};

function renderAdditives() {
  const m = ADD_MODES[addMode];
  const all = m.items();
  const q = norm($("addInput").value || "");
  document.querySelectorAll("#addModes button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.mode === addMode)));
  $("addFilter").innerHTML = m.filters
    .map(([id, key]) => {
      const n = id === "all" ? all.length : all.filter((i) => i.level === id).length;
      return `<button type="button" class="chip" role="tab" aria-selected="${id === addFilter}" data-f="${id}">${t(key)}<span class="n">${n}</span></button>`;
    })
    .join("");
  const items = all
    .filter((it) => (addFilter === "all" || it.level === addFilter) && (!q || norm([it.name, it.codes.join(" "), it.reason].join(" ")).includes(q)))
    .sort((a, b) => m.order[a.level] - m.order[b.level]);
  const groups = [...new Set(items.map((i) => i.group))];
  $("addList").innerHTML = items.length
    ? groups
        .map(
          (g) => `<div class="add-group"><p class="label">${esc(g)}</p>${items
            .filter((i) => i.group === g)
            .map(
              (it) => `<div class="add-item"><div class="add-head"><span class="add-name">${esc(it.name)}</span>${m.pill(it)}</div>
                ${it.codes.length ? `<div class="add-codes" dir="ltr">${it.codes.map((c) => `<span>${esc(c)}</span>`).join("")}</div>` : ""}
                <p class="add-why">${esc(it.reason)}</p>
                ${it.topic ? `<p class="add-setting">${esc(t("add.your_setting", { d: t(`decision.${prefs().topics[it.topic]}`).toLowerCase() }))} · <a href="#settings" data-goto-settings>${t("detail.change_setting")}</a></p>` : ""}
              </div>`
            )
            .join("")}</div>`
        )
        .join("")
    : `<div class="empty"><strong>${t("add.empty.t")}</strong><p>${t(addMode === "halal" ? "add.empty_halal" : "add.empty_health")}</p></div>`;
}
$("addModes").addEventListener("click", (e) => {
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
// Réglages
// ===========================================================================
function renderSettings() {
  const st = prefs();
  $("langGrid").innerHTML = LANGS.map(
    (l) => `<button type="button" role="radio" class="lang-btn" aria-checked="${st.lang === l}" data-lang="${l}" lang="${l}">${LANG_NAMES[l]}</button>`
  ).join("");

  const schools = [...Object.keys(SCHOOLS), ...(st.school === "custom" ? ["custom"] : [])];
  $("schoolList").innerHTML = schools
    .map(
      (s) => `<button type="button" role="radio" class="school" aria-checked="${st.school === s}" data-school="${s}">
        <span class="radio" aria-hidden="true"></span>
        <span class="school-text"><strong>${t(`school.${s}`)}</strong><small>${t(`school.${s}.d`)}</small></span>
      </button>`
    )
    .join("");

  $("topicList").innerHTML = TOPICS.map(
    (topic) => `<div class="topic">
      <span class="topic-name" id="tp-${topic}">${t(`topic.${topic}`)}</span>
      <div class="seg3" role="radiogroup" aria-labelledby="tp-${topic}">${DECISIONS.map(
        (d) => `<button type="button" role="radio" class="d-${d}" aria-checked="${st.topics[topic] === d}" data-topic="${topic}" data-decision="${d}">${t(`decision.${d}`)}</button>`
      ).join("")}</div>
    </div>`
  ).join("");

  renderOfflineStatus();

  $("legendHalal").innerHTML = LEGEND_ORDER.map(
    (s) => `<div class="legend-row"><span class="pill s-${s}"><span class="dot"></span>${S(s, "label")}</span><p>${S(s, "legend")}</p></div>`
  ).join("");
  $("legendHealth").innerHTML = HEALTH_GRADES.map((g, i) => {
    const max = i === 0 ? 100 : HEALTH_GRADES[i - 1].min - 1;
    return `<div class="legend-row"><span class="pill g-${g.id}" style="--cbg:var(--tint)"><span class="dot"></span>${t(`grade.${g.id}`)}</span><p>${t("health.range", { a: g.min, b: max })}</p></div>`;
  }).join("");
  document.querySelectorAll(".se-pts").forEach((el) => (el.textContent = t("health.pts", { n: el.dataset.pts })));
  $("demoLink").href = DEMO ? location.pathname + "#scan" : "?demo#scan";
  $("demoLinkT").textContent = t(DEMO ? "link.demo_exit.t" : "link.demo.t");
  $("demoLinkD").textContent = t(DEMO ? "link.demo_exit.d" : "link.demo.d");
  $("sourceList").innerHTML = ["data", "health", "halal"]
    .map((g) => `<p class="label">${t(`sources.g.${g}`)}</p><div class="source-list">${SOURCES.filter((src) => src.group === g)
      .map((src) => `<a class="source" href="${esc(src.url)}" target="_blank" rel="noopener"><span><strong>${esc(src.name)}</strong><small>${t(`src.${src.id}`)}</small></span><span aria-hidden="true">↗</span></a>`)
      .join("")}</div>`)
    .join("");
}

$("langGrid").addEventListener("click", (e) => {
  const b = e.target.closest("[data-lang]");
  if (b) settings.set({ lang: b.dataset.lang });
});
$("schoolList").addEventListener("click", (e) => {
  const b = e.target.closest("[data-school]");
  if (b && b.dataset.school !== "custom") settings.setSchool(b.dataset.school);
});
$("topicList").addEventListener("click", (e) => {
  const b = e.target.closest("[data-topic]");
  if (b) settings.setTopic(b.dataset.topic, b.dataset.decision);
});

// Pack hors connexion
let packing = false;
function renderOfflineStatus(progress) {
  const st = prefs();
  const btn = $("offlineBtn");
  btn.disabled = packing;
  btn.textContent = t(st.offlinePackAt ? "settings.offline_update" : "settings.offline_btn");
  $("offlineStatus").textContent =
    progress !== undefined
      ? t("settings.offline_progress", { n: progress })
      : st.offlinePackAt
        ? t("settings.offline_done", { n: st.offlinePackCount, d: new Date(st.offlinePackAt).toLocaleDateString(locale(), { day: "numeric", month: "long" }) })
        : "";
}
$("offlineBtn").addEventListener("click", async () => {
  if (packing) return;
  if (!("caches" in window) || !("serviceWorker" in navigator)) {
    $("offlineStatus").textContent = t("settings.offline_unsupported");
    return;
  }
  packing = true;
  renderOfflineStatus(0);
  try {
    getDetector().catch(() => {}); // garde aussi le lecteur de codes-barres en cache
    const n = await off.offlinePack({ onProgress: (count) => renderOfflineStatus(count) });
    packing = false;
    settings.set({ offlinePackAt: Date.now(), offlinePackCount: n });
  } catch {
    packing = false;
    renderOfflineStatus();
    $("offlineStatus").textContent = t("settings.offline_error");
  }
});

// Changement de réglage : tout ce qui est affiché est recalculé
settings.subscribe((st, patch) => {
  if (patch.lang) {
    setLang(st.lang);
    applyStatic();
    renderSuggestions();
  }
  renderSettings();
  if (current === "scan") renderHome();
  if (current === "history") renderHistory();
  if (current === "additives") renderAdditives();
  if (current === "search") renderResults($("searchInput").value.trim());
  if (!sheet.hidden && sheetProduct) {
    const top = $("sheetBody").scrollTop;
    renderSheetProduct(sheetProduct);
    if (!sheetProduct.local) loadAlternatives(sheetProduct, sheetCode);
    $("sheetBody").scrollTop = top;
  }
});

// ===========================================================================
// Navigation
// ===========================================================================
const TABS = ["scan", "search", "history", "additives", "settings"];
let current = null;

function showTab(name) {
  if (name === "infos") name = "settings"; // ancienne adresse
  if (!TABS.includes(name)) name = "scan";
  current = name;
  document.querySelectorAll(".view").forEach((v) => (v.hidden = v.dataset.view !== name));
  document.querySelectorAll(".tab").forEach((tab) =>
    tab.dataset.tab === name ? tab.setAttribute("aria-current", "page") : tab.removeAttribute("aria-current")
  );
  if (name === "scan") renderHome();
  if (name === "history") {
    confirmClear = false;
    renderHistory();
  }
  if (name === "additives") renderAdditives();
  if (name === "settings") renderSettings();
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
// Connexion et service worker
// ===========================================================================
function renderOnline() {
  $("offlineBadge").hidden = navigator.onLine !== false;
}
window.addEventListener("online", renderOnline);
window.addEventListener("offline", renderOnline);
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}

// ===========================================================================
// Toast
// ===========================================================================
let toastTimer;
function toast(text) {
  const el = $("toast");
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 2200);
}

// ===========================================================================
// Démarrage
// ===========================================================================
setLang(prefs().lang);
applyStatic();
renderSuggestions();
renderOnline();
if (DEMO) $("demoBadge").hidden = false;
showTab(location.hash.slice(1) || "scan");
// Prépare le lecteur en arrière-plan pour que le premier scan soit immédiat.
const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
idle(() => getDetector().then(() => ($("engineInfo").textContent = detectorEngine())).catch(() => {}));
