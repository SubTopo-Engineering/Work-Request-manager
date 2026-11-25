import { Routes, Route } from 'react-router-dom';
import { I18nProvider } from './i18n.js';
import { Layout } from './layout.js';
import { HomePage } from './home-page.js';
import { NewRequestPage } from './new-request-page.js';
import { TrackingPage } from './tracking-page.js';
import { ArchivePage } from './archive-page.js';
import { RequestDetailPage } from './request-detail-page.js';
import { ReportsPage } from './reports-page.js';
import { ExportPage, BackupPage, SettingsPage } from './data-pages.js';

/** Survey Group Work Request Manager — application router (FR / EN / AR). */
export function WrmApp() {
  return (
    <I18nProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/nouvelle" element={<NewRequestPage />} />
          <Route path="/suivi" element={<TrackingPage />} />
          <Route path="/archive" element={<ArchivePage />} />
          <Route path="/demande/:id" element={<RequestDetailPage />} />
          <Route path="/rapports" element={<ReportsPage />} />
          <Route path="/export" element={<ExportPage />} />
          <Route path="/sauvegarde" element={<BackupPage />} />
          <Route path="/parametres" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </I18nProvider>
  );
}
