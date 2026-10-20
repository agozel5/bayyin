// Carte image du verdict, à partager (WhatsApp, Instagram…). Dessinée dans un canvas, sans service externe.
import { qrMatrix } from "./qr.js";

const COLORS = { halal_certifie: "#128A4E", halal_probable: "#2E7F45", mashbouh: "#BF650A", haram: "#C3362D", inconnu: "#5F6B65" };

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
    setTimeout(() => resolve(null), 4000);
  });
}

// Coupe un texte en lignes qui tiennent dans la largeur donnée
function wrap(ctx, text, width, maxLines) {
  const words = String(text || "").split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > width && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else line = test;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, "…");
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Étoile à huit branches (signature de la marque)
function khatam(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  for (const a of [0, Math.PI / 4]) {
    ctx.save();
    ctx.rotate(a);
    ctx.strokeRect(-r, -r, 2 * r, 2 * r);
    ctx.restore();
  }
  ctx.restore();
}

/**
 * Carte au format story (Instagram, WhatsApp, Snapchat) : photo, verdict, note santé et un QR code
 * qui ouvre la fiche du produit dans Bayyin. Les zones du haut et du bas, couvertes par l'interface
 * des applis de story, ne portent rien d'essentiel.
 * @param {object} o { name, brand, image, status, statusLabel, kicker, lead, score, grade, gradeLabel, healthLabel,
 *                     footer, scanLine, url, urlLabel, rtl }
 * @returns {Promise<Blob>} image PNG 1080 × 1920
 */
