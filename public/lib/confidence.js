// Fiabilité du verdict halal : sur quoi il repose, dit simplement.
//   high   : label de certification sans conflit, ou interdit certain (porc, alcool, sang…)
//   medium : verdict déduit d'une liste d'ingrédients (pas de label), ou d'une forme de médicament
//   low    : pas de liste d'ingrédients, ou liste trop courte pour conclure
// reasons : points vérifiés, affichés avec ✓ ou ✗ (traduits par l'interface : conf.r.<id>).

import { SCHOOL_TOPICS } from "./rules.js";

export function verdictConfidence(p, v) {
  const raw = p.raw || {};
  const kind = p.kind || raw.kind || "food";
  if (kind === "medicine") return { level: "medium", reasons: [{ id: "form", ok: true }, { id: "excipients", ok: false }] };

  const text = String(p.ingredients || "").replace(/\s+/g, " ").trim();
  const hasIngr = text.length >= 15;
  const states = raw.states_tags || [];
  const checked = states.includes("en:ingredients-completed") || states.includes("en:complete");
  const label = !!(v.certification && v.status !== "haram");
  // Interdit certain : un signalement « haram » qui n'est ni une divergence d'école ni levé par un label
  const definite = v.status === "haram" && v.flags.some((f) => f.severity === "haram" && !(f.topic && SCHOOL_TOPICS.includes(f.topic)));

  const reasons = [
    { id: "ingredients", ok: hasIngr },
    p.local ? { id: "user", ok: true } : { id: "checked", ok: checked },
    { id: "label", ok: label },
  ];
  if (definite) reasons.unshift({ id: "definite", ok: true });

  let level;
  if (v.status === "inconnu" || (!hasIngr && !label)) level = "low";
  else if (definite || (label && v.status === "halal_certifie")) level = "high";
  else level = "medium";
  return { level, reasons };
}
