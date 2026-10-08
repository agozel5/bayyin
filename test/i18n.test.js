import { test } from "node:test";
import assert from "node:assert/strict";
import { DICTS } from "../public/lib/i18n.js";
import { TEXT_RULES, ADDITIVES, TOPICS, SCHOOLS } from "../public/lib/rules.js";
import { ADDITIVE_RISK } from "../public/lib/health.js";

const fr = DICTS.fr;

test("les quatre langues ont exactement les mêmes clés", () => {
  for (const [lang, d] of Object.entries(DICTS)) {
    const missing = Object.keys(fr).filter((k) => !(k in d));
    const extra = Object.keys(d).filter((k) => !(k in fr));
    assert.deepEqual(missing, [], `${lang} : clés manquantes`);
    assert.deepEqual(extra, [], `${lang} : clés en trop`);
  }
});

test("les variables {x} sont les mêmes dans chaque traduction", () => {
  const vars = (s) => (s.match(/\{\w+\}/g) || []).sort().join(",");
  for (const [lang, d] of Object.entries(DICTS))
    for (const k of Object.keys(fr)) {
      if (k.endsWith("_one") && vars(d[k]) !== vars(fr[k])) continue; // « un résultat » peut omettre {n}
      assert.equal(vars(d[k]), vars(fr[k]), `${lang} : variables différentes pour ${k}`);
    }
});

test("chaque règle, additif, sujet et école a sa traduction", () => {
  const needed = [
    ...TEXT_RULES.flatMap((r) => [`flag.${r.id}.label`, `flag.${r.id}.reason`]),
    ...Object.entries(ADDITIVES).filter(([, a]) => a.group !== "gras").flatMap(([c]) => [`flag.${c}.label`, `flag.${c}.reason`]),
    ...TOPICS.map((t) => `topic.${t}`),
    ...Object.keys(SCHOOLS).flatMap((s) => [`school.${s}`, `school.${s}.d`]),
    ...Object.keys(ADDITIVE_RISK).map((c) => `addname.${c}`),
    ...[...new Set(Object.values(ADDITIVE_RISK).map((a) => a.key))].map((k) => `risk.reason.${k}`),
  ];
  const missing = needed.filter((k) => !(k in fr));
  assert.deepEqual(missing, []);
});

import { SOURCES, SOURCE_BY_ID, RISK_SOURCES, FLAG_SOURCES } from "../public/lib/sources.js";

test("chaque additif à risque cite au moins une source existante", () => {
  const keys = [...new Set(Object.values(ADDITIVE_RISK).map((a) => a.key))];
  for (const k of keys) {
    assert.ok(RISK_SOURCES[k] && RISK_SOURCES[k].length, `pas de source pour ${k}`);
    for (const id of RISK_SOURCES[k]) assert.ok(SOURCE_BY_ID[id], `source inconnue ${id}`);
  }
  for (const ids of Object.values(FLAG_SOURCES)) for (const id of ids) assert.ok(SOURCE_BY_ID[id]);
});

test("chaque source a une description traduite et une adresse https", () => {
  for (const s of SOURCES) {
    assert.ok(`src.${s.id}` in fr, `src.${s.id} manquant`);
    assert.match(s.url, /^https:\/\//);
  }
});
