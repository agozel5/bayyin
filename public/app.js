import { createClient, OffError, present, classifyAny } from "./lib/off.js";
import { createCamera, decodeImageFile, getDetector, detectorEngine } from "./lib/camera.js";
import { store, localProducts } from "./lib/store.js";
import { settings, LANGS, THEMES, TEXT_SIZES } from "./lib/settings.js";
import { classify, ADDITIVES, TEXT_RULES, TOPICS, SCHOOLS, DECISIONS, TOPIC_OF, SEVERITY_OF, SCHOOL_TOPICS } from "./lib/rules.js";
import { ADDITIVE_RISK, HEALTH_GRADES } from "./lib/health.js";
import { t, tn, setLang, getLang, locale, applyStatic, LANG_NAMES } from "./lib/i18n.js";
import { readIngredients, additivesFromText } from "./lib/ocr.js";
import { SOURCES, SOURCE_BY_ID, RISK_SOURCES, FLAG_SOURCES } from "./lib/sources.js";
import { checkProfile, hasProfile, PROFILE_ALLERGENS, DIETS } from "./lib/profile.js";
import { BEAUTY_RULES } from "./lib/beauty.js";
import { isMedicineCode } from "./lib/medicine.js";
import { drawShareCard } from "./lib/sharecard.js";
import { setCosmeticDb, cosmeticDbVersion, analyzeCosmetic } from "./lib/cosmetic.js";
import { createAisle } from "./lib/aisle.js";
import { fetchPlaces, geocode, directionsUrl, osmUrl, RADII, CATEGORIES } from "./lib/places.js";
import { rankByRelevance } from "./lib/search.js";

// Mode démo (produits d'exemple, sans connexion) : ajouter ?demo à l'adresse.
const DEMO = new URLSearchParams(location.search).has("demo");
const prefs = () => settings.get();
// La base des médicaments est servie avec l'app (dossier data/med), donc aussi hors connexion.
const off = createClient({ demo: DEMO, prefs, medBase: new URL("data/med/", location.href).href });

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
  pill: '<path d="M10.5 20.5a5 5 0 0 1-7-7l6-6a5 5 0 0 1 7 7zM7 10.5l6.5 6.5"/>',
  drop: '<path d="M12 3.5c3.3 4.2 6 7.5 6 10.8a6 6 0 0 1-12 0c0-3.3 2.7-6.6 6-10.8z"/><path d="M9.5 15a2.6 2.6 0 0 0 2.5 2.4"/>',
  alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.5v.1"/>',
  user: '<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5c1.2-3.8 4-5.5 7.5-5.5s6.3 1.7 7.5 5.5"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
};
const STATUS_ICON = { halal_certifie: I.check, halal_probable: I.check, mashbouh: I.question, haram: I.cross, inconnu: I.dash };
const STATUS_ORDER = ["haram", "mashbouh", "halal_certifie", "halal_probable", "inconnu"];
const LEGEND_ORDER = ["halal_certifie", "halal_probable", "mashbouh", "haram", "inconnu"];
const S = (st, part) => t(`status.${st}.${part}`);

// Le verdict est recalculé à l'affichage : il suit toujours les réglages actuels.
const verdictOf = (p) => (p.raw ? classifyAny(p.raw, prefs()) : p.verdict);
const nameOf = (p) => {
  const n = p.names || {};
  return n[getLang()] || p.name || n.any || n.en || t("product.unnamed");
};
// Type de produit et comparaison avec le profil (allergies, régime)
const kindOf = (p) => p.kind || (p.raw && p.raw.kind) || "food";
const KIND_ICON = { food: I.box, beauty: I.drop, medicine: I.pill };
const profileOf = (p) => checkProfile(p.raw, verdictOf(p), prefs().profile);
const alertPill = (p) => alertTag(p); // allergène ou régime en toutes lettres
const statusPill = (st) => `<span class="pill s-${st}"><span class="dot"></span>${S(st, "short")}</span>`;
// Cosmétiques : la note est recalculée quand la base CosIng arrive (chargée après l'ouverture de l'app)
function healthOf(p) {
  if (p && p.raw && kindOf(p) === "beauty" && cosmeticDbVersion() && (!p.health || p.health.dbVersion !== cosmeticDbVersion())) {
    p.health = analyzeCosmetic(p.raw);
  }
  return p && p.health;
}
const scoreOf = (p) => { const h = healthOf(p); return (h && h.score) || null; };
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
    : `<span class="p-img ph">${svg(p.local ? I.doc : KIND_ICON[kindOf(p)])}</span>`;
  const meta = [p.brand, p.quantity].filter(Boolean).map(esc).join(" · ");
  const code = /^\d+$/.test(p.code) ? p.code : "";
  return `<div class="p-top">${img}<div class="p-text">
    <span class="p-name">${esc(nameOf(p))}</span>
    ${meta ? `<span class="p-meta">${meta}</span>` : ""}
    ${code ? `<span class="p-code" dir="ltr">${esc(code)}</span>` : ""}
  </div></div>`;
}

// Verdict en grand : la réponse se lit en une demi-seconde, la note santé juste en dessous.
function verdictHero(p, v) {
  const s = scoreOf(p);
  const kind = kindOf(p);
  // Aliments : note santé ; cosmétiques : note des ingrédients ; médicaments : forme pharmaceutique
  const scoreLabel = t(kind === "beauty" ? "detail.cosmetic" : "detail.health");
  const foot = kind === "medicine"
    ? `<span class="kind-ico">${svg(KIND_ICON[kind])}</span>
       <span class="v-foot-text"><span>${t(`kind.${kind}`)}</span><strong>${esc(p.form || t("kind.medicine"))}</strong></span>`
    : s
      ? `<span class="ring" style="--p:${s.score}" dir="ltr"><span>${s.score}<small>/100</small></span></span>
         <span class="v-foot-text"><span>${scoreLabel}</span><strong>${t(`grade.${s.grade}`)}</strong></span>
         <span class="grade-dot g-${s.grade}" aria-hidden="true"></span>`
      : `<span class="ring" style="--p:0"><span>?</span></span>
         <span class="v-foot-text"><span>${scoreLabel}</span><strong>${t(kind === "beauty" ? "detail.cosmetic_none_short" : "detail.not_rated")}</strong></span>`;
  return `<div class="verdict v-${v.status}" role="status">
    <div class="v-main">
      <span class="v-ico">${svg(STATUS_ICON[v.status])}</span>
      <span class="v-text"><span class="v-kicker">${t("detail.halal")}</span><strong class="v-label">${S(v.status, "label")}</strong><span class="v-lead">${S(v.status, "lead")}</span></span>
    </div>
    <div class="v-foot">${foot}</div>
  </div>`;
}

// Alerte personnelle en haut de la fiche
function profileAlert(p) {
  const r = profileOf(p);
  if (!r.alert) return "";
  const names = (tags) => tags.map((a) => t(`allergen.${a}`)).join(", ");
  const lines = [
    r.contains.length ? t("alert.contains", { list: names(r.contains) }) : null,
    r.diet ? t(`alert.${r.diet.id}.${r.diet.level}`) : null,
    r.traces.length ? t("alert.traces", { list: names(r.traces) }) : null,
  ].filter(Boolean);
  return `<div class="alert-card a-${r.alert}" role="alert">
    <span class="alert-top">${svg(I.alert)}${t(`alert.${r.alert}`)}</span>
    ${lines.map((l) => `<p>${esc(l)}</p>`).join("")}
    <small>${t("alert.note")}</small>
    <a href="#settings" data-goto-settings="profile">${t("alert.edit")}</a>
  </div>`;
}

// Médicament : forme, laboratoire, conseil
function medicineSection(p) {
  return `<section class="sec"><div class="sec-head"><h3>${t("kind.medicine")}</h3></div>
    <p class="lead">${t("detail.med_lead")}</p>
    <div class="kv"><div><span>${t("detail.med_form")}</span><strong>${esc(p.form || "—")}</strong></div>
    ${p.brand ? `<div><span>${t("detail.med_holder")}</span><strong>${esc(p.brand)}</strong></div>` : ""}</div>
    <p class="advice">${svg(I.bulb)}<span>${t("detail.med_ask")}</span></p>
    <p class="notes">${t("detail.med_source")}</p>
  </section>`;
}

function halalSection(p, v) {
  // Label lu sur la fiche Open Food Facts : les organismes ne publient pas la liste de leurs produits,
  // on ne peut donc pas le confirmer automatiquement. On le dit, et on donne un moyen de vérifier.
  const org = v.certification && v.certification.organisme;
  const verifyUrl = org
    ? CERT_LINKS[org] || `https://duckduckgo.com/?q=${encodeURIComponent(`${org} halal ${p.brand || ""}`)}`
    : `https://duckduckgo.com/?q=${encodeURIComponent(`${p.brand || nameOf(p)} halal certification organisme`)}`;
  const cert = v.certification
    ? `<div class="cert">${svg(I.shield)}${t("detail.certified")}${org ? " · " + esc(org) : ""}</div>
       <p class="cert-note">${t("cert.unverified")} <a href="${esc(verifyUrl)}" target="_blank" rel="noopener">${esc(org ? t("cert.verify", { org }) : t("cert.verify_any"))} ↗</a></p>`
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
    v.status === "inconnu" && /^\d+$/.test(p.code) && kindOf(p) === "food"
      ? `<label class="btn btn-primary" for="ocrInput" data-ocr-code="${esc(p.code)}">${svg(I.doc)}${t("detail.photo_ingredients")}</label>`
      : "";
  return `<section class="sec"><div class="sec-head"><h3>${t("detail.halal")}</h3></div>
    ${cert}
    ${notes.length ? `<div class="notes">${notes.map((n) => `<p>${esc(n)}</p>`).join("")}</div>` : ""}
    ${flags}${askBrand(p, v)}${ocrCta}</section>`;
}

// Pages des organismes où l'on peut vérifier un partenaire (seulement celles qui ont été vérifiées)
const CERT_LINKS = { AVS: "https://avs.fr/en/suppliers/" };