export async function drawShareCard(o) {
  if (document.fonts && document.fonts.ready) await document.fonts.ready.catch(() => {});
  const W = 1080, H = 1920, M = 90;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  const font = (w, s, mono) => `${w} ${s}px ${mono ? '"IBM Plex Mono", ui-monospace, monospace' : '"IBM Plex Sans", "IBM Plex Sans Arabic", system-ui, sans-serif'}`;
  ctx.direction = o.rtl ? "rtl" : "ltr";
  const X = (x) => (o.rtl ? W - x : x);
  const start = o.rtl ? "right" : "left";
  ctx.textAlign = start;
  const vc = COLORS[o.status] || COLORS.inconnu;

  // Fond : sauge clair, et le khatam en filigrane derrière l'en-tête
  ctx.fillStyle = "#F1F5F0";
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.strokeStyle = "rgba(18,114,79,.07)";
  ctx.lineWidth = 3;
  for (let y = 40; y < 300; y += 120) for (let x = 40; x < W + 60; x += 120) khatam(ctx, x, y, 30);
  ctx.restore();

  // En-tête : logo + nom
  const lx = o.rtl ? W - M - 84 : M;
  ctx.save();
  ctx.translate(lx, 150);
  ctx.scale(84 / 48, 84 / 48);
  ctx.fillStyle = "#12724F";
  roundRect(ctx, 0, 0, 48, 48, 12);
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 4.4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke(new Path2D("M9.6 20.4c-.1 5.6 3.4 8.1 10.4 8.3l7.6.1c6.9 0 10.6-2.6 11-8.4.2-2.4-.3-4.8-1.2-6.6"));
  ctx.fillStyle = "#E7B84E";
  ctx.beginPath();
  ctx.arc(23.6, 35.8, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#15211A";
  ctx.font = font(700, 50);
  ctx.fillText("Bayyin", X(M + 108), 208);
  ctx.fillStyle = "#12724F";
  ctx.font = font(600, 46);
  ctx.textAlign = o.rtl ? "left" : "right";
  ctx.fillText("بيّن", X(W - M), 208);
  ctx.textAlign = start;

  // Photo du produit sur une carte blanche
  const py = 280, ph = 460;
  ctx.fillStyle = "#fff";
  roundRect(ctx, M, py, W - 2 * M, ph, 36);
  ctx.fill();
  ctx.strokeStyle = "#E3E8E2";
  ctx.lineWidth = 2;
  ctx.stroke();
  const img = await loadImage(o.image);
  if (img) {
    const box = ph - 100;
    const sc = Math.min(box / img.width, (W - 2 * M - 100) / img.width, box / img.height);
    ctx.drawImage(img, (W - img.width * sc) / 2, py + (ph - img.height * sc) / 2, img.width * sc, img.height * sc);
  } else {
    ctx.strokeStyle = "#C9D3CC";
    ctx.lineWidth = 6;
    ctx.save();
    ctx.translate(W / 2, py + ph / 2);
    ctx.strokeRect(-70, -50, 140, 100);
    for (let i = -46; i <= 46; i += 14) { ctx.beginPath(); ctx.moveTo(i, -28); ctx.lineTo(i, 28); ctx.stroke(); }
    ctx.restore();
  }

  // Nom et marque
  ctx.fillStyle = "#15211A";
  ctx.font = font(700, 62);
  const nameLines = wrap(ctx, o.name, W - 2 * M, 2);
  nameLines.forEach((l, i) => ctx.fillText(l, X(M), 830 + i * 74));
  let y = 830 + nameLines.length * 74;
  if (o.brand) {
    ctx.fillStyle = "#5D6A63";
    ctx.font = font(500, 40);
    ctx.fillText(wrap(ctx, o.brand, W - 2 * M, 1)[0], X(M), y + 2);
    y += 50;
  }

  // Bloc du verdict
  const top = Math.max(y + 36, 1000), bh = 300;
  ctx.fillStyle = vc;
  roundRect(ctx, M, top, W - 2 * M, bh, 40);
  ctx.fill();
  ctx.save();
  roundRect(ctx, M, top, W - 2 * M, bh, 40);
  ctx.clip();
  ctx.strokeStyle = "rgba(255,255,255,.13)";
  ctx.lineWidth = 3;
  for (let yy = top + 10; yy < top + bh + 60; yy += 110) for (let x = M + 20; x < W; x += 110) khatam(ctx, x, yy, 26);
  ctx.restore();
  const icx = o.rtl ? W - M - 120 : M + 120, icy = top + 120;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(icx, icy, 74, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = vc;
  ctx.fillStyle = vc;
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  if (o.status === "halal_certifie" || o.status === "halal_probable") {
    ctx.moveTo(icx - 32, icy + 2); ctx.lineTo(icx - 8, icy + 26); ctx.lineTo(icx + 36, icy - 22);
  } else if (o.status === "haram") {
    ctx.moveTo(icx - 28, icy - 28); ctx.lineTo(icx + 28, icy + 28); ctx.moveTo(icx + 28, icy - 28); ctx.lineTo(icx - 28, icy + 28);
  } else if (o.status === "mashbouh") {
    ctx.font = font(700, 100); ctx.textAlign = "center"; ctx.fillText("?", icx, icy + 36); ctx.textAlign = start;
  } else {
    ctx.moveTo(icx - 32, icy); ctx.lineTo(icx + 32, icy);
  }
  ctx.stroke();
  const vx = o.rtl ? W - M - 230 : M + 230;
  ctx.fillStyle = "rgba(255,255,255,.85)";
  ctx.font = font(600, 36);
  ctx.fillText(o.kicker, X(o.rtl ? W - vx : vx), top + 92);
  ctx.fillStyle = "#fff";
  ctx.font = font(700, 76);
  ctx.fillText(wrap(ctx, o.statusLabel, W - 2 * M - 270, 1)[0], X(o.rtl ? W - vx : vx), top + 172);
  ctx.font = font(500, 34);
  ctx.fillStyle = "rgba(255,255,255,.92)";
  wrap(ctx, o.lead, W - 2 * M - 80, 1).forEach((l) => ctx.fillText(l, X(M + 40), top + 262));

  // Note santé
  let qy = top + bh + 40;
  if (o.score) {
    ctx.fillStyle = "#fff";
    roundRect(ctx, M, qy, W - 2 * M, 150, 32);
    ctx.fill();
    ctx.strokeStyle = "#E3E8E2";
    ctx.lineWidth = 2;
    ctx.stroke();
    const gc = { excellent: "#169B57", bon: "#7DBE45", mediocre: "#EE8A1F", mauvais: "#E0423A" }[o.grade] || "#5D6A63";
    const rx = o.rtl ? W - M - 90 : M + 90, ry = qy + 75;
    ctx.lineWidth = 12;
    ctx.strokeStyle = "#EBEFEA";
    ctx.beginPath(); ctx.arc(rx, ry, 46, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = gc;
    ctx.beginPath(); ctx.arc(rx, ry, 46, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * o.score) / 100); ctx.stroke();
    ctx.fillStyle = "#15211A";
    ctx.textAlign = "center";
    ctx.font = font(600, 38, true);
    ctx.fillText(String(o.score), rx, ry + 13);
    ctx.textAlign = start;
    ctx.fillStyle = "#5D6A63";
    ctx.font = font(500, 32);
    ctx.fillText(o.healthLabel, X(M + 170), ry - 10);
    ctx.fillStyle = "#15211A";
    ctx.font = font(700, 42);
    ctx.fillText(`${o.gradeLabel} · ${o.score}/100`, X(M + 170), ry + 38);
    qy += 150 + 40;
  }

  // QR code : la fiche du produit dans Bayyin
  if (o.url) {
    const qs = 200;
    const qx = o.rtl ? W - M - qs : M;
    ctx.fillStyle = "#fff";
    roundRect(ctx, qx, qy, qs, qs, 24);
    ctx.fill();
    try {
      const m = qrMatrix(o.url);
      const n = m.length, cell = (qs - 28) / n;
      ctx.fillStyle = "#15211A";
      m.forEach((row, yy) => row.forEach((on, xx) => { if (on) ctx.fillRect(qx + 14 + xx * cell, qy + 14 + yy * cell, cell + 0.4, cell + 0.4); }));
    } catch { /* lien trop long : la carte reste valable sans QR */ }
    const tx = o.rtl ? W - M - qs - 36 : M + qs + 36;
    ctx.fillStyle = "#15211A";
    ctx.font = font(700, 40);
    wrap(ctx, o.scanLine || o.footer, W - 2 * M - qs - 36, 2).forEach((l, i) => ctx.fillText(l, X(o.rtl ? W - tx : tx), qy + 70 + i * 50));
    ctx.fillStyle = "#12724F";
    ctx.font = font(500, 30, true);
    ctx.direction = "ltr";
    ctx.textAlign = o.rtl ? "right" : "left";
    ctx.fillText(o.urlLabel || "", tx, qy + 178);
    ctx.direction = o.rtl ? "rtl" : "ltr";
  }

  return new Promise((resolve) => c.toBlob((b) => resolve(b), "image/png"));
}
