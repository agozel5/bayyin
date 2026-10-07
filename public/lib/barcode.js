// Validation des codes-barres alimentaires (EAN-8, EAN-13, UPC-A, UPC-E, GTIN-14).
// Pur JavaScript, sans dépendance : utilisé par la caméra et testé sous Node.

// Clé de contrôle GS1 : écarte les lectures partielles ou erronées.
export function validBarcode(code) {
  if (!/^\d{8}$|^\d{12,14}$/.test(code)) return false;
  const digits = code.split("").map(Number);
  const check = digits.pop();
  const sum = digits.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

// UPC-E (8 chiffres compressés) n'a pas la même clé : on le décompresse en UPC-A.
export function expandUpcE(code) {
  if (!/^[01]\d{7}$/.test(code)) return null;
  const [n, d1, d2, d3, d4, d5, d6, chk] = code.split("");
  let mid;
  if ("012".includes(d6)) mid = d1 + d2 + d6 + "0000" + d3 + d4 + d5;
  else if (d6 === "3") mid = d1 + d2 + d3 + "00000" + d4 + d5;
  else if (d6 === "4") mid = d1 + d2 + d3 + d4 + "00000" + d5;
  else mid = d1 + d2 + d3 + d4 + d5 + "0000" + d6;
  const upca = n + mid + chk;
  return validBarcode(upca) ? upca : null;
}

// Texte brut lu par le décodeur -> code utilisable, ou null.
export function normalizeScan(text) {
  const code = String(text ?? "").replace(/\D/g, "");
  if (validBarcode(code)) return code;
  return expandUpcE(code);
}
