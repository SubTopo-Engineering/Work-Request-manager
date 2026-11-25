/** Lifecycle status of a Work Request. */
export type RequestStatus = 'Reçu' | 'En cours' | 'Terminé' | 'Archivé';

/** All statuses in display order. */
export const STATUSES: RequestStatus[] = ['Reçu', 'En cours', 'Terminé', 'Archivé'];

/** Category of an attached file. */
export type FileCategory = 'original' | 'document' | 'photo' | 'raw' | 'processing' | 'final';

/** Human labels of file categories. */
export const CATEGORY_LABELS: Record<FileCategory, string> = {
  original: 'Document original',
  document: 'Documents',
  photo: 'Photos',
  raw: 'Raw Data',
  processing: 'Données de traitement',
  final: 'Final Data',
};

/** Metadata of an attached file. */
export interface FileMeta {
  _id: string;
  name: string;
  mimeType: string;
  size: number;
  category: FileCategory;
  archivePath: string;
  blobId: string;
  uploadedAt: string;
  version: number;
}

/** History entry of a request. */
export interface HistoryEntry {
  at: string;
  action: string;
  details?: string;
  by?: string;
}

/** A Work Request. */
export interface WorkRequest {
  _id: string;
  number: string;
  year: number;
  receivedDate: string;
  subject: string;
  department: string;
  site?: string;
  description: string;
  plannedDate?: string | null;
  completedDate?: string | null;
  operator: string;
  status: RequestStatus;
  ocrText?: string;
  createdAt?: string;
  updatedAt?: string;
  files: FileMeta[];
  history?: HistoryEntry[];
  late?: boolean;
}

/** Editable fields of a request. */
export interface RequestForm {
  receivedDate: string;
  subject: string;
  department: string;
  site: string;
  description: string;
  plannedDate: string;
  completedDate: string;
  operator: string;
  status: RequestStatus;
}

/** Dashboard counters. */
export interface DashboardStats {
  total: number;
  received: number;
  inProgress: number;
  completed: number;
  archived: number;
  late: number;
  receivedToday: number;
}

/** A period report. */
export interface PeriodReport {
  from: string;
  to: string;
  received: WorkRequest[];
  executed: WorkRequest[];
  late: WorkRequest[];
  byOperator: Record<string, number>;
  byDepartment: Record<string, number>;
}

/** Application settings. */
export interface AppSettings {
  language: string;
  ocrLanguage: string;
  operators: string[];
  departments: string[];
  autoArchiveDays: number;
  rootFolder?: string;
  lastDailyRun?: string;
}
