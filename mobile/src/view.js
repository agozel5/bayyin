// Fonctions d'affichage communes aux écrans.
import { classifyAny, checkProfile } from "./core";
import { getSettings } from "./storage";
import { isPremium } from "./premium";
import { t, getLang, locale } from "./i18n";

// Le verdict est recalculé à l'affichage pour suivre les réglages actuels.
export const verdictOf = (p) => (p.raw ? classifyAny(p.raw, getSettings()) : p.verdict);
export const kindOf = (p) => p.kind || (p.raw && p.raw.kind) || "food";
// Comparaison avec le profil (allergies, régime) de l'utilisateur
// Profil : le vôtre, et ceux de la famille (Premium). L'alerte la plus forte passe en premier,
// avec le prénom de la personne concernée (comme la version web).
export const profileOf = (p) => {
  const v = verdictOf(p);
  const st = getSettings();
  const mine = checkProfile(p.raw, v, st.profile);
  if (!st.members || !st.members.length || !isPremium()) return mine;
  const people = [{ name: null, r: mine }, ...st.members.map((m) => ({ name: m.name, r: checkProfile(p.raw, v, m) }))].filter((x) => x.r.alert);
  if (!people.length) return mine;
  people.sort((a, b) => (a.r.alert === "no" ? 0 : 1) - (b.r.alert === "no" ? 0 : 1));
  return { ...people[0].r, who: people[0].name, people: people.map((x) => ({ name: x.name, ...x.r })) };
};
export const nameOf = (p) => {
  const n = p.names || {};
  return n[getLang()] || p.name || n.any || n.en || t("product.unnamed");
};
export const scoreOf = (p) => (p.health && p.health.score) || null;
export const S = (st, part) => t(`status.${st}.${part}`);
export const isBarcode = (code) => /^\d+$/.test(String(code));

export function flagLabel(f) {
  if (f.group === "gras") return `${f.code} · ${t("flag.fatty.label")}`;
  const label = t(`flag.${f.id}.label`);
  return f.code ? `${f.code} · ${label}` : label;
}
export function flagReason(f) {
  if (f.variant) return t(`flag.variant.${f.variant}`);
  if (f.group === "gras") return t("flag.fatty.reason");
  return t(`flag.${f.id}.reason`);
}
export const noteText = (n) => (/\s/.test(n) ? n : t(`note.${n}`));

export const fmt = (v) => Number(v).toLocaleString(locale(), { maximumFractionDigits: v < 10 ? 1 : 0 });

export function relTime(ts) {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return t("when.now");
  if (s < 3600) return t("when.min", { n: Math.floor(s / 60) });
  const d = new Date(ts);
  const hm = d.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === new Date().toDateString()) return t("when.today", { t: hm });
  if (d.toDateString() === new Date(Date.now() - 864e5).toDateString()) return t("when.yesterday", { t: hm });
  return d.toLocaleDateString(locale(), { day: "numeric", month: "short" });
}

export function errorText(err) {
  if (err && err.code === "network") return t("msg.offline_missing");
  if (err && err.code === "server") return t("msg.server");
  return t("msg.unexpected");
}
