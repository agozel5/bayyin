# Bayyin Premium : mise en vente de l'abonnement

L'abonnement est **déjà intégré dans l'app** mais **désactivé** : tant que `public/premium-config.js`
n'est pas rempli, toutes les fonctions restent ouvertes à tout le monde. Rien ne se bloque par erreur.

## Ce qui est gratuit et ce qui est Premium

| Toujours gratuit | Premium |
|---|---|
| Scan, verdict halal et ses explications | Mode rayon (plusieurs codes-barres d'un coup) |
| Notes santé et cosmétiques, additifs | Mode courses (scan en rafale + bilan du panier) |
| Rappels de produits (fiche + surveillance de l'historique) | Comparer deux produits |
| Alertes allergies et régime (votre profil) | Profils de la famille |
| Photo des ingrédients, recherche, carte des commerces | Téléchargement hors connexion |
| Organismes de certification, avis religieux point par point | Historique sur 12 mois (30 jours sans Premium) |

Principe : ce qui touche à la sécurité (rappels, allergies) et au verdict halal reste gratuit.
Premium vend du confort et des outils.

Prix recommandés (alignés sur Yuka, INCI Beauty) : **14,99 €/an** (offre principale) et **2,49 €/mois**,
avec un **essai gratuit de 7 jours**.

## Étapes à faire soi-même

1. **Statut** : déclarer une micro-entreprise sur formalites.entreprises.gouv.fr
   (activité : édition de logiciels / services en ligne ; demander l'ACRE). Récupérer le SIRET.
   Vérifier dans le contrat d'apprentissage qu'aucune clause n'interdit une activité à côté.
2. **Lemon Squeezy** (vendeur officiel : il facture le client, collecte et reverse la TVA européenne) :
   - créer le compte et la boutique, faire la vérification d'identité, ajouter l'IBAN ;
   - créer le produit **Bayyin Premium**, abonnement avec deux variantes : annuelle (14,99 €) et mensuelle (2,49 €),
     essai de 7 jours si souhaité ;
   - **activer les clés de licence** (« License keys ») sur le produit, limite d'activation : 5 appareils ;
   - noter le **Store ID** et le **Product ID** ;
   - copier les **liens de paiement** des deux variantes ;
   - copier l'adresse du **portail client** (Settings › Customer portal) : c'est là que l'abonné résilie (« résiliation en 3 clics ») ;
   - dans le produit, **Confirmation modal / Receipt** : ajouter le bouton « Activer dans l'app » vers
     `https://agozel5.github.io/bayyin/#premium=[license_key]` si l'option de variable est disponible ; sinon,
     l'abonné colle sa clé (reçue par e-mail) dans l'app.
3. **Pages légales** : compléter `docs/legal/cgv.html` et `docs/legal/mentions.html` (les passages
   entre crochets), les copier dans `public/legal/`. Faire relire par un professionnel si possible.
   Choisir un médiateur de la consommation (ex. CM2C, Medicys) et l'indiquer dans les CGV.
4. **Remplir `public/premium-config.js`** :

   ```js
   storeId: 123456, productId: 654321,
   checkout: { year: "https://….lemonsqueezy.com/buy/…", month: "https://….lemonsqueezy.com/buy/…" },
   portal: "https://….lemonsqueezy.com/billing",
   legal: { cgv: "legal/cgv.html", mentions: "legal/mentions.html" },
   ```

   Pousser sur GitHub : l'abonnement s'active à la publication.
5. **Tester l'appel depuis le site** : sur https://agozel5.github.io/bayyin/, Réglages › Bayyin Premium ›
   « J'ai une clé d'activation », avec une clé de test (mode test de Lemon Squeezy).
   Si l'activation répond « Pas de connexion » alors que le réseau marche, le navigateur bloque l'appel (CORS) :
   déployer le relais ci-dessous et mettre son adresse dans `api`.
6. **Rappel annuel (loi Chatel)** : vérifier que Lemon Squeezy envoie un e-mail avant chaque renouvellement annuel
   (Settings › Emails › Subscription renewal reminder), sinon l'envoyer soi-même 1 à 3 mois avant.
7. **URSSAF** : déclarer le chiffre d'affaires (mensuel ou trimestriel) ; Lemon Squeezy reverse les ventes nettes.

### Relais Cloudflare (seulement si le navigateur bloque l'appel)

Compte Cloudflare gratuit › Workers › créer un Worker avec ce code, puis mettre
`api: "https://<nom>.workers.dev/"` dans `premium-config.js`. Le relais ne contient aucun secret.

```js
export default {
  async fetch(req) {
    const cors = { "Access-Control-Allow-Origin": "https://agozel5.github.io", "Access-Control-Allow-Headers": "Content-Type, Accept", "Access-Control-Allow-Methods": "POST, OPTIONS" };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    const action = new URL(req.url).pathname.split("/").pop();
    if (!["activate", "validate", "deactivate"].includes(action)) return new Response("Not found", { status: 404, headers: cors });
    const res = await fetch(`https://api.lemonsqueezy.com/v1/licenses/${action}`, {
      method: "POST", headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" }, body: await req.text(),
    });
    return new Response(await res.text(), { status: res.status, headers: { ...cors, "Content-Type": "application/json" } });
  },
};
```

## Applications iPhone et Android (plus tard)

Apple et Google imposent leur propre paiement pour un abonnement numérique, et Apple interdit de débloquer
l'app par une clé de licence. Pour les versions natives :

- **RevenueCat** + `react-native-purchases` (build de développement Expo, pas Expo Go) ;
- produits d'abonnement aux mêmes prix dans App Store Connect et Google Play Console ;
- inscription au **Small Business Program** d'Apple (commission 15 %) ; Google : 15 % aussi ;
- même droit « premium » côté RevenueCat pour retrouver l'abonnement sur tous les appareils.

## Fonctionnement technique

- `public/lib/premium.js` : active la clé (`/v1/licenses/activate`), la revérifie tous les 3 jours
  (`/validate`), garde Premium 45 jours hors connexion, vérifie que la clé vient bien de cette boutique
  et de ce produit. Seuls la clé et un nom d'appareil anonyme sont envoyés.
- Pour tester l'interface avant la mise en vente : dans la console du navigateur,
  `localStorage.bayyin_premium_preview = "1"` puis recharger (`removeItem` pour revenir).
- Un lien `https://agozel5.github.io/bayyin/#premium=CLÉ` ouvre la page et active la clé.
