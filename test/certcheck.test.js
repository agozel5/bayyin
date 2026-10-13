import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyCertification, normStamp, productStamps } from "../public/lib/certcheck.js";

const db = {
  meta: { updated: "2026-10-12" },
  orgs: {
    avs: { updated: "2026-10-12", names: ["SOCOPA GUINGAMP", "ABATTOIR DE JOSSIGNY"], stamps: ["FR77237006CE"], url: "https://avs.fr/" },
    achahada: { updated: "2026-10-12", names: ["Burger Addict Cergy", "100% CROUSTI"] },
  },
};

test("estampilles normalisées depuis Open Food Facts", () => {
  assert.equal(normStamp("FR 77.237.006 CE"), "FR77237006CE");
  assert.deepEqual(productStamps({ emb_codes: "FR 77.237.006 CE", emb_codes_tags: ["fr-77-237-006-ce"] }), ["FR77237006CE"]);
});

test("estampille trouvée -> vérifié (preuve la plus forte)", () => {
  const r = verifyCertification({ raw: { emb_codes_tags: ["fr-77-237-006-ce"], brands: "X" } }, db, "avs");
  assert.equal(r.status, "stamp");
  assert.equal(r.match, "FR 77.237.006 CE");
});

test("marque trouvée, y compris un établissement suffixé par la ville", () => {
  assert.equal(verifyCertification({ raw: { brands: "Socopa" } }, db, "avs").status, "brand");
  assert.equal(verifyCertification({ raw: { brands: "Burger addict" } }, db, "achahada").match, "Burger Addict Cergy");
  assert.equal(verifyCertification({ raw: { brands: "100 % Crousti" } }, db, "achahada").status, "brand");
});

test("pas de correspondance partielle trompeuse", () => {
  assert.equal(verifyCertification({ raw: { brands: "Soc" } }, db, "avs").status, "missing");
  assert.equal(verifyCertification({ raw: { brands: "Burger King" } }, db, "achahada").status, "missing");
});

test("organisme sans liste publiée -> null", () => {
  assert.equal(verifyCertification({ raw: { brands: "X" } }, db, "paris"), null);
  assert.equal(verifyCertification({ raw: {} }, null, "avs"), null);
});
