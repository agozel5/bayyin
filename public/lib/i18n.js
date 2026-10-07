// Traductions : t("clé", { variables }) dans la langue choisie, repli sur le français.
import fr from "./i18n/fr.js";
import en from "./i18n/en.js";
import ar from "./i18n/ar.js";
import tr from "./i18n/tr.js";

export const DICTS = { fr, en, ar, tr };
export const LANG_NAMES = { fr: "Français", en: "English", ar: "العربية", tr: "Türkçe" };
const LOCALES = { fr: "fr-FR", en: "en-GB", ar: "ar-u-nu-latn", tr: "tr-TR" };

let lang = "fr";

export function setLang(l) {
  lang = DICTS[l] ? l : "fr";
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }
}
export const getLang = () => lang;
export const locale = () => LOCALES[lang];

export function t(key, vars) {
  let s = DICTS[lang][key];
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
