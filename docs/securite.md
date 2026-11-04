# Sécurité de Bayyin

Bayyin n'a ni compte, ni serveur, ni base de données à soi : il n'y a pas de mot de passe à voler ni de
données d'utilisateurs centralisées. Les risques réels sont ailleurs : du contenu venu de l'extérieur
(Open Food Facts, OpenStreetMap, RappelConso) qui serait exécuté comme du code, une bibliothèque de
CDN modifiée, ou un accès volé à un compte de publication (GitHub, Expo, Apple, Google).

## Ce qui est en place

### App mobile
- **Pages internes verrouillées** (`components/SafeWebView.js`) : la carte et la lecture de texte ne peuvent
  ni changer de page, ni ouvrir de fenêtre, ni lire les fichiers du téléphone, ni charger du contenu non chiffré.
  Un lien touché s'ouvre dans le navigateur seulement s'il est en https.
- **Données jamais exécutées** : les noms de commerces (OpenStreetMap, modifiable par tous) et les adresses
  de photos sont insérés dans la page de façon sûre (`safeJson`) : un nom piégé ne peut pas devenir du code.
- **Messages vérifiés** : ce que la page renvoie à l'app est contrôlé (type, taille, identifiant connu).
- **Liens extérieurs filtrés** : seules les adresses https, e-mail et téléphone s'ouvrent (rappels, sources,
  commerces) ; jamais « javascript: » ni « data: ».
- **Liens d'ouverture de l'app** (`bayyin://…`, widgets, raccourcis) : seuls des chemins connus et des
  codes-barres de chiffres sont acceptés.
- **Intégrité de Leaflet** : le fichier de la carte est refusé s'il a été modifié sur le CDN.
- **Sauvegarde Android désactivée** (`allowBackup: false`) : l'historique et le profil ne sortent pas du
  téléphone par une sauvegarde.
- **Réseau** : https partout (iOS et Android refusent le non chiffré par défaut).
- **Achats** : traités par Apple et Google ; seules les clés publiques de RevenueCat sont dans l'app.

### Site
- **Politique de sécurité du contenu** (`index.html`) : seuls les scripts du site et de jsDelivr s'exécutent ;
  un script injecté ou un attribut `onerror=` est bloqué par le navigateur (testé).
- Tout texte venu des bases est échappé avant affichage (`esc`) ; les liens venus de données passent par
  `safeHref` (http et https seulement).
- Intégrité de Leaflet, comme dans l'app.

### Automatisations GitHub
- Aucune automatisation ne se lance sur une proposition de modification extérieure (pas de `pull_request`).
- Les champs saisis au lancement (canal, message, architectures) passent par des variables et sont vérifiés :
  ils ne peuvent pas injecter de commande.

## À faire de votre côté (comptes)
1. **Double authentification** sur GitHub, Expo, Apple (App Store Connect) et Google (Play Console) : c'est la
   protection la plus importante, un compte volé permet de publier une fausse version de l'app.
2. **Branche `main` protégée** sur GitHub (Settings › Branches) quand le dépôt sera privé.
3. **Signature des mises à jour Expo** (expo-updates « code signing ») : l'app n'accepte alors que les mises à
   jour signées par votre clé. La clé privée se crée sur votre ordinateur et ne doit jamais être envoyée :
   `npx expo-updates codesigning:generate` (voir la documentation d'Expo).
4. Garder les clés secrètes (RevenueCat `sk_…`, jetons Expo, mots de passe) hors du code, dans les secrets
   GitHub ou sur votre machine.
