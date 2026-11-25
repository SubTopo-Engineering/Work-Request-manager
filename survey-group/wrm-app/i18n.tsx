import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

/** Supported interface languages. */
export type Lang = 'fr' | 'en' | 'ar';

/** Languages with their native label. */
export const LANGS: { code: Lang; label: string }[] = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
];

const fr = {
  appSub: 'Work Request Manager · gestionnaire de demandes de travaux',
  headerTitle: 'Réception, suivi et exécution des demandes',
  headerBy: 'Développé par Fathi Nasraoui — Chief Survey Engineer',
  navHome: 'Accueil', navNew: 'Nouvelle demande', navArchive: 'Archive', navReports: 'Rapports', navExport: 'Export', navBackup: 'Sauvegarde', navSettings: 'Paramètres',
  homeSub: 'Survey Group — gestion des demandes de travaux',
  tileNew: 'Importer une demande et remplir automatiquement les informations (OCR)',
  tileArchive: 'Rechercher, consulter et modifier les demandes',
  tileReports: 'Rapport journalier et mensuel des demandes reçues et exécutées',
  tileSettings: 'Langue, opérateurs, services, dossier d’archives et OCR',
  tileExport: 'Tableau Excel des demandes, actualisé automatiquement',
  tileBackup: 'Sauvegarder et restaurer la base de données et les fichiers',
  exportTile: 'Export Excel / CSV',
  flowTitle: 'Flux de traitement',
  flow: ['1. Importer le Request', '2. Extraire le texte / OCR', '3. Vérifier les champs', '4. Enregistrer et archiver', '5. Suivre les fichiers et statuts', '6. Générer les rapports'],
  footnote: 'Données stockées dans la base locale · suivi automatique quotidien activé',
  statTotal: 'Demandes reçues (total)', statNew: 'Nouvelles (Reçu)', statProgress: 'En cours', statDone: 'Terminées', statLate: 'En retard', statArchived: 'Archivées',
  'Reçu': 'Reçu', 'En cours': 'En cours', 'Terminé': 'Terminé', 'Archivé': 'Archivé', late: 'En retard',
  fSubject: 'Objet de la demande *', fDepartment: 'Service demandeur', fSite: 'Site / Lieu (nom du dossier)', fOperator: 'Opérateur responsable', fReceived: 'Date de réception', fPlanned: 'Date prévue', fCompleted: 'Date de réalisation', fStatus: 'Statut', fDescription: 'Description des travaux',
  nextNumber: 'Prochain numéro attribué', step1: '1. Importer le document scanné (PDF ou image)', step2: '2. Vérifier les champs', drop: 'Glisser-déposer ou cliquer pour choisir le Work Request scanné',
  ocrPrep: 'Préparation…', ocrDone: 'Extraction terminée — {n} champ(s) rempli(s). Vérifiez les champs surlignés.', ocrFail: 'OCR impossible : {e}. Vous pouvez saisir les champs manuellement.', ocrText: 'Texte extrait (OCR)',
  reset: 'Réinitialiser', saveArchive: 'Enregistrer et archiver', saving: 'Enregistrement…', subjectRequired: 'L’objet de la demande est obligatoire.',
  requests: 'demande(s)', searchPh: 'Rechercher par N° (SR-01-2026), objet, site, service, opérateur…', allStatuses: 'Tous les statuts', allYears: 'Toutes les années', search: 'Rechercher', loading: 'Chargement…', noResults: 'Aucune demande trouvée.',
  colNumber: 'N° Request', colReceived: 'Réception', colSubject: 'Objet', colSite: 'Site', colDept: 'Service', colPlanned: 'Prévue', colDone: 'Réalisée', colOperator: 'Opérateur', colStatus: 'Statut', colFiles: 'Fichiers',
  created: 'Demande enregistrée et document original archivé.', saved: 'Modifications enregistrées.', filesAdded: '{n} fichier(s) ajouté(s) à {c}.', confirmDelete: 'Supprimer définitivement {n} ?', confirmDeleteFile: 'Supprimer {n} ?',
  print: 'Imprimer la fiche', delete: 'Supprimer', info: 'Informations de la demande', folder: 'Dossier', back: '← Archive', saveChanges: 'Enregistrer les modifications',
  filesTitle: 'Documents, photos et données topographiques', import: '+ Importer', noFile: 'Aucun fichier', history: 'Historique complet',
  catoriginal: 'Document original', catdocument: 'Documents', catphoto: 'Photos', catraw: 'Raw Data', catprocessing: 'Données de traitement', catfinal: 'Final Data',
  monthly: 'Rapport mensuel', daily: 'Rapport journalier', mMonthly: 'Mensuel', mDaily: 'Journalier', runDaily: 'Lancer le suivi quotidien', printPdf: 'Imprimer / PDF',
  autoChanges: 'Suivi automatique : {l}', autoNone: 'Suivi automatique exécuté — aucun changement de statut.',
  rReceived: 'Demandes reçues', rExecuted: 'Demandes exécutées', rLate: 'En retard (fin de période)', rByDept: 'Reçues par service', rByOp: 'Exécutées par opérateur', rLateList: 'Demandes en retard', noData: 'Aucune donnée', noRequest: 'Aucune demande',
  months: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
  exportSub: 'Tableau des demandes généré à partir de la base, toujours à jour', dlExcel: 'Télécharger Excel (.xlsx)', dlExcelDesc: 'Feuille « Demandes », une feuille par année et une feuille « Statistiques ». Régénéré à chaque téléchargement.', dlCsv: 'Télécharger CSV', dlCsvDesc: 'Format CSV (séparateur « ; », UTF-8) compatible Excel.',
  backupSub: 'Base de données et fichiers archivés', backupCreate: 'Créer une sauvegarde complète', backupCreateDesc: 'Toutes les demandes, l’historique, les paramètres et les fichiers dans un seul fichier.', restore: 'Restaurer une sauvegarde', restoreDesc: 'Recharger un fichier de sauvegarde (.json) créé par l’application.', restoreConfirm: 'La restauration remplace toutes les données actuelles. Continuer ?', restored: '{n} demande(s) restaurée(s).',
  autoBackup: 'Sauvegarde automatique', autoBackupDesc: 'Chaque modification est enregistrée immédiatement dans la base de données et, si un dossier local est connecté, copiée sur le disque (D:\\ ou C:\\).',
  settingsSub: 'Langue, opérateurs, dossier d’archives et OCR', save: 'Enregistrer', settingsSaved: 'Paramètres enregistrés.', uiLang: 'Langue de l’interface', ocrLang: 'Langue(s) OCR', autoArchive: 'Archivage auto. après (jours, statut Terminé)', ocrState: 'État de l’OCR', ocrReady: 'Moteur Tesseract intégré (FR / EN / AR) · dernier suivi auto', operators: 'Opérateurs', departments: 'Services demandeurs', add: 'Ajouter', addPh: 'Ajouter…',
  localTitle: 'Dossier d’archives sur le disque (D:\\ ou C:\\)', localDesc: 'Choisissez un dossier sur votre PC (ex. D:\\SurveyGroup\\Work Requests). Chaque demande y est enregistrée dans : <année>\\SR-01-2026-Brega\\ avec les sous-dossiers 01_Original, 02_Documents, 03_Photos, 04_Raw Data, 05_Traitement, 06_Final Data et la fiche de la demande.',
  localPick: 'Choisir le dossier…', localConnected: 'Dossier connecté', localNone: 'Aucun dossier connecté', localSyncAll: 'Synchroniser toutes les demandes', localSyncOne: 'Enregistrer dans le dossier local', localSynced: '{n} fichier(s) écrit(s) dans {p}', localUnsupported: 'Utilisez Microsoft Edge ou Google Chrome sous Windows pour écrire directement sur le disque.', localReconnect: 'Autoriser l’accès au dossier',
  rootLabel: 'Chemin indicatif du dossier racine',
  navTracking: 'Suivi', tileTracking: 'Tableau de suivi de toutes les demandes : statut, délais, avancement',
  trackTitle: 'Tableau de suivi des demandes', trackSub: 'Toutes les demandes · mise à jour en temps réel',
  trackAll: 'Toutes', trackOpen: 'Ouvertes', trackDueSoon: 'Échéance ≤ 3 j',
  colProgress: 'Avancement', colDelay: 'Délai', colDays: 'Jours écoulés', colLastUpdate: 'Dernière MAJ', colActions: 'Actions',
  daysLeft: '{n} j restants', daysLate: '{n} j de retard', dueToday: 'Aujourd’hui', doneOn: 'Réalisé', noPlanned: 'Non planifié',
  open: 'Ouvrir', start: 'Démarrer', finish: 'Terminer', archiveAction: 'Archiver', printTracking: 'Imprimer le tableau',
  legend: 'Légende', onTime: 'Dans les délais', dueSoon: 'Échéance proche', overdue: 'En retard',
};

