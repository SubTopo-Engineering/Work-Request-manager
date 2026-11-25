import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from './api.js';
import type { DashboardStats } from './types.js';
import { TitleBar } from './layout.js';
import { useI18n, type TKey } from './i18n.js';
import s from './wrm-app.module.css';

const TILES: { to: string; icon: string; label: TKey; desc: TKey; color: string }[] = [
  { to: '/nouvelle', icon: '📄', label: 'navNew', desc: 'tileNew', color: s.green },
  { to: '/suivi', icon: '◷', label: 'navTracking', desc: 'tileTracking', color: s.red },
  { to: '/archive', icon: '📋', label: 'navArchive', desc: 'tileArchive', color: s.blue },
  { to: '/rapports', icon: '▤', label: 'navReports', desc: 'tileReports', color: s.teal },
  { to: '/export', icon: '⇩', label: 'exportTile', desc: 'tileExport', color: s.navy },
  { to: '/sauvegarde', icon: '⧉', label: 'navBackup', desc: 'tileBackup', color: s.orange },
];

/** Home page: dashboard counters, module tiles and processing flow. */
export function HomePage() {
  const { t, d } = useI18n();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  useEffect(() => {
    api.dashboard().then(setStats).catch(() => setStats(null));
  }, []);

  const cards = stats
    ? [
        { label: t('statTotal'), value: stats.total, color: '#2259a8', q: '' },
        { label: t('statNew'), value: stats.received, color: '#1f5c94', q: '?status=Reçu' },
        { label: t('statProgress'), value: stats.inProgress, color: '#ef9a1c', q: '?status=En cours' },
        { label: t('statDone'), value: stats.completed, color: '#1a9139', q: '?status=Terminé' },
        { label: t('statLate'), value: stats.late, color: '#c0392b', q: '?late=true' },
        { label: t('statArchived'), value: stats.archived, color: '#666', q: '?status=Archivé' },
      ]
    : [];

  return (
    <>
      <TitleBar title={t('navHome')} subtitle={t('homeSub')} />
      <div className={s.stats}>
        {cards.map((c) => (
          <Link key={c.label} to={`/archive${c.q}`} className={s.stat} style={{ borderLeftColor: c.color }}>
            <b style={{ color: c.color }}>{c.value}</b>
            <span>{c.label}</span>
          </Link>
        ))}
      </div>
      <div className={s.tiles}>
        {TILES.map((tile) => (
          <Link key={tile.to} to={tile.to} className={s.tile}>
            <div className={`${s.tileBtn} ${tile.color}`}>
              <small>{tile.icon}</small>
              {t(tile.label)}
            </div>
            <div className={s.tileDesc}>{t(tile.desc)}</div>
          </Link>
        ))}
      </div>
      <div className={s.card}>
        <h3>{t('flowTitle')}</h3>
        <div className={s.chips}>
          {d.flow.map((f) => (
            <span key={f} className={s.chip}>{f}</span>
          ))}
        </div>
      </div>
      <div className={s.footnote}>{t('footnote')}</div>
    </>
  );
}
