# Carotales
Jeu hébergé sur : https://shanto0o.github.io/3D-Game-Project-Carotales/

Video présentation du gameplay : https://www.youtube.com/watch?v=PiP7ZgeqVu0
  ## Groupe
  - **Nom** : Florent Belot, Alexis Dubarry, Shanti Noel

# README pour le rendu du 22/04 du cours de 3D game programming : 


Jeu : Le jeu est un platformer où l'on incarne un lapin qui a pour but de récupérer des carottes en parcourant des niveaux.

L'objectif principal est de passer au niveau suivant dans le temps imparti tout en amassant un maximum de carottes dans l'objectif d'atteindre la carotte sacrée.
  ## Les niveaux : 
  - Dans le premier niveau on est sur une seule île flottante avec une montagne. La fin se situe en haut de la montagne, vous pourrez l'atteindre via 2 chemin, l'un plutôt facile et l'autre plus difficile (mais avec plus de carottes disponible).
  - Dans le deuxième niveau il n'y a plus de mini-jeux mais des ennemis (abeilles) font leur apparition, l'objectif reste le même que pour le premier niveau.
  - (PAS ENCORE IMPLÉMENTÉ) Dans le 3ème niveau nous touchons au but et nous voyons la carotte mais le chemin pour l'atteindre est bloqué par un portail avec 4 cadenas. L'objectif est de déverouiller ces 4 cadenas pour accéder à la carottes et mettre fin au jeu.

  ## Fonctionnalité :
  - Dans le premier niveau, nous pouvons effectuer 2 mini-jeux, l'un représente de la pêche dans un étang où l'on va pêcher des poissons-carottes (avec une chance d'en avoir un qui vaut vraiment beaucoup de carottes) et l'autre en haut de la montagne permet de jouer aux dés avec une chance de remporter le gros lot.
  - Utilisation du moteur physique Havok.
  - Systeme de mouvement de caméra pendant qu'on peche.
  - Entre les niveaux une boutique apparait et permet d'acheter des améliorations ce qui donne de l'interêt au ramassage de carottes. ( Il y a 2 améliorations actives (competences :  freeze, speedboost)) et le reste sont des passifs pour améliorer l'experience de jeu)
  - Ajout de particules pour les 2 compétences actives du jeu.
  - Animations.
  - Ajout de différents sound effects pour rendre le jeu plus vivant.
  - Les ennemis peuvent nous suivre, sinon ils ont un chemin prédéfini.

  
  ## Commandes
  - "z" : Aller en avant.
  - "q" : Aller à gauche.
  - "s" : Aller en arrière.
  - "d" : Aller à droite.
  - Espace : Sauter.
  - "e" : Intéragir avec les mini-jeux.
  - "a" : Utiliser l'amélioration pour freeze les ennemis.
  - "r" : Speedboost.

  ## Répartition du travail :
  - Bélot Florent : Modélisation du terrain et implémentation de Havok.
  - Noel Shanti : Lapin avec les animations et le mini jeu de pêche.
  - Dubarry Alexis : Le code principale.

  Mais on travaillait ensemble tout le temps, donc on s'est tous entraidé et on a un peu touché à tout.

  ## Problèmes connus :
  - La caméra rentre dans les décors.
  - Il arrive parfois que le premier saut ne fonctionne pas.
  - On ne se déplace pas avec la plateforme mouvante du premier niveau.
  - Le lapin fait des 360 à un certain angle.


  ## Ce qu'on aimerait faire d'ici le rendu finale pour Game on Web :
  - Faire le niveau 3 (on a déjà commencé à faire la carte et réfléchir à comment l'implémenter).
  - Faire en sorte que lorsqu'on se situe sur une plateforme qui se déplace, on se déplace avec elle au lieu de glisser dessus (on en ajoutera plus si on y arrive et on améliorera le parcours).
  - Ajouter des ombres.
  - Empêcher la caméra de traverser les murs.
  - Rajouter du contenu. Si on arrive à faire tout le reste à la fin on essayera de rajouter des mini-jeux ou des niveaux en plus (à la fin seulement).

  



  



