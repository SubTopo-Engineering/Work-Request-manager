import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './api.js';
import { readDocument, extractFields } from './ocr.js';
import type { AppSettings, RequestForm } from './types.js';
import { TitleBar } from './layout.js';
import { RequestFields, emptyForm } from './request-fields.js';
import { useI18n } from './i18n.js';
import { autoSync } from './local-folder.js';
import s from './wrm-app.module.css';

/** New request: import scan, OCR, auto-fill, verify, save & archive (DB + local folder). */
export function NewRequestPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [form, setForm] = useState<RequestForm>(emptyForm());
  const [ocrText, setOcrText] = useState('');
  const [progress, setProgress] = useState<{ p: number; label: string } | null>(null);
  const [highlighted, setHighlighted] = useState<Set<keyof RequestForm>>(new Set());
  const [nextNumber, setNextNumber] = useState('');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.nextNumber().then((r) => setNextNumber(r.number)).catch(() => {});
    api.settings().then(setSettings).catch(() => {});
  }, []);

  const runOcr = async (f: File) => {
    setError('');
    setProgress({ p: 0, label: t('ocrPrep') });
    try {
      const text = await readDocument(f, settings?.ocrLanguage || 'fra+eng+ara', (p, label) => setProgress({ p, label }));
      setOcrText(text);
      const fields = extractFields(text);
      setForm((prev) => ({ ...prev, ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v)) }));
      const keys = Object.keys(fields).filter((k) => (fields as any)[k]) as (keyof RequestForm)[];
      setHighlighted(new Set(keys));
      setProgress({ p: 1, label: t('ocrDone', { n: keys.length }) });
    } catch (e: any) {
      setProgress(null);
      setError(t('ocrFail', { e: e.message }));
    }
  };

  const onFile = (f?: File | null) => {
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    runOcr(f);
  };

  const save = async () => {
    if (!form.subject.trim()) return setError(t('subjectRequired'));
    setSaving(true);
    try {
      const created = await api.create({ ...form, ocrText }, file || undefined);
      await autoSync(created);
      navigate(`/demande/${created._id}?created=1`);
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <>
      <TitleBar title={t('navNew')} subtitle={nextNumber ? `${t('nextNumber')} : ${nextNumber}` : undefined} />
      {error && <div className={`${s.msg} ${s.msgErr}`}>{error}</div>}
      <div className={s.grid2}>
        <div className={s.card}>
          <h3>{t('step1')}</h3>
          <label
            className={s.drop}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onFile(e.dataTransfer.files?.[0]);
            }}
          >
            <input type="file" accept="application/pdf,image/*" onChange={(e) => onFile(e.target.files?.[0])} />
            {file ? `📄 ${file.name}` : t('drop')}
          </label>
          {progress && (
            <>
              <div className={s.progress}><div style={{ width: `${Math.round(progress.p * 100)}%` }} /></div>
              <p style={{ fontSize: '.78rem' }}>{progress.label}</p>
            </>
          )}
          {file && previewUrl && (file.type.startsWith('image/') ? (
            <img src={previewUrl} alt="preview" className={s.preview} />
          ) : (
            <iframe src={previewUrl} title="PDF" className={s.preview} style={{ height: 420 }} />
          ))}
          {ocrText && (
            <details>
              <summary style={{ fontSize: '.8rem', cursor: 'pointer' }}>{t('ocrText')}</summary>
              <div className={s.ocrText}>{ocrText}</div>
            </details>
          )}
        </div>
        <div className={s.card}>
          <h3>{t('step2')}</h3>
          <RequestFields value={form} onChange={setForm} settings={settings} highlighted={highlighted} number={nextNumber} />
          <div className={s.toolbar} style={{ marginTop: 14, justifyContent: 'flex-end' }}>
            <button className={`${s.btn} ${s.btnGhost}`} onClick={() => { setForm(emptyForm()); setFile(null); setOcrText(''); setProgress(null); setHighlighted(new Set()); }}>
              {t('reset')}
            </button>
            <button className={`${s.btn} ${s.green}`} disabled={saving} onClick={save}>
              {saving ? t('saving') : `${t('saveArchive')} ${nextNumber}`}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
