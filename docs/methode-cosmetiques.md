# Note des cosmétiques : méthode

Bayyin note chaque cosmétique sur 100 à partir de sa liste d'ingrédients (INCI) et de son type de produit. Le code se trouve dans `public/lib/cosmetic.js` ; les explications affichées sont dans `public/lib/i18n/*.js` (clés `cosm.*`).

## 1. Principe : danger × exposition

Les toxicologues ne jugent pas un ingrédient seulement sur son danger, mais sur l'exposition réelle. C'est la base de l'évaluation officielle en Europe (CSSC, *Notes of Guidance*, 12e révision, SCCS/1647/22, 2023) :

- **Rincé ou non rincé.** Facteur de rétention de 0,01 pour un gel douche ou un shampooing, contre 1 pour une crème. À concentration égale, un lait corporel expose environ 80 fois plus qu'un shampooing (123 contre 1,5 mg/kg/jour).
- **Inhalation.** Les sprays et les poudres libres peuvent atteindre les poumons. Plusieurs ingrédients y sont interdits ou limités : PHMB, dioxyde de titane, nanoparticules, homosalate en aérosol.
- **Ingestion.** Les produits pour les lèvres sont en partie avalés. C'est la principale question pour les huiles minérales (MOAH).
- **Enfants.** Ils sont plus sensibles, en particulier sur le siège. Plusieurs substances sont interdites ou limitées pour eux : propylparaben et butylparaben, acide salicylique, salicylate de méthyle, triclosan dans le dentifrice.

## 2. Position dans la liste

Le règlement (CE) 1223/2009 (article 19) impose de lister les ingrédients à plus de 1 % par ordre décroissant ; ceux à moins de 1 % peuvent suivre dans n'importe quel ordre.

On en déduit une règle sûre : tout ce qui suit un conservateur plafonné à 1 % ou moins est présent à 1 % au plus. Les conservateurs utilisés comme repère sont le phénoxyéthanol, les parabens, la MI/MCI, le sorbate de potassium, l'acide déhydroacétique et la chlorphénésine.

L'app affiche cette indication. Pour les ingrédients dont l'effet dépend de la dose (irritants, impuretés, environnement, précaution), elle divise les points retirés par deux quand l'ingrédient est à moins de 1 %. Les allergènes ne bénéficient pas de cette réduction : les seuils d'étiquetage (0,001 %) montrent qu'ils agissent à très faible dose.

## 3. Niveaux de risque par ingrédient

Chaque famille d'ingrédients a un niveau qui dépend du contexte : produit non rincé, produit rincé, enfant, spray, aérosol, poudre libre, lèvres.

**Risque élevé**
- Substances interdites dans l'UE ou en France :
  - CMR : formaldéhyde, zinc pyrithione, lilial…
  - parabens interdits en 2014 ;
  - 4-MBC ;
  - éclaircissants illégaux ;
  - PFAS (loi n° 2025-188).
- Interdictions déjà programmées : triphényl phosphate en 2027 ; benzophénones 1 et 2, jugées non sûres par le CSSC.
- Libérateurs de formaldéhyde et MI/MCI dans un produit non rincé.
- Butylparaben dans un produit non rincé : inscrit par l'ECHA comme substance extrêmement préoccupante, et non sûr pour les enfants selon le CSSC (2025).
- Colorants capillaires PPD et toluène-2,5-diamine.

**Risque modéré**
- Propylparaben.
- Filtres UV encadrés comme perturbateurs endocriniens potentiels : benzophénone-3, homosalate, octocrylène.
- Triclosan.
- BHA (cancérogène possible, CIRC 2B).
- Silicone D4.
- Résorcinol, toluène, dérivés de DEA.
- SLS dans un produit non rincé.
- MI/MCI et libérateurs de formaldéhyde dans un produit rincé.

**Risque limité**
- Allergènes de parfum et parfum (modéré pour un enfant).
- Ingrédients éthoxylés (traces possibles de 1,4-dioxane).
- Silicones D5 et D6, microplastiques (environnement).
- BHT, parabens courts, phénoxyéthanol, sels d'aluminium : signalés par précaution, jugés sûrs par le CSSC aux doses autorisées.
- Rétinol, acide kojique.

**Sans risque dans ce contexte**
- Phénoxyéthanol dans un produit rincé.
- Huile minérale sur la peau (raffinée, de qualité cosmétique).
- Talc dans un produit rincé.
- Dioxyde de titane dans une crème.

Ces ingrédients sont listés sur la fiche, à part, pour la transparence.

## 3 bis. Base officielle CosIng (tous les autres ingrédients)

Les familles ci-dessus couvrent les ingrédients les plus étudiés. Pour tous les autres, l'app s'appuie sur **CosIng**, la base officielle des ingrédients cosmétiques de la Commission européenne : environ 33 000 ingrédients, avec leur rôle et leur statut dans le règlement.

