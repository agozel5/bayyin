// Mots courants dans les autres langues de l'app (allemand, espagnol, italien, néerlandais, indonésien,
// malais, ourdou, bengali). Chaque ligne : forme française | de | es | it | nl | id | ms | ur | bn.
// Plusieurs formes possibles dans une langue, séparées par « / » (la première est la principale).
const COLS = ["fr", "de", "es", "it", "nl", "id", "ms", "ur", "bn"];
const ROWS = `
lait|Milch|leche|latte|melk|susu|susu|دودھ|দুধ
chocolat|Schokolade|chocolate|cioccolato/cioccolata|chocolade/chocola|cokelat/coklat|coklat/cokelat|چاکلیٹ|চকলেট/চকোলেট
poulet|Hähnchen/Huhn|pollo|pollo|kip|ayam|ayam|مرغی/چکن|মুরগি/চিকেন
dinde|Pute/Truthahn|pavo|tacchino|kalkoen|ayam kalkun|ayam belanda|ٹرکی|টার্কি
boeuf|Rindfleisch|carne de res/ternera|manzo|rundvlees|daging sapi|daging lembu|گائے کا گوشت/بیف|গরুর মাংস/বিফ
agneau|Lamm|cordero|agnello|lamsvlees/lam|daging domba|daging kambing|مٹن/بھیڑ|ভেড়ার মাংস
viande|Fleisch|carne|carne|vlees|daging|daging|گوشت|মাংস
saucisse|Wurst|salchicha|salsiccia|worst|sosis|sosej|ساسج/ساسیج|সসেজ
poisson|Fisch|pescado/pez|pesce|vis|ikan|ikan|مچھلی|মাছ
thon|Thunfisch|atún|tonno|tonijn|tuna|tuna|ٹونا|টুনা
sardines|Sardinen|sardinas|sardine|sardines|sarden|sardin|سارڈین|সার্ডিন
fromage|Käse|queso|formaggio|kaas|keju|keju|پنیر|পনির
yaourt|Joghurt|yogur/yogurt|yogurt|yoghurt|yogurt|yogurt|دہی/یوگرٹ|দই/ইয়োগার্ট
beurre|Butter|mantequilla|burro|boter|mentega|mentega|مکھن|মাখন
oeufs|Eier/Ei|huevos/huevo|uova/uovo|eieren/ei|telur|telur|انڈے/انڈا|ডিম
biscuits|Kekse/Plätzchen|galletas|biscotti|koekjes|biskuit|biskut|بسکٹ|বিস্কুট
gâteau|Kuchen|pastel/tarta|torta|taart/cake|kue|kek|کیک|কেক
pain|Brot|pan|pane|brood|roti|roti|ڈبل روٹی|পাউরুটি
farine|Mehl|harina|farina|bloem/meel|tepung|tepung|آٹا/میدہ|আটা/ময়দা
semoule|Grieß|sémola|semolino|griesmeel|semolina|semolina|سوجی|সুজি
riz|Reis|arroz|riso|rijst|beras/nasi|beras|چاول|চাল/ভাত
pâtes|Nudeln|pasta/fideos|pasta|pasta|pasta/mi|pasta/mi|پاستا/نوڈلز|পাস্তা/নুডলস
lentilles|Linsen|lentejas|lenticchie|linzen|lentil|lentil|مسور/دال|মসুর ডাল/ডাল
pois chiches|Kichererbsen|garbanzos|ceci|kikkererwten|kacang arab|kacang kuda|چنے|ছোলা
jus|Saft|zumo/jugo|succo|sap|jus|jus|جوس/رس|জুস/রস
eau|Wasser|agua|acqua|water|air|air|پانی|পানি/জল
boisson|Getränk|bebida|bevanda|drank|minuman|minuman|مشروب|পানীয়
café|Kaffee|café|caffè|koffie|kopi|kopi|کافی|কফি
thé|Tee|té|tè|thee|teh|teh|چائے|চা
sucre|Zucker|azúcar|zucchero|suiker|gula|gula|چینی|চিনি
sel|Salz|sal|sale|zout|garam|garam|نمک|লবণ
huile|Öl|aceite|olio|olie|minyak|minyak|تیل|তেল
huile d'olive|Olivenöl|aceite de oliva|olio d'oliva|olijfolie|minyak zaitun|minyak zaitun|زیتون کا تیل|জলপাই তেল
olives|Oliven|aceitunas/olivas|olive|olijven|zaitun|zaitun|زیتون|জলপাই
vinaigre|Essig|vinagre|aceto|azijn|cuka|cuka|سرکہ|ভিনেগার
miel|Honig|miel|miele|honing|madu|madu|شہد|মধু
confiture|Marmelade/Konfitüre|mermelada|marmellata|jam|selai|jem|جام/مربہ|জ্যাম/জেলি
dattes|Datteln|dátiles|datteri|dadels|kurma|kurma|کھجور|খেজুর
amandes|Mandeln|almendras|mandorle|amandelen|almond|badam|بادام|কাঠবাদাম
noisettes|Haselnüsse|avellanas|nocciole|hazelnoten|kacang hazelnut|hazelnut|ہیزل نٹ|হ্যাজেলনাট
pistaches|Pistazien|pistachos|pistacchi|pistachenoten|kacang pistachio|pistachio|پستہ|পেস্তা
cacahuètes|Erdnüsse|cacahuetes|arachidi|pinda's|kacang tanah|kacang tanah|مونگ پھلی|চিনাবাদাম
bonbons|Bonbons/Süßigkeiten|caramelos/dulces|caramelle|snoep|permen|gula-gula|ٹافیاں|ক্যান্ডি
glace|Eiscreme/Eis|helado|gelato|ijs|es krim|aiskrim|آئس کریم|আইসক্রিম
chips|Chips|patatas fritas|patatine|chips|keripik|kerepek|چپس|চিপস
céréales|Müsli/Cerealien|cereales|cereali|ontbijtgranen|sereal|bijirin/sereal|سیریل|সিরিয়াল
soupe|Suppe|sopa|zuppa|soep|sup|sup|سوپ|স্যুপ
épices|Gewürze|especias|spezie|specerijen/kruiden|rempah|rempah|مصالحے/مسالے|মসলা
tomate|Tomate|tomate|pomodoro|tomaat|tomat|tomato|ٹماٹر|টমেটো
mayonnaise|Mayonnaise|mayonesa|maionese|mayonaise|mayones|mayonis|مایونیز|মেয়োনিজ
moutarde|Senf|mostaza|senape|mosterd|mustard|mustard|سرسوں|সরষে
levure|Hefe|levadura|lievito|gist|ragi|yis|خمیر|ইস্ট/খামির
gélatine|Gelatine|gelatina|gelatina|gelatine|gelatin|gelatin|جیلیٹن|জেলাটিন
bébé|Baby|bebé|bambino|baby|bayi|bayi|بچوں/بچہ|শিশু/বেবি
sans sucre|zuckerfrei|sin azúcar|senza zucchero|suikervrij|tanpa gula|tanpa gula|بغیر چینی|চিনি ছাড়া
savon|Seife|jabón|sapone|zeep|sabun|sabun|صابن|সাবান
shampooing|Shampoo|champú|shampoo|shampoo|sampo|syampu|شیمپو|শ্যাম্পু
gel douche|Duschgel|gel de ducha|bagnoschiuma|douchegel|sabun mandi cair|gel mandi|شاور جیل|শাওয়ার জেল
dentifrice|Zahnpasta|pasta de dientes/dentífrico|dentifricio|tandpasta|pasta gigi|ubat gigi|ٹوتھ پیسٹ/منجن|টুথপেস্ট
déodorant|Deodorant|desodorante|deodorante|deodorant|deodoran|deodoran|ڈیوڈورنٹ|ডিওডোরেন্ট
parfum|Parfüm|perfume|profumo|parfum|parfum|minyak wangi|پرفیوم/عطر|পারফিউম/আতর
crème|Creme|crema|crema|crème/creme|krim|krim|کریم|ক্রিম
rouge à lèvres|Lippenstift|pintalabios/labial|rossetto|lippenstift|lipstik|gincu|لپ اسٹک|লিপস্টিক
maquillage|Make-up/Schminke|maquillaje|trucco|make-up|riasan/makeup|solekan/mekap|میک اپ|মেকআপ
mascara|Mascara|rímel|mascara|mascara|maskara|maskara|مسکارا|মাস্কারা
fond de teint|Foundation|base de maquillaje|fondotinta|foundation|foundation|foundation|فاؤنڈیشن|ফাউন্ডেশন
vernis à ongles|Nagellack|esmalte de uñas|smalto|nagellak|cat kuku|pengilat kuku|نیل پالش|নেইল পলিশ
fard à paupières|Lidschatten|sombra de ojos|ombretto|oogschaduw|eyeshadow|eyeshadow|آئی شیڈو|আইশ্যাডো
crayon yeux|Kajal/Augenstift|lápiz de ojos|matita occhi|oogpotlood|pensil mata|pensel mata|کاجل/آنکھوں کی پنسل|কাজল
gloss|Lipgloss|brillo de labios|lucidalabbra|lipgloss|lip gloss|gloss bibir|لپ گلوس|লিপ গ্লস
anticernes|Concealer|corrector|correttore|concealer|concealer|concealer|کنسیلر|কনসিলার
poudre|Puder|polvos|cipria|poeder|bedak|bedak|پاؤڈر|পাউডার
blush|Rouge|colorete|fard|blush|perona pipi|pemerah pipi|بلش|ব্লাশ
démaquillant|Make-up-Entferner|desmaquillante|struccante|make-up remover|pembersih riasan|pembersih solekan|میک اپ ریموور|মেকআপ রিমুভার
crème solaire|Sonnencreme|protector solar/crema solar|crema solare|zonnebrandcrème|tabir surya|tabir suria|سن اسکرین/سن بلاک|সানস্ক্রিন
baume à lèvres|Lippenbalsam|bálsamo labial|balsamo labbra|lippenbalsem|pelembap bibir|pelembap bibir|لپ بام|লিপ বাম
`;

/** { "lait": { de: ["Milch"], es: ["leche"], … }, … } */
export const EXTRA = {};
for (const line of ROWS.trim().split("\n")) {
  const cells = line.split("|");
  const e = {};
  COLS.forEach((c, i) => { if (i > 0) e[c] = cells[i].split("/").map((x) => x.trim()).filter(Boolean); });
  EXTRA[cells[0].trim()] = e;
}