type Dict = typeof fr;

const en: Dict = {
  ...fr,
  appSub: 'Work Request Manager',
  headerTitle: 'Receiving, tracking and execution of requests',
  headerBy: 'Developed by Fathi Nasraoui — Chief Survey Engineer',
  navHome: 'Home', navNew: 'New request', navArchive: 'Archive', navReports: 'Reports', navExport: 'Export', navBackup: 'Backup', navSettings: 'Settings',
  homeSub: 'Survey Group — work request management',
  tileNew: 'Import a request and fill in the information automatically (OCR)', tileArchive: 'Search, view and edit requests', tileReports: 'Daily and monthly report of received and executed requests', tileSettings: 'Language, operators, departments, archive folder and OCR', tileExport: 'Excel sheet of requests, updated automatically', tileBackup: 'Back up and restore the database and files', exportTile: 'Excel / CSV export',
  flowTitle: 'Processing flow', flow: ['1. Import the Request', '2. Extract text / OCR', '3. Check the fields', '4. Save and archive', '5. Track files and statuses', '6. Generate reports'],
  footnote: 'Data stored in the local database · daily automatic follow-up enabled',
  statTotal: 'Requests received (total)', statNew: 'New (Received)', statProgress: 'In progress', statDone: 'Completed', statLate: 'Overdue', statArchived: 'Archived',
  'Reçu': 'Received', 'En cours': 'In progress', 'Terminé': 'Completed', 'Archivé': 'Archived', late: 'Overdue',
  fSubject: 'Request subject *', fDepartment: 'Requesting department', fSite: 'Site / Location (folder name)', fOperator: 'Responsible operator', fReceived: 'Received date', fPlanned: 'Planned date', fCompleted: 'Completion date', fStatus: 'Status', fDescription: 'Work description',
  nextNumber: 'Next number assigned', step1: '1. Import the scanned document (PDF or image)', step2: '2. Check the fields', drop: 'Drag & drop or click to choose the scanned Work Request',
  ocrPrep: 'Preparing…', ocrDone: 'Extraction finished — {n} field(s) filled. Check the highlighted fields.', ocrFail: 'OCR failed: {e}. You can fill in the fields manually.', ocrText: 'Extracted text (OCR)',
  reset: 'Reset', saveArchive: 'Save and archive', saving: 'Saving…', subjectRequired: 'The request subject is required.',
  requests: 'request(s)', searchPh: 'Search by No. (SR-01-2026), subject, site, department, operator…', allStatuses: 'All statuses', allYears: 'All years', search: 'Search', loading: 'Loading…', noResults: 'No request found.',
  colNumber: 'Request No.', colReceived: 'Received', colSubject: 'Subject', colSite: 'Site', colDept: 'Department', colPlanned: 'Planned', colDone: 'Completed', colOperator: 'Operator', colStatus: 'Status', colFiles: 'Files',
  created: 'Request saved and original document archived.', saved: 'Changes saved.', filesAdded: '{n} file(s) added to {c}.', confirmDelete: 'Permanently delete {n}?', confirmDeleteFile: 'Delete {n}?',
  print: 'Print sheet', delete: 'Delete', info: 'Request information', folder: 'Folder', back: '← Archive', saveChanges: 'Save changes',
  filesTitle: 'Documents, photos and survey data', import: '+ Import', noFile: 'No file', history: 'Full history',
  catoriginal: 'Original document', catdocument: 'Documents', catphoto: 'Photos', catraw: 'Raw Data', catprocessing: 'Processing data', catfinal: 'Final Data',
  monthly: 'Monthly report', daily: 'Daily report', mMonthly: 'Monthly', mDaily: 'Daily', runDaily: 'Run daily follow-up', printPdf: 'Print / PDF',
  autoChanges: 'Automatic follow-up: {l}', autoNone: 'Automatic follow-up done — no status change.',
  rReceived: 'Requests received', rExecuted: 'Requests executed', rLate: 'Overdue (end of period)', rByDept: 'Received by department', rByOp: 'Executed by operator', rLateList: 'Overdue requests', noData: 'No data', noRequest: 'No request',
  months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  exportSub: 'Request table generated from the database, always up to date', dlExcel: 'Download Excel (.xlsx)', dlExcelDesc: '“Demandes” sheet, one sheet per year and a “Statistics” sheet. Regenerated on every download.', dlCsv: 'Download CSV', dlCsvDesc: 'CSV format (“;” separator, UTF-8), Excel compatible.',
  backupSub: 'Database and archived files', backupCreate: 'Create a full backup', backupCreateDesc: 'All requests, history, settings and files in a single file.', restore: 'Restore a backup', restoreDesc: 'Reload a backup file (.json) created by the application.', restoreConfirm: 'Restoring replaces all current data. Continue?', restored: '{n} request(s) restored.',
  autoBackup: 'Automatic backup', autoBackupDesc: 'Every change is saved immediately in the database and, when a local folder is connected, copied to disk (D:\\ or C:\\).',
  settingsSub: 'Language, operators, archive folder and OCR', save: 'Save', settingsSaved: 'Settings saved.', uiLang: 'Interface language', ocrLang: 'OCR language(s)', autoArchive: 'Auto-archive after (days, Completed status)', ocrState: 'OCR status', ocrReady: 'Built-in Tesseract engine (FR / EN / AR) · last auto run', operators: 'Operators', departments: 'Requesting departments', add: 'Add', addPh: 'Add…',
  localTitle: 'Archive folder on disk (D:\\ or C:\\)', localDesc: 'Choose a folder on your PC (e.g. D:\\SurveyGroup\\Work Requests). Each request is saved in: <year>\\SR-01-2026-Brega\\ with sub-folders 01_Original, 02_Documents, 03_Photos, 04_Raw Data, 05_Traitement, 06_Final Data and the request sheet.',
  localPick: 'Choose folder…', localConnected: 'Folder connected', localNone: 'No folder connected', localSyncAll: 'Sync all requests', localSyncOne: 'Save to local folder', localSynced: '{n} file(s) written to {p}', localUnsupported: 'Use Microsoft Edge or Google Chrome on Windows to write directly to disk.', localReconnect: 'Allow folder access',
  rootLabel: 'Root folder path (reference)',
  navTracking: 'Tracking', tileTracking: 'Tracking board of all requests: status, deadlines, progress',
  trackTitle: 'Request tracking board', trackSub: 'All requests · live update',
  trackAll: 'All', trackOpen: 'Open', trackDueSoon: 'Due ≤ 3 d',
  colProgress: 'Progress', colDelay: 'Deadline', colDays: 'Days elapsed', colLastUpdate: 'Last update', colActions: 'Actions',
  daysLeft: '{n} d left', daysLate: '{n} d overdue', dueToday: 'Today', doneOn: 'Done', noPlanned: 'Not planned',
  open: 'Open', start: 'Start', finish: 'Complete', archiveAction: 'Archive', printTracking: 'Print board',
  legend: 'Legend', onTime: 'On time', dueSoon: 'Due soon', overdue: 'Overdue',
};

