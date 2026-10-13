# Ajout de produits à Open Food Facts et avis des utilisateurs

Deux réglages dans `public/app-config.js`, à remplir quand tu veux.

## 1. Compte Open Food Facts de l'app (facultatif)

Quand un produit manque, l'utilisateur photographie sa liste d'ingrédients. L'app lui propose ensuite
de l'ajouter à Open Food Facts pour que le produit existe pour tout le monde.

- **Sans compte configuré** (situation actuelle) : le bouton « Ajouter sur Open Food Facts » ouvre la page
  d'ajout du site et copie la liste d'ingrédients ; l'utilisateur doit avoir (ou créer) un compte Open Food Facts.
- **Avec un compte de l'app** : un seul bouton « Envoyer à Open Food Facts » (après accord de l'utilisateur
  sur la licence libre). Le nom, la liste d'ingrédients et la photo sont envoyés, signés « Bayyin » avec un
  identifiant d'appareil anonyme (`app_uuid`) qui permet à Open Food Facts de modérer sans connaître la personne.

Pour l'activer :
1. Créer un compte dédié sur https://world.openfoodfacts.org (ex. `bayyin-app`), avec un mot de passe
   **qui ne sert nulle part ailleurs**.
2. Le mettre dans `off: { user: "bayyin-app", password: "…" }`.

Attention : l'app n'a pas de serveur, donc ce mot de passe est lisible dans le code publié. Ce n'est pas grave
pour un compte qui ne sert qu'à ça (au pire, quelqu'un pourrait contribuer en son nom), mais il ne faut
jamais y mettre un compte personnel. Si un jour il y a des abus, il suffit de changer le mot de passe.
Il est conseillé de prévenir l'équipe Open Food Facts (contact@openfoodfacts.org) que l'app Bayyin
contribue avec ce compte.

## 2. Adresse qui reçoit les avis

Réglages › « Donner mon avis » : note sur 5, type (idée, problème, produit mal classé, autre) et message.

- **Avec une adresse** dans `feedbackEmail` : l'application d'e-mail de l'utilisateur s'ouvre avec le message prêt.
  Conseil : une adresse dédiée (ex. contact.bayyin@…), pas l'adresse personnelle, puisqu'elle sera visible.
- **Sans adresse** (situation actuelle) : le message s'ouvre sur GitHub, dans les « issues » du projet
  (l'utilisateur a besoin d'un compte GitHub).
