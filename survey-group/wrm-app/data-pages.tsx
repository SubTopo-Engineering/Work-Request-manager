import { useEffect, useState } from 'react';
import { api, download } from './api.js';
import type { AppSettings } from './types.js';
import { TitleBar } from './layout.js';
import { useI18n, LANGS, type Lang } from './i18n.js';
import { isLocalFolderSupported, getRootHandle, pickRootFolder, ensurePermission, syncAllToFolder } from './local-folder.js';
import s from './wrm-app.module.css';

/** Export page: Excel workbook (auto-updated) and CSV. */
export function ExportPage() {
  const { t } = useI18n();
  const [err, setErr] = useState('');
  const go = (path: string, name: string) => download(path, name).catch((e) => setErr(e.message));
  return (
    <>
      <TitleBar title={t('navExport')} subtitle={t('exportSub')} />
      {err && <div className={`${s.msg} ${s.msgErr}`}>{err}</div>}
      <div className={s.tiles}>
        <div className={s.tile}>
          <button className={`${s.tileBtn} ${s.green}`} style={{ border: 0, cursor: 'pointer' }} onClick={() => go('/export/excel', 'SurveyGroup_WorkRequests.xlsx')}>
            <small>▦</small>{t('dlExcel')}
          </button>
          <div className={s.tileDesc}>{t('dlExcelDesc')}</div>
        </div>
        <div className={s.tile}>
          <button className={`${s.tileBtn} ${s.navy}`} style={{ border: 0, cursor: 'pointer' }} onClick={() => go('/export/csv', 'SurveyGroup_WorkRequests.csv')}>
            <small>⇩</small>{t('dlCsv')}
          </button>
          <div className={s.tileDesc}>{t('dlCsvDesc')}</div>
        </div>
      </div>
    </>
  );
}

/** Local disk folder (D:\ or C:\) connection and full sync. */
function LocalFolderCard() {
  const { t } = useI18n();
  const [name, setName] = useState<string | null>(null);
  const [granted, setGranted] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [progress, setProgress] = useState('');
  const supported = isLocalFolderSupported();

  useEffect(() => {
    getRootHandle().then(async (h) => {
      if (!h) return;
      setName(h.name);
      setGranted(await ensurePermission(h, false));
    });
  }, []);

  const pick = async () => {
    try {
      const h = await pickRootFolder();
      setName(h.name);
      setGranted(true);
    } catch { /* cancelled */ }
  };

  const syncAll = async () => {
    const h = await getRootHandle();
    if (!h || !(await ensurePermission(h))) return;
    setGranted(true);
    try {
      const n = await syncAllToFolder(h, (i, total) => setProgress(`${i}/${total}`));
      setMsg({ ok: true, text: t('localSynced', { n, p: h.name }) });
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    }
    setProgress('');
  };

  return (
    <div className={s.card}>
      <h3>💾 {t('localTitle')}</h3>
      <p style={{ fontSize: '.82rem', margin: '0 0 10px' }}>{t('localDesc')}</p>
      <pre className={s.ocrText} dir="ltr">{`D:\\SurveyGroup\\Work Requests\\
└── 2026\\
    └── SR-01-2026-Brega\\
        ├── 01_Original\\
        ├── 02_Documents\\
        ├── 03_Photos\\
        ├── 04_Raw Data\\
        ├── 05_Traitement\\
        ├── 06_Final Data\\
        ├── SR-01-2026_fiche.txt
        └── SR-01-2026.json
└── SurveyGroup_WorkRequests.xlsx`}</pre>
      {!supported ? (
        <div className={`${s.msg} ${s.msgErr}`}>{t('localUnsupported')}</div>
      ) : (
        <div className={s.toolbar} style={{ marginTop: 10 }}>
          <span style={{ fontSize: '.85rem', flex: 1 }}>{name ? `✅ ${t('localConnected')} : ${name}` : t('localNone')}</span>
          <button className={`${s.btn} ${s.purple}`} onClick={pick}>{t('localPick')}</button>
          {name && !granted && <button className={`${s.btn} ${s.btnGhost}`} onClick={async () => { const h = await getRootHandle(); if (h) setGranted(await ensurePermission(h)); }}>{t('localReconnect')}</button>}
          {name && <button className={`${s.btn} ${s.brown}`} disabled={!!progress} onClick={syncAll}>{progress ? `… ${progress}` : t('localSyncAll')}</button>}
        </div>
      )}
      {msg && <div className={`${s.msg} ${msg.ok ? s.msgOk : s.msgErr}`} style={{ marginTop: 8 }}>{msg.text}</div>}
    </div>
  );
}

