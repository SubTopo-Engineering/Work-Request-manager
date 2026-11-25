import type { AppSettings, DashboardStats, FileCategory, PeriodReport, RequestForm, WorkRequest } from './types.js';

/** Base URL of the WRM service routed through the platform gateway. */
export const API_BASE = `${process.env.BACKEND_URL || ''}/wrm-service/api`;

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Erreur ${res.status}`);
  }
  return res.json();
}

/** Read a browser File as base64 (without data: prefix). */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/** Build the upload payload for a file. */
export async function toUpload(file: File, category: FileCategory) {
  return { name: file.name, mimeType: file.type || 'application/octet-stream', dataBase64: await fileToBase64(file), category };
}

/** Trigger a browser download of an API resource. */
export async function download(path: string, fallbackName: string) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
  const blob = await res.blob();
  const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1] || fallbackName;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = decodeURIComponent(name);
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** URL of a stored file. */
export const fileUrl = (blobId: string) => `${API_BASE}/files/${blobId}`;

/** WRM REST client. */
export const api = {
  dashboard: () => call<DashboardStats>('/dashboard'),
  nextNumber: () => call<{ number: string }>('/next-number'),
  list: (params: Record<string, string> = {}) => call<WorkRequest[]>(`/requests?${new URLSearchParams(params)}`),
  get: (id: string) => call<WorkRequest>(`/requests/${id}`),
  create: async (form: Partial<RequestForm> & { ocrText?: string }, original?: File) =>
    call<WorkRequest>('/requests', {
      method: 'POST',
      body: JSON.stringify({ request: form, original: original ? await toUpload(original, 'original') : undefined }),
    }),
  update: (id: string, form: Partial<RequestForm>) => call<WorkRequest>(`/requests/${id}`, { method: 'PUT', body: JSON.stringify(form) }),
  remove: (id: string) => call<{ deleted: boolean }>(`/requests/${id}`, { method: 'DELETE' }),
  addFile: async (id: string, file: File, category: FileCategory) =>
    call<WorkRequest>(`/requests/${id}/files`, { method: 'POST', body: JSON.stringify(await toUpload(file, category)) }),
  removeFile: (id: string, fileId: string) => call<WorkRequest>(`/requests/${id}/files/${fileId}`, { method: 'DELETE' }),
  monthly: (year: number, month: number) => call<PeriodReport>(`/reports/monthly?year=${year}&month=${month}`),
  daily: (day: string) => call<PeriodReport>(`/reports/daily?day=${day}`),
  runAutomation: () => call<{ ranAt: string; updates: string[] }>('/automation/run', { method: 'POST' }),
  settings: () => call<AppSettings>('/settings'),
  saveSettings: (s: Partial<AppSettings>) => call<AppSettings>('/settings', { method: 'PUT', body: JSON.stringify(s) }),
  restore: (data: unknown) => call<{ restored: number }>('/restore', { method: 'POST', body: JSON.stringify(data) }),
};
