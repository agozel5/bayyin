// Traductions (mêmes dictionnaires que la version web).
import { DICTS } from "./core";
import { EXTRA } from "./i18n-extra";

export const LANGS = ["fr", "en", "ar", "tr"];
const LOCALES = { fr: "fr-FR", en: "en-GB", ar: "ar-u-nu-latn", tr: "tr-TR" };
let lang = "fr";

export function setLang(l) {
  lang = DICTS[l] ? l : "fr";
}
export const getLang = () => lang;
export const isRTL = () => lang === "ar";
export const locale = () => LOCALES[lang];

// Textes propres à l'app native (la version web parle de navigateur et de site).
const NATIVE = {
  fr: {
    "cam.err.denied.p": "Bayyin a besoin de la caméra pour lire les codes-barres. Autorisez-la dans les réglages du téléphone.",
    "cam.allow": "Autoriser la caméra",
    "cam.open_settings": "Ouvrir les réglages",
    "settings.offline_p": "Les fiches déjà consultées restent disponibles sans réseau. Téléchargez en plus les 1 000 produits les plus scannés en France et tous les classements (environ 10 Mo, de préférence en Wi-Fi).",
  },
  en: {
    "cam.err.denied.p": "Bayyin needs the camera to read barcodes. Allow it in your phone settings.",
    "cam.allow": "Allow camera",
    "cam.open_settings": "Open settings",
    "settings.offline_p": "Products you have already viewed stay available offline. You can also download the 1,000 most scanned products in France and all the rankings (about 10 MB, preferably on Wi-Fi).",
  },
  ar: {
    "cam.err.denied.p": "يحتاج بيّن إلى الكاميرا لقراءة الرموز الشريطية. اسمح بها من إعدادات الهاتف.",
    "cam.allow": "السماح بالكاميرا",
    "cam.open_settings": "فتح الإعدادات",
    "settings.offline_p": "تبقى المنتجات التي اطّلعت عليها متاحة دون اتصال. ويمكنك أيضًا تنزيل أكثر 1000 منتج مسحًا في فرنسا وجميع التصنيفات (نحو 10 ميغابايت، ويُفضّل عبر Wi-Fi).",
  },
  tr: {
    "cam.err.denied.p": "Bayyin barkodları okumak için kameraya ihtiyaç duyar. Telefon ayarlarından izin verin.",
    "cam.allow": "Kameraya izin ver",
    "cam.open_settings": "Ayarları aç",
    "settings.offline_p": "Daha önce baktığınız ürünler çevrimdışı da görüntülenebilir. Ayrıca Fransa'da en çok taranan 1.000 ürünü ve tüm sıralamaları indirebilirsiniz (yaklaşık 10 MB, tercihen Wi-Fi ile).",
  },
};

export function t(key, vars) {
  let s = NATIVE[lang][key] ?? EXTRA[lang][key] ?? DICTS[lang][key];
  if (s === undefined) s = NATIVE.fr[key] ?? EXTRA.fr[key];
  if (s === undefined) s = DICTS.fr[key];
  if (s === undefined) return key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
  return s;
}
export const tn = (key, n, vars = {}) => t(`${key}_${n === 1 ? "one" : "other"}`, { n, ...vars });
// Les textes « _html » de la version web contiennent <br> et <strong> : on les retire ici.
export const tPlain = (key, vars) => t(key, vars).replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, "");
