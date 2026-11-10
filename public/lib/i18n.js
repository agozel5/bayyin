// Traductions : t("clé", { variables }) dans la langue choisie, repli sur le français.
import fr from "./i18n/fr.js";
import en from "./i18n/en.js";
import ar from "./i18n/ar.js";
import tr from "./i18n/tr.js";
import de from "./i18n/de.js";
import es from "./i18n/es.js";
import ur from "./i18n/ur.js";
import id from "./i18n/id.js";
import nl from "./i18n/nl.js";
import it from "./i18n/it.js";
import ms from "./i18n/ms.js";
import bn from "./i18n/bn.js";

export const DICTS = { fr, en, ar, tr, de, es, ur, id, nl, it, ms, bn };
export const LANG_NAMES = { fr: "Français", en: "English", ar: "العربية", tr: "Türkçe", de: "Deutsch", es: "Español", ur: "اردو", id: "Bahasa Indonesia", nl: "Nederlands", it: "Italiano", ms: "Bahasa Melayu", bn: "বাংলা" };
const LOCALES = { fr: "fr-FR", en: "en-GB", ar: "ar-u-nu-latn", tr: "tr-TR", de: "de-DE", es: "es-ES", ur: "ur-PK-u-nu-latn", id: "id-ID", nl: "nl-NL", it: "it-IT", ms: "ms-MY", bn: "bn-BD-u-nu-latn" };
export const RTL_LANGS = ["ar", "ur"];

let lang = "fr";

export function setLang(l) {
  lang = DICTS[l] ? l : "fr";
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL_LANGS.includes(lang) ? "rtl" : "ltr";
  }
}
export const getLang = () => lang;
export const locale = () => LOCALES[lang];

/** La clé existe-t-elle ? (pour les textes facultatifs, sans déclencher le rechargement ci-dessous) */
export const has = (key) => DICTS[lang][key] !== undefined || fr[key] !== undefined;

/** Numéro de version de chaque fichier de traduction (comparé à celui de l'app au démarrage) */
export const dictBuilds = () => Object.values(DICTS).map((d) => d._build);

export function t(key, vars) {
  let s = DICTS[lang][key];
  if (s === undefined && lang !== "fr") s = en[key]; // langue incomplète : l'anglais avant le français
  if (s === undefined) s = fr[key];
  if (s === undefined) return key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
  return s;
}

// Pluriel simple : clé_one pour 1, clé_other sinon.
export const tn = (key, n, vars = {}) => t(`${key}_${n === 1 ? "one" : "other"}`, { n, ...vars });

// Applique les traductions aux éléments statiques de la page.
export function applyStatic(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  root.querySelectorAll("[data-i18n-html]").forEach((el) => (el.innerHTML = t(el.dataset.i18nHtml)));
  root.querySelectorAll("[data-i18n-ph]").forEach((el) => el.setAttribute("placeholder", t(el.dataset.i18nPh)));
  root.querySelectorAll("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
}
