# Exercises Planner

PWA installable de timer d'entraînement, 100% locale (IndexedDB), sans compte ni serveur.
Alternative à l'app Seven : bibliothèque d'exercices personnalisée (incluant exercices de kiné),
séries manuelles, mode random, historique/streak, export/import JSON.

## Modèle de données

```
Exercise:  { id, nom, catégories: [string], durée_défaut, repos_défaut }
SérieItem: { exercise_id, durée: number|null, repos: number|null }   // null = hérite du défaut
Série:     { id, nom, items: [SérieItem] }
```

Random : non stocké comme série. Écran de lancement direct
`{ catégorie, nombre_exercices, durée_globale, repos_global }` → tirage à la volée.

## Règles de résolution (strictes)

- **Série manuelle** : durée effective = `item.durée ?? exercise.durée_défaut` (idem repos)
- **Série random** : TOUS les exercices utilisent `durée_globale` / `repos_global`.
  Les défauts de la bibliothèque sont ignorés dans ce mode.

## Écrans

1. Bibliothèque — CRUD exercices (nom, catégories multi-select, durée/repos par défaut)
2. Mes séries — liste + création (piocher dans la bibliothèque, override par item)
3. Lancer random — catégorie + nombre + durée + repos → génère et lance
4. Player — plein écran : nom, décompte, bip/vibration, enchaînement auto, pause/stop
5. Historique — jours de complétion + streak
6. Export/Import — JSON complet (bibliothèque + séries)

## Développement

Une étape à la fois. Un commit par changement fonctionnel.

- **Étape 1** : modèle de données + écran Bibliothèque (CRUD) + Player avec série codée en dur
- **Étape 2** : création de séries manuelles
- **Étape 3** : mode random
- **Étape 4** : historique / streak
- **Étape 5** : export / import
