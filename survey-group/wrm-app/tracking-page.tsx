import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from './api.js';
import type { RequestStatus, WorkRequest } from './types.js';
import { STATUSES } from './types.js';
import { TitleBar, StatusBadge, fmtDate } from './layout.js';
import { useI18n } from './i18n.js';
import { requestFolderName } from './local-folder.js';
import s from './wrm-app.module.css';

const DAY = 864e5;
const today = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

/** Progress (0-100) derived from status and planned timeline. */
export function progressOf(r: WorkRequest): number {
  if (r.status === 'Terminé' || r.status === 'Archivé') return 100;
  if (r.status === 'Reçu') return 10;
  const start = new Date(r.receivedDate).getTime();
  const end = r.plannedDate ? new Date(r.plannedDate).getTime() : start + 14 * DAY;
  const pct = ((Date.now() - start) / Math.max(DAY, end - start)) * 80 + 15;
  return Math.max(15, Math.min(90, Math.round(pct)));
}

/** Deadline info: remaining (negative = late) days, or null. */
export function deadlineOf(r: WorkRequest): { days: number; tone: 'done' | 'ok' | 'soon' | 'late' | 'none' } {
  if (r.status === 'Terminé' || r.status === 'Archivé') return { days: 0, tone: 'done' };
  if (!r.plannedDate) return { days: 0, tone: 'none' };
  const p = new Date(r.plannedDate);
  const days = Math.round((new Date(p.getFullYear(), p.getMonth(), p.getDate()).getTime() - today()) / DAY);
  return { days, tone: days < 0 ? 'late' : days <= 3 ? 'soon' : 'ok' };
}

type Filter = 'all' | 'open' | 'soon' | 'late' | RequestStatus;
type SortKey = 'number' | 'deadline' | 'received' | 'status';

const NEXT: Partial<Record<RequestStatus, { to: RequestStatus; label: string; color: string }>> = {
  'Reçu': { to: 'En cours', label: 'start', color: s.orange },
  'En cours': { to: 'Terminé', label: 'finish', color: s.green },
  'Terminé': { to: 'Archivé', label: 'archiveAction', color: s.gray },
};

