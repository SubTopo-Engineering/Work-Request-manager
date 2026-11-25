import Tesseract from 'tesseract.js';
import * as pdfjs from 'pdfjs-dist';
// @ts-ignore vite url import
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { RequestForm } from './types.js';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/** Progress callback: 0..1 with a status label. */
export type OcrProgress = (p: number, label: string) => void;

async function pdfToImages(file: File, maxPages = 3): Promise<{ images: HTMLCanvasElement[]; text: string }> {
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const images: HTMLCanvasElement[] = [];
  let text = '';
  for (let i = 1; i <= Math.min(pdf.numPages, maxPages); i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it: any) => ('str' in it ? it.str + (it.hasEOL ? '\n' : ' ') : '')).join('') + '\n';
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
    images.push(canvas);
  }
  return { images, text };
}

/**
 * Read a scanned document (PDF or image) and return its text.
 * Uses the embedded PDF text layer when available, otherwise Tesseract OCR.
 */
export async function readDocument(file: File, lang: string, onProgress?: OcrProgress): Promise<string> {
  let sources: (File | HTMLCanvasElement)[] = [file];
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    onProgress?.(0.05, 'Lecture du PDF…');
    const { images, text } = await pdfToImages(file);
    if (text.replace(/\s/g, '').length > 40) return text;
    sources = images;
  }
  let out = '';
  for (let i = 0; i < sources.length; i++) {
    const { data } = await Tesseract.recognize(sources[i], lang || 'fra+eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') onProgress?.((i + m.progress) / sources.length, `OCR page ${i + 1}/${sources.length}…`);
        else onProgress?.(i / sources.length, 'Chargement du moteur OCR…');
      },
    });
    out += data.text + '\n';
  }
  return out;
}

const LABELS: Record<'subject' | 'department' | 'description' | 'receivedDate' | 'plannedDate' | 'operator', string[]> = {
  subject: ['objet', 'subject', 'titre', 'title', 'intitulé'],
  department: ['service demandeur', 'service', 'département', 'department', 'demandeur', 'requested by', 'requester', 'direction'],
  description: ['description des travaux', 'description', 'travaux demandés', 'work description', 'scope of work', 'détails'],
  receivedDate: ['date de réception', 'date réception', 'date de la demande', 'date', 'request date'],
  plannedDate: ['date prévue', 'date souhaitée', 'délai', 'due date', 'required date', 'date limite'],
  operator: ['opérateur', 'responsable', 'assigned to', 'operator'],
};

function toIsoDate(raw: string): string {
  const m = raw.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  return iso ? iso[0] : '';
}

/**
 * Extract Work Request fields from OCR text using label heuristics
 * (French and English forms).
 */
export function extractFields(text: string): Partial<RequestForm> {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const result: Partial<RequestForm> = {};
  const used = new Set<number>();
  const find = (labels: string[]) => {
    for (let i = 0; i < lines.length; i++) {
      if (used.has(i)) continue;
      const low = lines[i].toLowerCase();
      for (const l of labels) {
        const idx = low.indexOf(l);
        if (idx === -1 || idx > 4) continue;
        let value = lines[i].slice(idx + l.length).replace(/^[\s:.\-–_]+/, '').trim();
        if (!value && lines[i + 1]) value = lines[i + 1];
        if (value) {
          used.add(i);
          return { value, index: i };
        }
      }
    }
    return null;
  };
  const subj = find(LABELS.subject);
  if (subj) result.subject = subj.value;
  const dep = find(LABELS.department);
  if (dep) result.department = dep.value;
  const planned = find(LABELS.plannedDate);
  if (planned) result.plannedDate = toIsoDate(planned.value);
  const rec = find(LABELS.receivedDate);
  if (rec) result.receivedDate = toIsoDate(rec.value);
  const op = find(LABELS.operator);
  if (op) result.operator = op.value;
  const desc = find(LABELS.description);
  if (desc) {
    const extra: string[] = [desc.value];
    for (let i = desc.index + 1; i < Math.min(lines.length, desc.index + 6); i++) {
      if (/^[A-Za-zÀ-ÿ ]{3,30}\s*:/.test(lines[i])) break;
      extra.push(lines[i]);
    }
    result.description = [...new Set(extra)].join(' ');
  }
  if (!result.receivedDate) {
    const any = toIsoDate(text);
    if (any) result.receivedDate = any;
  }
  if (!result.subject && lines.length) result.subject = lines.find((l) => l.length > 12 && l.length < 120) || '';
  return result;
}
