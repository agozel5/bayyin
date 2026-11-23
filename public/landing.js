// Page de présentation : texte selon la langue du navigateur, lien « Ouvrir dans l'app » si l'adresse porte un produit (?p=code).
const D = {
  fr: {},
  en: { title: "Halal, health, additives. All in one scan.", lead: "Scan a food, cosmetic or medicine: Bayyin tells you if it is halal according to your school, its health score and its additives. Free, no ads.", ios: "App Store · coming soon", android: "Google Play · coming soon", open: "Open this product in the app", f1t: "Halal by your school", f1p: "A clear verdict, with the ingredients and additives involved explained.", f2t: "Health and additives", f2p: "A health score, decoded additives and safer alternatives.", f3t: "Food, cosmetics, medicines", f3p: "One scan to check everything, including product recalls.", f4t: "Your privacy respected", f4p: "No ads, no mandatory account, history kept on your phone.", privacy: "Privacy", terms: "Terms", legal: "Legal notice", contact: "Contact" },
  ar: { title: "حلال، صحة، إضافات. كل شيء بمسح واحد.", lead: "امسح غذاءً أو مستحضر تجميل أو دواءً: يخبرك بيّن إن كان حلالاً حسب مدرستك، مع تقييمه الصحي وإضافاته. مجاني وبلا إعلانات.", ios: "App Store · قريباً", android: "Google Play · قريباً", open: "افتح هذا المنتج في التطبيق", f1t: "حلال حسب مدرستك", f1p: "حكم واضح مع شرح المكوّنات والإضافات المعنية.", f2t: "الصحة والإضافات", f2p: "تقييم صحي وشرح للإضافات وبدائل أفضل.", f3t: "أغذية ومستحضرات وأدوية", f3p: "مسح واحد للتحقق من كل شيء، بما في ذلك سحب المنتجات.", f4t: "خصوصيتك محفوظة", f4p: "بلا إعلانات ولا حساب إلزامي، والسجل يبقى على هاتفك.", privacy: "الخصوصية", terms: "الشروط", legal: "إشعار قانوني", contact: "اتصل بنا" },
};
const lang = ((navigator.language || "fr").slice(0, 2).toLowerCase());
const dict = D[lang];
if (dict) {
  document.documentElement.lang = lang;
  if (lang === "ar") document.documentElement.dir = "rtl";
  document.querySelectorAll("[data-i]").forEach((el) => { const v = dict[el.dataset.i]; if (v) el.textContent = v; });
}
const p = new URLSearchParams(location.search).get("p");
if (p && /^\d{6,14}$/.test(p)) {
  document.getElementById("openLink").href = "bayyin://p/" + p;
  document.getElementById("open").hidden = false;
}
