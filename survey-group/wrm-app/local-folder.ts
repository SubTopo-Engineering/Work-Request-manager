import { api, fileUrl } from './api.js';
import type { WorkRequest } from './types.js';

/** Sub-folders created inside every request folder. */
export const SUB_FOLDERS: Record<string, string> = {
  original: '01_Original',
  document: '02_Documents',
  photo: '03_Photos',
  raw: '04_Raw Data',
  processing: '05_Traitement',
  final: '06_Final Data',
};

/** Folder name of a request, e.g. "SR-01-2026-Brega". */
export function requestFolderName(number: string, site?: string): string {
  const clean = (site || '').replace(/[<>:"/\\|?*\x00-\x1F]/g, '').replace(/\s+/g, '_').trim();
  return clean ? `${number}-${clean}` : number;
}

/** True when the browser can write to a local folder (Edge / Chrome). */
export const isLocalFolderSupported = () => typeof window !== 'undefined' && 'showDirectoryPicker' in window;

const DB = 'wrm-local';
const STORE = 'handles';

function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
    };
  });
}

/** Get the saved root folder handle (if any). */
export async function getRootHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    return (await idb<FileSystemDirectoryHandle | undefined>('readonly', (s) => s.get('root'))) || null;
  } catch {
    return null;
  }
}

/** Ask the user to choose the root archive folder (e.g. D:\SurveyGroup\Work Requests). */
export async function pickRootFolder(): Promise<FileSystemDirectoryHandle> {
  const h: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker({ id: 'wrm-root', mode: 'readwrite', startIn: 'documents' });
  await idb('readwrite', (s) => s.put(h, 'root'));
  return h;
}

/** Ensure read/write permission on the handle (prompts if needed). */
export async function ensurePermission(h: FileSystemDirectoryHandle, prompt = true): Promise<boolean> {
  const opts = { mode: 'readwrite' };
  if ((await (h as any).queryPermission(opts)) === 'granted') return true;
  if (!prompt) return false;
  return (await (h as any).requestPermission(opts)) === 'granted';
}

async function writeFile(dir: FileSystemDirectoryHandle, name: string, data: Blob | string) {
  const fh = await dir.getFileHandle(name, { create: true });
  const w = await (fh as any).createWritable();
  await w.write(data);
  await w.close();
}

async function exists(dir: FileSystemDirectoryHandle, name: string, size: number) {
  try {
    const f = await (await dir.getFileHandle(name)).getFile();
    return f.size === size;
  } catch {
    return false;
  }
}

function sheet(r: WorkRequest) {
  const d = (v?: string | null) => (v ? new Date(v).toLocaleDateString('fr-FR') : '');
  return [
    `SURVEY GROUP — WORK REQUEST ${r.number}`,
    '',
    `N° Request        : ${r.number}`,
    `Site / Lieu       : ${r.site || ''}`,
    `Date réception    : ${d(r.receivedDate)}`,
    `Objet             : ${r.subject}`,
    `Service demandeur : ${r.department}`,
    `Opérateur         : ${r.operator}`,
    `Date prévue       : ${d(r.plannedDate)}`,
    `Date réalisation  : ${d(r.completedDate)}`,
    `Statut            : ${r.status}`,
    '',
    'Description des travaux :',
    r.description,
    '',
    'Historique :',
    ...(r.history || []).map((h) => `- ${new Date(h.at).toLocaleString('fr-FR')} | ${h.by || ''} | ${h.action} ${h.details ? '— ' + h.details : ''}`),
    '',
    `Mis à jour le ${new Date().toLocaleString('fr-FR')}`,
  ].join('\r\n');
}

/**
 * Write one request into <root>\<year>\SR-xx-yyyy-Site\ with its sub-folders,
 * all attached files and a request sheet. Returns the number of files written.
 */
export async function syncRequestToFolder(root: FileSystemDirectoryHandle, req: WorkRequest): Promise<number> {
  const full = req.history ? req : await api.get(req._id);
  const yearDir = await root.getDirectoryHandle(String(full.year), { create: true });
  const dir = await yearDir.getDirectoryHandle(requestFolderName(full.number, full.site), { create: true });
  const subs: Record<string, FileSystemDirectoryHandle> = {};
  for (const [k, name] of Object.entries(SUB_FOLDERS)) subs[k] = await dir.getDirectoryHandle(name, { create: true });
  let written = 0;
  for (const f of full.files) {
    const name = `${f.version > 1 ? `v${f.version}_` : ''}${f.name}`;
    const target = subs[f.category] || subs.document;
    if (await exists(target, name, f.size)) continue;
    const res = await fetch(fileUrl(f.blobId), { credentials: 'include' });
    if (!res.ok) continue;
    await writeFile(target, name, await res.blob());
    written++;
  }
  await writeFile(dir, `${full.number}_fiche.txt`, '\uFEFF' + sheet(full));
  await writeFile(dir, `${full.number}.json`, JSON.stringify(full, null, 2));
  return written + 2;
}

/** Sync every request plus the up-to-date Excel workbook into the root folder. */
export async function syncAllToFolder(root: FileSystemDirectoryHandle, onProgress?: (i: number, n: number) => void) {
  const list = await api.list();
  let total = 0;
  for (let i = 0; i < list.length; i++) {
    onProgress?.(i + 1, list.length);
    total += await syncRequestToFolder(root, list[i]);
  }
  const xlsx = await fetch(`${fileUrl('').replace(/files\/$/, '')}export/excel`, { credentials: 'include' });
  if (xlsx.ok) {
    await writeFile(root, 'SurveyGroup_WorkRequests.xlsx', await xlsx.blob());
    total++;
  }
  return total;
}

/** Auto-sync a request if a folder is connected and permission already granted (silent). */
export async function autoSync(req: WorkRequest): Promise<number | null> {
  if (!isLocalFolderSupported()) return null;
  const root = await getRootHandle();
  if (!root || !(await ensurePermission(root, false))) return null;
  try {
    return await syncRequestToFolder(root, req);
  } catch {
    return null;
  }
}
