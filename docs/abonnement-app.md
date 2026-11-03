# Bayyin Premium dans l'app : mise en place du paiement

Sur iPhone, un abonnement numérique doit passer par l'achat intégré d'Apple (règle 3.1.1 de l'App Store).
Sur Android, il passe par Google Play Billing. L'app gère déjà les deux avec RevenueCat (`mobile/src/premium.js`).
Il reste à créer les produits dans les stores, puis à coller deux clés publiques dans `mobile/app.json`.
Tant que ces clés sont vides, Premium affiche « Bientôt disponible » et toutes les fonctions restent gratuites.

Offre prévue : **14,99 €/an** ou **2,49 €/mois**, avec **7 jours gratuits** sur les deux offres.

## 1. App Store Connect (Apple)

1. **Accords, taxes et banque** : signez le contrat « Paid Apps », puis renseignez le compte bancaire et les formulaires fiscaux. Sans ce contrat, aucun achat ne fonctionne, même en test.
2. **App › Monétisation › Abonnements** : créez le groupe d'abonnements `Bayyin Premium`, puis deux abonnements à renouvellement automatique :
   - `bayyin_premium_year` : 1 an, 14,99 € ;
   - `bayyin_premium_month` : 1 mois, 2,49 €.
3. Pour chacun, ajoutez une **offre de lancement** : « Essai gratuit », 1 semaine, pour les nouveaux abonnés.
4. Remplissez le nom affiché, la description et la capture de révision (une capture de la page Premium suffit).
5. **Infos sur l'app** : ajoutez le lien vers la politique de confidentialité (exigée par Apple). Les conditions d'utilisation sont affichées dans l'app (Réglages › Informations légales, et en bas de la page Premium).
6. **Utilisateurs et accès › Sandbox** : créez un compte de test pour essayer l'achat sur TestFlight.

## 2. Google Play Console

1. **Profil de paiement** : créez-le (compte marchand Google), avec la banque.
2. **Monétiser › Produits › Abonnements** : créez `bayyin_premium` avec deux forfaits de base :
   - `year` : renouvellement annuel, 14,99 € ;
   - `month` : renouvellement mensuel, 2,49 €.
3. Pour chaque forfait, ajoutez une **offre** « Essai sans frais » de 7 jours, réservée aux nouveaux clients.
4. **Licences de test** : ajoutez votre adresse Google pour tester sans être prélevé.

## 3. RevenueCat (gratuit jusqu'à 2 500 $ de revenus mensuels)

1. Créez un compte sur revenuecat.com, puis un projet « Bayyin ».
2. Ajoutez l'app iOS (bundle `io.github.agozel5.bayyin`), avec la clé « In-App Purchase » d'App Store Connect, et l'app Android (package `io.github.agozel5.bayyin`), avec un compte de service Google Play.
3. **Entitlements** : créez `premium`, puis rattachez-y les quatre produits (deux Apple, deux Google).
4. **Offerings** : dans l'offre `default`, ajoutez un package **Annual** (les deux produits annuels) et un package **Monthly** (les deux produits mensuels).
5. **API keys** : copiez les deux clés **publiques** du SDK (`appl_…` et `goog_…`), puis collez-les vous-même dans `mobile/app.json` :

```json
"revenuecat": { "ios": "appl_…", "android": "goog_…", "entitlement": "premium" }
```

Ces clés publiques sont faites pour être dans l'app. Ne mettez jamais la clé secrète (`sk_…`) dans le code.

## 4. Ce que l'app affiche déjà

- L'essai, lu depuis le store : « Essayer gratuitement 7 jours », puis « 7 jours gratuits, puis 14,99 €/an ».
- Le renouvellement automatique, la résiliation au moins 24 h avant la fin de la période et le compte de paiement (Apple ou Google).
- Les liens vers les conditions de l'abonnement et la confidentialité, avant l'achat.
- Les boutons « Restaurer mes achats » et « Gérer mon abonnement ».

## 5. Informations légales à compléter

Dans `mobile/app.json › expo.extra.legal`, renseignez : nom, SIRET, adresse, e-mail, téléphone (facultatif), et le médiateur de la consommation (nom et site).
Ces champs alimentent les mentions légales, la politique de confidentialité et les conditions. Tant qu'un champ est vide, la page affiche « [à compléter] ».