const ar: Dict = {
  ...fr,
  appSub: 'نظام إدارة طلبات العمل',
  headerTitle: 'استلام ومتابعة وتنفيذ الطلبات',
  headerBy: 'تطوير فتحي النصراوي — كبير مهندسي المساحة',
  navHome: 'الرئيسية', navNew: 'طلب جديد', navArchive: 'الأرشيف', navReports: 'التقارير', navExport: 'تصدير', navBackup: 'النسخ الاحتياطي', navSettings: 'الإعدادات',
  homeSub: 'مجموعة المساحة — إدارة طلبات العمل',
  tileNew: 'استيراد طلب وتعبئة البيانات تلقائياً (OCR)', tileArchive: 'البحث عن الطلبات وعرضها وتعديلها', tileReports: 'تقرير يومي وشهري للطلبات المستلمة والمنفذة', tileSettings: 'اللغة، المشغلون، الأقسام، مجلد الأرشيف و OCR', tileExport: 'جدول Excel للطلبات يُحدَّث تلقائياً', tileBackup: 'حفظ واستعادة قاعدة البيانات والملفات', exportTile: 'تصدير Excel / CSV',
  flowTitle: 'مسار المعالجة', flow: ['1. استيراد الطلب', '2. استخراج النص / OCR', '3. التحقق من الحقول', '4. الحفظ والأرشفة', '5. متابعة الملفات والحالات', '6. إنشاء التقارير'],
  footnote: 'البيانات محفوظة في قاعدة البيانات المحلية · المتابعة اليومية التلقائية مفعّلة',
  statTotal: 'إجمالي الطلبات المستلمة', statNew: 'جديدة (مستلم)', statProgress: 'قيد التنفيذ', statDone: 'منجزة', statLate: 'متأخرة', statArchived: 'مؤرشفة',
  'Reçu': 'مستلم', 'En cours': 'قيد التنفيذ', 'Terminé': 'منجز', 'Archivé': 'مؤرشف', late: 'متأخر',
  fSubject: 'موضوع الطلب *', fDepartment: 'القسم الطالب', fSite: 'الموقع (اسم المجلد)', fOperator: 'المشغل المسؤول', fReceived: 'تاريخ الاستلام', fPlanned: 'التاريخ المخطط', fCompleted: 'تاريخ الإنجاز', fStatus: 'الحالة', fDescription: 'وصف الأعمال',
  nextNumber: 'الرقم التالي', step1: '1. استيراد المستند الممسوح (PDF أو صورة)', step2: '2. التحقق من الحقول', drop: 'اسحب وأفلت أو انقر لاختيار طلب العمل الممسوح',
  ocrPrep: 'جارٍ التحضير…', ocrDone: 'اكتمل الاستخراج — تمت تعبئة {n} حقل. تحقق من الحقول المظللة.', ocrFail: 'تعذّر OCR: {e}. يمكنك إدخال الحقول يدوياً.', ocrText: 'النص المستخرج (OCR)',
  reset: 'إعادة تعيين', saveArchive: 'حفظ وأرشفة', saving: 'جارٍ الحفظ…', subjectRequired: 'موضوع الطلب إلزامي.',
  requests: 'طلب', searchPh: 'ابحث برقم الطلب (SR-01-2026)، الموضوع، الموقع، القسم، المشغل…', allStatuses: 'كل الحالات', allYears: 'كل السنوات', search: 'بحث', loading: 'جارٍ التحميل…', noResults: 'لا توجد طلبات.',
  colNumber: 'رقم الطلب', colReceived: 'الاستلام', colSubject: 'الموضوع', colSite: 'الموقع', colDept: 'القسم', colPlanned: 'المخطط', colDone: 'المنجز', colOperator: 'المشغل', colStatus: 'الحالة', colFiles: 'الملفات',
  created: 'تم حفظ الطلب وأرشفة المستند الأصلي.', saved: 'تم حفظ التعديلات.', filesAdded: 'تمت إضافة {n} ملف إلى {c}.', confirmDelete: 'حذف {n} نهائياً؟', confirmDeleteFile: 'حذف {n}؟',
  print: 'طباعة البطاقة', delete: 'حذف', info: 'بيانات الطلب', folder: 'المجلد', back: 'الأرشيف →', saveChanges: 'حفظ التعديلات',
  filesTitle: 'المستندات والصور والبيانات المساحية', import: '+ استيراد', noFile: 'لا يوجد ملف', history: 'السجل الكامل',
  catoriginal: 'المستند الأصلي', catdocument: 'المستندات', catphoto: 'الصور', catraw: 'البيانات الخام', catprocessing: 'بيانات المعالجة', catfinal: 'البيانات النهائية',
  monthly: 'التقرير الشهري', daily: 'التقرير اليومي', mMonthly: 'شهري', mDaily: 'يومي', runDaily: 'تشغيل المتابعة اليومية', printPdf: 'طباعة / PDF',
  autoChanges: 'المتابعة التلقائية: {l}', autoNone: 'تمت المتابعة التلقائية — لا تغيير في الحالات.',
  rReceived: 'الطلبات المستلمة', rExecuted: 'الطلبات المنفذة', rLate: 'المتأخرة (نهاية الفترة)', rByDept: 'المستلمة حسب القسم', rByOp: 'المنفذة حسب المشغل', rLateList: 'الطلبات المتأخرة', noData: 'لا توجد بيانات', noRequest: 'لا توجد طلبات',
  months: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  exportSub: 'جدول الطلبات من قاعدة البيانات، محدَّث دائماً', dlExcel: 'تنزيل Excel (.xlsx)', dlExcelDesc: 'ورقة الطلبات، ورقة لكل سنة وورقة إحصائيات. يُعاد إنشاؤه عند كل تنزيل.', dlCsv: 'تنزيل CSV', dlCsvDesc: 'صيغة CSV (فاصل «;»، UTF-8) متوافقة مع Excel.',
  backupSub: 'قاعدة البيانات والملفات المؤرشفة', backupCreate: 'إنشاء نسخة احتياطية كاملة', backupCreateDesc: 'جميع الطلبات والسجل والإعدادات والملفات في ملف واحد.', restore: 'استعادة نسخة احتياطية', restoreDesc: 'إعادة تحميل ملف نسخة احتياطية (.json).', restoreConfirm: 'الاستعادة تستبدل جميع البيانات الحالية. متابعة؟', restored: 'تمت استعادة {n} طلب.',
  autoBackup: 'الحفظ التلقائي', autoBackupDesc: 'يُحفظ كل تعديل فوراً في قاعدة البيانات، ويُنسخ إلى القرص (D:\\ أو C:\\) عند ربط مجلد محلي.',
  settingsSub: 'اللغة والمشغلون ومجلد الأرشيف و OCR', save: 'حفظ', settingsSaved: 'تم حفظ الإعدادات.', uiLang: 'لغة الواجهة', ocrLang: 'لغة/لغات OCR', autoArchive: 'الأرشفة التلقائية بعد (أيام، حالة منجز)', ocrState: 'حالة OCR', ocrReady: 'محرك Tesseract مدمج (FR / EN / AR) · آخر متابعة', operators: 'المشغلون', departments: 'الأقسام الطالبة', add: 'إضافة', addPh: 'إضافة…',
  localTitle: 'مجلد الأرشيف على القرص (D:\\ أو C:\\)', localDesc: 'اختر مجلداً على جهازك (مثال D:\\SurveyGroup\\Work Requests). يُحفظ كل طلب في: <السنة>\\SR-01-2026-Brega\\ مع المجلدات الفرعية 01_Original و 02_Documents و 03_Photos و 04_Raw Data و 05_Traitement و 06_Final Data وبطاقة الطلب.',
  localPick: 'اختيار المجلد…', localConnected: 'المجلد متصل', localNone: 'لا يوجد مجلد متصل', localSyncAll: 'مزامنة جميع الطلبات', localSyncOne: 'حفظ في المجلد المحلي', localSynced: 'تمت كتابة {n} ملف في {p}', localUnsupported: 'استخدم Microsoft Edge أو Google Chrome على Windows للكتابة مباشرة على القرص.', localReconnect: 'السماح بالوصول إلى المجلد',
  rootLabel: 'مسار المجلد الرئيسي (مرجعي)',
  navTracking: 'المتابعة', tileTracking: 'لوحة متابعة جميع الطلبات: الحالة، المواعيد، نسبة الإنجاز',
  trackTitle: 'لوحة متابعة الطلبات', trackSub: 'جميع الطلبات · تحديث مباشر',
  trackAll: 'الكل', trackOpen: 'المفتوحة', trackDueSoon: 'الاستحقاق ≤ 3 أيام',
  colProgress: 'الإنجاز', colDelay: 'المهلة', colDays: 'الأيام المنقضية', colLastUpdate: 'آخر تحديث', colActions: 'إجراءات',
  daysLeft: 'متبقي {n} يوم', daysLate: 'متأخر {n} يوم', dueToday: 'اليوم', doneOn: 'منجز', noPlanned: 'غير مخطط',
  open: 'فتح', start: 'بدء', finish: 'إنهاء', archiveAction: 'أرشفة', printTracking: 'طباعة اللوحة',
  legend: 'دليل الألوان', onTime: 'ضمن المهلة', dueSoon: 'الاستحقاق قريب', overdue: 'متأخر',
};

