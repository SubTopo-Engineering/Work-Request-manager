import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from './api.js';
import type { PeriodReport, WorkRequest } from './types.js';
import { TitleBar, StatusBadge, fmtDate } from './layout.js';
import { useI18n } from './i18n.js';
import s from './wrm-app.module.css';

function Bars({ data }: { data: Record<string, number> }) {
  const { t } = useI18n();
  const max = Math.max(1, ...Object.values(data));
  const entries = Object.entries(data);
  if (!entries.length) return <div style={{ fontSize: '.78rem', color: '#999' }}>{t('noData')}</div>;
  return (
    <div className={s.bars}>
      {entries.map(([k, v]) => (
        <div key={k} className={s.bar}>
          <span>{k}</span>
          <div style={{ width: `${(v / max) * 100}%` }} />
          <b>{v}</b>
        </div>
      ))}
    </div>
  );
}

function List({ title, rows }: { title: string; rows: WorkRequest[] }) {
  const { t } = useI18n();
  return (
    <div className={`${s.card} ${s.tableWrap}`}>
      <h3>{title} ({rows.length})</h3>
      {rows.length === 0 ? (
        <div style={{ fontSize: '.78rem', color: '#999' }}>{t('noRequest')}</div>
      ) : (
        <table className={s.table}>
          <thead><tr><th>{t('colNumber')}</th><th>{t('colSubject')}</th><th>{t('colSite')}</th><th>{t('colDept')}</th><th>{t('colReceived')}</th><th>{t('colPlanned')}</th><th>{t('colDone')}</th><th>{t('colOperator')}</th><th>{t('colStatus')}</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id}>
                <td className={s.num}><Link to={`/demande/${r._id}`}>{r.number}</Link></td>
                <td>{r.subject}</td><td>{r.site || '—'}</td><td>{r.department}</td><td>{fmtDate(r.receivedDate)}</td><td>{fmtDate(r.plannedDate)}</td><td>{fmtDate(r.completedDate)}</td><td>{r.operator || '—'}</td>
                <td><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** Daily and monthly reports with automation trigger and print. */
export function ReportsPage() {
  const { t, d, locale } = useI18n();
  const now = new Date();
  const [mode, setMode] = useState<'monthly' | 'daily'>('monthly');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [day, setDay] = useState(now.toISOString().slice(0, 10));
  const [report, setReport] = useState<PeriodReport | null>(null);
  const [autoMsg, setAutoMsg] = useState('');

  const load = () => (mode === 'monthly' ? api.monthly(year, month) : api.daily(day)).then(setReport);
  useEffect(() => { load(); }, [mode, year, month, day]);

  const runAuto = async () => {
    const r = await api.runAutomation();
    setAutoMsg(r.updates.length ? t('autoChanges', { l: r.updates.join(', ') }) : t('autoNone'));
    load();
  };

  const period = mode === 'monthly' ? `${d.months[month - 1]} ${year}` : new Date(day).toLocaleDateString(locale, { dateStyle: 'full' });

  return (
    <>
      <TitleBar
        title={mode === 'monthly' ? t('monthly') : t('daily')}
        subtitle={period}
        actions={
          <>
            <button className={`${s.btn} ${s.teal}`} onClick={runAuto}>{t('runDaily')}</button>
            <button className={`${s.btn} ${s.btnGhost}`} onClick={() => window.print()}>{t('printPdf')}</button>
          </>
        }
      />
      <div className={`${s.card} ${s.toolbar} noPrint`}>
        <select value={mode} onChange={(e) => setMode(e.target.value as any)}>
          <option value="monthly">{t('mMonthly')}</option>
          <option value="daily">{t('mDaily')}</option>
        </select>
        {mode === 'monthly' ? (
          <>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>{d.months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))}>{[0, 1, 2].map((x) => <option key={x}>{now.getFullYear() - x}</option>)}</select>
          </>
        ) : (
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} style={{ flex: 'none' }} />
        )}
      </div>
      {autoMsg && <div className={`${s.msg} ${s.msgOk}`}>{autoMsg}</div>}
      {report && (
        <>
          <div className={s.stats}>
            <div className={s.stat}><b>{report.received.length}</b><span>{t('rReceived')}</span></div>
            <div className={s.stat} style={{ borderLeftColor: '#1a9139' }}><b style={{ color: '#1a9139' }}>{report.executed.length}</b><span>{t('rExecuted')}</span></div>
            <div className={s.stat} style={{ borderLeftColor: '#c0392b' }}><b style={{ color: '#c0392b' }}>{report.late.length}</b><span>{t('rLate')}</span></div>
          </div>
          <div className={s.grid2}>
            <div className={s.card}><h3>{t('rByDept')}</h3><Bars data={report.byDepartment} /></div>
            <div className={s.card}><h3>{t('rByOp')}</h3><Bars data={report.byOperator} /></div>
          </div>
          <List title={t('rReceived')} rows={report.received} />
          <List title={t('rExecuted')} rows={report.executed} />
          <List title={t('rLateList')} rows={report.late} />
        </>
      )}
    </>
  );
}
