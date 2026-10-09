# Exercises Planner

PWA 100% locale : toutes les données de l'utilisateur (exercices, séries, historique) vivent dans
IndexedDB sur son appareil. Il n'y a aucun serveur ni sauvegarde distante : **une donnée perdue
est définitivement perdue.**

## Règle absolue : aucun changement ne doit faire perdre les données de l'utilisateur

Chaque modification (feature, refactor, correctif) doit préserver les données déjà stockées sur
les appareils qui ont une version précédente de l'app. Concrètement :

- **Migrations IndexedDB additives uniquement** (`src/db/database.js`) : pour changer le schéma,
  incrémenter `DB_VERSION` et ajouter un bloc `if (oldVersion < N)` dans `upgrade`. Ne jamais
  supprimer, renommer ou recréer un store existant, ni changer son `keyPath`, ni changer
  `DB_NAME`. Si des données doivent être transformées, les migrer (lire → réécrire), pas les jeter.
- **Nouveaux champs optionnels** : un enregistrement créé par une ancienne version ne contient pas
  les nouveaux champs. Le code doit fonctionner avec leur absence (valeur par défaut), sans
  exiger une migration préalable.
- **Pas de renommage/suppression de champs existants** sans migration des enregistrements.
- **Export/Import rétrocompatible** (`src/db/backup.js`) : un fichier exporté par une version
  antérieure doit toujours s'importer. L'export doit inclure tout ce qui est stocké.
- **Opérations destructrices** (`clear()`, `delete`, import qui remplace tout) : uniquement sur
  action explicite de l'utilisateur, avec confirmation. Ne jamais en ajouter d'implicites (au
  démarrage, dans une migration, dans un correctif).
- **Intégrité référentielle** : on ne supprime pas un exercice utilisé dans une série
  (`deleteExercise` le bloque) — conserver ce garde-fou.
- **Vérifier avant de livrer** : tester qu'une base remplie avec la version précédente s'ouvre
  correctement avec le nouveau code et que ses données sont intactes (idéalement en exportant avant,
  en important/ouvrant après).

En cas de doute sur l'impact d'un changement sur les données existantes : s'arrêter et poser la
question plutôt que deviner.

## Workflow Git et déploiement

- **`main` = production.** Chaque push sur `main` déclenche le déploiement automatique sur GitHub
  Pages (`.github/workflows/deploy.yml`) : https://sawnd.github.io/exercises-planner/
- `main` est protégée : aucun push direct, on passe par une Pull Request.
- **Tout le travail se fait sur la branche `dev`** (ou une branche de feature dédiée), jamais
  directement sur `main`.
- Une fois une évolution prête : ouvrir une PR `dev` → `main`, puis **attendre la validation
  explicite de Stéphane avant de merger**. Ne jamais merger vers `main` de sa propre initiative.
- Un commit par changement fonctionnel.
- `vite.config.js` n'utilise `base: '/exercises-planner/'` que si `GITHUB_PAGES=true` (positionné
  par la CI) ; en local (`npm run dev`/`build`/`preview`), `base` reste `/`.