/** Professional tracking board listing every request with deadlines, progress and quick actions. */
export function TrackingPage() {
  const { t, locale } = useI18n();
  const [rows, setRows] = useState<WorkRequest[]>([]);
  const [filter, setFilter] = useState<Filter>('open');
  const [sort, setSort] = useState<SortKey>('deadline');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState('');
  const [updated, setUpdated] = useState(new Date());

  const load = () => api.list().then((r) => { setRows(r); setUpdated(new Date()); });
  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  const counts = useMemo(() => ({
    all: rows.length,
    open: rows.filter((r) => r.status === 'Reçu' || r.status === 'En cours').length,
    soon: rows.filter((r) => deadlineOf(r).tone === 'soon').length,
    late: rows.filter((r) => deadlineOf(r).tone === 'late').length,
    ...Object.fromEntries(STATUSES.map((st) => [st, rows.filter((r) => r.status === st).length])),
  }) as Record<string, number>, [rows]);

  const view = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = rows.filter((r) => {
      const dl = deadlineOf(r).tone;
      if (filter === 'open' && !(r.status === 'Reçu' || r.status === 'En cours')) return false;
      if (filter === 'soon' && dl !== 'soon') return false;
      if (filter === 'late' && dl !== 'late') return false;
      if ((STATUSES as string[]).includes(filter) && r.status !== filter) return false;
      if (needle && ![r.number, r.subject, r.site, r.department, r.operator].join(' ').toLowerCase().includes(needle)) return false;
      return true;
    });
    const order: Record<string, number> = { late: 0, soon: 1, ok: 2, none: 3, done: 4 };
    list = [...list].sort((a, b) => {
      if (sort === 'number') return b.year - a.year || b.number.localeCompare(a.number, undefined, { numeric: true });
      if (sort === 'received') return new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime();
      if (sort === 'status') return STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status);
      const da = deadlineOf(a), db = deadlineOf(b);
      return order[da.tone] - order[db.tone] || da.days - db.days;
    });
    return list;
  }, [rows, filter, sort, q]);

  const advance = async (r: WorkRequest) => {
    const n = NEXT[r.status];
    if (!n) return;
    setBusy(r._id);
    try {
      await api.update(r._id, { status: n.to });
      await load();
    } finally {
      setBusy('');
    }
  };

  const chips: { key: Filter; label: string; tone?: string }[] = [
    { key: 'all', label: t('trackAll') },
    { key: 'open', label: t('trackOpen') },
    ...STATUSES.map((st) => ({ key: st as Filter, label: t(st) })),
    { key: 'soon', label: t('trackDueSoon'), tone: s.chipSoon },
    { key: 'late', label: t('late'), tone: s.chipLate },
  ];

  const deadlineLabel = (r: WorkRequest) => {
    const d = deadlineOf(r);
    if (d.tone === 'done') return t('doneOn');
    if (d.tone === 'none') return t('noPlanned');
    if (d.days === 0) return t('dueToday');
    return d.days > 0 ? t('daysLeft', { n: d.days }) : t('daysLate', { n: -d.days });
  };

  return (
    <>
      <TitleBar
        title={t('trackTitle')}
        subtitle={`${t('trackSub')} · ${updated.toLocaleTimeString(locale)}`}
        actions={<button className={`${s.btn} ${s.btnGhost}`} onClick={() => window.print()}>{t('printTracking')}</button>}
      />

      <div className={s.trackKpis}>
        {[
          { k: 'all', label: t('statTotal'), c: '#2259a8' },
          { k: 'open', label: t('trackOpen'), c: '#1f5c94' },
          { k: 'En cours', label: t('statProgress'), c: '#ef9a1c' },
          { k: 'soon', label: t('dueSoon'), c: '#d4a106' },
          { k: 'late', label: t('overdue'), c: '#c0392b' },
          { k: 'Terminé', label: t('statDone'), c: '#1a9139' },
        ].map((x) => (
          <button key={x.k} className={`${s.trackKpi} ${filter === x.k ? s.trackKpiActive : ''}`} style={{ borderTopColor: x.c }} onClick={() => setFilter(x.k as Filter)}>
            <b style={{ color: x.c }}>{counts[x.k] ?? 0}</b>
            <span>{x.label}</span>
          </button>
        ))}
      </div>

      <div className={`${s.card} ${s.trackToolbar} noPrint`}>
        <div className={s.chips}>
          {chips.map((c) => (
            <button key={c.key} className={`${s.filterChip} ${c.tone || ''} ${filter === c.key ? s.filterChipActive : ''}`} onClick={() => setFilter(c.key)}>
              {c.label} <em>{counts[c.key] ?? 0}</em>
            </button>
          ))}
        </div>
        <div className={s.toolbar}>
          <input placeholder={t('searchPh')} value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="sort">
            <option value="deadline">{t('colDelay')}</option>
            <option value="number">{t('colNumber')}</option>
            <option value="received">{t('colReceived')}</option>
            <option value="status">{t('colStatus')}</option>
          </select>
        </div>
      </div>

      <div className={`${s.card} ${s.tableWrap}`}>
        {view.length === 0 ? (
          <p>{t('noResults')}</p>
        ) : (
          <table className={`${s.table} ${s.trackTable}`}>
            <thead>
              <tr>
                <th></th>
                <th>{t('colNumber')}</th>
                <th>{t('colSubject')}</th>
                <th>{t('colSite')}</th>
                <th>{t('colDept')}</th>
                <th>{t('colOperator')}</th>
                <th>{t('colReceived')}</th>
                <th>{t('colPlanned')}</th>
                <th>{t('colDelay')}</th>
                <th>{t('colProgress')}</th>
                <th>{t('colStatus')}</th>
                <th>{t('colFiles')}</th>
                <th className="noPrint">{t('colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {view.map((r) => {
                const dl = deadlineOf(r);
                const pct = progressOf(r);
                const n = NEXT[r.status];
                return (
                  <tr key={r._id} className={s[`row_${dl.tone}`]}>
                    <td><span className={`${s.dot} ${s[`dot_${dl.tone}`]}`} /></td>
                    <td className={s.num}>
                      <Link to={`/demande/${r._id}`}>{r.number}</Link>
                      <small className={s.folderHint}>{requestFolderName(r.number, r.site)}</small>
                    </td>
                    <td className={s.subjectCell}>{r.subject}</td>
                    <td>{r.site || '—'}</td>
                    <td>{r.department || '—'}</td>
                    <td>{r.operator || <i style={{ color: '#c0392b' }}>—</i>}</td>
                    <td>{fmtDate(r.receivedDate)}</td>
                    <td>{fmtDate(r.plannedDate)}</td>
                    <td><span className={`${s.deadline} ${s[`dl_${dl.tone}`]}`}>{deadlineLabel(r)}</span></td>
                    <td>
                      <div className={s.progressCell}>
                        <div className={s.progressTrack}><div style={{ width: `${pct}%`, background: dl.tone === 'late' ? '#c0392b' : pct === 100 ? '#1a9139' : '#2259a8' }} /></div>
                        <span>{pct}%</span>
                      </div>
                    </td>
                    <td><StatusBadge status={r.status} /></td>
                    <td style={{ textAlign: 'center' }}>{r.files.length}</td>
                    <td className="noPrint">
                      <div className={s.rowActions}>
                        <Link to={`/demande/${r._id}`} className={`${s.miniBtn} ${s.btnGhost}`}>{t('open')}</Link>
                        {n && (
                          <button className={`${s.miniBtn} ${n.color}`} disabled={busy === r._id} onClick={() => advance(r)}>
                            {t(n.label)}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div className={s.legend}>
          <b>{t('legend')} :</b>
          <span><i className={`${s.dot} ${s.dot_ok}`} /> {t('onTime')}</span>
          <span><i className={`${s.dot} ${s.dot_soon}`} /> {t('dueSoon')}</span>
          <span><i className={`${s.dot} ${s.dot_late}`} /> {t('overdue')}</span>
          <span><i className={`${s.dot} ${s.dot_done}`} /> {t('doneOn')}</span>
        </div>
      </div>
    </>
  );
}
