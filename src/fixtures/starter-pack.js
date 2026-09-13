// Pack de démarrage — liste d'exercices fitness fournie par Stéphane, chargée
// à la demande depuis la Bibliothèque (bouton « Charger le pack fitness »).
// Chaque exercice : 30 s d'effort / 10 s de repos par défaut, tag « Corps entier ».

const NOMS_FITNESS = [
  'Jumping Jacks',
  'Levée de genou obliques',
  'Pompes',
  'Crunchs',
  'Levée de fessier',
  'Squats',
  'Levée de triceps',
  'Planche',
  'Course sur place genoux levés',
  'Fentes',
  'Pompes avec rotation',
  'Planche latérale',
];

export const FITNESS_STARTER_PACK = NOMS_FITNESS.map((nom) => ({
  nom,
  masterCategorie: 'fitness',
  categories: ['Corps entier'],
  dureeDefaut: 30,
  reposDefaut: 10,
}));
