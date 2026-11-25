import mongoose from 'mongoose';
import * as XLSX from 'xlsx';
import {
  WorkRequest,
  FileBlob,
  Counter,
  Settings,
  ReportSnapshot,
  STATUSES,
  FILE_CATEGORIES,
  type WorkRequestDoc,
  type FileCategory,
  type SettingsDoc,
} from './models.js';
import { seedRequests, DEFAULT_SETTINGS } from './seed.js';

/** Input to create or update a Work Request. */
export interface RequestInput {
  receivedDate?: string;
  subject?: string;
  department?: string;
  site?: string;
  description?: string;
  plannedDate?: string | null;
  completedDate?: string | null;
  operator?: string;
  status?: string;
  ocrText?: string;
}

/** A file upload encoded as base64. */
export interface FileUpload {
  name: string;
  mimeType: string;
  dataBase64: string;
  category: FileCategory;
}

/** Sub-folder name of each file category inside a request folder. */
export const CATEGORY_FOLDERS: Record<FileCategory, string> = {
  original: '01_Original',
  document: '02_Documents',
  photo: '03_Photos',
  raw: '04_Raw Data',
  processing: '05_Traitement',
  final: '06_Final Data',
};

/**
 * Folder name of a request, e.g. "SR-01-2026-Brega" (number + site).
 * Characters forbidden on Windows are removed.
 */
