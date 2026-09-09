// Série codée en dur — ÉTAPE 1 UNIQUEMENT.
// Sert à valider le moteur de timer avant de construire la couche « Mes séries ».
// À supprimer à l'étape 2.

export const DEMO_EXERCISES = [
  { id: 'demo-1', nom: 'Jumping Jacks', masterCategorie: 'fitness', categories: ['cardio'], dureeDefaut: 30, reposDefaut: 10 },
  { id: 'demo-2', nom: 'Squats',        masterCategorie: 'fitness', categories: ['jambes'], dureeDefaut: 40, reposDefaut: 15 },
  { id: 'demo-3', nom: 'Pompes',        masterCategorie: 'fitness', categories: ['haut du corps'], dureeDefaut: 30, reposDefaut: 10 },
  { id: 'demo-4', nom: 'Planche',       masterCategorie: 'fitness', categories: ['gainage'], dureeDefaut: 25, reposDefaut: 10 },
];

export const DEMO_SERIE = {
  id: 'demo-serie',
  nom: 'Démo — Étape 1',
  items: [
    { exercise_id: 'demo-1', duree: null, repos: null }, // hérite : 30 s / 10 s
    { exercise_id: 'demo-2', duree: 20,   repos: null }, // override durée : 20 s / 15 s
    { exercise_id: 'demo-3', duree: null, repos: 5    }, // override repos : 30 s / 5 s
    { exercise_id: 'demo-4', duree: null, repos: null }, // dernier : 25 s, pas de repos final
  ],
};
