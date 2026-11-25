import { formatNumber, isLate } from './wrm-service.js';

describe('wrm service', () => {
  it('formats SR numbers with two-digit sequence', () => {
    expect(formatNumber(1, 2026)).toEqual('SR-01-2026');
    expect(formatNumber(123, 2026)).toEqual('SR-123-2026');
  });

  it('flags overdue requests only when not completed', () => {
    const past = new Date(Date.now() - 3 * 864e5);
    expect(isLate({ plannedDate: past, status: 'En cours' })).toBe(true);
    expect(isLate({ plannedDate: past, status: 'Terminé' })).toBe(false);
  });
});
