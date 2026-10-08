// Le moteur est le même que celui de la version web (dossier public/lib) :
// une correction de règle profite aux deux.
export {
  classify, TOPICS, SCHOOLS, DECISIONS, TOPIC_OF, SEVERITY_OF, ADDITIVES, TEXT_RULES, DEFAULT_PREFS,
} from "../../public/lib/rules.js";
export { ADDITIVE_RISK, HEALTH_GRADES } from "../../public/lib/health.js";
export { present, pickAlternatives, FIELDS, productUrl, OFF_BASE, OffError, classifyAny } from "../../public/lib/off.js";
export { isMedicineCode, medShardUrl, medicineRaw, medNoticeUrl } from "../../public/lib/medicine.js";
export { PROFILE_ALLERGENS, DIETS, EMPTY_PROFILE, hasProfile, checkProfile } from "../../public/lib/profile.js";
export { normalizeScan, validBarcode } from "../../public/lib/barcode.js";
export { SOURCES, SOURCE_BY_ID, RISK_SOURCES, FLAG_SOURCES } from "../../public/lib/sources.js";
export { DICTS, LANG_NAMES } from "../../public/lib/i18n.js";
export { additivesFromText, cleanOcrText } from "../../public/lib/ocr.js";
export { BEAUTY_RULES } from "../../public/lib/beauty.js";
