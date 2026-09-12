# Exercises Planner

PWA installable de timer d'entraînement, 100% locale (IndexedDB), sans compte ni serveur.
Alternative à l'app Seven : bibliothèque d'exercices personnalisée (fitness, yoga, kiné),
séries manuelles, mode random, historique/streak, sons, rappel passif, export/import JSON.

## Modèle de données

```
Exercise:  { id, nom, masterCategorie: 'fitness'|'yoga', categories: [string], dureeDefaut, reposDefaut }
SérieItem: { exercise_id, duree: number|null, repos: number|null }   // null = hérite du défaut
Série:     { id, nom, items: [SérieItem] }
Completion: { id, date, timestamp, source: 'serie'|'random', serieId, serieName, exerciseIds }
```

`masterCategorie` est un simple champ de classement (aucun effet sur le timer). Les catégories
libres sont des tags. Random : non stocké comme série — tirage à la volée dans une master
catégorie, filtré par tags, avec `nombre_exercices` / `durée_globale` / `repos_global`.

## Règles de résolution (strictes)

- **Série manuelle** : durée effective = `item.duree ?? exercise.dureeDefaut` (idem repos)
- **Série random** : TOUS les exercices utilisent `dureeGlobale` / `reposGlobale`.
  Les défauts de la bibliothèque sont ignorés dans ce mode.
- Timeline d'une séance : préparation 3 s → effort → repos → … → dernier effort
  (**pas de repos après le dernier exercice**).

## Écrans

1. **Bibliothèque** — CRUD exercices, filtre par master catégorie + tags
2. **Mes séries** — liste (durée estimée, streak 🔥) + éditeur (items réordonnables, filtre par catégorie)
3. **Random** — master catégorie → tags → nombre/durée/repos globaux → tirage
4. **Player** — plein écran : décompte, bip/vibration, décompte sonore des 3 dernières secondes,
   annonce vocale de l'exercice suivant, pause/suivant/stop, wake lock
5. **Historique** — streak en cours/record, nb de séances, calendrier, compteur par exercice
6. **Export** — export/import JSON complet (bibliothèque + séries + historique)

Rappel passif : bandeau in-app + badge sur l'icône si la séance du jour n'est pas faite
(pas de notification système programmée — app 100% locale sans serveur).

## Backlog

Géré dans Todoist, projet « App : Exercise Planning ».

## Développement

Une étape à la fois. Un commit par changement fonctionnel.

- ✅ **Étape 1** : modèle de données + Bibliothèque (CRUD) + Player (série codée en dur)
- ✅ **Étape 2** : création de séries manuelles
- ✅ **Étape 3** : mode random (master catégorie + tags)
- ✅ **Étape 4** : filtres par catégorie (Bibliothèque + création de série)
- ✅ **Étape 5** : historique / streak
- ✅ **Étape 6** : export / import JSON
- ✅ **Étape 7** : sons (décompte 3-2-1, annonce vocale)
- ✅ **Étape 8** : rappel passif (bandeau + badge)

Question ouverte (non bloquante) : BDD partagée ou non entre mobile et web, si un jour
un rewrite natif s'ajoute à la PWA.
