# Bayyin — بيّن

**Scanner halal & santé.** Gratuit, sans publicité, sans pistage.

> « Le halal est clair (*bayyin*) et le haram est clair, et entre les deux se trouvent des
> choses douteuses. » — hadith rapporté par al-Bukhari (52) et Muslim (1599)

*Bayyin* signifie « clair » en arabe : les trois statuts de l'app (halal, douteux, haram)
viennent de ce hadith. L'icône reprend la lettre ب, initiale du mot.

Web app qui scanne le code-barres d'un produit alimentaire et indique :

- son statut **halal** : certifié, probable, douteux ou haram, avec l'ingrédient en cause ;
- une **note santé sur 100** (Nutri-Score, additifs à risque, bio), avec défauts et qualités nutritionnels ;
- les **additifs à surveiller**, les allergènes et le niveau de transformation (NOVA) ;
- des **alternatives halal mieux notées** dans la même catégorie.

Ce qui la distingue :

- **verdict selon votre école** (hanafite, malékite, chaféite, hanbalite, prudent, ou point par point) pour les sujets débattus : insectes (carmin), présure, vinaigre de vin, alcool, etc. ;
- **photo de la liste d'ingrédients** (OCR dans le navigateur) quand le produit n'est pas dans la base : texte corrigeable, analyse immédiate, mémorisée pour ce code-barres ;
- **quatre langues** : français, anglais, arabe (de droite à gauche) et turc, avec détection des ingrédients sensibles dans ces langues ;
- **sources citées** : chaque additif à risque, chaque interdit halal et la note santé renvoient vers leur source officielle (EFSA, ANSES, CIRC, JECFA, règlements européens, Nutri-Score, FSA, Coran) ; page « Nos sources » dans Réglages ;
- **vie privée** : aucun compte, aucune publicité, aucun pistage ; tout reste sur le téléphone, seul le code-barres part vers Open Food Facts ;
- **tous les additifs du produit** listés avec leur statut halal et santé, et un **signalement d'erreur** prérempli pour chaque produit ;
- **hors connexion** : l'app et les fiches déjà vues restent disponibles sans réseau, plus un pack des 500 produits les plus scannés en France.

Les données produits viennent d'[Open Food Facts](https://fr.openfoodfacts.org)
(base collaborative, gratuite, plus de 3 millions de produits).

L'app est **100 % statique** : le dossier `public/` suffit. Le navigateur
interroge directement Open Food Facts et applique les règles lui-même, donc
aucun serveur n'est nécessaire en production.

## Mettre l'app en ligne (GitHub Pages, gratuit, HTTPS)

Adresse : **https://agozel5.github.io/halal-scan/**

La caméra du téléphone n'est autorisée qu'en HTTPS, d'où l'hébergement sur
GitHub Pages. Le workflow `.github/workflows/pages.yml` lance les tests puis
publie le dossier `public/` à chaque push sur `main`.

Réglage à faire une seule fois : **Settings → Pages → Source : GitHub Actions**,
puis relancer le workflow depuis l'onglet **Actions** (ou pousser un commit).

Sur le téléphone : ouvrir l'adresse, autoriser la caméra, puis
« Ajouter à l'écran d'accueil » pour l'avoir comme une application.

Mode démo sans internet : ajouter `?demo` à la fin de l'adresse.

## Développer en local

Prérequis : Node.js 18 ou plus récent. Aucune dépendance à installer.

```bash
npm start        # http://localhost:3000 (sert public/ + une API JSON)
npm test         # tests des règles halal, de la note santé et de l'API
```

Sur ordinateur, la caméra fonctionne sur `localhost`.

## Architecture

```
public/                 l'app (à héberger telle quelle)
  index.html
  app.js                onglets Scanner, Recherche, Historique, Additifs, Infos + fiche produit
  style.css             thème clair, barre d'onglets en bas
  lib/camera.js         caméra plein écran + décodage (BarcodeDetector natif ou ZXing WebAssembly)
  lib/barcode.js        validation des codes EAN/UPC
  lib/health.js         note santé, seuils nutritionnels, risque des additifs, allergènes, NOVA
  lib/settings.js       réglages (langue, école, avis par sujet), gardés sur l'appareil
  lib/i18n.js           traductions ; dictionnaires dans lib/i18n/{fr,en,ar,tr}.js
  lib/ocr.js            lecture d'étiquette (Tesseract.js chargé à la demande)
  lib/sources.js        sources officielles et correspondance avec chaque explication
  sw.js                 service worker : mode hors connexion
  lib/store.js          historique et favoris (localStorage, consultables hors connexion)
  lib/rules.js          moteur de classification halal
  lib/off.js            appels à Open Food Facts depuis le navigateur
  lib/fixtures.js       produits d'exemple (tests + mode démo)
src/server.js           serveur local optionnel : sert public/ + API JSON
test/                   tests node:test
```

### API du serveur local (optionnelle)

