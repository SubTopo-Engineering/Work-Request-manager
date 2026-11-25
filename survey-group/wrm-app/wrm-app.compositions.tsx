import { MemoryRouter } from 'react-router-dom';
import { WrmApp } from './wrm-app.js';

/** Home dashboard of the Work Request Manager. */
export const WrmAppHome = () => (
  <MemoryRouter initialEntries={['/']}>
    <WrmApp />
  </MemoryRouter>
);

/** New request page with OCR import. */
export const WrmAppNewRequest = () => (
  <MemoryRouter initialEntries={['/nouvelle']}>
    <WrmApp />
  </MemoryRouter>
);
