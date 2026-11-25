import type { RequestInput } from './wrm-service.js';

/** Default application settings. */
export const DEFAULT_SETTINGS = {
  language: 'fr',
  ocrLanguage: 'fra+eng+ara',
  operators: ['Fathi Nasraoui', 'Karim Ben Ali', 'Sami Trabelsi', 'Youssef Haddad'],
  departments: ['Génie Civil', 'Maintenance', 'Production', 'HSE', 'Projets', 'Pipeline'],
  autoArchiveDays: 30,
  rootFolder: 'D:\\SurveyGroup\\Work Requests',
};

const iso = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

/** Demo Work Requests inserted when the database is empty. */
export function seedRequests(): { input: RequestInput; status?: string }[] {
  return [
    { input: { receivedDate: iso(-20), subject: 'Levé topographique zone stockage', department: 'Génie Civil', site: 'Brega', description: 'Levé complet de la zone de stockage nord pour extension de dalle.', plannedDate: iso(-12), completedDate: iso(-10), operator: 'Fathi Nasraoui' }, status: 'Terminé' },
    { input: { receivedDate: iso(-14), subject: 'Implantation fondations pompe P-204', department: 'Maintenance', site: 'Ras Lanuf', description: 'Implantation des axes et niveaux des fondations de la pompe P-204.', plannedDate: iso(-6), operator: 'Karim Ben Ali' }, status: 'En cours' },
    { input: { receivedDate: iso(-8), subject: 'Contrôle verticalité cheminée C-1', department: 'HSE', site: 'Brega', description: 'Mesure de la verticalité et rapport de déformation.', plannedDate: iso(2), operator: 'Sami Trabelsi' }, status: 'En cours' },
    { input: { receivedDate: iso(-3), subject: 'Profil en long tracé pipeline 12"', department: 'Pipeline', site: 'Zueitina', description: 'Profil en long et sections transversales sur 2,4 km.', plannedDate: iso(7), operator: 'Youssef Haddad' } },
    { input: { receivedDate: iso(-1), subject: 'Récolement réseau assainissement', department: 'Projets', site: 'Brega', description: 'Récolement des regards et canalisations du lot B.', plannedDate: iso(10), operator: '' } },
  ];
}
