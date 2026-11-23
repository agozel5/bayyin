# Fiche des stores (App Store et Google Play)

Tout est regénéré par `python3 scripts/store-assets.py --shots` (serveur local lancé), à partir de `icon-master.svg`.

| Fichier | Usage |
|---|---|
| `icon-1024.png` | App Store (1024 × 1024, sans transparence) |
| `play-icon-512.png` | Google Play (512 × 512) |
| `android-adaptive-foreground.png` | Icône adaptative Android (premier plan ; fond `#14805A`) |
| `splash.png` | Écran de démarrage de l'app native (fond vert, icône, nom) |
| `screenshots/<langue>/N-ios-6.9.jpg` | Captures App Store, iPhone 6,9" (1290 × 2796) |
| `screenshots/<langue>/N-android.jpg` | Captures Google Play (1080 × 1920) ; langues : fr, en, ar, tr |
| `play-feature-<langue>.png` | Bannière Google Play, obligatoire (1024 × 500) |
| `social/post-<langue>.jpg` | Publication carrée Instagram, Facebook, LinkedIn (1080 × 1080) |
| `social/story-<langue>.jpg` | Story Instagram, WhatsApp, TikTok (1080 × 1920) |
| `social/header-x-<langue>.jpg` | Bannière de profil X (1500 × 500), fr et en |
| `social/header-linkedin-<langue>.jpg` | Bannière de page LinkedIn (1584 × 396), fr et en |
| `../../public/og.jpg` | Aperçu quand on partage le lien du site (1200 × 630) |
| `../../public/screenshots/*.jpg` | Captures montrées par Android et Chrome à l'installation de la version web |

Les écrans de démarrage de la version web installée sur iPhone sont dans `public/splash/`.

## Textes des fiches

Les textes à coller (nom, sous-titre, texte promotionnel, mots-clés, description courte, nouveautés, description) sont dans `textes-stores.json`, pour les 12 langues de l'app, avec les titres des captures. Ils respectent les limites de caractères d'Apple et de Google.
