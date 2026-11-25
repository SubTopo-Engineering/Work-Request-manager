import type { AppSettings, RequestForm } from './types.js';
import { STATUSES } from './types.js';
import { useI18n } from './i18n.js';
import { requestFolderName } from './local-folder.js';
import s from './wrm-app.module.css';

/** Props of the request form fields. */
export interface RequestFieldsProps {
  value: RequestForm;
  onChange: (v: RequestForm) => void;
  settings?: AppSettings | null;
  highlighted?: Set<keyof RequestForm>;
  /** Request number used to preview the folder name. */
  number?: string;
}

/** Shared editable fields of a Work Request. */
export function RequestFields({ value, onChange, settings, highlighted, number }: RequestFieldsProps) {
  const { t } = useI18n();
  const set = (k: keyof RequestForm) => (e: { target: { value: string } }) => onChange({ ...value, [k]: e.target.value });
  const hl = (k: keyof RequestForm) => `${s.field} ${highlighted?.has(k) ? s.ocrFilled : ''}`;
  return (
    <div className={s.formGrid}>
      <label className={`${hl('subject')} ${s.full}`}>
        {t('fSubject')}
        <input value={value.subject} onChange={set('subject')} required />
      </label>
      <label className={hl('site')}>
        {t('fSite')}
        <input value={value.site} onChange={set('site')} placeholder="Brega" />
        {number && <small style={{ fontWeight: 400, color: '#1f5c94' }}>📁 {requestFolderName(number, value.site)}</small>}
      </label>
      <label className={hl('department')}>
        {t('fDepartment')}
        <input list="wrm-departments" value={value.department} onChange={set('department')} />
        <datalist id="wrm-departments">{settings?.departments.map((d) => <option key={d} value={d} />)}</datalist>
      </label>
      <label className={hl('operator')}>
        {t('fOperator')}
        <input list="wrm-operators" value={value.operator} onChange={set('operator')} />
        <datalist id="wrm-operators">{settings?.operators.map((d) => <option key={d} value={d} />)}</datalist>
      </label>
      <label className={s.field}>
        {t('fStatus')}
        <select value={value.status} onChange={set('status')}>
          {STATUSES.map((st) => <option key={st} value={st}>{t(st)}</option>)}
        </select>
      </label>
      <label className={hl('receivedDate')}>
        {t('fReceived')}
        <input type="date" value={value.receivedDate} onChange={set('receivedDate')} />
      </label>
      <label className={hl('plannedDate')}>
        {t('fPlanned')}
        <input type="date" value={value.plannedDate} onChange={set('plannedDate')} />
      </label>
      <label className={hl('completedDate')}>
        {t('fCompleted')}
        <input type="date" value={value.completedDate} onChange={set('completedDate')} />
      </label>
      <label className={`${hl('description')} ${s.full}`}>
        {t('fDescription')}
        <textarea value={value.description} onChange={set('description')} />
      </label>
    </div>
  );
}

/** Empty form with today's date. */
export const emptyForm = (): RequestForm => ({
  receivedDate: new Date().toISOString().slice(0, 10),
  subject: '',
  department: '',
  site: '',
  description: '',
  plannedDate: '',
  completedDate: '',
  operator: '',
  status: 'Reçu',
});
