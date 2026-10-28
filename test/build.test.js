import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DICTS } from "../public/lib/i18n.js";

// Une mise à jour change le numéro partout à la fois : sinon l'app croirait à des fichiers mélangés
test("même numéro de version dans sw.js, app.js et les traductions", () => {
  const sw = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8").match(/const VERSION = "([^"]+)"/)[1];
  const app = readFileSync(new URL("../public/app.js", import.meta.url), "utf8").match(/const APP_BUILD = "([^"]+)"/)[1];
  assert.equal(app, sw, "app.js");
  for (const [lang, d] of Object.entries(DICTS)) assert.equal(d._build, sw, `traductions ${lang}`);
});
