// Ramadan : savoir si on y est (calendrier hégirien Umm al-Qura du navigateur), le jour du mois,
// et les horaires indicatifs du suhoor (fin : l'aube, Fajr) et de l'iftar (coucher du soleil, Maghrib),
// calculés sur l'appareil à partir d'une position approximative. Aucun service extérieur.

// Repli si le navigateur ne connaît pas le calendrier hégirien : débuts et fins attendus (veille au soir près)
const FALLBACK = [
  ["2027-02-08", "2027-03-09"],
  ["2028-01-28", "2028-02-26"],
  ["2029-01-16", "2029-02-14"],
];

/** { day, month } du calendrier hégirien pour une date, ou null si le navigateur ne sait pas. */
let calendarOk = null;
export function hijri(date = new Date()) {
  try {
    // Certains moteurs (dont celui de l'app mobile) ignorent le calendrier demandé et répondent en grégorien :
    // le 1er mars 2026 tombe pendant le Ramadan 1447, il doit donc donner le mois 9.
    if (calendarOk === null) {
      const m = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { month: "numeric" }).formatToParts(new Date(Date.UTC(2026, 2, 1, 12)));
      calendarOk = Number((m.find((p) => p.type === "month") || {}).value) === 9;
    }
    if (!calendarOk) return null;
    const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { day: "numeric", month: "numeric" }).formatToParts(date);
    const day = Number((parts.find((p) => p.type === "day") || {}).value);
    const month = Number((parts.find((p) => p.type === "month") || {}).value);
    if (day && month) return { day, month };
  } catch { /* calendrier non pris en charge */ }
  return null;
}

/** Jour du Ramadan (1 à 30) ou 0 en dehors du mois. */
export function ramadanDay(date = new Date()) {
  const h = hijri(date);
  if (h) return h.month === 9 ? h.day : 0;
  const iso = date.toISOString().slice(0, 10);
  for (const [a, b] of FALLBACK) {
    if (iso >= a && iso <= b) return Math.floor((Date.parse(iso) - Date.parse(a)) / 864e5) + 1;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Position du soleil (formules simplifiées de l'US Naval Observatory, précision ~1 minute)
// ---------------------------------------------------------------------------
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const fix = (a, b) => ((a % b) + b) % b;

function sun(jd) {
  const D = jd - 2451545.0;
  const g = fix(357.529 + 0.98560028 * D, 360);
  const q = fix(280.459 + 0.98564736 * D, 360);
  const L = fix(q + 1.915 * Math.sin(rad(g)) + 0.020 * Math.sin(rad(2 * g)), 360);
  const e = 23.439 - 0.00000036 * D;
  const RA = fix(deg(Math.atan2(Math.cos(rad(e)) * Math.sin(rad(L)), Math.cos(rad(L)))) / 15, 24);
  return { decl: deg(Math.asin(Math.sin(rad(e)) * Math.sin(rad(L)))), eqt: q / 15 - RA };
}

// Heure UTC (en heures) où le soleil est à `angle` degrés sous l'horizon, avant (-1) ou après (+1) midi
function timeAt(dayJd, lat, lng, angle, dir) {
  let t = 12;
  for (let i = 0; i < 2; i++) { // deux passes : la position du soleil à l'heure trouvée
    const { decl, eqt } = sun(dayJd + t / 24 - 0.5);
    const noon = 12 - lng / 15 - (fix(eqt + 12, 24) - 12);
    const c = (-Math.sin(rad(angle)) - Math.sin(rad(decl)) * Math.sin(rad(lat))) / (Math.cos(rad(decl)) * Math.cos(rad(lat)));
    if (c < -1 || c > 1) return null; // le soleil n'atteint pas cet angle (hautes latitudes)
    t = noon + dir * (deg(Math.acos(c)) / 15);
  }
  return t;
}

/**
 * Horaires du jour (objets Date) : fajr (fin du suhoor) et maghrib (iftar).
 * fajrAngle : 12° (UOIF, France), 15° ou 18° (Ligue islamique mondiale, Diyanet).
 */
export function fastTimes(date, lat, lng, { fajrAngle = 12 } = {}) {
  const y = date.getFullYear(), m = date.getMonth(), d = date.getDate();
  const midnightUtc = Date.UTC(y, m, d);
  const dayJd = midnightUtc / 864e5 + 2440587.5 + 0.5; // jour julien à midi UTC
  const at = (h) => (h == null ? null : new Date(midnightUtc + h * 3600e3));
  return {
    fajr: at(timeAt(dayJd, lat, lng, fajrAngle, -1)),
    maghrib: at(timeAt(dayJd, lat, lng, 0.833, 1)), // bord du disque solaire + réfraction
  };
}