Utile pour un futur client mobile natif ; l'app web ne s'en sert pas.

| Route | Rôle |
|---|---|
| `GET /api/product/:code` | Fiche + verdict pour un code-barres (8 à 14 chiffres) |
| `GET /api/search?q=nutella` | Recherche par nom, 12 résultats max avec verdict |
| `GET /api/health` | État du serveur, mode hors-ligne ou non |

Exemple de réponse (abrégée) :

```json
{
  "found": true,
  "product": {
    "code": "4001686301029",
    "name": "Dragibus",
    "brand": "Haribo",
    "verdict": {
      "status": "mashbouh",
      "statusLabel": "Douteux",
      "certification": null,
      "flags": [
        { "id": "gelatine", "severity": "mashbouh", "label": "Gélatine", "reason": "…", "source": "gelatine" },
        { "id": "e120", "severity": "mashbouh", "label": "E120 (carmin)", "reason": "…", "source": "E120" }
      ],
      "notes": []
    }
  }
}
```

## Comment le verdict est calculé (`public/lib/rules.js`)

1. **Texte des ingrédients**, découpé en segments pour que les exceptions
   s'appliquent localement (« vinaigre de vin », « jambon de dinde »,
   « bière sans alcool », « orange sanguine »…).
2. **Additifs** : codes E lus dans `additives_tags` d'Open Food Facts et dans le
   texte. Les dérivés d'acides gras (E471, E472…, E481…) passent en simple
   information si l'étiquette précise une origine végétale ou si le produit est
   végétalien.
3. **Certification** : label « halal » sur la fiche, avec reconnaissance des
   organismes (AVS, Achahada, Mosquée de Paris, Mosquée de Lyon, HMC, HFA…).
4. **Décision** : haram > certifié > douteux > halal probable > non déterminé.
   Un ingrédient haram l'emporte même sur un label (la fiche peut être fausse).

Chaque signalement a une sévérité : `haram`, `mashbouh` (douteux) ou `info`
(point d'attention qui ne change pas le verdict, ex. vinaigre de vin).

Pour ajouter une règle (`public/lib/rules.js`) : une entrée dans `TEXT_RULES` ou `ADDITIVES`, puis un
test dans `test/rules.test.js`.

## Limites connues

- Le verdict dépend de la qualité de la fiche Open Food Facts : liste
  d'ingrédients absente, ancienne ou mal transcrite = verdict incertain.
- Les labels de certification ne sont pas vérifiés auprès des organismes.
  Une prochaine étape serait d'importer leurs listes publiques de produits.
- Les positions retenues pour les cas débattus (E120, présure, vinaigre de vin…)
  sont des choix à valider ; l'idéal serait un réglage « école / niveau de
  prudence » dans l'app.

## Lecture des codes-barres (`public/lib/camera.js`)

La caméra est pilotée directement (`getUserMedia`), sans bibliothèque de scan. Plusieurs fois
par seconde, la zone du cadre est copiée dans un canvas et décodée :

- par l'API `BarcodeDetector` du navigateur quand elle existe (Chrome sur Android) ;
- sinon par ZXing compilé en WebAssembly, via le paquet `barcode-detector` chargé depuis jsDelivr (iPhone, Firefox).

Une analyse sur quatre porte sur l'image entière, pour les caméras dont l'image est rognée à
l'écran. Secours : photo du code-barres ou saisie des chiffres.

## Note santé (`public/lib/health.js`)

| Composante | Points |
|---|---|
| Nutri-Score A / B / C / D / E | 60 / 45 / 30 / 15 / 0 |
| Additifs (30 au départ) | −30 risque élevé, −10 modéré, −4 limité ; un risque élevé plafonne la note à 49 |
| Label bio | +10 |

Sans Nutri-Score sur la fiche, aucune note n'est affichée. Les seuils sucre, sel, graisses
saturées et calories suivent les feux tricolores de la Food Standards Agency (aliments et
boissons séparés). Les niveaux de risque des additifs résument des avis EFSA, ANSES et CIRC.

## Écoles et sujets débattus (`public/lib/rules.js`)

Chaque point débattu est un « sujet » : `insectes`, `presure`, `vinaigre`, `arome_alcool`,
`traces_alcool`, `gelatine`, `viande`, `derives`. Pour chacun, l'utilisateur choisit
**permis** (simple information), **douteux** ou **interdit**. Les préréglages `SCHOOLS`
résument des tendances générales et sont modifiables point par point. Gélatine, viande et
dérivés d'origine inconnue restent « douteux » partout : c'est un manque d'information,
pas une divergence d'école.

## Traductions

`lib/i18n/fr.js` est la référence. Un test vérifie que `en`, `ar` et `tr` ont exactement
les mêmes clés et les mêmes variables `{x}`. Pour ajouter une langue : un nouveau fichier,
puis l'ajouter à `DICTS` (`lib/i18n.js`) et à `LANGS` (`lib/settings.js`).
