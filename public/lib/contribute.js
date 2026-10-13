// Ajouter un produit manquant à Open Food Facts (ou Open Beauty Facts) depuis l'app.
// Avec le compte de l'app (app-config.js) : envoi direct du nom, des ingrédients et de la photo,
// signé « Bayyin » et d'un identifiant d'appareil anonyme (app_uuid) pour la modération.
// Sans compte : on ouvre la page d'ajout du site, ingrédients copiés pour être collés.

import { APP } from "../app-config.js";

const OFF = "https://world.openfoodfacts.org";
const OBF = "https://world.openbeautyfacts.org";
const DONE_KEY = "bayyin_contributed";

export const offAccountReady = () => !!(APP.off && APP.off.user && APP.off.password);
export const addUrl = (code, beauty = false) => `${beauty ? OBF : OFF}/cgi/product.pl?type=search_or_add&action=process&code=${encodeURIComponent(code)}`;

function deviceUuid() {
  try {
    let id = localStorage.getItem("bayyin_uuid");
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) || String(Math.random()).slice(2) + Date.now();
      localStorage.setItem("bayyin_uuid", id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

export function contributed(code) {
  try {
    return (JSON.parse(localStorage.getItem(DONE_KEY)) || []).includes(code);
  } catch {
    return false;
  }
}
function markContributed(code) {
  try {
    const list = JSON.parse(localStorage.getItem(DONE_KEY)) || [];
    if (!list.includes(code)) localStorage.setItem(DONE_KEY, JSON.stringify([...list, code].slice(-200)));
  } catch { /* stockage indisponible */ }
}

/** -> { ok, photo: true|false|null, error? } */
export async function contribute({ code, name = "", ingredients, photo = null, beauty = false, lang = "fr" }) {
  if (!offAccountReady()) return { ok: false, error: "no_account" };
  const base = beauty ? OBF : OFF;
  const auth = { user_id: APP.off.user, password: APP.off.password };
  const meta = { app_name: "Bayyin", app_version: APP.version, app_uuid: deviceUuid(), comment: "Bayyin : liste d'ingrédients photographiée et vérifiée par l'utilisateur" };
  const fields = new URLSearchParams({ code, ...auth, ...meta, lang, [`ingredients_text_${lang}`]: ingredients });
  if (name) fields.set(`product_name_${lang}`, name);
  let res;
  try {
    res = await fetch(`${base}/cgi/product_jqm2.pl`, { method: "POST", body: fields, signal: AbortSignal.timeout(20000) }).then((r) => r.json());
  } catch {
    return { ok: false, error: "network" };
  }
  if (!res || res.status !== 1) return { ok: false, error: "refused" };
  let photoOk = null;
  if (photo) {
    const form = new FormData();
    Object.entries({ code, ...auth, ...meta, imagefield: `ingredients_${lang}` }).forEach(([k, v]) => form.append(k, v));
    form.append(`imgupload_ingredients_${lang}`, photo, "ingredients.jpg");
    try {
      const up = await fetch(`${base}/cgi/product_image_upload.pl`, { method: "POST", body: form, signal: AbortSignal.timeout(45000) }).then((r) => r.json());
      photoOk = !!up && (up.status === "status ok" || up.status === 1 || !!up.image);
    } catch {
      photoOk = false;
    }
  }
  markContributed(code);
  return { ok: true, photo: photoOk };
}
