/**
 * Build a simple date range filter for SQL queries.
 *
 * @param {string} column - SQL column name to filter on (e.g. "created_at").
 * @param {string} range - one of: "today", "3days", "7days", "15days", "all" (default "all").
 * @param {Array} params - existing params array to append to (mutated).
 * @returns {{ clause: string, params: any[] }} - partial WHERE clause and updated params.
 */
export function buildDateRangeFilter(column, range, params = []) {
  const normalized = (range || 'all').toLowerCase();

  if (normalized === 'all') {
    return { clause: '', params };
  }

  let fromDate;
  const now = new Date();

  switch (normalized) {
    case 'today': {
      fromDate = new Date(now);
      fromDate.setHours(0, 0, 0, 0);
      break;
    }
    case '3days': {
      fromDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      break;
    }
    case '7days': {
      fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    }
    case '15days': {
      fromDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
      break;
    }
    default: {
      return { clause: '', params };
    }
  }

  const idx = params.length + 1;
  params.push(fromDate);
  return { clause: ` AND ${column} >= $${idx}`, params };
}

