# Songspotteur

Un jeu où il faut reconnaître une chanson québécoise à partir d'un extrait d'une demi-seconde.

**Jouer : https://naimouellet.github.io/songspotteur/**

Inspiré de [songspot](https://songspot.co), mais uniquement avec de la musique d'ici, en français : des classiques de Beau Dommage, Harmonium et Jean Leloup jusqu'au rap et à l'indie d'aujourd'hui (Les Louanges, Ariane Roy, Thierry Larose, FouKi, Souldia…).

## Comment jouer

1. Appuie sur lecture : tu entends les **0,5 premières secondes** de la chanson.
2. Tape le titre dans le champ de recherche et choisis-le dans les suggestions.
3. Pas sûr ? **Extrait plus long** débloque le prochain extrait : 0,5 s → 2 s → 4 s → 8 s → 16 s.
4. Un mauvais essai débloque aussi l'extrait suivant.
5. Après le dernier extrait, **Je ne sais pas** révèle la réponse.

| Trouvée avec l'extrait de | Points |
| --- | --- |
| 0,5 s | 100 |
| 2 s | 75 |
| 4 s | 50 |
| 8 s | 25 |
| 16 s | 10 |

Les bonnes réponses d'affilée font monter ta série. Une fois la réponse révélée, la chanson joue pendant 15 secondes et le bouton **Ouvrir dans Musique** l'ouvre dans Apple Music.

Raccourcis : **Entrée** dans un champ vide réécoute l'extrait, **Espace** joue ou met en pause.

## Le catalogue

Environ 750 chansons de plus de 150 artistes, choisies pour être :

- **québécoises** : l'artiste principal doit être d'ici (les collaborations avec des artistes de France sont exclues) ;
- **en français** : les chansons en anglais ou dans d'autres langues sont retirées ;
- **variées** : un nombre maximal de chansons par artiste évite que la pop radio prenne toute la place.

Le catalogue couvre toutes les époques ; environ la moitié des chansons datent des années 2020.

## Comment ça marche

C'est un site statique : du HTML, du CSS et du JavaScript, sans serveur ni compte.

- **Extraits** : chaque chanson est associée à une piste [Deezer](https://www.deezer.com). Le jeu demande à l'API publique de Deezer un aperçu de 30 secondes au moment de jouer, parce que les liens d'aperçu expirent.
- **Découpage précis** : l'aperçu est décodé avec la Web Audio API, ce qui permet de jouer exactement 0,5 s. Le jeu saute aussi le fondu du début des aperçus pour que le premier extrait soit bien audible.
- **Sons du jeu** : les petits sons de bonne et de mauvaise réponse sont synthétisés dans le navigateur ; il n'y a aucun fichier audio.
- **Fluidité** : la chanson suivante se télécharge pendant que tu joues, pour enchaîner sans attente.

Ce dépôt contient la version publiée du jeu :

| Fichier | Rôle |
| --- | --- |
| `index.html` | La page |
| `style.css` | L'apparence |
| `app.js` | La logique du jeu |
| `songs.js` | Le catalogue de chansons |

## Crédits

Les extraits audio et les pochettes proviennent de Deezer et appartiennent à leurs ayants droit. Ce projet n'est affilié ni à Deezer, ni à Apple, ni à songspot.
