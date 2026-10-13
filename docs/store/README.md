# Fiche des stores (App Store et Google Play)

Tout est regénéré par `python3 scripts/store-assets.py --shots` (serveur local lancé), à partir de `icon-master.svg`.

| Fichier | Usage |
|---|---|
| `icon-1024.png` | App Store (1024 × 1024, sans transparence) |
| `play-icon-512.png` | Google Play (512 × 512) |
| `android-adaptive-foreground.png` | Icône adaptative Android (premier plan ; fond `#14805A`) |
| `splash.png` | Écran de démarrage de l'app native (fond vert, icône, nom) |
| `screenshots/<langue>/N-ios-6.9.jpg` | Captures App Store, iPhone 6,9" (1290 × 2796) |
| `screenshots/<langue>/N-android.jpg` | Captures Google Play (1080 × 1920) |

Les écrans de démarrage de la version web installée sur iPhone sont dans `public/splash/`.

## Textes proposés

**Nom** : Bayyin — Halal & santé
**Sous-titre (App Store, 30 caractères)** : Scanner halal, santé, additifs
**Description courte (Play, 80 caractères)** : Scannez un produit : halal, douteux ou haram, note santé et additifs. Gratuit.

**Description**

Bayyin (« clair » en arabe) vous dit en une seconde si un aliment, un cosmétique ou un médicament est halal,
douteux ou haram, selon votre école juridique et vos réglages, et vous donne sa note santé.

- Verdict halal expliqué ingrédient par ingrédient, avec ses sources
- Certification vérifiée : le label AVS, Achahada ou HMC comparé à la liste officielle de l'organisme
- Note santé sur 100 : Nutri-Score, additifs à risque, bio
- 534 additifs expliqués : origine, statut halal, avis de l'EFSA et de l'ANSES
- Alertes allergies et régimes, pour vous et votre famille
- Rappels de produits (RappelConso) : alerte si un produit déjà scanné est rappelé
- Meilleures alternatives dans le même rayon
- Photo des ingrédients quand le produit est inconnu
- En français, anglais, arabe et turc ; mode sombre ; fonctionne hors connexion
- Sans compte, sans publicité, sans pistage

**Mots-clés (App Store, 100 caractères)** : halal,scanner,code barre,additifs,nutriscore,haram,cosmétique,allergie,santé,muslim