/** Translation key. */
export type TKey = { [K in keyof Dict]: Dict[K] extends string ? K : never }[keyof Dict];

const DICTS: Record<Lang, Dict> = { fr, en, ar };

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TKey | string, vars?: Record<string, string | number>) => string;
  d: Dict;
  locale: string;
}

const Ctx = createContext<I18nCtx | null>(null);

const STORAGE_KEY = 'wrm-lang';

/** Provides the current language, translation function and RTL direction. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return v === 'en' || v === 'ar' ? v : 'fr';
  });
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);
  const setLang = (l: Lang) => {
    localStorage.setItem(STORAGE_KEY, l);
    setLangState(l);
  };
  const d = DICTS[lang];
  const t = (key: string, vars?: Record<string, string | number>) => {
    let s = ((d as any)[key] as string) ?? key;
    if (vars) Object.entries(vars).forEach(([k, v]) => (s = s.replace(`{${k}}`, String(v))));
    return s;
  };
  const locale = lang === 'ar' ? 'ar-LY' : lang === 'en' ? 'en-GB' : 'fr-FR';
  return <Ctx.Provider value={{ lang, setLang, t, d, locale }}>{children}</Ctx.Provider>;
}

/** Access translations. Falls back to French outside a provider. */
export function useI18n(): I18nCtx {
  const c = useContext(Ctx);
  if (c) return c;
  return { lang: 'fr', setLang: () => {}, t: (k) => ((fr as any)[k] as string) ?? k, d: fr, locale: 'fr-FR' };
}