// « Demander à la marque » : un message prêt à envoyer sur les ingrédients douteux
function askBrandMessage(p, v) {
  const doubts = v.flags.filter((f) => f.severity === "mashbouh" || f.severity === "haram").map((f) => flagLabel(f));
  return {
    subject: t("ask.subject", { name: nameOf(p) }),
    body: t("ask.body", { name: nameOf(p), brand: p.brand || "", code: p.code, list: doubts.map((d) => "- " + d).join("\n") }),
  };
}
function askBrand(p, v) {
  if (kindOf(p) === "medicine" || !/^\d+$/.test(p.code)) return "";
  if (!v.flags.some((f) => f.severity === "mashbouh" && !f.covered)) return "";
  const m = askBrandMessage(p, v);
  const mail = `mailto:?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.body)}`;
  const find = `https://duckduckgo.com/?q=${encodeURIComponent(`${p.brand || nameOf(p)} service consommateurs contact`)}`;
  return `<div class="ask">
    <strong>${t("ask.t")}</strong><p>${t("ask.p")}</p>
    <div class="ask-actions">
      <a class="btn btn-primary" href="${esc(mail)}">${svg('<path d="M4 6h16v12H4z"/><path d="M4 7l8 6 8-6"/>')}${t("ask.write")}</a>
      <button class="btn btn-soft" type="button" data-ask-copy>${t("ask.copy")}</button>
      <a class="btn btn-soft" href="${esc(find)}" target="_blank" rel="noopener">${t("ask.find")}</a>
    </div>
  </div>`;
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

// Cosmétiques : la note croise le danger de chaque ingrédient et l'exposition (type de produit)
const CTX_ORDER = ["rinse", "spray", "powder", "lip", "child"];
function cosmeticSection(p) {
  const h = healthOf(p);
  if (!h || !h.cosmetic) return "";
  const s = h.score;
  if (!s) return `<section class="sec"><div class="sec-head"><h3>${t("detail.cosmetic")}</h3></div><p class="notes">${t("detail.cosmetic_none")}</p></section>`;
  const all = h.risks || [];
  const risks = all.filter((r) => r.level);
  const safeHere = all.filter((r) => !r.level);
  const ctx = h.context || {};
  const ctxTags = [ctx.rinse ? "rinse" : "leave", ...CTX_ORDER.slice(1).filter((k) => ctx[k])]
    .map((k) => `<span class="ctx-tag">${esc(t(`cosm.ctx.${k}`))}</span>`).join("");
  const lead = risks.length
    ? t("detail.cosmetic_lead", { n: s.score, k: h.analyzed, e: s.parts.eleve, m: s.parts.modere, l: s.parts.limite })
    : t("detail.cosmetic_clean", { n: s.score, k: h.analyzed });
  const title = (r) => t(`cosm.${r.key}.t`);
  const rows = risks
    .map((r) => `<details class="risk"><summary><span class="risk-name"><span dir="ltr">${esc(r.name)}</span>${r.name.toLowerCase() === title(r).toLowerCase() ? "" : `<small>${esc(title(r))}</small>`}<span class="kind-tags">${r.kinds.map((k) => `<span class="kind-tag k-${k}">${esc(t(`cosm.kind.${k}`))}</span>`).join("")}</span></span><span class="pill r-${r.level}">${t(`risk.${r.level}`)}</span></summary>
      <p>${esc(t(`cosm.${r.key}.p`))}</p>
      ${r.dose ? `<p class="risk-dose">${esc(t(`cosm.dose.${r.dose}`))}</p>` : ""}
      <p class="risk-src">${sourceLine(r.sources)}</p></details>`)
    .join("");
  const safe = safeHere.length
    ? `<details class="risk risk-safe"><summary><span class="risk-name"><span>${esc(t("detail.cosmetic_safe_here", { n: safeHere.length }))}</span><small dir="ltr">${esc(safeHere.map((r) => r.name).join(", "))}</small></span></summary><p>${esc(t("detail.cosmetic_safe_here_p"))}</p></details>`
    : "";
  return `<section class="sec"><div class="sec-head"><h3>${t("detail.cosmetic")}</h3><small>${t("detail.cosmetic_sub")}</small></div>
    <p class="lead">${esc(lead)}</p>
    <div class="ctx-line"><span>${t("detail.cosmetic_ctx")}</span>${ctxTags}</div>
    ${risks.length ? `<p class="sub-label">${t("detail.cosmetic_watch")}</p><div class="risks">${rows}${safe}</div>` : `<div class="nut lv-bon"><span class="nut-ico">${svg(I.flask)}</span><span class="nut-text"><strong>${t("detail.cosmetic_ok_t")}</strong><small>${t("detail.cosmetic_ok_p")}</small></span><span class="nut-val"><span class="dot"></span></span></div>${safe ? `<div class="risks">${safe}</div>` : ""}`}
    <p class="notes">${t("detail.cosmetic_method")}</p>
  </section>`;
}

// Liste complète des ingrédients d'un cosmétique : rôle (CosIng) et niveau de risque dans ce produit
const fnLabel = (f) => {
  const k = "fn." + f.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const v = t(k);
  return v === k ? f.charAt(0) + f.slice(1).toLowerCase() : v;
};
// Rôles les plus parlants d'abord (CosIng les liste sans ordre) ; rôles secondaires à la fin
const FN_FIRST = ["PRESERVATIVE", "UV FILTER", "UV ABSORBER", "COLORANT", "HAIR DYEING", "SURFACTANT - CLEANSING", "SURFACTANT - EMULSIFYING",
  "SKIN CONDITIONING - EMOLLIENT", "SKIN CONDITIONING - HUMECTANT", "HUMECTANT", "PERFUMING", "ANTIOXIDANT", "ANTIPERSPIRANT", "DEODORANT",
  "EXFOLIATING", "SOLVENT", "VISCOSITY CONTROLLING", "FILM FORMING", "HAIR CONDITIONING", "SKIN CONDITIONING", "SKIN PROTECTING"];
const FN_LAST = ["DENATURANT", "FRAGRANCE", "ANTIFOAMING", "BUFFERING", "ORAL CARE", "ANTISTATIC", "BINDING", "BULKING", "NOT REPORTED"];
const fnRank = (f) => { const i = FN_FIRST.indexOf(f); return i >= 0 ? i : FN_LAST.includes(f) ? 900 + FN_LAST.indexOf(f) : 100; };
const sortFunctions = (list) => {
  const main = list.filter((f) => !FN_LAST.includes(f));
  return [...(main.length ? main : list)].sort((a, b) => fnRank(a) - fnRank(b));
};
function ingredientListSection(p) {
  const h = healthOf(p);
  const list = (h && h.ingredients) || [];
  if (!list.length || !h.coverage) return "";
  const rows = list.map((x) => {
    const cls = x.level ? `lv-${x.level}` : x.known ? "lv-ok" : "lv-unk";
    const fns = [...new Set(sortFunctions(x.functions).map(fnLabel))].slice(0, 3).join(" · ");
    const sub = fns || (x.known ? t("detail.ing_ok") : t("detail.ing_unknown"));
    const pill = x.level ? `<span class="pill r-${x.level}">${t(`risk.short.${x.level}`)}</span>` : "";
    return `<li class="ing ${cls}"><span class="ing-dot" aria-hidden="true"></span><span class="ing-text"><strong dir="ltr">${esc(x.name)}</strong><small>${esc(sub)}</small></span>${pill}</li>`;
  }).join("");
  const c = h.coverage;
  const low = c.total >= 4 && c.known / c.total < 0.7;
  return `<section class="sec"><details class="ingr-all"><summary><span>${t("detail.all_ingredients")}</span><small>${list.length}</small></summary>
    <p class="notes">${esc(t("detail.coverage", { k: c.known, n: c.total }))}${low ? ` ${esc(t("detail.coverage_low"))}` : ""}</p>
    <ul class="ing-list">${rows}</ul>
    <p class="notes">${t("detail.ing_legend")} ${sourceLine(["cosing"])}</p>
    ${p.ingredients ? `<details class="ingr ingr-raw"><summary>${t("detail.ingredients")}</summary><p>${esc(p.ingredients.replace(/_/g, ""))}</p></details>` : ""}
  </details></section>`;
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
  if (!h || p.local || h.cosmetic) return "";
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
  const kind = kindOf(p);
  const ingrList = kind === "beauty" ? ingredientListSection(p) : "";
  const ingr = ingrList || (p.ingredients
    ? `<section class="sec"><details class="ingr"${p.local ? " open" : ""}><summary>${t("detail.ingredients")}</summary><p>${esc(p.ingredients.replace(/_/g, ""))}</p></details></section>`
    : "");
  const isBarcode = /^\d+$/.test(p.code);
  const alt = p.local || kind === "medicine"
    ? ""
    : `<section class="sec" id="altSection"><div class="sec-head"><h3>${t("detail.alternatives")}</h3><small>${t(kind === "beauty" ? "detail.alt_sub_beauty" : "detail.alt_sub")}</small></div>
      <div id="altBox"><div class="loading"><span class="spinner"></span>${t("detail.alt_loading")}</div></div></section>`;
  const offLink = p.local
    ? isBarcode
      ? `<section class="sec"><a class="off-link" href="https://world.openfoodfacts.org/cgi/product.pl?type=add&code=${esc(p.code)}" target="_blank" rel="noopener">${t("msg.add_off")}</a></section>`
      : ""
    : p.offUrl
      ? `<section class="sec"><a class="off-link" href="${esc(p.offUrl)}" target="_blank" rel="noopener">${t(kind === "medicine" ? "detail.med_link" : kind === "beauty" ? "detail.obf_link" : "detail.off_link")}</a></section>`
      : `<section class="sec"></section>`;
  const food = kind === "food";
  return `${productTop(p)}${verdictHero(p, v)}${profileAlert(p)}${halalSection(p, v)}${kind === "medicine" ? medicineSection(p) : ""}${kind === "beauty" ? cosmeticSection(p) : ""}${food ? healthSection(p) + additivesSection(p) : ""}${alt}${food ? allAdditivesSection(p, v) : ""}${extraSection(p)}${ingr}${offLink.replace("</section>", reportLink(p, v) + "</section>")}`;
}

// Mot clair à la place d'un « ! » : l'allergène en cause, ou le régime non respecté
function alertTag(p) {
  const pr = profileOf(p);
  if (!pr.alert) return "";
  const al = (x) => t(`allergen.${x}`);
  const word = pr.contains.length
    ? al(pr.contains[0]) + (pr.contains.length > 1 ? ` +${pr.contains.length - 1}` : "")
    : pr.diet
      ? t(`alert.tag.${pr.diet.id}.${pr.diet.level}`)
      : t("alert.tag.traces", { x: al(pr.traces[0]) });
  const full = pr.contains.length ? t("alert.contains", { list: pr.contains.map(al).join(", ") }) : t(`alert.${pr.alert}`);
  return `<span class="alert-tag a-${pr.alert}" title="${esc(full)}">${svg(I.alert)}<span>${esc(word)}</span></span>`;
}

function altCard(a, { fav = false } = {}) {
  const img = a.image
    ? `<img src="${esc(a.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
    : `<span class="ph">${svg(a.local ? I.doc : KIND_ICON[kindOf(a)])}</span>`;
  const st = verdictOf(a).status;
  return `<button type="button" class="alt" data-open="${esc(a.code)}">
    <span class="alt-band s-${st}">${svg(STATUS_ICON[st])}<span>${esc(S(st, "label"))}</span>${fav ? svg(I.star, "alt-fav") : ""}</span>${img}
    <strong>${esc(nameOf(a))}</strong><small>${esc(a.brand || "")}</small>
    <span class="alt-tags">${miniScore(a)}${alertTag(a)}</span></button>`;
}

async function loadAlternatives(p, code) {
  if (!$("altBox")) return;
  try {
    const alts = (await off.alternatives(p)).filter((a) => !profileOf(a).alert); // respecte le profil
    if (sheetCode !== code || !$("altBox")) return;
    alts.forEach((a) => memo.set(a.code, a));
    $("altBox").innerHTML = alts.length
      ? `<div class="alts">${alts.map(altCard).join("")}</div>`
      : `<p class="notes">${t(p.categories && p.categories.length ? "detail.alt_none" : "detail.alt_nocat")}</p>`;
  } catch {
    if (sheetCode === code && $("altBox")) $("altBox").innerHTML = `<p class="notes">${t("detail.alt_error")}</p>`;
  }
}

// Squelette de fiche pendant le chargement
const skeletonHtml = () => `<div class="skel" aria-busy="true" aria-label="${esc(t("msg.loading"))}">
  <div class="sk-row"><i style="width:118px;height:118px;border-radius:22px"></i><div style="flex:1;display:flex;flex-direction:column;gap:10px"><i style="height:22px;width:85%"></i><i style="height:16px;width:50%"></i></div></div>
  <i style="height:150px;border-radius:28px"></i>
  <i style="height:18px;width:40%"></i><i style="height:14px"></i><i style="height:14px;width:90%"></i>
  <i style="height:80px;border-radius:20px"></i></div>`;
// Petite illustration pour les pages vides (panier + étoile de la marque)
const emptyArt = () => `<svg class="empty-art" viewBox="0 0 120 96" aria-hidden="true">
  <circle cx="60" cy="50" r="40" fill="#E3F3EB" stroke="none"/>
  <path d="M36 40h48l-5 30a6 6 0 0 1-6 5H47a6 6 0 0 1-6-5z" fill="#fff" stroke="#12724F" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="M46 40l8-14M74 40l-8-14" stroke="#12724F" stroke-width="2.4" stroke-linecap="round" fill="none"/>
  <path d="M52 52v12M60 52v12M68 52v12" stroke="#9CC9B4" stroke-width="2.4" stroke-linecap="round" fill="none"/>
  <g transform="translate(88 22)" fill="none" stroke="#E7B84E" stroke-width="2"><rect x="-7" y="-7" width="14" height="14"/><rect x="-7" y="-7" width="14" height="14" transform="rotate(45)"/></g>
</svg>`;
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
const notFoundHtml = (code) =>
  isMedicineCode(code)
    ? messageHtml(t("msg.notfound.t"), t("msg.med_notfound", { code }))
    : messageHtml(t("msg.notfound.t"), t("msg.notfound.p", { code }), ocrButton(code));

function rowHtml(p, { fav = false, when = "" } = {}) {
  const img = p.image
    ? `<img class="row-img" src="${esc(p.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
    : `<span class="row-img ph">${svg(p.local ? I.doc : KIND_ICON[kindOf(p)])}</span>`;
  const meta = [kindOf(p) !== "food" ? t(`kind.${kindOf(p)}`) : "", p.brand, when].filter(Boolean).map(esc).join(" · ");
  return `<button type="button" class="row" data-open="${esc(p.code)}">${img}
    <span class="row-text"><span class="row-name">${esc(nameOf(p))}</span>
      ${meta ? `<span class="row-meta">${meta}</span>` : ""}
      <span class="row-tags">${statusPill(verdictOf(p).status)}${miniScore(p)}${alertPill(p)}${fav ? svg(I.star, "row-fav") : ""}</span>
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
const lockScroll = () => document.body.classList.toggle("no-scroll", !sheet.hidden || !cameraEl.hidden || !$("aisle").hidden);

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
  $("sheetCompare").hidden = kindOf(p) === "medicine";
  $("sheetShare").hidden = false;
  refreshFav();
}

async function openSheet(code, { fromScan = false, replace = false } = {}) {
  sheetCode = code;
  sheetProduct = null;
  const cached = memo.get(code) || (store.get(code) && store.get(code).p);
  const fresh = cached && cached.health; // les très anciennes entrées n'ont pas de données santé
  $("sheetTitle").textContent = cached ? nameOf(cached) : t("sheet.title");
  $("sheetBody").innerHTML = skeletonHtml();
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
// Partage : une carte image du verdict (ou le texte si le partage d'image n'est pas possible)
$("sheetShare").hidden = false;
$("sheetShare").addEventListener("click", async () => {
  const p = sheetProduct;
  if (!p) return;
  const v = verdictOf(p);
  const s = scoreOf(p);
  const text = t("sheet.share_text", { name: nameOf(p), status: S(v.status, "label"), health: s ? t(kindOf(p) === "beauty" ? "sheet.share_cosmetic" : "sheet.share_health", { n: s.score }) : "" });
  const url = location.origin + location.pathname;
  try {
    const blob = await drawShareCard({
      name: nameOf(p), brand: p.brand, image: p.image, status: v.status, statusLabel: S(v.status, "label"),
      kicker: t("detail.halal"), lead: S(v.status, "lead"), score: s ? s.score : null, grade: s && s.grade,
      gradeLabel: s ? t(`grade.${s.grade}`) : "", healthLabel: t(kindOf(p) === "beauty" ? "detail.cosmetic" : "detail.health"), footer: t("share.footer"), rtl: getLang() === "ar",
    });
    const file = new File([blob], `bayyin-${p.code}.png`, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: nameOf(p), text: `${text}\n${url}` });
    } else if (navigator.share) {
      await navigator.share({ title: nameOf(p), text, url });
    } else {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      toast(t("share.saved"));
    }
  } catch {
    /* partage annulé */
  }
});

// Délégation : ouvrir une fiche, aller aux réglages, préparer une photo d'ingrédients
let pendingOcrCode = null;
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-ask-copy]") && sheetProduct) {
    const m = askBrandMessage(sheetProduct, verdictOf(sheetProduct));
    navigator.clipboard?.writeText(`${m.subject}\n\n${m.body}`).then(() => toast(t("ask.copied")), () => {});
    return;
  }
  const base = e.target.closest("[data-compare-base]");
  if (base) {
    const p = (store.get(base.dataset.compareBase) || {}).p;
    if (p) pickCompareSecond(p);
    return;
  }
  const cmp = e.target.closest("[data-compare]");
  if (cmp) return showCompare(cmp.dataset.compare);
  if (e.target.closest("[data-basket-clear]")) {
    basket.clear();
    toast(t("basket.cleared"));
    return renderBasket();
  }
  if (e.target.closest("[data-scan-now]")) {
    closeSheet();
    return setTimeout(() => openCamera(), 60);
  }
  if (e.target.closest("[data-basket-scan]")) {
    basketMode = true;
    closeSheet();
    return setTimeout(() => openCamera(), 60);
  }
  const open = e.target.closest("[data-open]");
  if (open) return openSheet(open.dataset.open, { replace: !sheet.hidden });
  const ocr = e.target.closest("[data-ocr-code], label[for=ocrInput]");
  if (ocr) pendingOcrCode = ocr.dataset.ocrCode || null;
  const go = e.target.closest("[data-goto-settings]");
  if (go) {
    e.preventDefault();
    closeSheet();
    // Page des réglages concernée : profil (allergies, régime) ou avis religieux
    const page = go.dataset.gotoSettings === "profile" ? "profile" : "religion";
    setTimeout(() => (location.hash = `#settings/${page}`), 50);
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
let slowTimer = null;
const camera = createCamera({
  video: $("camVideo"),
  frame: $("camFrame"),
  onState(state, detail) {
    cameraEl.dataset.state = state;
    if (state === "starting") $("camBusyText").textContent = t("cam.opening");
    clearTimeout(slowTimer);
    $("camHint").classList.remove("slow");
    $("camHint").textContent = t("cam.hint");
    if (state === "scanning") {
      // Rien de lu au bout de 8 s : un conseil, et la saisie manuelle reste à portée de main
      slowTimer = setTimeout(() => {
        $("camHint").textContent = t("cam.slow");
        $("camHint").classList.add("slow");
      }, 8000);
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
    clearTimeout(slowTimer);
    if (basketMode) return basketScan(code); // mode courses : on reste dans la caméra
    // Confirmation : cadre vert un court instant, puis la fiche
    cameraEl.classList.add("found");
    setTimeout(() => {
      cameraEl.classList.remove("found");
      closeCamera({ keepHistory: true });
      openSheet(code, { fromScan: true, replace: true });
    }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 260);
  },
});

function openCamera({ replace = false } = {}) {
  cameraEl.hidden = false;
  $("camFlash").hidden = true;
  renderBasketButtons();
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
  basketMode = false; // le mode courses ne dure que le temps d'une session de caméra
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
  $("focusManual").setAttribute("aria-expanded", "true");
  $("manualInput").focus();
}
$("focusManual").addEventListener("click", () => {
  if ($("manualForm").hidden) showManual();
  else {
    $("manualForm").hidden = true;
    $("focusManual").setAttribute("aria-expanded", "false");
  }
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
  $("manualInput").value = "";
  $("manualForm").hidden = true;
  $("focusManual").setAttribute("aria-expanded", "false");
  openSheet(code, { fromScan: true });
});

// ===========================================================================
// Accueil
// ===========================================================================
const TIP_COUNT = 8;
const TIP_KEY = "bayyin_tip_hidden";
const today = () => Math.floor(Date.now() / 864e5);
function tipHiddenToday() {
  try {
    return Number(localStorage.getItem(TIP_KEY)) === today();
  } catch {
    return false;
  }
}
$("homeTipClose").addEventListener("click", () => {
  try {
    localStorage.setItem(TIP_KEY, String(today())); // revient demain, avec une autre astuce
  } catch { /* stockage indisponible */ }
  $("homeTipBox").classList.add("closing");
  setTimeout(() => ($("homeTipBox").hidden = true), 220);
});

// Petit bilan des 7 derniers jours : une barre proportionnelle et sa légende
function weekSummary(all) {
  const week = all.filter((e) => e.at > Date.now() - 7 * 864e5);
  if (!week.length) return `<p class="wk-title">${esc(t("home.week_none"))}</p>`;
  const c = { ok: 0, doubt: 0, bad: 0, other: 0 };
  week.forEach((e) => {
    const st = verdictOf(e.p).status;
    if (st === "haram" || profileOf(e.p).alert === "no") c.bad++;
    else if (st === "mashbouh") c.doubt++;
    else if (st === "halal_certifie" || st === "halal_probable") c.ok++;
    else c.other++;
  });
  const seg = (k) => (c[k] ? `<i class="wk-${k}" style="flex:${c[k]}"></i>` : "");
  const leg = (k) => (c[k] ? `<span class="wk-${k}"><i></i>${esc(t(`home.wk_${k}`, { n: c[k] }))}</span>` : "");
  return `<p class="wk-title">${esc(tn("home.week", week.length))}</p>
    <div class="wk-bar" aria-hidden="true">${seg("ok")}${seg("doubt")}${seg("bad")}${seg("other")}</div>
    <p class="wk-legend">${leg("ok")}${leg("doubt")}${leg("bad")}</p>`;
}

function renderHome() {
  const all = store.all();
  $("view-scan").classList.toggle("returning", all.length > 0); // accueil court pour qui revient
  // Premier passage : ce que fait l'app ; ensuite : bonjour et bilan de la semaine
  if (all.length) $("h-home").textContent = t("home.greet");
  else $("h-home").innerHTML = t("home.h1_html");
  $("homeLead").hidden = !!all.length;
  $("homeWeek").hidden = !all.length;
  if (all.length) $("homeWeek").innerHTML = weekSummary(all);
  renderBasketButtons();
  const recent = all.slice(0, 10);
  const favs = all.filter((e) => e.fav).slice(0, 10);
  $("homeRecent").hidden = !recent.length;
  $("homeFavs").hidden = !favs.length;
  $("homeExplain").hidden = all.length >= 3;
  $("homeRecentList").innerHTML = recent.map((e) => altCard(e.p, { fav: e.fav })).join("");
  $("homeFavList").innerHTML = favs.map((e) => altCard(e.p, { fav: true })).join("");
  // Pastilles : école et profil, qui mènent aux Réglages
  const st = prefs();
  const prof = st.profile;
  const profText = hasProfile(prof)
    ? [prof.diet ? t(`diet.${prof.diet}`) : null, ...prof.allergens.slice(0, 2).map((x) => t(`allergen.${x}`)), prof.allergens.length > 2 ? `+${prof.allergens.length - 2}` : null]
        .filter(Boolean).join(" · ")
    : null;
  $("homeChips").innerHTML =
    `<a class="set-chip" href="#settings" data-goto-settings="school">${svg(I.shield)}<span>${esc(t("home.school_chip", { s: t(`school.${st.school}`) }))}</span></a>` +
    `<a class="set-chip${profText ? "" : " accent"}" href="#settings" data-goto-settings="profile">${svg(I.user)}<span>${esc(profText ? t("home.profile_chip", { p: profText }) : t("home.profile_add"))}</span></a>`;
  $("homeTip").textContent = t(`home.tip.${1 + (today() % TIP_COUNT)}`); // une astuce par jour
  $("homeTipBox").hidden = tipHiddenToday();
  $("homeTipBox").classList.remove("closing");
}

// ===========================================================================
// Recherche
// ===========================================================================
const SUGGESTIONS = DEMO ? ["Haribo", "Nutella", "Saucisson", "Camembert", "Nuggets"] : ["Nutella", "Haribo", "Isla Délice", "Kinder", "Danone"];
function renderSuggestions() {
  // Des marques, et deux mots courants dans la langue de l'app (la recherche les comprend dans les 4 langues)
  const ideas = [...SUGGESTIONS.slice(0, 3), t("search.idea_milk"), t("search.idea_chicken"), ...SUGGESTIONS.slice(3)];
  $("suggestChips").innerHTML = ideas.map((s) => `<button type="button" class="chip" data-q="${esc(s)}">${esc(s)}</button>`).join("");
}
$("suggestChips").addEventListener("click", (e) => {
  const b = e.target.closest("[data-q]");
  if (!b) return;
  $("searchInput").value = b.dataset.q;
  runSearch(b.dataset.q);
});

let searchCtl = null;
let searchRunning = ""; // recherche en cours : un deuxième appui ne la relance pas
let lastResults = null;
async function runSearch(raw, { force = false } = {}) {
  const q = raw.trim();
  const out = $("searchResults");
  $("searchSuggest").hidden = !!q;
  if (!q) {
    searchCtl?.abort();
    searchRunning = "";
    lastResults = null;
    return (out.innerHTML = "");
  }
  if (q === searchRunning && !force) return;
  searchCtl?.abort();
  const ctl = (searchCtl = new AbortController());
  searchRunning = q;
  lastResults = null;
  const digits = q.replace(/\s+/g, "");
  try {
    if (/^\d{8,14}$/.test(digits)) {
      out.innerHTML = loadingHtml(t("search.searching"));
      const p = await fetchProduct(digits);
      if (ctl.signal.aborted) return;
      lastResults = p ? { q, local: [], food: [p], beauty: [], single: true } : null;
      if (!p) out.innerHTML = notFoundHtml(digits);
      else renderResults(q);
      return;
    }
    if (q.length < 2) return (out.innerHTML = messageHtml(t("search.short.t"), t("search.short.p")));
    // Tout de suite : les produits déjà scannés qui correspondent
    const local = rankByRelevance(store.all().map((e) => e.p), q).slice(0, 3);
    out.innerHTML = (local.length ? resultGroup(t("search.in_history"), local) : "") + loadingHtml(t("search.searching"));
    const res = await off.search(q, { lang: getLang(), signal: ctl.signal });
    if (ctl.signal.aborted) return;
    const known = new Set(local.map((p) => p.code));
    const fresh = (list) => list.filter((p) => !known.has(p.code));
    [...res.food, ...res.beauty].forEach((p) => memo.set(p.code, p));
    lastResults = { q, local, food: fresh(res.food), beauty: fresh(res.beauty), alt: res.alt, foodFailed: res.foodFailed };
    renderResults(q);
  } catch (err) {
    if (ctl.signal.aborted) return;
    out.innerHTML = messageHtml(t("msg.error.t"), errorText(err), `<button class="btn btn-primary" type="button" data-search-retry>${esc(t("msg.retry"))}</button>`);
  } finally {
    if (searchCtl === ctl) searchRunning = "";
  }
}
const resultGroup = (title, list, count = false) =>
  `<section class="result-group"><p class="label">${esc(title)}${count ? ` · ${list.length}` : ""}</p><div class="list">${list.map((p) => rowHtml(p)).join("")}</div></section>`;
function renderResults(q) {
  const r = lastResults;
  if (!r || r.q !== q) return;
  const total = r.local.length + r.food.length + r.beauty.length;
  let html = "";
  if (r.single) html = `<div class="list">${r.food.map((p) => rowHtml(p)).join("")}</div>`;
  else if (total) {
    html += `<p class="search-count">${esc(tn("search.results", total))}${r.alt ? ` · <span>${esc(t("search.alt", { q: r.alt }))}</span>` : ""}</p>`;
    if (r.local.length) html += resultGroup(t("search.in_history"), r.local);
    const both = r.food.length && r.beauty.length;
    if (r.food.length) html += both || r.local.length ? resultGroup(t("search.g_food"), r.food, true) : `<div class="list">${r.food.map((p) => rowHtml(p)).join("")}</div>`;
    if (r.beauty.length) html += resultGroup(t("search.g_beauty"), r.beauty, true);
  }
  // Les aliments n'ont pas répondu : on le dit, au lieu d'afficher seulement des cosmétiques
  if (r.foodFailed) html = messageHtml(t("search.food_failed.t"), t("search.food_failed.p"), `<button class="btn btn-primary" type="button" data-search-retry>${esc(t("msg.retry"))}</button>`) + html;
  else if (!total) html = `<div class="empty">${emptyArt()}<strong>${esc(t("search.none.t"))}</strong><p>${esc(t("search.none.p", { q }))}</p></div>`;
  $("searchResults").innerHTML = html;
}
$("searchResults").addEventListener("click", (e) => {
  if (e.target.closest("[data-search-retry]")) runSearch($("searchInput").value, { force: true });
});
function submitSearch(e) {
  e?.preventDefault();
  $("searchInput").blur();
  runSearch($("searchInput").value);
}
$("searchForm").addEventListener("submit", submitSearch);
// Certains claviers de téléphone envoient seulement la touche « Rechercher » sans valider le formulaire
$("searchInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.isComposing) submitSearch(e);
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

// Historique rangé par période : aujourd'hui, hier, cette semaine, plus ancien
function historyGroups(entries) {
  const day = (ts) => new Date(ts).setHours(0, 0, 0, 0);
  const today = day(Date.now());
  const bucket = (ts) => {
    const d = (today - day(ts)) / 864e5;
    return d < 1 ? "today" : d < 2 ? "yesterday" : d < 7 ? "week" : "older";
  };
  const order = ["today", "yesterday", "week", "older"];
  return order
    .map((g) => {
      const list = entries.filter((e) => bucket(e.at) === g);
      return list.length
        ? `<p class="hist-day">${t(`history.g.${g}`)}</p><div class="list">${list.map((e) => rowHtml(e.p, { fav: e.fav, when: relTime(e.at) })).join("")}</div>`
        : "";
    })
    .join("");
}

function renderHistory() {
  const all = store.all();
  const counts = {};
  all.forEach((e) => {
    const st = verdictOf(e.p).status;
    counts[st] = (counts[st] || 0) + 1;
  });
  const seen = STATUS_ORDER.filter((s) => counts[s]);

  $("historyStats").innerHTML = !all.length
    ? `<div class="empty">${emptyArt()}<strong>${t("history.empty.t")}</strong><p>${t("history.empty.p")}</p><a class="btn btn-primary" href="#scan">${t("home.scan")}</a></div>`
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
      ? historyGroups(shown)
      : `<div class="empty">${emptyArt()}<p>${t(historyFilter === "fav" ? "history.empty_fav" : "history.empty_cat")}</p></div>`;

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
const addOpen = new Set(); // groupes ouverts par l'utilisateur
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
  for (const r of BEAUTY_RULES) {
    items.push({
      group: t("kind.beauty"), name: t(`flag.${r.id}.label`), codes: [], reason: t(`flag.${r.id}.reason`),
      level: level(r.id, r.severity), topic: TOPIC_OF[r.id],
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
  // Une recherche ou un filtre ouvre tout ; sinon les groupes restent repliés (sauf ceux ouverts à la main)
  const forceOpen = !!q || addFilter !== "all" || groups.length === 1;
  $("addList").innerHTML = items.length
    ? groups
        .map((g) => {
          const list = items.filter((i) => i.group === g);
          const counts = Object.keys(m.order)
            .map((lv) => [lv, list.filter((i) => i.level === lv).length])
            .filter(([, n]) => n);
          const open = forceOpen || addOpen.has(addMode + "|" + g);
          return `<details class="add-sec" data-g="${esc(addMode + "|" + g)}"${open ? " open" : ""}>
            <summary>
              <span class="add-sec-head"><strong>${esc(g)}</strong>
                <span class="add-sec-counts">${counts.map(([lv, n]) => m.pill({ level: lv }).replace("</span>", ` · ${n}</span>`)).join("")}</span></span>
              <span class="src-chev" aria-hidden="true">${svg(I.chev)}</span>
            </summary>
            <div class="add-rows2">${list
              .map(
                (it) => `<details class="add-entry"><summary><span class="add-name">${esc(it.name)}</span>${m.pill(it)}</summary>
                  ${it.codes.length ? `<div class="add-codes" dir="ltr">${it.codes.map((c) => `<span>${esc(c)}</span>`).join("")}</div>` : ""}
                  <p class="add-why">${esc(it.reason)}</p>
                  ${it.topic ? `<p class="add-setting">${esc(t("add.your_setting", { d: t(`decision.${prefs().topics[it.topic]}`).toLowerCase() }))} · <a href="#settings" data-goto-settings>${t("detail.change_setting")}</a></p>` : ""}
                </details>`
              )
              .join("")}</div>
          </details>`;
        })
        .join("")
    : `<div class="empty">${emptyArt()}<strong>${t("add.empty.t")}</strong><p>${t(addMode === "halal" ? "add.empty_halal" : "add.empty_health")}</p></div>`;
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
$("addList").addEventListener("toggle", (e) => {
  const d = e.target;
  if (!d.matches || !d.matches("details.add-sec")) return;
  if (d.open) addOpen.add(d.dataset.g);
  else addOpen.delete(d.dataset.g);
}, true);

// ===========================================================================
// Réglages
// ===========================================================================
// Réglages : un menu court ; chaque ligne ouvre une sous-page (#settings/<page>)
const SET_PAGES = ["lang", "profile", "religion", "appearance", "offline", "data", "notes", "how", "sources", "privacy", "limits"];
let setPage = "menu";
let setPrev = "menu";
let setFromMenu = false;
const SI = {
  lang: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
  profile: I.user,
  religion: '<path d="M15.5 3.6A8.6 8.6 0 1 0 20.4 16a7 7 0 0 1-4.9-12.4z"/><path d="M17 7.5l.7 1.4 1.5.2-1.1 1 .3 1.5-1.4-.7-1.4.7.3-1.5-1.1-1 1.5-.2z"/>',
  appearance: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18a9 9 0 0 0 0-18z" fill="currentColor" stroke="none"/>',
  offline: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14"/>',
  data: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
  notes: '<path d="M5 20V11M10.5 20V5M16 20v-6M3 20.5h18"/>',
  how: I.bulb,
  sources: I.doc,
  privacy: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  limits: I.alert,
  off: I.box,
  report: '<path d="M5.5 21V4M5.5 4h11l-2.2 4 2.2 4h-11"/>',
  demo: '<path d="M8 5.5v13l10.5-6.5z"/>',
};
const schoolName = (s) => t(`school.${s}`);
const modifiedTopics = (st) => TOPICS.filter((x) => (SCHOOLS[st.baseSchool] || SCHOOLS.standard)[x] !== st.topics[x]);
const religionValue = (st) =>
  st.school === "custom" ? t("settings.custom_base", { s: schoolName(st.baseSchool) }) : schoolName(st.school);
const profileValue = (st) => {
  const parts = [];
  if (st.profile.diet) parts.push(t(`diet.${st.profile.diet}`));
  if (st.profile.allergens.length) parts.push(tn("settings.allergy_count", st.profile.allergens.length));
  return parts.join(" · ") || t("settings.profile_none");
};
const offlineValue = (st) => (st.offlinePackAt ? t("settings.offline_ready", { n: st.offlinePackCount }) : t("settings.offline_not"));
const appearanceValue = (st) => t(`theme.${st.theme}`) + (st.textSize !== "normal" ? " · " + t(`text.${st.textSize}`) : "");

function setRow(page, value, { href, external = false } = {}) {
  const url = href || `#settings/${page}`;
  return `<a class="set-row" href="${esc(url)}"${external ? ' target="_blank" rel="noopener"' : ` data-go="${page}"`}>
    <span class="set-ico si-${page}">${svg(SI[page])}</span>
    <span class="set-text"><strong>${esc(t(page === "off" ? "link.off.t" : page === "report" ? "link.report.t" : page === "demo" ? "link.demo_exit.t" : `settings.menu.${page}`))}</strong>${value ? `<small>${esc(value)}</small>` : ""}</span>
    <span class="set-chev" aria-hidden="true">${external ? "↗" : svg(I.chev, "flip")}</span>
  </a>`;
}
function renderSettingsMenu() {
  const st = prefs();
  const nHist = store.all().length;
  $("setSummary").innerHTML = `<div class="set-summary">
      <p class="ss-kicker">${t("settings.summary_t")}</p>
      <div class="ss-items">
        <a class="ss-item" href="#settings/religion" data-go="religion"><small>${t("settings.summary_school")}</small><strong>${esc(religionValue(st))}</strong></a>
        <a class="ss-item" href="#settings/profile" data-go="profile"><small>${t("settings.summary_profile")}</small><strong>${esc(profileValue(st))}</strong></a>
        <a class="ss-item" href="#settings/offline" data-go="offline"><small>${t("settings.summary_offline")}</small><strong>${esc(offlineValue(st))}</strong></a>
      </div>
    </div>`;
  const group = (title, rows) => `<section class="set-section"><h2 class="set-group-t">${t(title)}</h2><div class="set-group">${rows.join("")}</div></section>`;
  $("setMenu").innerHTML =
    group("settings.g_prefs", [
      setRow("lang", LANG_NAMES[st.lang]),
      setRow("profile", profileValue(st)),
      setRow("religion", religionValue(st)),
      setRow("appearance", appearanceValue(st)),
    ]) +
    group("settings.g_data", [setRow("offline", offlineValue(st)), setRow("data", tn("settings.data_count", nHist))]) +
    group("settings.g_about", [setRow("notes"), setRow("how"), setRow("sources"), setRow("privacy"), setRow("limits")]) +
    group("settings.g_links", [
      setRow("off", t("link.off.d"), { href: "https://fr.openfoodfacts.org", external: true }),
      setRow("report", t("link.report.d"), { href: "https://github.com/agozel5/bayyin/issues", external: true }),
      ...(DEMO ? [setRow("demo", t("link.demo_exit.d"), { href: location.pathname + "#scan" }).replace(` data-go="demo"`, "")] : []),
    ]);
}
function showSetPage(page, { animate = true } = {}) {
  const changed = animate && page !== setPage;
  setPrev = setPage;
  setPage = page;
  document.querySelectorAll("#view-settings .set-page").forEach((el) => {
    const on = el.dataset.page === page;
    el.hidden = !on;
    if (on && changed) {
      el.classList.remove("enter-fwd", "enter-back");
      void el.offsetWidth; // relance l'animation
      el.classList.add(page === "menu" ? "enter-back" : "enter-fwd");
    }
  });
}
$("view-settings").addEventListener("click", (e) => {
  if (e.target.closest("[data-go]")) setFromMenu = true;
  if (e.target.closest("[data-back]")) {
    e.preventDefault();
    if (setFromMenu && history.length > 1) history.back();
    else location.hash = "#settings";
    setFromMenu = false;
  }
});

function renderSettings() {
  const st = prefs();
  renderSettingsMenu();
  $("langGrid").innerHTML = LANGS.map(
    (l) => `<button type="button" role="radio" class="lang-btn" aria-checked="${st.lang === l}" data-lang="${l}" lang="${l}">${LANG_NAMES[l]}</button>`
  ).join("");

  $("dietList").style.gridTemplateColumns = "repeat(3,1fr)";
  $("dietList").innerHTML = [null, ...DIETS].map(
    (d) => `<button type="button" role="radio" class="d-diet" aria-checked="${(st.profile.diet || null) === d}" data-diet="${d || ""}">${t(d ? `diet.${d}` : "diet.none")}</button>`
  ).join("");
  $("allergenList").innerHTML = PROFILE_ALLERGENS.map(
    (a) => `<button type="button" role="checkbox" class="chip allergen-chip" aria-checked="${st.profile.allergens.includes(a)}" data-allergen="${a}">${esc(t(`allergen.${a}`))}</button>`
  ).join("");

  // Écoles : cartes compactes ; un réglage personnalisé rappelle l'école de départ
  const schools = Object.keys(SCHOOLS);
  $("schoolList").innerHTML =
    (st.school === "custom"
      ? `<div class="school custom" aria-checked="true" role="radio"><span class="radio" aria-hidden="true"></span><span class="school-text"><strong>${t("school.custom")}</strong><small>${esc(t("settings.custom_from", { s: schoolName(st.baseSchool) }))}</small></span></div>`
      : "") +
    schools
      .map(
        (s) => `<button type="button" role="radio" class="school" aria-checked="${st.school === s}" data-school="${s}">
        <span class="radio" aria-hidden="true"></span>
        <span class="school-text"><strong>${t(`school.${s}`)}</strong><small>${t(`school.${s}.d`)}</small></span>
      </button>`
      )
      .join("");
  renderTopics();
  renderAppearance();
  renderOfflineStatus();
  renderDataPage();

  $("legendHalal").innerHTML = LEGEND_ORDER.map(
    (s) => `<div class="legend-row"><span class="pill s-${s}"><span class="dot"></span>${S(s, "label")}</span><p>${S(s, "legend")}</p></div>`
  ).join("");
  $("legendHealth").innerHTML = HEALTH_GRADES.map((g, i) => {
    const max = i === 0 ? 100 : HEALTH_GRADES[i - 1].min - 1;
    return `<div class="legend-row"><span class="pill g-${g.id}" style="--cbg:var(--tint)"><span class="dot"></span>${t(`grade.${g.id}`)}</span><p>${t("health.range", { a: g.min, b: max })}</p></div>`;
  }).join("");
  document.querySelectorAll(".se-pts[data-pts]").forEach((el) => (el.textContent = t("health.pts", { n: el.dataset.pts })));
  // Sources regroupées : on touche un groupe pour voir les organismes et textes qu'il contient
  const GROUP_ICON = { data: I.box, health: I.flask, halal: I.shield };
  $("sourceList").innerHTML = ["data", "health", "halal"]
    .map((g) => {
      const list = SOURCES.filter((src) => src.group === g);
      const preview = list.slice(0, 3).map((src) => src.name.split(" (")[0]).join(", ") + (list.length > 3 ? "…" : "");
      return `<details class="src-group">
        <summary>
          <span class="src-ico">${svg(GROUP_ICON[g])}</span>
          <span class="src-head"><strong>${t(`sources.g.${g}`)}</strong><small>${t(`sources.gd.${g}`)}</small>
            <small class="src-meta"><span class="src-count">${tn("sources.count", list.length)}</span><span class="src-preview">${esc(preview)}</span></small></span>
          <span class="src-chev" aria-hidden="true">${svg(I.chev)}</span>
        </summary>
        ${[...new Set(list.map((src) => src.kind))]
          .map((k) => `<p class="src-kind">${t(`sources.k.${k}`)}</p><div class="source-list">${list
            .filter((src) => src.kind === k)
            .map((src) => `<a class="source" href="${esc(src.url)}" target="_blank" rel="noopener"><span><strong>${esc(src.name)}</strong><small>${t(`src.${src.id}`)}</small></span><span aria-hidden="true">↗</span></a>`)
            .join("")}</div>`)
          .join("")}
      </details>`;
    })
    .join("");
  showSetPage(setPage);
}

// Point par point : replié par défaut, avec recherche ; les points modifiés passent en tête
function renderTopics() {
  const st = prefs();
  const base = SCHOOLS[st.baseSchool] ? st.baseSchool : "standard";
  const modified = modifiedTopics(st);
  $("topicSummary").textContent = modified.length
    ? tn("settings.topics_modified", modified.length, { s: schoolName(base) })
    : t("settings.topics_none", { s: schoolName(base) });
  $("topicReset").hidden = !modified.length;
  $("topicReset").textContent = t("settings.topics_reset", { s: schoolName(base) });
  const q = normText($("topicSearch").value);
  const match = (topic) => !q || normText(t(`topic.${topic}`)).includes(q);
  const topicRow = (topic) => `<div class="topic${modified.includes(topic) ? " is-mod" : ""}">
      <span class="topic-name" id="tp-${topic}">${t(`topic.${topic}`)}${modified.includes(topic) ? `<span class="mod-tag">${t("settings.topic_modified")}</span>` : ""}</span>
      <div class="seg3 seg-sm" role="radiogroup" aria-labelledby="tp-${topic}">${DECISIONS.map(
        (d) => `<button type="button" role="radio" class="d-${d}" aria-checked="${st.topics[topic] === d}" data-topic="${topic}" data-decision="${d}">${t(`decision.${d}`)}</button>`
      ).join("")}</div>
    </div>`;
  const section = (title, list) => (list.length ? `<p class="topic-group">${title}</p>` + list.map(topicRow).join("") : "");
  const mods = modified.filter(match);
  const rest = TOPICS.filter((x) => match(x) && !modified.includes(x));
  const html =
    section(t("settings.topics_mod_group"), mods) +
    section(t("settings.topics_origin"), rest.filter((x) => !SCHOOL_TOPICS.includes(x))) +
    section(t("settings.topics_school"), rest.filter((x) => SCHOOL_TOPICS.includes(x)));
  $("topicList").innerHTML = html || `<p class="notes">${t("settings.topics_empty")}</p>`;
}
const normText = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
$("topicSearch").addEventListener("input", () => {
  $("topicDetails").open = true;
  renderTopics();
});
$("topicReset").addEventListener("click", () => settings.setSchool(prefs().baseSchool || "standard"));

// Apparence : thème et taille du texte
const darkQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
function applyAppearance() {
  const st = prefs();
  const dark = st.theme === "dark" || (st.theme === "auto" && darkQuery && darkQuery.matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.dataset.text = st.textSize;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = dark ? "#0F1512" : "#FFFFFF";
}
if (darkQuery) (darkQuery.addEventListener ? darkQuery.addEventListener("change", applyAppearance) : darkQuery.addListener(applyAppearance));
function renderAppearance() {
  const st = prefs();
  $("themeList").innerHTML = THEMES.map(
    (th) => `<button type="button" role="radio" class="theme-card th-${th}" aria-checked="${st.theme === th}" data-theme-choice="${th}">
      <span class="th-art" aria-hidden="true"><i></i><i></i><i></i></span>
      <strong>${t(`theme.${th}`)}</strong>${th === "auto" ? `<small>${t("theme.auto_d")}</small>` : ""}
    </button>`
  ).join("");
  $("textSizeList").style.gridTemplateColumns = "repeat(3,1fr)";
  $("textSizeList").innerHTML = TEXT_SIZES.map(
    (z) => `<button type="button" role="radio" class="ts-${z}" aria-checked="${st.textSize === z}" data-text-size="${z}"><span class="ts-a" aria-hidden="true">A</span>${t(`text.${z}`)}</button>`
  ).join("");
}
$("themeList").addEventListener("click", (e) => {
  const b = e.target.closest("[data-theme-choice]");
  if (b) settings.set({ theme: b.dataset.themeChoice });
});
$("textSizeList").addEventListener("click", (e) => {
  const b = e.target.closest("[data-text-size]");
  if (b) settings.set({ textSize: b.dataset.textSize });
});

// Mes données : chiffres, sauvegarde, effacement (confirmation par un second appui)
let confirmData = null;
function renderDataPage(msg) {
  const all = store.all();
  const stats = [
    [all.length, "data.history"],
    [all.filter((e) => e.fav).length, "data.favs"],
    [basket.all().length, "data.basket"],
    [Object.keys(localProductsAll()).length, "data.local"],
  ];
  $("dataStats").innerHTML = stats.map(([n, k]) => `<div class="data-stat"><strong>${n}</strong><small>${t(k)}</small></div>`).join("");
  $("clearHistoryBtn").textContent = t(confirmData === "history" ? "data.confirm" : "data.clear_history");
  $("resetBtn").textContent = t(confirmData === "reset" ? "data.confirm" : "data.reset");
  $("clearHistoryBtn").classList.toggle("is-confirm", confirmData === "history");
  $("resetBtn").classList.toggle("is-confirm", confirmData === "reset");
  if (msg !== undefined) $("dataStatus").textContent = msg;
}
const LOCAL_KEY_APP = "halalscan_local_v1";
function localProductsAll() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY_APP)) || {}; } catch { return {}; }
}
$("clearHistoryBtn").addEventListener("click", () => {
  if (confirmData !== "history") { confirmData = "history"; return renderDataPage(""); }
  confirmData = null;
  store.clear({ keepFavs: true });
  renderDataPage(t("data.cleared"));
});
$("resetBtn").addEventListener("click", () => {
  if (confirmData !== "reset") { confirmData = "reset"; return renderDataPage(""); }
  confirmData = null;
  settings.reset();
  renderDataPage(t("data.reset_done"));
});
// Comprendre les notes : un onglet par type de note
$("notesTabs").addEventListener("click", (e) => {
  const b = e.target.closest("[data-notes]");
  if (!b) return;
  document.querySelectorAll("#notesTabs button").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
  document.querySelectorAll("[data-notes-of]").forEach((el) => (el.hidden = el.dataset.notesOf !== b.dataset.notes));
});

$("langGrid").addEventListener("click", (e) => {
  const b = e.target.closest("[data-lang]");
  if (b) settings.set({ lang: b.dataset.lang });
});
$("dietList").addEventListener("click", (e) => {
  const b = e.target.closest("[data-diet]");
  if (b) settings.setDiet(b.dataset.diet || null);
});
$("allergenList").addEventListener("click", (e) => {
  const b = e.target.closest("[data-allergen]");
  if (b) settings.toggleAllergen(b.dataset.allergen);
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
function renderOfflineStatus(progress, med) {
  const st = prefs();
  const btn = $("offlineBtn");
  btn.disabled = packing;
  btn.textContent = t(st.offlinePackAt ? "settings.offline_update" : "settings.offline_btn");
  $("offlineStatus").textContent =
    progress !== undefined
      ? med !== undefined
        ? t("settings.offline_progress_med", { n: med })
        : t("settings.offline_progress", { n: progress })
      : st.offlinePackAt
        ? t("settings.offline_done", { n: st.offlinePackCount, d: new Date(st.offlinePackAt).toLocaleDateString(locale(), { day: "numeric", month: "long" }) }) +
          (st.offlineMedCount ? " " + t("settings.offline_meds", { n: st.offlineMedCount.toLocaleString(locale()) }) : "")
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
    const { count: n, medCount } = await off.offlinePack({ onProgress: (count, _t, med) => renderOfflineStatus(count, med) });
    packing = false;
    settings.set({ offlinePackAt: Date.now(), offlinePackCount: n, offlineMedCount: medCount });
  } catch {
    packing = false;
    renderOfflineStatus();
    $("offlineStatus").textContent = t("settings.offline_error");
  }
});

// Changement de réglage : tout ce qui est affiché est recalculé
settings.subscribe((st, patch) => {
  if (patch.theme || patch.textSize || patch.reset || patch.imported) applyAppearance();
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
  if (patch.lang && current === "search" && !$("searchInput").value.trim()) renderSuggestions();
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
const TABS = ["scan", "search", "history", "additives", "settings", "places"];
let current = null;

// Bouton central : depuis un autre onglet il ramène à l'accueil ; sur l'accueil il ouvre la caméra.
$("tabScan").addEventListener("click", (e) => {
  if (current !== "scan") return;
  e.preventDefault();
  if (navigator.vibrate) navigator.vibrate(15);
  openCamera();
});

function showTab(name) {
  const [main, sub] = String(name || "").split("/");
  name = main;
  if (name === "infos") name = "settings"; // ancienne adresse
  if (!TABS.includes(name)) name = "scan";
  const wasSettings = current === "settings";
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
  if (name === "places") renderPlaces();
  if (name === "settings") {
    renderSettings();
    showSetPage(SET_PAGES.includes(sub) ? sub : "menu", { animate: wasSettings });
  }
  $("tabScan").setAttribute("aria-label", t(name === "scan" ? "home.scan" : "tab.scan"));
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", () => {
  closeAisle({ fromPop: true });
  closeCamera({ fromPop: true });
  closeSheet({ fromPop: true });
  showTab(location.hash.slice(1));
});
window.addEventListener("popstate", (e) => {
  const st = e.state || {};
  if (!st.cam) closeCamera({ fromPop: true });
  if (!st.aisle) closeAisle({ fromPop: true });
  if (!st.sheet) closeSheet({ fromPop: true });
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!$("aisle").hidden) closeAisle();
  else if (!cameraEl.hidden) closeCamera();
  else closeSheet();
});
// Caméra rendue au système quand l'app passe en arrière-plan ; relancée au retour.
document.addEventListener("visibilitychange", () => {
  if (!$("aisle").hidden) return document.hidden ? aisle.stop() : aisle.start();
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
// Mode rayon : pastilles en surimpression sur tous les codes-barres visibles
// ===========================================================================
const aisleEl = $("aisle");
const aisleInfo = new Map(); // code -> { status, alert, name, loading }
const aisleMarks = new Map(); // code -> { el, last }
let aisleQueue = [];
let aisleBusy = 0;
const AISLE_ICON = { halal_certifie: "✓", halal_probable: "✓", mashbouh: "?", haram: "✕", inconnu: "–" };

function aisleLookup(code) {
  if (aisleInfo.has(code)) return;
  aisleInfo.set(code, { loading: true });
  aisleQueue.push(code);
  aislePump();
}
// Trois recherches à la fois au plus, pour rester rapide sans surcharger Open Food Facts
function aislePump() {
  while (aisleBusy < 3 && aisleQueue.length) {
    const code = aisleQueue.shift();
    aisleBusy++;
    fetchProduct(code)
      .then((p) => {
        aisleInfo.set(code, p ? { status: verdictOf(p).status, alert: profileOf(p).alert, name: nameOf(p) } : { status: "inconnu", missing: true });
      })
      .catch(() => aisleInfo.delete(code)) // nouvel essai au prochain passage devant la caméra
      .finally(() => {
        aisleBusy--;
        renderAisleMark(code);
        renderAisleStats();
        aislePump();
      });
  }
}

function renderAisleMark(code) {
  const m = aisleMarks.get(code);
  if (!m) return;
  const info = aisleInfo.get(code) || { loading: true };
  const st = info.loading ? "loading" : info.status;
  m.el.className = `aisle-mark v-${st}${info.alert ? " has-alert" : ""}`;
  m.el.innerHTML = `<span class="am-dot">${info.loading ? '<span class="spinner light"></span>' : AISLE_ICON[st] || "–"}</span>${
    info.name ? `<span class="am-name">${esc(info.name)}</span>` : ""}${info.alert ? '<span class="am-alert">!</span>' : ""}`;
  m.el.setAttribute("aria-label", info.loading ? t("msg.loading") : `${info.name || code} : ${S(info.status, "label")}${info.alert ? ", " + t(`alert.${info.alert}`) : ""}`);
}

function renderAisleStats() {
  const counts = {};
  let alerts = 0;
  for (const [, info] of aisleInfo) {
    if (info.loading || info.missing) continue;
    counts[info.status] = (counts[info.status] || 0) + 1;
    if (info.alert) alerts++;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  $("aisleHint").hidden = total > 0;
  $("aisleStats").innerHTML = total
    ? `<span class="as-total">${esc(tn("aisle.seen", total))}</span>` +
      // Certifié et probable : une seule pastille verte
      [["halal_probable", (counts.halal_certifie || 0) + (counts.halal_probable || 0)], ["mashbouh", counts.mashbouh], ["haram", counts.haram], ["inconnu", counts.inconnu]]
        .filter(([, n]) => n)
        .map(([x, n]) => `<span class="as-chip v-${x}" aria-label="${n} ${esc(S(x, "short"))}">${AISLE_ICON[x]} ${n}</span>`)
        .join("") +
      (alerts ? `<span class="as-chip as-alert">! ${alerts}</span>` : "")
    : "";
}

const aisle = createAisle({
  video: $("aisleVideo"),
  onState(state, detail) {
    aisleEl.dataset.state = state;
    if (state === "error") {
      const kind = ["https", "unsupported", "denied", "nocamera", "decoder"].includes(detail.kind) ? detail.kind : "camera";
      $("aisleErrTitle").textContent = t(`cam.err.${kind}.t`);
      $("aisleErrText").textContent = t(`cam.err.${kind}.p`);
    }
  },
  onFrame(found) {
    const now = Date.now();
    for (const { code, rect } of found) {
      let m = aisleMarks.get(code);
      if (!m) {
        const el = document.createElement("button");
        el.type = "button";
        el.dataset.aisleOpen = code;
        $("aisleLayer").appendChild(el);
        m = { el };
        aisleMarks.set(code, m);
        aisleLookup(code);
        renderAisleMark(code);
        if (navigator.vibrate) navigator.vibrate(12);
      }
      m.last = now;
      // Pastille posée au-dessus du code-barres
      m.el.style.transform = `translate(${Math.round(rect.x + rect.w / 2)}px, ${Math.round(rect.y)}px) translate(-50%, -100%)`;
      m.el.classList.remove("gone");
    }
    // Un code qui n'est plus vu s'efface après un court délai (évite le clignotement)
    for (const [code, m] of aisleMarks) {
      if (now - m.last > 900) m.el.classList.add("gone");
      if (now - m.last > 2500) {
        m.el.remove();
        aisleMarks.delete(code);
      }
    }
  },
});

function openAisle({ replace = false } = {}) {
  if (!cameraEl.hidden) closeCamera({ keepHistory: true });
  aisleEl.hidden = false;
  $("aisleLayer").innerHTML = "";
  aisleMarks.clear();
  aisleInfo.clear();
  aisleQueue = [];
  renderAisleStats();
  if (replace) history.replaceState({ aisle: true }, "");
  else history.pushState({ aisle: true }, "");
  lockScroll();
  aisle.start();
}
function closeAisle({ fromPop = false } = {}) {
  if (aisleEl.hidden) return;
  aisle.stop();
  aisleEl.hidden = true;
  lockScroll();
  if (!fromPop && history.state && history.state.aisle) history.back();
}
$("openAisle").addEventListener("click", () => openAisle());
$("camAisle").addEventListener("click", () => openAisle({ replace: true }));
$("aisleClose").addEventListener("click", () => closeAisle());
$("aisleLayer").addEventListener("click", (e) => {
  const b = e.target.closest("[data-aisle-open]");
  if (!b) return;
  const code = b.dataset.aisleOpen;
  aisle.stop();
  aisleEl.hidden = true;
  openSheet(code, { fromScan: true, replace: true });
});

// ===========================================================================
// Mode courses : scan en rafale, panier et bilan
// ===========================================================================
const BASKET_KEY = "bayyin_basket_v1";
const basket = {
  all() {
    try {
      return JSON.parse(localStorage.getItem(BASKET_KEY)) || [];
    } catch {
      return [];
    }
  },
  save(list) {
    try {
      localStorage.setItem(BASKET_KEY, JSON.stringify(list));
    } catch { /* stockage indisponible */ }
  },
  add(p) {
    const list = this.all().filter((x) => x.code !== p.code);
    list.unshift({ code: p.code, at: Date.now() });
    this.save(list.slice(0, 80));
  },
  clear() {
    this.save([]);
  },
};
let basketMode = false;
const basketProducts = () => basket.all().map((x) => (store.get(x.code) || {}).p || memo.get(x.code)).filter(Boolean);

function renderBasketButtons() {
  const n = basket.all().length;
  $("camBasketMode").setAttribute("aria-pressed", String(basketMode));
  $("camBasketMode").textContent = t(basketMode ? "basket.mode_on" : "basket.mode");
  $("camBasketOpen").hidden = !basketMode || !n;
  $("camBasketOpen").textContent = t("basket.open", { n });
  const badge = $("toolBasketN");
  badge.hidden = !n;
  badge.textContent = n > 99 ? "99+" : String(n);
  $("toolBasket").setAttribute("aria-label", n ? `${t("basket.mode")} · ${tn("basket.count", n)}` : t("basket.mode"));
}

async function basketScan(code) {
  cameraEl.classList.add("found");
  const flash = $("camFlash");
  flash.hidden = false;
  flash.className = "cam-flash";
  flash.textContent = t("msg.loading");
  try {
    const p = await fetchProduct(code);
    if (p) {
      store.add(p);
      basket.add(p);
      const st = verdictOf(p).status;
      const al = profileOf(p).alert;
      flash.className = `cam-flash v-${st}`;
      flash.innerHTML = `<strong>${esc(S(st, "label"))}</strong><span>${esc(nameOf(p))}</span>${al ? `<em>${esc(t(`alert.${al}`))}</em>` : ""}`;
      if (navigator.vibrate) navigator.vibrate(st === "haram" || al === "no" ? [60, 60, 60] : 40);
    } else {
      flash.className = "cam-flash v-inconnu";
      flash.textContent = t("msg.notfound.t") + " · " + code;
    }
  } catch {
    flash.className = "cam-flash v-inconnu";
    flash.textContent = t("msg.load_error.t");
  }
  renderBasketButtons();
  // Reprise du scan après un court instant, pour laisser lire le résultat
  setTimeout(() => {
    cameraEl.classList.remove("found");
    if (!cameraEl.hidden && basketMode) camera.start();
  }, 1400);
}

$("camBasketMode").addEventListener("click", () => {
  basketMode = !basketMode;
  $("camFlash").hidden = true;
  renderBasketButtons();
  toast(t(basketMode ? "basket.on_toast" : "basket.off_toast"));
});
$("camBasketOpen").addEventListener("click", () => {
  closeCamera({ keepHistory: true });
  openBasket({ replace: true });
});
// Panier déjà commencé : on l'ouvre ; sinon on lance la caméra en mode courses
$("toolBasket").addEventListener("click", () => {
  if (basket.all().length) return openBasket();
  basketMode = true;
  openCamera();
});

function openBasket({ replace = false } = {}) {
  sheetCode = "basket";
  sheetProduct = null;
  $("sheetTitle").textContent = t("basket.title");
  $("sheetCompare").hidden = true;
  $("sheetShare").hidden = true;
  showSheet({ replace });
  refreshFav();
  renderBasket();
}
function renderBasket() {
  const items = basketProducts();
  if (!items.length) {
    $("sheetBody").innerHTML = `<div class="empty">${emptyArt()}<strong>${t("basket.empty.t")}</strong><p>${t("basket.empty.p")}</p><button class="btn btn-primary" type="button" data-basket-scan>${t("basket.start")}</button></div>`;
    return;
  }
  const counts = {};
  items.forEach((p) => {
    const st = verdictOf(p).status;
    counts[st] = (counts[st] || 0) + 1;
  });
  const scores = items.map(scoreOf).filter(Boolean).map((x) => x.score);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const alerts = items.filter((p) => profileOf(p).alert).length;
  const seen = STATUS_ORDER.filter((x) => counts[x]);
  $("sheetBody").innerHTML = `<div class="stats basket-stats">
      <div class="stats-top"><span class="stats-num">${items.length}</span><span class="stats-unit">${esc(tn("basket.count", items.length).replace(/^\d+\s*/, ""))}</span></div>
      <div class="bar">${seen.map((x) => `<i style="flex:${counts[x]};--c:${STATUS_COLOR[x]}"></i>`).join("")}</div>
      <div class="bar-legend">${seen.map((x) => `<span><i class="dot" style="--c:${STATUS_COLOR[x]}"></i>${counts[x]} ${S(x, "label")}</span>`).join("")}</div>
      ${avg !== null ? `<p class="basket-avg">${t("basket.avg", { n: avg })}</p>` : ""}
      ${alerts ? `<p class="basket-alert">${esc(tn("basket.alerts", alerts))}</p>` : ""}
    </div>
    <div class="list">${items.map((p) => rowHtml(p)).join("")}</div>
    <div class="basket-actions">
      <button class="btn btn-primary" type="button" data-basket-scan>${t("basket.continue")}</button>
      <button class="link-btn danger" type="button" data-basket-clear>${t("basket.clear")}</button>
    </div>`;
}

// ===========================================================================
// Comparer deux produits
// ===========================================================================
let compareBase = null;
function pickCompareSecond(base) {
  compareBase = base;
  const others = store.all().map((e) => e.p).filter((p) => p.code !== base.code && kindOf(p) === kindOf(base));
  $("sheetTitle").textContent = t("cmp.title");
  $("sheetCompare").hidden = true;
  $("sheetBody").innerHTML = `<p class="lead cmp-intro">${esc(t("cmp.pick", { name: nameOf(base) }))}</p>
    ${others.length ? `<div class="list">${others.map((p) => rowHtml(p).replace('data-open="', 'data-compare="')).join("")}</div>` : `<div class="empty">${emptyArt()}<p>${t("cmp.none")}</p></div>`}`;
  $("sheetBody").scrollTop = 0;
}
$("sheetCompare").addEventListener("click", () => {
  if (sheetProduct) pickCompareSecond(sheetProduct);
});
// Depuis l'accueil : choisir d'abord le premier produit dans l'historique
$("toolCompare").addEventListener("click", () => {
  sheetCode = "compare";
  sheetProduct = null;
  compareBase = null;
  $("sheetTitle").textContent = t("cmp.title");
  $("sheetCompare").hidden = true;
  $("sheetShare").hidden = true;
  showSheet();
  refreshFav();
  const items = store.all().map((e) => e.p).filter((p) => kindOf(p) !== "medicine");
  $("sheetBody").innerHTML = items.length >= 2
    ? `<p class="lead cmp-intro">${esc(t("cmp.pick_first"))}</p><div class="list">${items.map((p) => rowHtml(p).replace('data-open="', 'data-compare-base="')).join("")}</div>`
    : `<div class="empty">${emptyArt()}<strong>${esc(t("cmp.need_two.t"))}</strong><p>${esc(t("cmp.need_two.p"))}</p><button class="btn btn-primary" type="button" data-scan-now>${esc(t("home.scan"))}</button></div>`;
});

function showCompare(code) {
  const a = compareBase;
  const b = (store.get(code) || {}).p || memo.get(code);
  if (!a || !b) return;
  sheetCode = "compare";
  sheetProduct = null;
  refreshFav();
  $("sheetShare").hidden = true;
  const va = verdictOf(a), vb = verdictOf(b);
  const sa = scoreOf(a), sb = scoreOf(b);
  const nut = (p, id) => {
    const h = p.health;
    const n = h && h.nutrition && [...h.nutrition.negatives, ...h.nutrition.positives].find((x) => x.id === id);
    return n ? `<span class="lv-${n.level} cmp-nut">${fmt(n.value)} ${esc(n.unit)}<i class="dot"></i></span>` : "—";
  };
  const better = (x, y, lowIsBetter) => (x === null || y === null || x === y ? ["", ""] : (lowIsBetter ? x < y : x > y) ? ["win", ""] : ["", "win"]);
  const val = (p, id) => {
    const h = p.health;
    const n = h && h.nutrition && [...h.nutrition.negatives, ...h.nutrition.positives].find((x) => x.id === id);
    return n ? n.value : null;
  };
  // Additifs à risque (aliments) ou ingrédients controversés (cosmétiques)
  const watchCount = (p) => { const h = healthOf(p); return ((h && (h.additives || (h.risks || []).filter((r) => r.level))) || []).length; };
  const rank = { halal_certifie: 4, halal_probable: 3, inconnu: 2, mashbouh: 1, haram: 0 };
  const rows = [
    [t("detail.halal"), `<span class="pill s-${va.status}"><span class="dot"></span>${S(va.status, "short")}</span>`, `<span class="pill s-${vb.status}"><span class="dot"></span>${S(vb.status, "short")}</span>`, better(rank[va.status], rank[vb.status])],
    [t(kindOf(a) === "beauty" ? "detail.cosmetic" : "detail.health"), sa ? `${sa.score}/100` : "—", sb ? `${sb.score}/100` : "—", better(sa && sa.score, sb && sb.score)],
    ...["sugars", "saturated-fat", "salt", "energy", "fiber", "proteins"].map((id) => [t(`nut.${id}`), nut(a, id), nut(b, id), better(val(a, id), val(b, id), !["fiber", "proteins"].includes(id))]),
    [t(kindOf(a) === "beauty" ? "detail.cosmetic_watch" : "detail.watch"), String(watchCount(a)), String(watchCount(b)), better(watchCount(a), watchCount(b), true)],
    [t("detail.nova"), a.health && a.health.nova ? String(a.health.nova.group) : "—", b.health && b.health.nova ? String(b.health.nova.group) : "—",
      better(a.health && a.health.nova && a.health.nova.group, b.health && b.health.nova && b.health.nova.group, true)],
  ];
  // Une ligne sans donnée des deux côtés n'apprend rien : on la retire
  for (let i = rows.length - 1; i >= 0; i--) if (rows[i][1] === "—" && rows[i][2] === "—") rows.splice(i, 1);
  const alA = profileOf(a).alert, alB = profileOf(b).alert;
  if (alA || alB) rows.push([t("settings.profile"), alA ? `<span class="pill a-${alA}">${t(`alert.short.${alA}`)}</span>` : "✓", alB ? `<span class="pill a-${alB}">${t(`alert.short.${alB}`)}</span>` : "✓", better(alA ? 0 : 1, alB ? 0 : 1)]);
  const head = (p) => `<button type="button" class="cmp-head" data-open="${esc(p.code)}">${p.image ? `<img src="${esc(p.image)}" alt="" referrerpolicy="no-referrer">` : `<span class="ph">${svg(KIND_ICON[kindOf(p)])}</span>`}<strong>${esc(nameOf(p))}</strong><small>${esc(p.brand || "")}</small></button>`;
  $("sheetTitle").textContent = t("cmp.title");
  $("sheetBody").innerHTML = `<div class="cmp">
    <div class="cmp-heads">${head(a)}${head(b)}</div>
    <div class="cmp-table">${rows
      .map(([label, x, y, [wa, wb]]) => `<div class="cmp-row"><span class="cmp-label">${esc(label)}</span><span class="cmp-cell ${wa}">${x}</span><span class="cmp-cell ${wb}">${y}</span></div>`)
      .join("")}</div>
    <p class="notes cmp-note">${t("cmp.note")}</p>
  </div>`;
  $("sheetBody").scrollTop = 0;
}

// ===========================================================================
// Accueil guidé : langue, école, profil (une seule fois, au premier lancement)
// ===========================================================================
let obStep = 0;
function renderOnboard() {
  const st = prefs();
  document.querySelectorAll("#obDots i").forEach((d, i) => d.classList.toggle("on", i === obStep));
  const head = (title, text) => `<img src="icon.svg" alt="" width="52" height="52" class="ob-logo"><h2 id="obTitle">${title}</h2><p class="muted">${text}</p>`;
  if (obStep === 0) {
    $("obBody").innerHTML = head(t("ob.1.t"), t("ob.1.p")) +
      `<div class="lang-grid" role="radiogroup">${LANGS.map((l) => `<button type="button" role="radio" class="lang-btn" aria-checked="${st.lang === l}" data-ob-lang="${l}" lang="${l}">${LANG_NAMES[l]}</button>`).join("")}</div>`;
  } else if (obStep === 1) {
    $("obBody").innerHTML = head(t("ob.2.t"), t("ob.2.p")) +
      `<div class="school-list" role="radiogroup">${Object.keys(SCHOOLS).map((sc) => `<button type="button" role="radio" class="school" aria-checked="${st.school === sc}" data-ob-school="${sc}">
        <span class="radio" aria-hidden="true"></span><span class="school-text"><strong>${t(`school.${sc}`)}</strong><small>${t(`school.${sc}.d`)}</small></span></button>`).join("")}</div>`;
  } else {
    $("obBody").innerHTML = head(t("ob.3.t"), t("ob.3.p")) +
      `<h3 class="sub-label">${t("settings.diet")}</h3><div class="seg3" role="radiogroup">${[null, ...DIETS].map((d) => `<button type="button" role="radio" class="d-diet" aria-checked="${(st.profile.diet || null) === d}" data-ob-diet="${d || ""}">${t(d ? `diet.${d}` : "diet.none")}</button>`).join("")}</div>
      <h3 class="sub-label">${t("settings.allergens")}</h3><div class="chips">${PROFILE_ALLERGENS.map((a) => `<button type="button" role="checkbox" class="chip allergen-chip" aria-checked="${st.profile.allergens.includes(a)}" data-ob-allergen="${a}">${esc(t(`allergen.${a}`))}</button>`).join("")}</div>`;
  }
  $("obNext").textContent = t(obStep === 2 ? "ob.start" : "ob.next");
}
function openOnboard() {
  obStep = 0;
  $("onboard").hidden = false;
  renderOnboard();
}
function closeOnboard() {
  $("onboard").hidden = true;
  settings.set({ onboarded: true });
}
$("obNext").addEventListener("click", () => {
  if (obStep < 2) {
    obStep++;
    renderOnboard();
    $("obBody").scrollTop = 0;
  } else closeOnboard();
});
$("obSkip").addEventListener("click", closeOnboard);
$("obBody").addEventListener("click", (e) => {
  const b = e.target.closest("[data-ob-lang],[data-ob-school],[data-ob-diet],[data-ob-allergen]");
  if (!b) return;
  if (b.dataset.obLang) settings.set({ lang: b.dataset.obLang });
  else if (b.dataset.obSchool) settings.setSchool(b.dataset.obSchool);
  else if (b.dataset.obAllergen) settings.toggleAllergen(b.dataset.obAllergen);
  else settings.setDiet(b.dataset.obDiet || null);
});
settings.subscribe(() => {
  if (!$("onboard").hidden) renderOnboard();
});


// ===========================================================================
// Commerces halal autour de moi (OpenStreetMap)
// ===========================================================================
const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const PLACE_ICON = {
  butcher: '<path d="M14.5 4.2c3 .6 5.3 3.4 4.9 6.6-.5 3.6-4 6.4-7.9 6.2l-3.1 3.1a1.6 1.6 0 1 1-2.3-2.3l3.1-3.1c-.4-3.4 1.4-7 4.4-8.9.3-.2.6-.4.9-.6z"/><circle cx="14.6" cy="10.4" r="1.6"/>',
  restaurant: '<path d="M7 3v7a2 2 0 0 0 4 0V3M9 12v9M16.5 3C14.8 3 13.5 5 13.5 8s1.3 4 3 4v9"/>',
  grocery: '<path d="M3.5 5.5h2.2l2 10.5h9.5l2.2-7.5H6.6"/><circle cx="9.5" cy="19.5" r="1.3"/><circle cx="16.5" cy="19.5" r="1.3"/>',
  bakery: '<path d="M4 15c0-4.4 3.6-8 8-8s8 3.6 8 8v2H4z"/><path d="M9 9.5l1 5M15 9.5l-1 5M12 8v6.5"/>',
  other: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
};
const placesState = { center: null, label: "", radius: 3000, cat: "all", list: [], loading: false, error: "", selected: null };
let leafletReady = null;
let placesMap = null;
let placesLayer = null;

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletReady) return leafletReady;
  leafletReady = new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);
    const js = document.createElement("script");
    js.src = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js";
    js.onload = () => resolve(window.L);
    js.onerror = () => { leafletReady = null; reject(new Error("leaflet")); };
    document.head.appendChild(js);
  });
  return leafletReady;
}

const fmtDistance = (m) =>
  m < 950 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toLocaleString(locale(), { maximumFractionDigits: m < 9950 ? 1 : 0 })} km`;
const placesVisible = () => placesState.list.filter((p) => placesState.cat === "all" || p.cat === placesState.cat);

function placeCard(p) {
  const title = p.name || t(`places.cat.${p.cat}`);
  const tags = [
    `<span class="pill ${p.halal === "only" ? "s-halal_certifie" : "s-halal_probable"}"><span class="dot"></span>${t(p.halal === "only" ? "places.only" : "places.yes")}</span>`,
    p.cert ? `<span class="pill r-info">${esc(t("places.cert", { c: p.cert }))}</span>` : "",
  ].join("");
  return `<article class="place${placesState.selected === p.id ? " is-selected" : ""}" data-place="${esc(p.id)}">
    <span class="place-ico pc-${p.cat}">${svg(PLACE_ICON[p.cat])}</span>
    <div class="place-body">
      <button type="button" class="place-head" data-focus="${esc(p.id)}"><strong>${esc(title)}</strong><small>${t(`places.cat.${p.cat}`)} · <span dir="ltr">${fmtDistance(p.distance)}</span></small></button>
      <div class="place-tags">${tags}</div>
      ${p.address ? `<p class="place-line">${esc(p.address)}</p>` : ""}
      ${p.hours ? `<p class="place-line place-hours" dir="ltr">${esc(p.hours)}</p>` : ""}
      <div class="place-actions">
        <a class="btn btn-soft btn-sm" href="${esc(directionsUrl(p, IOS))}" target="_blank" rel="noopener">${t("places.directions")}</a>
        ${p.phone ? `<a class="btn btn-soft btn-sm" href="tel:${esc(p.phone.replace(/[^\d+]/g, ""))}">${t("places.call")}</a>` : ""}
        ${p.website ? `<a class="btn btn-soft btn-sm" href="${esc(/^https?:/.test(p.website) ? p.website : "https://" + p.website)}" target="_blank" rel="noopener">${t("places.website")}</a>` : ""}
        <a class="link-btn place-osm" href="${esc(osmUrl(p))}" target="_blank" rel="noopener">${t("places.osm")}</a>
      </div>
    </div>
  </article>`;
}

function renderPlaces() {
  const st = placesState;
  $("placesRadius").innerHTML = RADII.map(
    (r) => `<button type="button" role="radio" class="chip" aria-checked="${st.radius === r}" aria-selected="${st.radius === r}" data-radius="${r}">${r / 1000} km</button>`
  ).join("");
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, st.list.filter((p) => p.cat === c).length]));
  $("placesCats").innerHTML = st.list.length
    ? ["all", ...CATEGORIES.filter((c) => counts[c])]
        .map((c) => `<button type="button" class="chip" aria-selected="${st.cat === c}" data-pcat="${c}">${t(c === "all" ? "places.all" : `places.cats.${c}`)} <small>${c === "all" ? st.list.length : counts[c]}</small></button>`)
        .join("")
    : "";
  const vis = placesVisible();
  $("placesStatus").innerHTML = st.loading
    ? `<span class="spinner"></span> ${t("places.loading")}`
    : st.error
      ? esc(st.error)
      : st.center
        ? esc(tn("places.found", vis.length, { where: st.label, r: st.radius / 1000 }))
        : esc(t("places.intro"));
  $("placesList").innerHTML = st.center && !st.loading && !st.error && !vis.length
    ? `<div class="empty"><strong>${t("places.empty_t")}</strong><p>${t("places.empty_p")}</p></div>`
    : vis.map(placeCard).join("");
  $("placesLocate").disabled = st.loading;
  updatePlacesMap();
}

async function updatePlacesMap() {
  const st = placesState;
  if (!st.center) { $("placesMap").hidden = true; return; }
  $("placesMap").hidden = false;
  let L;
  try { L = await loadLeaflet(); } catch { $("placesMap").hidden = true; return; }
  if (!placesMap) {
    placesMap = L.map("placesMap", { zoomControl: false, attributionControl: true }).setView([st.center.lat, st.center.lon], 14);
    L.control.zoom({ position: "bottomright" }).addTo(placesMap);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    }).addTo(placesMap);
    placesLayer = L.layerGroup().addTo(placesMap);
  }
  placesLayer.clearLayers();
  L.marker([st.center.lat, st.center.lon], { icon: L.divIcon({ className: "pm-me", html: "<i></i>", iconSize: [18, 18] }), interactive: false }).addTo(placesLayer);
  const vis = placesVisible();
  const pts = [[st.center.lat, st.center.lon]];
  for (const p of vis) {
    const m = L.marker([p.lat, p.lon], {
      icon: L.divIcon({ className: "pm", html: `<span class="pm-pin pm-${p.halal}${st.selected === p.id ? " is-selected" : ""}">${svg(PLACE_ICON[p.cat])}</span>`, iconSize: [34, 34], iconAnchor: [17, 32] }),
      title: p.name || t(`places.cat.${p.cat}`),
    });
    m.on("click", () => selectPlace(p.id, { fromMap: true }));
    m.addTo(placesLayer);
    pts.push([p.lat, p.lon]);
  }
  setTimeout(() => {
    placesMap.invalidateSize();
    if (!st.selected) {
      if (pts.length > 1) placesMap.fitBounds(pts.slice(0, 40), { padding: [28, 28], maxZoom: 16 });
      else placesMap.setView([st.center.lat, st.center.lon], 14);
    }
  }, 60);
}

function selectPlace(id, { fromMap = false } = {}) {
  placesState.selected = id;
  const p = placesState.list.find((x) => x.id === id);
  renderPlaces();
  if (p && placesMap) placesMap.setView([p.lat, p.lon], Math.max(placesMap.getZoom(), 16), { animate: true });
  const card = document.querySelector(`.place[data-place="${CSS.escape(id)}"]`);
  if (card && fromMap) card.scrollIntoView({ behavior: "smooth", block: "center" });
  if (!fromMap) $("placesMap").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function searchPlaces(lat, lon, label) {
  Object.assign(placesState, { center: { lat, lon }, label, loading: true, error: "", selected: null, cat: "all" });
  renderPlaces();
  try {
    placesState.list = await fetchPlaces(lat, lon, placesState.radius);
  } catch {
    placesState.list = [];
    placesState.error = t("places.error");
  }
  placesState.loading = false;
  renderPlaces();
}

$("placesLocate").addEventListener("click", () => {
  if (!navigator.geolocation) { placesState.error = t("places.geo_unsupported"); return renderPlaces(); }
  placesState.loading = true;
  placesState.error = "";
  renderPlaces();
  navigator.geolocation.getCurrentPosition(
    (pos) => searchPlaces(pos.coords.latitude, pos.coords.longitude, t("places.around_me")),
    (err) => {
      placesState.loading = false;
      placesState.error = t(err && err.code === 1 ? "places.geo_denied" : "places.geo_error");
      renderPlaces();
    },
    { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
  );
});
$("placesCityForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = $("placesCity").value.trim();
  if (!q) return;
  $("placesCity").blur();
  placesState.loading = true;
  placesState.error = "";
  renderPlaces();
  try {
    const g = await geocode(q, getLang());
    if (!g) throw new Error("none");
    await searchPlaces(g.lat, g.lon, q);
  } catch {
    placesState.loading = false;
    placesState.error = t("places.city_error", { q });
    renderPlaces();
  }
});
$("placesRadius").addEventListener("click", (e) => {
  const b = e.target.closest("[data-radius]");
  if (!b) return;
  placesState.radius = Number(b.dataset.radius);
  if (placesState.center) searchPlaces(placesState.center.lat, placesState.center.lon, placesState.label);
  else renderPlaces();
});
$("placesCats").addEventListener("click", (e) => {
  const b = e.target.closest("[data-pcat]");
  if (!b) return;
  placesState.cat = b.dataset.pcat;
  placesState.selected = null;
  renderPlaces();
});
$("placesList").addEventListener("click", (e) => {
  const b = e.target.closest("[data-focus]");
  if (b) selectPlace(b.dataset.focus);
});

// ===========================================================================
// Démarrage
// ===========================================================================
applyAppearance();
setLang(prefs().lang);
applyStatic();
renderSuggestions();
renderOnline();
if (DEMO) $("demoBadge").hidden = false;
showTab(location.hash.slice(1) || "scan");
if (!prefs().onboarded && !DEMO) openOnboard();
// Prépare le lecteur en arrière-plan pour que le premier scan soit immédiat.
const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
idle(() => getDetector().then(() => ($("engineInfo").textContent = detectorEngine())).catch(() => {}));
// Base des ingrédients cosmétiques (CosIng) : chargée une fois, puis gardée hors connexion
let cosingLoading = null;
function loadCosing() {
  if (cosingLoading) return cosingLoading;
  cosingLoading = fetch("data/cosing.json")
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (!d || !d.i) return;
      setCosmeticDb(d);
      if (sheetProduct && kindOf(sheetProduct) === "beauty") { renderSheetProduct(sheetProduct); if (!sheetProduct.local) loadAlternatives(sheetProduct, sheetCode); }
    })
    .catch(() => { cosingLoading = null; });
  return cosingLoading;
}
idle(loadCosing);
