// Carte image du verdict, à partager (WhatsApp, Instagram…). Dessinée dans un canvas, sans service externe.

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
 * @param {object} o { name, brand, image, status, statusLabel, kicker, lead, score, grade, gradeLabel, healthLabel, footer, rtl }
 * @returns {Promise<Blob>} image PNG 1080 × 1350
 */
export async function drawShareCard(o) {
  if (document.fonts && document.fonts.ready) await document.fonts.ready.catch(() => {});
  const W = 1080, H = 1350;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  const font = (w, s) => `${w} ${s}px Figtree, "IBM Plex Sans Arabic", system-ui, sans-serif`;
  ctx.direction = o.rtl ? "rtl" : "ltr";
  const X = (x) => (o.rtl ? W - x : x);
  ctx.textAlign = o.rtl ? "right" : "left";

  // Fond
  ctx.fillStyle = "#F1F5F0";
  ctx.fillRect(0, 0, W, H);

  // En-tête : logo (le même tracé que icon.svg) + nom
  const lx = o.rtl ? W - 72 - 88 : 72;
  ctx.save();
  ctx.translate(lx, 70);
  ctx.scale(88 / 48, 88 / 48);
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
  ctx.font = font(800, 52);
  ctx.fillText("Bayyin", X(184), 132);

  // Carte produit
  ctx.fillStyle = "#fff";
  roundRect(ctx, 60, 210, W - 120, 330, 40);
  ctx.fill();
  const img = await loadImage(o.image);
  const imgX = o.rtl ? W - 100 - 250 : 100;
  if (img) {
    const s = Math.min(250 / img.width, 250 / img.height);
    ctx.drawImage(img, imgX + (250 - img.width * s) / 2, 250 + (250 - img.height * s) / 2, img.width * s, img.height * s);
  } else {
    ctx.fillStyle = "#F3F6F2";
    roundRect(ctx, imgX, 250, 250, 250, 30);
    ctx.fill();
  }
  const tx = o.rtl ? W - 100 - 250 - 40 : 100 + 250 + 40;
  const tw = W - 120 - 250 - 120;
  ctx.fillStyle = "#15211A";
  ctx.font = font(800, 54);
  const nameLines = wrap(ctx, o.name, tw, 3);
  nameLines.forEach((l, i) => ctx.fillText(l, tx, 310 + i * 64));
  ctx.fillStyle = "#5D6A63";
  ctx.font = font(500, 38);
  if (o.brand) ctx.fillText(wrap(ctx, o.brand, tw, 1)[0], tx, 310 + nameLines.length * 64 + 16);

  // Bandeau du verdict
  const vc = COLORS[o.status] || COLORS.inconnu;
  const top = 580, bh = o.score ? 560 : 440;
  ctx.fillStyle = vc;
  roundRect(ctx, 60, top, W - 120, bh, 48);
  ctx.fill();
  ctx.save();
  roundRect(ctx, 60, top, W - 120, bh, 48);
  ctx.clip();
  ctx.strokeStyle = "rgba(255,255,255,.14)";
  ctx.lineWidth = 3;
  for (let y = top + 20; y < top + bh + 60; y += 110) for (let x = 90; x < W; x += 110) khatam(ctx, x, y, 26);
  ctx.restore();

  const icx = o.rtl ? W - 200 : 200;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(icx, top + 150, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = vc;
  ctx.lineWidth = 16;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  if (o.status === "halal_certifie" || o.status === "halal_probable") {
    ctx.moveTo(icx - 40, top + 152); ctx.lineTo(icx - 10, top + 182); ctx.lineTo(icx + 44, top + 122);
  } else if (o.status === "haram") {
    ctx.moveTo(icx - 36, top + 114); ctx.lineTo(icx + 36, top + 186); ctx.moveTo(icx + 36, top + 114); ctx.lineTo(icx - 36, top + 186);
  } else if (o.status === "mashbouh") {
    ctx.font = font(900, 120); ctx.fillStyle = vc; ctx.textAlign = "center"; ctx.fillText("?", icx, top + 192); ctx.textAlign = o.rtl ? "right" : "left";
  } else {
    ctx.moveTo(icx - 40, top + 150); ctx.lineTo(icx + 40, top + 150);
  }
  ctx.stroke();

  const vx = o.rtl ? W - 340 : 340;
  ctx.fillStyle = "rgba(255,255,255,.88)";
  ctx.font = font(600, 38);
  ctx.fillText(o.kicker, vx, top + 110);
  ctx.fillStyle = "#fff";
  ctx.font = font(800, 84);
  ctx.fillText(wrap(ctx, o.statusLabel, W - 340 - 100, 1)[0], vx, top + 196);
  ctx.font = font(500, 38);
  ctx.fillStyle = "rgba(255,255,255,.92)";
  wrap(ctx, o.lead, W - 220, 2).forEach((l, i) => ctx.fillText(l, X(110), top + 300 + i * 52));

  if (o.score) {
    ctx.save();
    roundRect(ctx, 60, top, W - 120, bh, 48);
    ctx.clip();
    ctx.fillStyle = "rgba(0,0,0,.14)";
    ctx.fillRect(60, top + bh - 170, W - 120, 170);
    ctx.restore();
    const rx = o.rtl ? W - 190 : 190, ry = top + bh - 85;
    ctx.strokeStyle = "rgba(255,255,255,.3)";
    ctx.lineWidth = 14;
    ctx.beginPath(); ctx.arc(rx, ry, 56, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "#fff";
    ctx.beginPath(); ctx.arc(rx, ry, 56, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * o.score) / 100); ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = font(800, 44);
    ctx.fillText(String(o.score), rx, ry + 15);
    ctx.textAlign = o.rtl ? "right" : "left";
    ctx.font = font(500, 34);
    ctx.fillStyle = "rgba(255,255,255,.85)";
    ctx.fillText(o.healthLabel, X(290), ry - 12);
    ctx.font = font(800, 46);
    ctx.fillStyle = "#fff";
    ctx.fillText(`${o.gradeLabel} · ${o.score}/100`, X(290), ry + 42);
  }

  // Pied
  ctx.fillStyle = "#5D6A63";
  ctx.font = font(600, 34);
  ctx.textAlign = "center";
  ctx.fillText(o.footer, W / 2, H - 70);

  return new Promise((resolve) => c.toBlob((b) => resolve(b), "image/png"));
}
