import { test } from "node:test";
import assert from "node:assert/strict";
import { ramadanDay, fastTimes } from "../public/lib/ramadan.js";
import { qrMatrix } from "../public/lib/qr.js";

const hm = (d, tz) => d.toLocaleTimeString("fr-FR", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
const mins = (s) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };

test("Ramadan : reconnu pendant le mois, pas en dehors", () => {
  assert.ok(ramadanDay(new Date("2027-02-25T12:00:00Z")) > 0);
  assert.equal(ramadanDay(new Date("2027-06-15T12:00:00Z")), 0);
});

test("Ramadan : horaires du soleil plausibles (Paris, Istanbul)", () => {
  // Coucher du soleil à Paris le 20 février : vers 18 h 15 ; à Istanbul : vers 18 h 40
  const paris = fastTimes(new Date(2027, 1, 20), 48.8566, 2.3522, { fajrAngle: 18 });
  assert.ok(Math.abs(mins(hm(paris.maghrib, "Europe/Paris")) - mins("18:16")) <= 6, hm(paris.maghrib, "Europe/Paris"));
  assert.ok(mins(hm(paris.fajr, "Europe/Paris")) < mins("06:30"));
  const ist = fastTimes(new Date(2027, 1, 20), 41.0082, 28.9784, { fajrAngle: 18 });
  assert.ok(Math.abs(mins(hm(ist.maghrib, "Europe/Istanbul")) - mins("18:42")) <= 6, hm(ist.maghrib, "Europe/Istanbul"));
  // Un angle plus faible (12°) donne une aube plus tardive
  const p12 = fastTimes(new Date(2027, 1, 20), 48.8566, 2.3522, { fajrAngle: 12 });
  assert.ok(p12.fajr > paris.fajr);
});

test("QR code : taille et motifs de repérage", () => {
  const m = qrMatrix("https://agozel5.github.io/bayyin/?p=3017620422003");
  assert.equal(m.length, 33); // version 4
  const finder = (x, y) => m[y][x] && m[y][x + 6] && m[y + 6][x] && !m[y + 1][x + 1] && m[y + 3][x + 3];
  assert.ok(finder(0, 0) && finder(m.length - 7, 0) && finder(0, m.length - 7));
  assert.throws(() => qrMatrix("x".repeat(400)));
});
