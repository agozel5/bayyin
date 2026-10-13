# Certification vérifiée

Quand un produit porte un label AVS, Achahada ou HMC, Bayyin le compare à la liste que l'organisme publie
lui-même. `scripts/build-certified.mjs` (GitHub Actions, chaque lundi) construit `public/data/certified.json`.

| Organisme | Source publique | Ce qui est comparé |
|---|---|---|
| AVS | annuaire des fournisseurs (equinox.avs.fr, utilisé par avs.fr/etablissements) | estampille sanitaire de l'emballage (`emb_codes` d'Open Food Facts), puis nom |
| Achahada | carte des établissements et marques (achahada.com/marques) | nom de la marque |
| HMC (UK) | liste des marques approuvées (halalhmc.org/brands) | nom de la marque |

Résultats affichés sur la fiche :
- **Certification vérifiée** : l'estampille de l'emballage est celle d'un établissement de la liste (preuve la plus forte) ;
- **Marque présente dans la liste** : la marque correspond à un nom de la liste ;
- **Pas retrouvé dans la liste** : message neutre — les listes sont incomplètes, ce n'est pas une accusation de fraude.

On ne garde que les noms et les estampilles (aucun téléphone, contact ni e-mail). Une liste qui ne répond pas
garde sa dernière version. Les autres organismes (mosquées de Paris, Lyon, Évry…) ne publient pas de liste
exploitable : la fiche garde le lien « Vérifier auprès de … ».

## Demande d'autorisation / de partenariat (à envoyer par le propriétaire)

> Objet : Bayyin — affichage de votre liste officielle dans une application de vérification halal
>
> Bonjour,
>
> Je développe Bayyin (https://agozel5.github.io/bayyin/), une application gratuite qui aide les consommateurs
> à vérifier les produits halal en scannant leur code-barres. Quand un produit porte votre label, l'application
> le compare à la liste que vous publiez sur votre site et affiche « vérifié sur la liste officielle [organisme] »,
> avec un lien vers votre page. Nous ne reprenons que les noms et les estampilles sanitaires, sans aucune donnée
> de contact.
>
> Je souhaite m'assurer que cet usage vous convient. Si vous le pouvez, une liste des produits ou des codes-barres
> certifiés (même un simple fichier) nous permettrait d'être encore plus précis et de mieux repérer les faux logos.
> Je retirerai votre liste sur simple demande.
>
> Bien cordialement,
> [Nom] — [e-mail]
