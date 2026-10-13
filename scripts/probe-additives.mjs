// Sonde : forme de la taxonomie des additifs d'Open Food Facts
const url = "https://static.openfoodfacts.org/data/taxonomies/additives.json";
const res = await fetch(url);
console.log("HTTP", res.status);
const data = await res.json();
const keys = Object.keys(data);
console.log("entrées", keys.length);
const props = new Map();
for (const k of keys) for (const p of Object.keys(data[k])) props.set(p, (props.get(p) || 0) + 1);
console.log("propriétés", JSON.stringify([...props].sort((a, b) => b[1] - a[1]).slice(0, 60)));
for (const k of ["en:e100", "en:e120", "en:e330", "en:e471", "en:e441", "en:e250", "en:e951", "en:e1105"]) console.log(k, JSON.stringify(data[k]).slice(0, 1600));
const classes = await (await fetch("https://static.openfoodfacts.org/data/taxonomies/additives_classes.json")).json();
console.log("classes", Object.keys(classes).length, JSON.stringify(classes["en:colour"]).slice(0, 600));
