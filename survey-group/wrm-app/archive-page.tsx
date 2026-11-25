import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from './api.js';
import type { WorkRequest } from './types.js';
import { STATUSES } from './types.js';
import { TitleBar, StatusBadge, fmtDate } from './layout.js';
import { useI18n } from './i18n.js';
import s from './wrm-app.module.css';

/** Archive: search by number/subject/site, filter by status/year/late, open a request. */
export function ArchivePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<WorkRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(params.get('q') || '');

  const status = params.get('status') || '';
  const year = params.get('year') || '';
  const late = params.get('late') || '';

  useEffect(() => {
    setLoading(true);
    const p: Record<string, string> = {};
    params.forEach((v, k) => v && (p[k] = v));
    api.list(p).then(setRows).finally(() => setLoading(false));
  }, [params]);

  const update = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next);
  };

  const currentYear = new Date().getFullYear();

  return (
    <>
      <TitleBar title={t('navArchive')} subtitle={`${rows.length} ${t('requests')}`} />
      <div className={s.card}>
        <form className={s.toolbar} onSubmit={(e) => { e.preventDefault(); update('q', q); }}>
          <input placeholder={t('searchPh')} value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={status} onChange={(e) => update('status', e.target.value)}>
            <option value="">{t('allStatuses')}</option>
            {STATUSES.map((st) => <option key={st} value={st}>{t(st)}</option>)}
          </select>
          <select value={year} onChange={(e) => update('year', e.target.value)}>
            <option value="">{t('allYears')}</option>
            {[currentYear, currentYear - 1, currentYear - 2].map((y) => <option key={y}>{y}</option>)}
          </select>
          <label style={{ fontSize: '.8rem', display: 'flex', gap: 4, alignItems: 'center' }}>
            <input type="checkbox" style={{ minWidth: 0, flex: 'none' }} checked={late === 'true'} onChange={(e) => update('late', e.target.checked ? 'true' : '')} />
            {t('late')}
          </label>
          <button className={`${s.btn} ${s.blue}`} type="submit">{t('search')}</button>
        </form>
      </div>
      <div className={`${s.card} ${s.tableWrap}`}>
        {loading ? (
          <p>{t('loading')}</p>
        ) : rows.length === 0 ? (
          <p>{t('noResults')}</p>
        ) : (
          <table className={s.table}>
            <thead>
              <tr>
                <th>{t('colNumber')}</th><th>{t('colReceived')}</th><th>{t('colSubject')}</th><th>{t('colSite')}</th><th>{t('colDept')}</th><th>{t('colPlanned')}</th><th>{t('colDone')}</th><th>{t('colOperator')}</th><th>{t('colStatus')}</th><th>{t('colFiles')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} onClick={() => navigate(`/demande/${r._id}`)}>
                  <td className={s.num}>{r.number}</td>
                  <td>{fmtDate(r.receivedDate)}</td>
                  <td>{r.subject}</td>
                  <td>{r.site || '—'}</td>
                  <td>{r.department}</td>
                  <td>{fmtDate(r.plannedDate)}</td>
                  <td>{fmtDate(r.completedDate)}</td>
                  <td>{r.operator || '—'}</td>
                  <td><StatusBadge status={r.status} late={r.late} /></td>
                  <td>{r.files.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
