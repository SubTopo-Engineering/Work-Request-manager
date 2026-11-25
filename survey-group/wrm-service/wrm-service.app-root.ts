import express, { type Request, type Response, type NextFunction } from 'express';
import { WrmService } from './wrm-service.js';

type Handler = (req: Request, res: Response) => Promise<unknown>;

/** Wrap async handlers so errors become JSON 500 responses. */
const h = (fn: Handler) => (req: Request, res: Response, next: NextFunction) =>
  fn(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ message: err?.message || 'Erreur serveur' });
  });

/** Start the Work Request Manager REST service. */
export function run() {
  const app = express();
  const wrm = WrmService.from();
  const port = process.env.PORT || 3000;
  const ready = wrm.init().catch((e) => console.error('init failed', e));

  app.use(express.json({ limit: '60mb' }));
  app.use(async (_req, _res, next) => {
    await ready;
    next();
  });

  app.get('/', (_req, res) => {
    res.json({ service: 'wrm-service', ok: true });
  });

  app.get('/api/dashboard', h(async (_req, res) => res.json(await wrm.dashboard())));
  app.get('/api/next-number', h(async (_req, res) => res.json({ number: await wrm.peekNextNumber() })));

  app.get('/api/requests', h(async (req, res) => res.json(await wrm.listRequests(req.query as any))));
  app.get('/api/requests/:id', h(async (req, res) => {
    const r = await wrm.getRequest(req.params.id as string);
    return r ? res.json(r) : res.status(404).json({ message: 'Demande introuvable' });
  }));
  app.post('/api/requests', h(async (req, res) => res.status(201).json(await wrm.createRequest(req.body.request || {}, req.body.original))));
  app.put('/api/requests/:id', h(async (req, res) => res.json(await wrm.updateRequest(req.params.id as string, req.body))));
  app.delete('/api/requests/:id', h(async (req, res) => res.json({ deleted: await wrm.deleteRequest(req.params.id as string) })));

  app.post('/api/requests/:id/files', h(async (req, res) => res.json(await wrm.addFile(req.params.id as string, req.body))));
  app.delete('/api/requests/:id/files/:fileId', h(async (req, res) => res.json(await wrm.removeFile(req.params.id as string, req.params.fileId as string))));
  app.get('/api/files/:blobId', h(async (req, res) => {
    const b = await wrm.getBlob(req.params.blobId as string);
    if (!b) return res.status(404).json({ message: 'Fichier introuvable' });
    res.setHeader('Content-Type', b.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(b.name)}"`);
    return res.send(Buffer.from(b.data.buffer ?? b.data));
  }));

  app.get('/api/reports/monthly', h(async (req, res) => {
    const now = new Date();
    return res.json(await wrm.monthlyReport(Number(req.query.year) || now.getFullYear(), Number(req.query.month) || now.getMonth() + 1));
  }));
  app.get('/api/reports/daily', h(async (req, res) => res.json(await wrm.dailyReport((req.query.day as string) || new Date().toISOString().slice(0, 10)))));
  app.get('/api/reports/snapshots', h(async (_req, res) => res.json(await wrm.snapshots())));
  app.post('/api/automation/run', h(async (_req, res) => res.json(await wrm.runDailyAutomation())));

  app.get('/api/export/excel', h(async (_req, res) => {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="SurveyGroup_WorkRequests.xlsx"');
    return res.send(await wrm.exportExcel());
  }));
  app.get('/api/export/csv', h(async (_req, res) => {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="SurveyGroup_WorkRequests.csv"');
    return res.send(await wrm.exportCsv());
  }));
  app.get('/api/backup', h(async (_req, res) => {
    res.setHeader('Content-Disposition', `attachment; filename="SurveyGroup_backup_${new Date().toISOString().slice(0, 10)}.json"`);
    return res.json(await wrm.backup());
  }));
  app.post('/api/restore', h(async (req, res) => res.json(await wrm.restore(req.body))));

  app.get('/api/settings', h(async (_req, res) => res.json(await wrm.getSettings())));
  app.put('/api/settings', h(async (req, res) => res.json(await wrm.updateSettings(req.body))));

  // daily automatic follow-up (checks every hour, runs once per day)
  const timer = setInterval(async () => {
    const s = await wrm.getSettings();
    const last = s.lastDailyRun ? new Date(s.lastDailyRun).toDateString() : '';
    if (last !== new Date().toDateString()) await wrm.runDailyAutomation();
  }, 60 * 60 * 1000);

  const server = app.listen(port, () => {
    console.log(`🚀  Server ready at: http://localhost:${port}`);
  });

  return {
    port,
    // implement stop to support HMR.
    stop: async () => {
      clearInterval(timer);
      server.closeAllConnections();
      server.close();
    },
  };
}