/** Backup page: local disk folder, download full backup and restore. */
export function BackupPage() {
  const { t } = useI18n();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const restore = async (f?: File | null) => {
    if (!f || !confirm(t('restoreConfirm'))) return;
    try {
      const r = await api.restore(JSON.parse(await f.text()));
      setMsg({ ok: true, text: t('restored', { n: r.restored }) });
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    }
  };
  return (
    <>
      <TitleBar title={t('navBackup')} subtitle={t('backupSub')} />
      {msg && <div className={`${s.msg} ${msg.ok ? s.msgOk : s.msgErr}`}>{msg.text}</div>}
      <LocalFolderCard />
      <div className={s.tiles} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <div className={s.tile}>
          <button className={`${s.tileBtn} ${s.orange}`} style={{ border: 0, cursor: 'pointer' }} onClick={() => download('/backup', 'backup.json').catch((e) => setMsg({ ok: false, text: e.message }))}>
            <small>⧉</small>{t('backupCreate')}
          </button>
          <div className={s.tileDesc}>{t('backupCreateDesc')}</div>
        </div>
        <label className={s.tile} style={{ cursor: 'pointer' }}>
          <div className={`${s.tileBtn} ${s.brown}`}><small>↺</small>{t('restore')}</div>
          <input type="file" accept="application/json" style={{ display: 'none' }} onChange={(e) => restore(e.target.files?.[0])} />
          <div className={s.tileDesc}>{t('restoreDesc')}</div>
        </label>
      </div>
      <div className={s.card}>
        <h3>{t('autoBackup')}</h3>
        <p style={{ fontSize: '.85rem', margin: 0 }}>{t('autoBackupDesc')}</p>
      </div>
    </>
  );
}

function ListEditor({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  const { t } = useI18n();
  const [v, setV] = useState('');
  return (
    <div className={s.card}>
      <h3>{label}</h3>
      <div className={s.tags}>
        {items.map((i) => (
          <span key={i} className={s.tag}>{i}<button onClick={() => onChange(items.filter((x) => x !== i))}>✕</button></span>
        ))}
      </div>
      <form className={s.toolbar} onSubmit={(e) => { e.preventDefault(); if (v.trim() && !items.includes(v.trim())) onChange([...items, v.trim()]); setV(''); }}>
        <input value={v} onChange={(e) => setV(e.target.value)} placeholder={t('addPh')} />
        <button className={`${s.btn} ${s.purple}`} type="submit">{t('add')}</button>
      </form>
    </div>
  );
}

/** Settings page: language (FR/EN/AR), OCR language, archive folder, operators, departments. */
export function SettingsPage() {
  const { t, lang, setLang, locale } = useI18n();
  const [st, setSt] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => { api.settings().then(setSt); }, []);
  if (!st) return <TitleBar title={t('navSettings')} subtitle={t('loading')} />;
  const save = async () => {
    setSt(await api.saveSettings({ ...st, language: lang }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };
  return (
    <>
      <TitleBar title={t('navSettings')} subtitle={t('settingsSub')} actions={<button className={`${s.btn} ${s.purple}`} onClick={save}>{t('save')}</button>} />
      {saved && <div className={`${s.msg} ${s.msgOk}`}>{t('settingsSaved')}</div>}
      <div className={s.card}>
        <div className={s.formGrid}>
          <label className={s.field}>{t('uiLang')}
            <select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </label>
          <label className={s.field}>{t('ocrLang')}
            <select value={st.ocrLanguage} onChange={(e) => setSt({ ...st, ocrLanguage: e.target.value })}>
              <option value="fra+eng+ara">Français + English + العربية</option>
              <option value="fra+eng">Français + English</option>
              <option value="fra">Français</option>
              <option value="eng">English</option>
              <option value="ara">العربية</option>
            </select>
          </label>
          <label className={s.field}>{t('rootLabel')}
            <input dir="ltr" value={st.rootFolder || ''} onChange={(e) => setSt({ ...st, rootFolder: e.target.value })} placeholder="D:\SurveyGroup\Work Requests" />
          </label>
          <label className={s.field}>{t('autoArchive')}
            <input type="number" min={1} value={st.autoArchiveDays} onChange={(e) => setSt({ ...st, autoArchiveDays: Number(e.target.value) })} />
          </label>
          <div className={s.field}>{t('ocrState')}
            <span style={{ fontWeight: 400, fontSize: '.85rem', paddingTop: 8 }}>✅ {t('ocrReady')} : {st.lastDailyRun ? new Date(st.lastDailyRun).toLocaleString(locale) : '—'}</span>
          </div>
        </div>
      </div>
      <LocalFolderCard />
      <div className={s.grid2}>
        <ListEditor label={t('operators')} items={st.operators} onChange={(operators) => setSt({ ...st, operators })} />
        <ListEditor label={t('departments')} items={st.departments} onChange={(departments) => setSt({ ...st, departments })} />
      </div>
    </>
  );
}
