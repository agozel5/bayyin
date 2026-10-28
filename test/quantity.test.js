import { test } from "node:test";
import assert from "node:assert/strict";
import { normQuantity } from "../public/lib/off.js";

test("quantités lisibles", () => {
  assert.equal(normQuantity("110gr"), "110 g");
  assert.equal(normQuantity("400G"), "400 g");
  assert.equal(normQuantity("1,5L"), "1,5 L");
  assert.equal(normQuantity("250ml"), "250 ml");
  assert.equal(normQuantity("6x23,5g"), "6 × 23,5 g");
  assert.equal(normQuantity("12 sachets"), "12 sachets");
  assert.equal(normQuantity(""), null);
  assert.equal(normQuantity(null), null);
});