export function requestFolderName(number: string, site?: string): string {
  const clean = (site || '').replace(/[<>:"/\\|?*\x00-\x1F]/g, '').replace(/\s+/g, '_').trim();
  return clean ? `${number}-${clean}` : number;
}

/** Search filters for listing requests. */
export interface ListFilters {
  q?: string;
  status?: string;
  year?: string;
  late?: string;
}

const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Format a sequence + year into the official SR number, e.g. SR-01-2026. */
export function formatNumber(seq: number, year: number): string {
  return `SR-${String(seq).padStart(2, '0')}-${year}`;
}

/** Returns true when a request is overdue (planned date passed and not completed). */
export function isLate(r: Pick<WorkRequestDoc, 'plannedDate' | 'status'>, now = new Date()): boolean {
  if (!r.plannedDate) return false;
  if (r.status === 'Terminé' || r.status === 'Archivé') return false;
  return new Date(r.plannedDate) < startOfDay(now);
}

const toDate = (v?: string | null) => (v ? new Date(v) : v === null ? null : undefined);

/**
 * Work Request Manager service — all data access and business rules
 * (numbering, archiving, automation, reports, exports).
 */
export class WrmService {
  /** Connect to the built-in MongoDB and seed demo data when empty. */
  async init() {
    await mongoose.connect(process.env.MONGO_URL as string);
    if (!(await Settings.findById('main'))) await Settings.create({ _id: 'main', ...DEFAULT_SETTINGS });
    // backfill demo sites for previously seeded data
    for (const s of seedRequests()) {
      await WorkRequest.updateMany({ subject: s.input.subject, site: { $in: [null, ''] } }, { site: s.input.site });
    }
    if ((await WorkRequest.countDocuments()) === 0) {
      for (const s of seedRequests()) {
        const created = await this.createRequest(s.input, undefined, 'seed');
        if (s.status) await WorkRequest.updateOne({ _id: created._id }, { status: s.status });
      }
    }
    await this.runDailyAutomation();
  }

  /** Allocate the next SR number for the given year (atomic counter). */
  async allocateNumber(year: number) {
    const c = await Counter.findByIdAndUpdate(`sr-${year}`, { $inc: { value: 1 } }, { upsert: true, returnDocument: 'after' });
    return { seq: c.value as number, number: formatNumber(c.value as number, year) };
  }

  /** Preview the next number without consuming it. */
  async peekNextNumber(year = new Date().getFullYear()) {
    const c = await Counter.findById(`sr-${year}`);
    return formatNumber(((c?.value as number) || 0) + 1, year);
  }

  /** List requests with search/filters, newest first. */
  async listRequests(f: ListFilters = {}) {
    const query: Record<string, unknown> = {};
    if (f.q) {
      const rx = new RegExp(f.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ number: rx }, { subject: rx }, { department: rx }, { operator: rx }, { site: rx }];
    }
    if (f.status) query.status = f.status;
    if (f.year) query.year = Number(f.year);
    const docs = await WorkRequest.find(query, { ocrText: 0, history: 0 }).sort({ year: -1, seq: -1 }).lean();
    const list = docs.map((d: any) => ({ ...d, late: isLate(d) }));
    return f.late === 'true' ? list.filter((d) => d.late) : list;
  }

  /** Get a single request with full history. */
  async getRequest(id: string) {
    const d: any = await WorkRequest.findById(id).lean();
    return d ? { ...d, late: isLate(d) } : null;
  }

  /** Create a request: allocate number, store original scan in its archive folder. */
  async createRequest(input: RequestInput, original?: FileUpload, by = 'utilisateur') {
    const received = toDate(input.receivedDate) || new Date();
    const year = received.getFullYear();
    const { seq, number } = await this.allocateNumber(year);
    const doc = await WorkRequest.create({
      number,
      seq,
      year,
      receivedDate: received,
      subject: input.subject || '',
      department: input.department || '',
      site: input.site || '',
      description: input.description || '',
      plannedDate: toDate(input.plannedDate) || null,
      completedDate: toDate(input.completedDate) || null,
      operator: input.operator || '',
      status: STATUSES.includes(input.status as any) ? input.status : 'Reçu',
      ocrText: input.ocrText,
      files: [],
      history: [{ at: new Date(), action: 'Création', details: `Demande ${number} enregistrée`, by }],
    });
    if (original) await this.addFile(String(doc._id), { ...original, category: 'original' }, by);
    return (await WorkRequest.findById(doc._id).lean()) as any;
  }

  /** Update request fields, recording each change in history. */
  async updateRequest(id: string, input: RequestInput, by = 'utilisateur') {
    const doc: any = await WorkRequest.findById(id);
    if (!doc) return null;
    const changes: string[] = [];
    const fields: (keyof RequestInput)[] = [
      'subject', 'department', 'site', 'description', 'operator', 'status', 'receivedDate', 'plannedDate', 'completedDate',
    ];
    for (const k of fields) {
      if (input[k] === undefined) continue;
      const isDate = k.endsWith('Date');
      const next = isDate ? toDate(input[k] as string) : input[k];
      const prev = doc[k];
      const same = isDate
        ? (prev ? new Date(prev).toISOString().slice(0, 10) : '') === (next ? (next as Date).toISOString().slice(0, 10) : '')
        : prev === next;
      if (same) continue;
      if (k === 'status' && !STATUSES.includes(next as any)) continue;
      changes.push(`${k}: ${isDate ? fmt(prev) : prev || '—'} → ${isDate ? fmt(next as Date) : next || '—'}`);
      doc[k] = next;
    }
    if (input.status === 'Terminé' && !doc.completedDate) {
      doc.completedDate = new Date();
      changes.push('completedDate: auto');
    }
    if (changes.length) doc.history.push({ at: new Date(), action: 'Modification', details: changes.join(' ; '), by });
    await doc.save();
    return this.getRequest(id);
  }

  /** Delete a request and its file blobs. */
  async deleteRequest(id: string) {
    const doc: any = await WorkRequest.findById(id);
    if (!doc) return false;
    await FileBlob.deleteMany({ _id: { $in: doc.files.map((f: any) => f.blobId) } });
    await doc.deleteOne();
    return true;
  }

  /** Attach a file (versioned) to a request under Archives/<year>/<number>/<category>/. */
  async addFile(id: string, file: FileUpload, by = 'utilisateur') {
    const doc: any = await WorkRequest.findById(id);
    if (!doc) return null;
    const category = FILE_CATEGORIES.includes(file.category) ? file.category : 'document';
    const data = Buffer.from(file.dataBase64, 'base64');
    const blob = await FileBlob.create({ data, mimeType: file.mimeType, name: file.name });
    const prevVersions = doc.files.filter((f: any) => f.name === file.name && f.category === category).length;
    const version = prevVersions + 1;
    const folder = CATEGORY_FOLDERS[category as FileCategory];
    doc.files.push({
      name: file.name,
      mimeType: file.mimeType,
      size: data.length,
      category,
      archivePath: `${doc.year}/${requestFolderName(doc.number, doc.site)}/${folder}/${version > 1 ? `v${version}_` : ''}${file.name}`,
      blobId: blob._id,
      uploadedAt: new Date(),
      version,
    });
    doc.history.push({ at: new Date(), action: 'Fichier ajouté', details: `${folder} : ${file.name}${version > 1 ? ` (v${version})` : ''}`, by });
    await doc.save();
    return this.getRequest(id);
  }

  /** Remove a file from a request. */
  async removeFile(id: string, fileId: string, by = 'utilisateur') {
    const doc: any = await WorkRequest.findById(id);
    if (!doc) return null;
    const f = doc.files.id(fileId);
    if (!f) return this.getRequest(id);
    await FileBlob.deleteOne({ _id: f.blobId });
    doc.history.push({ at: new Date(), action: 'Fichier supprimé', details: f.name, by });
    f.deleteOne();
    await doc.save();
    return this.getRequest(id);
  }

  /** Read a stored file blob. */
  async getBlob(blobId: string) {
    return (await FileBlob.findById(blobId).lean()) as any;
  }

  /** Dashboard counters. */
  async dashboard() {
    const all: any[] = await WorkRequest.find({}, { status: 1, plannedDate: 1, receivedDate: 1 }).lean();
    const today = startOfDay();
    return {
      total: all.length,
      received: all.filter((r) => r.status === 'Reçu').length,
      inProgress: all.filter((r) => r.status === 'En cours').length,
      completed: all.filter((r) => r.status === 'Terminé').length,
      archived: all.filter((r) => r.status === 'Archivé').length,
      late: all.filter((r) => isLate(r)).length,
      receivedToday: all.filter((r) => startOfDay(new Date(r.receivedDate)).getTime() === today.getTime()).length,
    };
  }

  /** Report for a period: requests received and executed between from (inclusive) and to (exclusive). */
  async periodReport(from: Date, to: Date) {
    const received: any[] = await WorkRequest.find({ receivedDate: { $gte: from, $lt: to } }, { ocrText: 0, history: 0, files: 0 }).sort({ seq: 1 }).lean();
    const executed: any[] = await WorkRequest.find({ completedDate: { $gte: from, $lt: to } }, { ocrText: 0, history: 0, files: 0 }).sort({ seq: 1 }).lean();
    const late: any[] = (await WorkRequest.find({ status: { $in: ['Reçu', 'En cours'] } }, { ocrText: 0, history: 0, files: 0 }).lean()).filter((r: any) => isLate(r, to));
    const byOperator: Record<string, number> = {};
    executed.forEach((r) => (byOperator[r.operator || '—'] = (byOperator[r.operator || '—'] || 0) + 1));
    const byDepartment: Record<string, number> = {};
    received.forEach((r) => (byDepartment[r.department || '—'] = (byDepartment[r.department || '—'] || 0) + 1));
    return { from, to, received, executed, late, byOperator, byDepartment };
  }

  /** Monthly report (month is 1-12). */
  monthlyReport(year: number, month: number) {
    return this.periodReport(new Date(year, month - 1, 1), new Date(year, month, 1));
  }

  /** Daily report for a given day (YYYY-MM-DD). */
  dailyReport(day: string) {
    const d = new Date(`${day}T00:00:00`);
    return this.periodReport(d, new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
  }

  /**
   * Daily automation: auto-start planned requests, close completed ones,
   * archive old finished ones and snapshot the daily stats.
   */
  async runDailyAutomation() {
    const settings = await this.getSettings();
    const now = new Date();
    const today = startOfDay(now);
    const log: string[] = [];
    const docs: any[] = await WorkRequest.find({ status: { $ne: 'Archivé' } });
    for (const d of docs) {
      let changed = '';
      if (d.status === 'Reçu' && d.plannedDate && new Date(d.plannedDate) <= now) changed = 'En cours';
      else if (d.status !== 'Terminé' && d.completedDate && new Date(d.completedDate) <= now) changed = 'Terminé';
      else if (d.status === 'Terminé' && d.completedDate && (today.getTime() - new Date(d.completedDate).getTime()) / 864e5 > settings.autoArchiveDays) changed = 'Archivé';
      if (changed) {
        d.history.push({ at: now, action: 'Suivi automatique', details: `Statut : ${d.status} → ${changed}`, by: 'système' });
        d.status = changed;
        await d.save();
        log.push(`${d.number}: ${changed}`);
      }
    }
    const day = today.toISOString().slice(0, 10);
    await ReportSnapshot.updateOne({ day }, { day, generatedAt: now, stats: await this.dashboard() }, { upsert: true });
    await Settings.updateOne({ _id: 'main' }, { lastDailyRun: now });
    return { ranAt: now, updates: log };
  }

  /** Daily stats snapshots (latest first). */
  async snapshots(limit = 31) {
    return ReportSnapshot.find().sort({ day: -1 }).limit(limit).lean();
  }

  /** Rows used for Excel / CSV export. */
  async exportRows() {
    const docs: any[] = await WorkRequest.find({}, { ocrText: 0, history: 0 }).sort({ year: 1, seq: 1 }).lean();
    return docs.map((r) => ({
      'N° Request': r.number,
      'Date réception': fmt(r.receivedDate),
      Objet: r.subject,
      'Service demandeur': r.department,
      'Site / Lieu': r.site || '',
      Description: r.description,
      'Date prévue': fmt(r.plannedDate),
      'Date réalisation': fmt(r.completedDate),
      Opérateur: r.operator,
      Statut: r.status,
      'En retard': isLate(r) ? 'Oui' : 'Non',
      Fichiers: r.files.length,
      'Dossier archive': `${r.year}/${requestFolderName(r.number, r.site)}`,
    }));
  }

  /** Always-up-to-date Excel workbook: all requests + one sheet per year + stats. */
  async exportExcel(): Promise<Buffer> {
    const rows = await this.exportRows();
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [12, 14, 32, 22, 40, 12, 14, 16, 10, 10, 8, 28].map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(wb, ws, 'Demandes');
    const years = [...new Set(rows.map((r) => r['N° Request'].slice(-4)))];
    years.forEach((y) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.filter((r) => r['N° Request'].endsWith(y))), y));
    const stats = await this.dashboard();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        { Indicateur: 'Total', Valeur: stats.total },
        { Indicateur: 'Reçu', Valeur: stats.received },
        { Indicateur: 'En cours', Valeur: stats.inProgress },
        { Indicateur: 'Terminé', Valeur: stats.completed },
        { Indicateur: 'Archivé', Valeur: stats.archived },
        { Indicateur: 'En retard', Valeur: stats.late },
        { Indicateur: 'Mis à jour le', Valeur: new Date().toLocaleString('fr-FR') },
      ]),
      'Statistiques'
    );
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  /** CSV export (UTF-8 with BOM, semicolon separated for Excel FR). */
  async exportCsv(): Promise<string> {
    const ws = XLSX.utils.json_to_sheet(await this.exportRows());
    return '\uFEFF' + XLSX.utils.sheet_to_csv(ws, { FS: ';' });
  }

  /** Full backup (database + files) as JSON. */
  async backup() {
    return {
      app: 'Survey Group WRM',
      version: 1,
      createdAt: new Date(),
      settings: await Settings.findById('main').lean(),
      counters: await Counter.find().lean(),
      requests: await WorkRequest.find().lean(),
      files: (await FileBlob.find().lean()).map((b: any) => ({ _id: b._id, name: b.name, mimeType: b.mimeType, data: b.data.toString('base64') })),
    };
  }

  /** Restore a full backup (replaces all data). */
  async restore(data: any) {
    if (!data || !Array.isArray(data.requests)) throw new Error('Fichier de sauvegarde invalide');
    await Promise.all([WorkRequest.deleteMany({}), FileBlob.deleteMany({}), Counter.deleteMany({})]);
    if (data.counters?.length) await Counter.insertMany(data.counters);
    if (data.requests.length) await WorkRequest.insertMany(data.requests);
    if (data.files?.length) await FileBlob.insertMany(data.files.map((f: any) => ({ ...f, data: Buffer.from(f.data, 'base64') })));
    if (data.settings) await Settings.replaceOne({ _id: 'main' }, data.settings, { upsert: true });
    return { restored: data.requests.length };
  }

  /** Read settings. */
  async getSettings(): Promise<SettingsDoc> {
    return ((await Settings.findById('main').lean()) as any) || { _id: 'main', ...DEFAULT_SETTINGS };
  }

  /** Update settings. */
  async updateSettings(input: Partial<SettingsDoc>) {
    const { _id, lastDailyRun, ...rest } = input as any;
    await Settings.updateOne({ _id: 'main' }, rest, { upsert: true });
    return this.getSettings();
  }

  /** Create a new instance of the service. */
  static from() {
    return new WrmService();
  }
}

function fmt(d?: Date | string | null) {
  return d ? new Date(d).toLocaleDateString('fr-FR') : '';
}
