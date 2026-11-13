// Pages légales de Bayyin (droit français) : mentions légales, confidentialité, conditions d'utilisation
// et conditions de l'abonnement. Textes partagés par l'app et par le site (pages legal/*.html).
// Les informations de l'éditeur viennent de legal-info.js, à remplir par le propriétaire ; tant qu'un
// champ est vide, la page affiche « [à compléter] ». Textes en français (langue du contrat et de la loi).
import { LEGAL_INFO } from "./legal-info.js";

let X = LEGAL_INFO;
/** L'app peut fournir ses propres valeurs (app.json › extra.legal) ; les champs remplis l'emportent */
export function setLegalInfo(extra) {
  const keep = (o) => Object.fromEntries(Object.entries(o || {}).filter(([, val]) => val && (typeof val !== "string" || val.trim())));
  X = { ...LEGAL_INFO, ...keep(extra), mediator: { ...(LEGAL_INFO.mediator || {}), ...keep(extra && extra.mediator) } };
}
const v = (k) => (X[k] && String(X[k]).trim()) || "[à compléter]";
export const legalComplete = () => ["name", "siret", "address", "email"].every((k) => X[k] && String(X[k]).trim());
const UPDATED = "13 novembre 2026";

// Chaque document : { title, intro?, sections: [[titre, [paragraphes…]]] } ; un paragraphe qui
// commence par « • » est une puce.
export function legalDoc(id) {
  const editor = `${v("name")}, entrepreneur individuel (micro-entreprise), SIRET ${v("siret")}, ${v("address")}`;
  const contact = v("email");
  const mediator = X.mediator && X.mediator.name ? `${X.mediator.name}${X.mediator.url ? ` (${X.mediator.url})` : ""}` : "[à compléter : nom et site du médiateur de la consommation]";

  if (id === "mentions") return {
    title: "Mentions légales",
    sections: [
      ["Éditeur", [`L'application Bayyin est éditée par ${editor}.`, `E-mail : ${contact}${X.phone ? ` · Téléphone : ${X.phone}` : ""}.`, `Directeur de la publication : ${v("name")}.`]],
      ["Hébergement et distribution", [
        "Site web et fichiers de données de l'application (classements, médicaments, rappels, commerces, appels au boycott) : GitHub Inc. (service GitHub Pages), 88 Colin P Kelly Jr Street, San Francisco, CA 94107, États-Unis.",
        "Mises à jour de l'application : Expo (650 Industries, Inc.), Palo Alto, Californie, États-Unis.",
        "L'application est distribuée par l'App Store (Apple Distribution International, Cork, Irlande) et Google Play (Google Ireland Limited, Dublin, Irlande).",
      ]],
      ["Propriété intellectuelle", [
        "Le nom Bayyin, le logo, les illustrations, les textes et le code de l'application appartiennent à l'éditeur. Toute reproduction sans autorisation est interdite.",
        "Les données de produits viennent de bases ouvertes, utilisées selon leurs licences : Open Food Facts et Open Beauty Facts (licence ODbL), OpenStreetMap (ODbL, © les contributeurs d'OpenStreetMap), Base de données publique des médicaments et RappelConso (Licence Ouverte Etalab), CosIng (Commission européenne).",
        "Nutri-Score est une marque déposée de Santé publique France. Bayyin affiche la note publiée sur Open Food Facts à titre d'information ; Bayyin n'est ni un fabricant ni un distributeur des produits notés.",
      ]],
      ["Signalement", [`Pour signaler un contenu ou une erreur : ${contact}.`]],
    ],
  };

  if (id === "privacy") return {
    title: "Confidentialité",
    intro: `En vigueur au ${UPDATED}. Responsable du traitement : ${editor} (${contact}).`,
    sections: [
      ["En bref", ["Bayyin fonctionne sans compte, sans publicité et sans outil de mesure d'audience. Votre historique, vos favoris, votre profil (allergies, régime, profils de la famille), votre avis religieux et votre position arrondie pour le Ramadan restent sur votre téléphone. Bayyin n'a pas de serveur qui les recevrait."]],
      ["Ce qui quitte votre téléphone, et pourquoi", [
        "• Vous scannez ou recherchez un produit : le code-barres ou les mots tapés sont envoyés à Open Food Facts ou Open Beauty Facts (association française) pour trouver la fiche.",
        "• Vous cherchez des commerces halal : la zone de recherche (autour de votre position, si vous l'autorisez, ou de la ville tapée) est envoyée à OpenStreetMap (serveurs Overpass et Nominatim) et à ses serveurs de cartes. La position n'est pas gardée.",
        "• Vous lisez une étiquette par photo : la lecture se fait sur le téléphone ; l'outil de lecture (Tesseract) est téléchargé depuis jsDelivr, qui voit l'adresse IP comme pour toute page web.",
        "• Mode voyage et carte de restaurant : la photo est lue sur le téléphone et n'est envoyée nulle part.",
        "• Alerte « la recette a changé » (si elle est activée) : tous les quelques jours, les codes-barres de vos favoris et de vos produits récents sont envoyés à Open Food Facts pour comparer leur liste d'ingrédients.",
        "• L'application télécharge ses fichiers de données (classements, médicaments, rappels) et ses mises à jour : GitHub et Expo voient l'adresse IP et le modèle de l'appareil, comme pour toute connexion.",
        "• Vous souscrivez à Bayyin Premium : le paiement est traité par Apple ou Google, qui ne communiquent ni votre nom ni vos coordonnées bancaires. L'abonnement est vérifié par RevenueCat (RevenueCat, Inc., États-Unis) à l'aide d'un identifiant anonyme et du reçu d'achat.",
        "• Vous nous écrivez : votre message et votre adresse e-mail, le temps de vous répondre.",
      ]],
      ["Ce que nous ne faisons pas", ["Pas de publicité, pas de revente ni de partage de données, pas de profilage, pas de traceur publicitaire. Votre avis religieux, vos allergies et votre profil ne quittent jamais votre téléphone."]],
      ["Autorisations du téléphone", ["Caméra : lire les codes-barres et photographier les ingrédients. Position : trouver les commerces autour de vous et calculer les horaires du Ramadan. Notifications : vous prévenir si un produit de votre historique est rappelé (la vérification se fait sur le téléphone). Chaque autorisation est demandée au moment où elle sert, et peut être retirée dans les réglages du téléphone."]],
      ["Transferts hors de l'Union européenne", ["Certains prestataires (GitHub, Expo, RevenueCat) sont situés aux États-Unis. Ils sont couverts par le cadre de protection des données UE–États-Unis ou par les clauses contractuelles types de la Commission européenne."]],
      ["Durée de conservation", ["Sur votre téléphone : tant que vous ne les effacez pas (historique, favoris, profil). Vous pouvez tout effacer dans Réglages › Mes données, ou en supprimant l'application. Les e-mails reçus sont gardés le temps de vous répondre, puis au plus trois ans."]],
      ["Vos droits", [`Vous pouvez demander l'accès, la rectification ou l'effacement des données que nous détiendrions à votre sujet (en pratique, vos e-mails), et vous opposer à leur traitement, en écrivant à ${contact}. Vous pouvez aussi adresser une réclamation à la CNIL (cnil.fr).`]],
      ["Enfants", ["Bayyin ne demande aucune information personnelle et convient à tous les âges. L'achat de Premium nécessite l'accord d'un parent pour un mineur, comme le prévoient Apple et Google."]],
    ],
  };

  if (id === "terms") return {
    title: "Conditions d'utilisation",
    intro: `En vigueur au ${UPDATED}. Éditeur : ${editor}.`,
    sections: [
      ["Objet", ["Bayyin aide à savoir si un aliment, un cosmétique ou un médicament convient à une consommation halal, et donne des informations de santé (note sur 100, additifs, allergènes). L'application est gratuite ; certaines fonctions de confort sont réservées à l'abonnement Bayyin Premium."]],
      ["Une aide, pas une certification", [
        "Le verdict halal est établi automatiquement à partir des informations publiées sur le produit (ingrédients, additifs, labels) et des réglages que vous choisissez. Ce n'est ni une certification ni un avis religieux : en cas de doute, adressez-vous à un organisme de certification ou à un savant de confiance.",
        "Les informations de santé sont générales et ne remplacent pas l'avis d'un médecin ou d'un diététicien. En cas d'allergie, lisez toujours l'emballage : la composition peut changer et les bases de données peuvent être incomplètes.",
      ]],
      ["Appels au boycott", ["Bayyin peut indiquer qu'un produit appartient à une entreprise visée par un appel au boycott du mouvement BDS ou de BDS France, ou qu'il vient d'Israël. Cette information reprend les listes publiées par ces organisations, dont la source et la date de relecture sont affichées ; elle n'entre pas dans le verdict halal et n'exprime pas la position de l'éditeur. Elle peut être masquée dans les réglages, et une erreur peut être signalée depuis l'application."]],
      ["Sources et exactitude", ["Les données viennent de bases publiques et collaboratives (Open Food Facts, Open Beauty Facts, base des médicaments, RappelConso, CosIng, listes publiées par les organismes de certification). Bayyin les présente avec soin mais ne peut garantir qu'elles sont complètes ou à jour. Vous pouvez signaler une erreur depuis la fiche du produit."]],
      ["Responsabilité", ["L'éditeur met tout en œuvre pour que l'application fonctionne et que ses informations soient exactes, sans pouvoir le garantir. Sa responsabilité ne peut être engagée pour un choix d'achat ou de consommation fait à partir de l'application, sauf faute de sa part et dans les limites prévues par la loi. Rien dans ces conditions ne limite vos droits de consommateur."]],
      ["Utilisation", ["Vous vous engagez à utiliser Bayyin pour un usage personnel et à ne pas en extraire massivement les données ni en perturber le fonctionnement."]],
      ["Modifications", ["Ces conditions peuvent évoluer ; la date d'entrée en vigueur est indiquée en haut. En cas de changement important, vous en serez informé dans l'application."]],
      ["Droit applicable", [`Ces conditions sont soumises au droit français. En cas de litige, contactez-nous d'abord (${contact}) ; vous pouvez aussi recourir gratuitement au médiateur de la consommation : ${mediator}. À défaut, les tribunaux français sont compétents.`]],
    ],
  };

  // Conditions de l'abonnement Bayyin Premium (achats intégrés Apple et Google)
  return {
    title: "Conditions de l'abonnement",
    intro: `En vigueur au ${UPDATED}. Éditeur : ${editor} (${contact}).`,
    sections: [
      ["Ce que comprend Premium", ["Bayyin Premium donne accès au mode rayon, au mode courses, à la comparaison de produits, à tous les classements, aux profils de la famille, au mode voyage, à l'alerte « la recette a changé », au téléchargement hors connexion et à un historique sur douze mois. Le scan, le verdict halal, la note santé, les alertes allergies, les rappels de produits, les appels au boycott et la lecture de carte de restaurant restent gratuits."]],
      ["Prix et paiement", ["Les offres (mensuelle et annuelle) et leur prix toutes taxes comprises sont affichés dans l'application avant l'achat. Le paiement est fait par votre compte Apple (App Store) ou Google (Google Play), qui encaisse le prix et vous adresse le reçu."]],
      ["Essai gratuit de 7 jours", ["À la première souscription, un essai gratuit de 7 jours peut être proposé. Rien n'est prélevé pendant l'essai. Sans résiliation au moins 24 heures avant sa fin, l'abonnement payant commence automatiquement au prix affiché. Un seul essai par compte."]],
      ["Renouvellement et résiliation", ["L'abonnement se renouvelle automatiquement pour la même durée, sauf résiliation au moins 24 heures avant la fin de la période en cours. Vous pouvez résilier à tout moment, sans frais, dans les réglages de votre compte Apple ou Google, ou depuis l'application (Réglages › Bayyin Premium › Gérer mon abonnement). La résiliation prend effet à la fin de la période déjà payée."]],
      ["Remboursement et rétractation", ["Le remboursement d'un achat se demande auprès d'Apple (reportaproblem.apple.com) ou de Google (play.google.com), selon leurs conditions, qui prévoient un droit de rétractation pour les clients de l'Union européenne. Les fonctions Premium sont fournies dès l'achat ou dès le début de l'essai."]],
      ["Médiation", [`En cas de litige, après une réclamation écrite à ${contact}, vous pouvez recourir gratuitement au médiateur de la consommation : ${mediator}.`]],
      ["Droit applicable", ["Ces conditions sont soumises au droit français."]],
    ],
  };
}
export const LEGAL_IDS = ["mentions", "privacy", "terms", "sales"];
