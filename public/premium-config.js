// Bayyin Premium : réglages de la boutique, à remplir par le propriétaire (voir docs/abonnement.md).
//
// Tant que ces champs sont vides, l'abonnement est désactivé et toutes les fonctions restent
// accessibles à tout le monde : rien ne se bloque par erreur avant la mise en vente.

export const PREMIUM = {
  // Identifiants Lemon Squeezy (Store ID et Product ID, visibles dans le tableau de bord)
  storeId: null,
  productId: null,
  // Liens de paiement (« Share » > lien de la variante annuelle et de la variante mensuelle)
  checkout: { year: "", month: "" },
  // Portail client Lemon Squeezy : gérer ou résilier l'abonnement (obligatoire : résiliation en 3 clics)
  portal: "",
  // Prix affichés (TTC) : doivent correspondre à ceux de la boutique
  prices: { year: "14,99 €", yearPerMonth: "1,25 €", month: "2,49 €" },
  trialDays: 7, // 0 si la boutique ne propose pas d'essai gratuit
  // Adresse de l'API des licences. Si le navigateur bloque l'appel (CORS), mettre ici l'adresse
  // d'un relais (voir docs/abonnement.md, « Relais Cloudflare »).
  api: "https://api.lemonsqueezy.com/v1/licenses/",
  // Pages légales publiées (obligatoires pour vendre) : conditions de vente et mentions légales
  legal: { cgv: "", mentions: "" },
};
