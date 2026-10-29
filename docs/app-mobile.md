# App mobile (iPhone et Android) : réglages à faire par le propriétaire

L'app native (dossier `mobile/`, React Native avec Expo) reprend le site et ajoute ce que seul un téléphone permet.
La plupart des fonctions marchent sans rien configurer. Trois choses demandent vos comptes : **Premium**, la **publication** et, sur iPhone, les **liens universels**.

## Fonctions propres à l'app

| Fonction | Ce qu'elle fait | Réglage nécessaire |
|---|---|---|
| Alertes de rappel | Vérifie en arrière-plan si un produit de l'historique est rappelé (RappelConso) et envoie une notification | Aucun (l'autorisation est demandée à l'utilisateur après 2 produits) |
| Mode courses | Scan en continu depuis la caméra, panier avec verdicts et note moyenne | Aucun (réservé à Premium quand Premium est en vente) |
| Lecture d'étiquette | Texte lu par le téléphone (Apple Vision, Google ML Kit), sans réseau ; Tesseract en secours et pour l'arabe | Aucun |
| Raccourcis de l'icône | Appui long : Scanner, Rechercher, Historique, Classements | Aucun |
| Carte de partage | Image du verdict avec QR code, à envoyer sur WhatsApp, Instagram… | Aucun |
| Demande d'avis | Fenêtre officielle d'Apple ou Google après 6 fiches, une seule fois, sur un verdict halal | Aucun |
| Widget | Bilan de la semaine et bouton Scanner sur l'écran d'accueil | Aucun pour Android ; sur iPhone, groupe d'apps (voir plus bas) |
| Liens | `bayyin://p/<code>` et les liens de partage du site (`agozel5.github.io/bayyin/?p=<code>`) ouvrent la fiche dans l'app | Android : aucun. iPhone : voir « Liens universels » |

## Premium (achats intégrés)

Apple et Google imposent leurs propres achats intégrés dans une app : l'abonnement du site (Lemon Squeezy) ne peut pas être vendu dans l'app.
L'app utilise **RevenueCat**, qui gère les deux stores avec un seul code.

1. Créez les abonnements dans App Store Connect et dans la Google Play Console (annuel et mensuel, avec l'essai gratuit si vous en voulez un).
2. Créez un compte RevenueCat, ajoutez les deux apps, puis :
   - un **entitlement** nommé `premium` ;
   - une **offering** par défaut (« current ») avec un package **Annual** et un package **Monthly**.
3. Copiez les **clés publiques** du SDK (elles commencent par `appl_` pour iOS et `goog_` pour Android) dans `mobile/app.json` :

```json
"extra": {
  "revenuecat": { "ios": "appl_…", "android": "goog_…", "entitlement": "premium" }
}
```

Tant que ces clés sont vides, Premium est **désactivé** : tout reste accessible et la page Premium n'apparaît pas. Les clés publiques peuvent être dans le code (ce ne sont pas des secrets) ; ne mettez jamais la clé secrète RevenueCat dans l'app.

Avec Premium actif, sont réservés : les classements au-delà des 3 premiers rayons de chaque onglet, le mode courses, le téléchargement hors connexion et l'historique de plus de 30 jours.

## Widget iPhone et groupe d'apps

Le widget iPhone (expo-widgets) partage ses données avec l'app par un **App Group** (`group.io.github.agozel5.bayyin`).
Lors de la première compilation avec EAS, acceptez la création des « capabilities » (App Groups) quand EAS le propose, ou ajoutez le groupe dans le portail Apple Developer.

## Liens universels (iPhone)

Sur Android, un lien de partage propose d'ouvrir Bayyin. Sur iPhone, il faut un fichier `apple-app-site-association` à la **racine** du domaine, ce que GitHub Pages ne permet pas pour `agozel5.github.io/bayyin`.
Deux options plus tard : un domaine à vous (par exemple `bayyin.app`), ou le dépôt `agozel5.github.io`. En attendant, le lien ouvre le site, qui affiche la même fiche.

## Compilation

- **Android** : onglet Actions → « App mobile » → Run workflow. L'APK est publié dans la release `android-latest`.
- **iPhone** : la même action vérifie que le projet compile pour le simulateur. L'installation sur un vrai iPhone et TestFlight passent par EAS (`eas build -p ios`) avec votre compte Apple Developer.
