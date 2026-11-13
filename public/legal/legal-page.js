// Pages légales du site : même texte que dans l'app (lib/legal-docs.js), une page par document.
import { legalDoc, legalComplete } from "../lib/legal-docs.js";
import { LEGAL_INFO } from "../lib/legal-info.js";

const PAGES = [["mentions", "mentions.html", "Mentions légales"], ["privacy", "confidentialite.html", "Confidentialité"],
  ["terms", "conditions.html", "Conditions d'utilisation"], ["sales", "abonnement.html", "Abonnement"], ["contact", "contact.html", "Contact"]];
const id = document.body.dataset.doc;
const el = (tag, text, attrs = {}) => { const e = document.createElement(tag); if (text != null) e.textContent = text; Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); return e; };

const nav = document.querySelector("nav");
for (const [pid, href, label] of PAGES) nav.append(el("a", label, { href, ...(pid === id ? { "aria-current": "page" } : {}) }));

const art = document.querySelector("article");
if (id === "contact") {
  art.append(el("h1", "Contact"));
  art.append(el("p", "Une question, une erreur dans une fiche, une demande sur vos données ? Écrivez-nous :"));
  const mail = (LEGAL_INFO.email || "").trim();
  if (mail) art.append(el("a", mail, { class: "mail", href: `mailto:${mail}` }));
  else art.append(el("p", "[à compléter : adresse e-mail de contact]"));
  art.append(el("p", "Nous répondons en général sous quelques jours."));
} else {
  const d = legalDoc(id);
  document.title = `${d.title} · Bayyin`;
  art.append(el("h1", d.title));
  if (d.intro) art.append(el("p", d.intro, { class: "intro" }));
  for (const [title, paras] of d.sections) {
    art.append(el("h2", title));
    let ul = null;
    for (const para of paras) {
      if (para.startsWith("•")) { if (!ul) { ul = el("ul"); art.append(ul); } ul.append(el("li", para.replace(/^•\s*/, ""))); }
      else { ul = null; art.append(el("p", para)); }
    }
  }
  if (!legalComplete()) art.append(el("p", "Certaines informations de l'éditeur sont en cours de complément.", { class: "intro" }));
}
