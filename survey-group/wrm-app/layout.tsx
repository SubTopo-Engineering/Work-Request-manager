import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useI18n, LANGS, type TKey } from './i18n.js';
import s from './wrm-app.module.css';

/** Bottom navigation entries (labels are translation keys). */
export const NAV: { to: string; icon: string; label: TKey; color: string }[] = [
  { to: '/', icon: '⌂', label: 'navHome', color: s.blue },
  { to: '/nouvelle', icon: '+', label: 'navNew', color: s.green },
  { to: '/suivi', icon: '◷', label: 'navTracking', color: s.red },
  { to: '/archive', icon: '📋', label: 'navArchive', color: s.gray },
  { to: '/rapports', icon: '▤', label: 'navReports', color: s.teal },
  { to: '/export', icon: '⇩', label: 'navExport', color: s.navy },
  { to: '/sauvegarde', icon: '⧉', label: 'navBackup', color: s.brown },
  { to: '/parametres', icon: '⚙', label: 'navSettings', color: s.purple },
];

/** App shell: header with language switch, blue frame and bottom navigation. */
export function Layout({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  return (
    <>
      <header className={s.header}>
        <div>
          <h1 className={s.brand}>Survey Group</h1>
          <div className={s.brandSub}>{t('appSub')}</div>
        </div>
        <div className={s.headerRight}>
          <div className={s.langSwitch} role="group" aria-label="Language">
            {LANGS.map((l) => (
              <button key={l.code} className={lang === l.code ? s.langActive : ''} onClick={() => setLang(l.code)}>
                {l.label}
              </button>
            ))}
          </div>
          <strong>{t('headerTitle')}</strong>
          <span>{t('headerBy')}</span>
        </div>
      </header>
      <div className={s.frame}>
        <main className={s.content}>{children}</main>
        <nav className={s.bottomNav}>
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) => `${s.navBtn} ${n.color} ${isActive ? s.navActive : ''}`}
            >
              <span>{n.icon}</span>
              {t(n.label)}
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  );
}

/** Page title bar. */
export function TitleBar({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className={s.titleBar}>
      <h2>{title}</h2>
      {subtitle && <span>{subtitle}</span>}
      {actions && <div className={s.titleActions}>{actions}</div>}
    </div>
  );
}

const STATUS_COLOR: Record<string, string> = { Reçu: s.navy, 'En cours': s.orange, Terminé: s.green, Archivé: s.gray };

/** Coloured, translated status badge with optional late flag. */
export function StatusBadge({ status, late }: { status: string; late?: boolean }) {
  const { t } = useI18n();
  return (
    <>
      <span className={`${s.badge} ${STATUS_COLOR[status] || s.gray}`}>{t(status)}</span>
      {late && <span className={`${s.badge} ${s.late}`}>{t('late')}</span>}
    </>
  );
}

/** Format an ISO date as dd/mm/yyyy. */
export const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');
/** ISO date to yyyy-mm-dd for inputs. */
export const toInput = (d?: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '');