- **Mise à jour.** Le programme `scripts/build-cosing.mjs` la télécharge chaque mois (workflow `cosing.yml`) et la convertit en `public/data/cosing.json`. L'app charge ce fichier une fois, puis le garde hors connexion.
- **Ce qui est importé.** L'inventaire des ingrédients (nom INCI, fonctions, références aux annexes) et les annexes II à VI du règlement (CE) 1223/2009 : interdits, restreints, colorants, conservateurs, filtres UV, avec la classification CMR et les conditions d'étiquetage.

Niveau attribué à un ingrédient qu'aucune famille ne couvre :

| Statut dans CosIng | Niveau |
|---|---|
| Annexe II (interdit), sauf interdiction limitée à certains usages | élevé |
| CMR de catégorie 1, interdit | élevé |
| CMR de catégorie 1, autorisé sous conditions | modéré (limité si rincé, élevé pour un enfant) |
| CMR de catégorie 2 | limité |
| Allergène de parfum à étiqueter (0,001 % / 0,01 %) | limité (modéré pour un enfant) |
| Colorant capillaire encadré | limité |
| Autre ingrédient connu | sans risque connu |

La fiche affiche tous les ingrédients avec leur rôle et un point de couleur, ainsi que la part de la liste reconnue. Quand moins de 70 % des ingrédients sont reconnus, elle prévient que la note est moins fiable.

**Différence avec Yuka.** Yuka note environ 12 500 ingrédients un par un, avec un toxicologue. Ici, la base couvre davantage d'ingrédients, mais leur niveau découle de leur statut réglementaire : c'est une évaluation officielle et vérifiable, pas un avis d'expert au cas par cas.

## 4. Calcul de la note

Le calcul s'inspire de la méthode publiée par Yuka (help.yuka.io, « How are penalties calculated in the cosmetic product scores »).

1. L'ingrédient le plus à risque fixe la fourchette :
   - élevé : 0 à 24 (Mauvais) ;
   - modéré : 25 à 49 (Médiocre) ;
   - sinon : 50 à 100 (Bon ou Excellent).
2. Les autres ingrédients à risque retirent des points :

   | Niveau | Effet sur l'organisme (CMR, perturbateur endocrinien, interdit) | Effet local ou environnement |
   |---|---|---|
   | Élevé | −12 | −8 |
   | Modéré | −6 | −4 |
   | Limité | −3 | −2 |

   Dans la fourchette 50–100, chaque ingrédient à risque limité retire 6 points s'il agit sur l'organisme et 2 points sinon.
3. La note ne sort jamais de sa fourchette. Sans liste d'ingrédients, il n'y a pas de note.

## 5. Limites

- **Les concentrations exactes ne sont pas publiées.** La position dans la liste n'en donne qu'une borne. C'est la principale critique faite à toutes ces applications par les toxicologues et la FEBEA (2025).
- **Le type de produit est déduit** des catégories et du nom donnés par Open Beauty Facts. En cas de doute, le produit est traité comme non rincé, l'hypothèse la plus prudente.
- **La grossesse n'est pas prise en compte** : aucune recommandation officielle vérifiable n'a été trouvée pour les cosmétiques.
- **Les impuretés invisibles dans la liste**, comme le 1,4-dioxane, ne sont signalées que comme possibles.

## 6. Sources principales

- CosIng, base des ingrédients cosmétiques (Commission européenne) : https://ec.europa.eu/growth/tools-databases/cosing/
- CSSC, *Notes of Guidance*, 12e révision (2023) : https://health.ec.europa.eu/publications/sccs-notes-guidance-testing-cosmetic-ingredients-and-their-safety-evaluation-12th-revision_en
- Règlement (CE) 1223/2009 consolidé : https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:02009R1223-20250501
- Règlements modificatifs :
  - 2022/1176 (benzophénone-3, octocrylène) ;
  - 2022/2195 (homosalate, BHT) ;
  - 2022/1181 (libérateurs de formaldéhyde) ;
  - 2023/1545 (allergènes de parfum) ;
  - 2024/996 (rétinol, 4-MBC, triclosan) ;
  - 2026/909 (aluminium, salicylate de benzyle, triphényl phosphate).
- REACH : 2024/1328 (D4, D5, D6) et 2023/2055 (microplastiques) — https://echa.europa.eu
- CIRC, monographie 136 (talc, 2024) : https://www.iarc.who.int/wp-content/uploads/2024/07/pr352_E.pdf
- ESSCA, tests épicutanés en Europe 2019-2020 (Uter et al., *Contact Dermatitis* 2022)
- Loi n° 2025-188 du 27 février 2025 (PFAS) et décret n° 2025-1376
- CJUE, C-4/21, 15 septembre 2022 (phénoxyéthanol)
- Yuka, méthode de notation des cosmétiques : https://help.yuka.io/l/fr/article/ih5pet4ffc-comment-sont-d-termin-s-les-malus-pour-le-score-des-produits-cosm-tiques
