import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { api, fileUrl } from './api.js';
import type { AppSettings, FileCategory, RequestForm, WorkRequest } from './types.js';
import { TitleBar, StatusBadge, toInput } from './layout.js';
import { RequestFields } from './request-fields.js';
import { useI18n } from './i18n.js';
import { autoSync, getRootHandle, ensurePermission, syncRequestToFolder, isLocalFolderSupported, requestFolderName, SUB_FOLDERS } from './local-folder.js';
import s from './wrm-app.module.css';

const CATEGORIES: FileCategory[] = ['original', 'document', 'photo', 'raw', 'processing', 'final'];

const toForm = (r: WorkRequest): RequestForm => ({
  receivedDate: toInput(r.receivedDate),
  subject: r.subject,
  department: r.department,
  site: r.site || '',
  description: r.description,
  plannedDate: toInput(r.plannedDate),
  completedDate: toInput(r.completedDate),
  operator: r.operator,
  status: r.status,
});

const kb = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`);

/** Request detail: edit fields, manage documents/photos/topographic data, local folder sync, full history. */
export function RequestDetailPage() {
  const { t, locale } = useI18n();
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [req, setReq] = useState<WorkRequest | null>(null);
  const [form, setForm] = useState<RequestForm | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(params.get('created') ? { ok: true, text: t('created') } : null);
  const [busy, setBusy] = useState(false);

  const load = (r: WorkRequest) => {
    setReq(r);
    setForm(toForm(r));
  };

  useEffect(() => {
    api.get(id).then(load).catch((e) => setMsg({ ok: false, text: e.message }));
    api.settings().then(setSettings).catch(() => {});
  }, [id]);

  if (!req || !form) return <TitleBar title="…" subtitle={msg?.text || t('loading')} />;

  const folder = `${settings?.rootFolder || ''}\\${req.year}\\${requestFolderName(req.number, form.site)}`;

  const save = async () => {
    setBusy(true);
    try {
      const r = await api.update(id, form);
      load(r);
      await autoSync(r);
      setMsg({ ok: true, text: t('saved') });
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    }
    setBusy(false);
  };

  const upload = async (category: FileCategory, files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      let r = req;
      for (const f of Array.from(files)) r = await api.addFile(id, f, category);
      load(r);
      await autoSync(r);
      setMsg({ ok: true, text: t('filesAdded', { n: files.length, c: t(`cat${category}`) }) });
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    }
    setBusy(false);
  };

  const syncLocal = async () => {
    if (!isLocalFolderSupported()) return setMsg({ ok: false, text: t('localUnsupported') });
    const root = await getRootHandle();
    if (!root) return navigate('/parametres');
    if (!(await ensurePermission(root))) return;
    setBusy(true);
    try {
      const n = await syncRequestToFolder(root, req);
      setMsg({ ok: true, text: t('localSynced', { n, p: folder }) });
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    }
    setBusy(false);
  };

  const del = async () => {
    if (!confirm(t('confirmDelete', { n: req.number }))) return;
    await api.remove(id);
    navigate('/archive');
  };

  return (
    <>
      <TitleBar
        title={req.number}
        subtitle={req.subject}
        actions={
          <>
            <StatusBadge status={req.status} late={req.late} />
            <button className={`${s.btn} ${s.brown}`} disabled={busy} onClick={syncLocal}>💾 {t('localSyncOne')}</button>
            <button className={`${s.btn} ${s.btnGhost}`} onClick={() => window.print()}>{t('print')}</button>
            <button className={`${s.btn} ${s.red}`} onClick={del}>{t('delete')}</button>
          </>
        }
      />
      {msg && <div className={`${s.msg} ${msg.ok ? s.msgOk : s.msgErr}`}>{msg.text}</div>}
      <div className={s.card}>
        <h3>{t('info')} <small style={{ fontWeight: 400, color: '#777' }}>· {t('folder')} : <span dir="ltr">{folder}</span></small></h3>
        <RequestFields value={form} onChange={setForm} settings={settings} number={req.number} />
        <div className={s.toolbar} style={{ marginTop: 12, justifyContent: 'flex-end' }}>
          <Link to="/suivi" className={`${s.btn} ${s.btnGhost}`}>{t('navTracking')}</Link>
          <button className={`${s.btn} ${s.blue}`} disabled={busy} onClick={save}>{t('saveChanges')}</button>
        </div>
      </div>
      <div className={s.card}>
        <h3>{t('filesTitle')}</h3>
        <div className={s.files}>
          {CATEGORIES.map((cat) => {
            const list = req.files.filter((f) => f.category === cat);
            return (
              <div key={cat} className={s.fileBox}>
                <h4>
                  <span>📁 {SUB_FOLDERS[cat]} <small style={{ fontWeight: 400, color: '#777' }}>· {t(`cat${cat}`)} ({list.length})</small></span>
                  <label className={`${s.uploadLabel} noPrint`}>
                    {t('import')}
                    <input type="file" multiple onChange={(e) => { upload(cat, e.target.files); e.target.value = ''; }} />
                  </label>
                </h4>
                {list.length === 0 && <div style={{ fontSize: '.72rem', color: '#999' }}>{t('noFile')}</div>}
                {list.map((f) => (
                  <div key={f._id} className={s.fileRow}>
                    <div>
                      <a href={fileUrl(f.blobId)} target="_blank" rel="noreferrer">{f.name}</a>
                      {f.version > 1 && <b> v{f.version}</b>}
                      <small>{kb(f.size)} · {new Date(f.uploadedAt).toLocaleString(locale)}</small>
                    </div>
                    <button className={s.iconBtn} title={t('delete')} onClick={async () => confirm(t('confirmDeleteFile', { n: f.name })) && load(await api.removeFile(id, f._id))}>✕</button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      <div className={s.card}>
        <h3>{t('history')}</h3>
        <ul className={s.history}>
          {[...(req.history || [])].reverse().map((h, i) => (
            <li key={i}>
              <time>{new Date(h.at).toLocaleString(locale)} · {h.by}</time>
              <b>{h.action}</b> {h.details && `— ${h.details}`}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
